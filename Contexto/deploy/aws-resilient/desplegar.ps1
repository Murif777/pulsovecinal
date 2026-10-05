# Despliega PulsoVecinal en una cuenta AWS nueva, con la misma arquitectura
# que quedo corriendo: VPC en 2 zonas, NAT, ALB publico, ALB interno,
# RDS PostgreSQL Multi-AZ, y dos Auto Scaling Groups (front y back) de 1 a 6
# instancias segun la cantidad de peticiones.
#
# Los companeros lo corren asi, desde la raiz del repositorio:
#
#   aws configure
#   powershell -ExecutionPolicy Bypass -File Contexto\deploy\aws-resilient\desplegar.ps1 -Confirmar
#
# Para borrar lo que ESTE script creo (la VPC llamada pv-vpc):
#
#   powershell -ExecutionPolicy Bypass -File Contexto\deploy\aws-resilient\desplegar.ps1 -Accion Destruir -Confirmar
#
# No usa los IDs de ninguna cuenta. Si el balanceador pv-alb ya existe en otra
# VPC (por ejemplo el demo ya montado), se detiene y no toca nada.
# Tarda unos 30-40 minutos. El token del laboratorio tiene que seguir vigente.

[CmdletBinding()]
param(
    [ValidateSet('Aplicar', 'Destruir', 'Preparar')]
    [string]$Accion = 'Aplicar',
    [switch]$Confirmar,
    [string]$Region = 'us-east-1'
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$script:Region  = $Region
$script:Project = 'pulsovecinal'
$script:Repo    = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..')).Path
$script:Gen     = Join-Path $PSScriptRoot 'userdata.generated'
$script:State   = Join-Path $PSScriptRoot 'stack.local.ps1'
$script:ImgFront = 'miguecaramirez/pulsovecinal:latest'
$script:ImgBack  = 'miguecaramirez/pulsovecinal-backend:latest'
$script:ImgPg    = 'postgres:16-alpine'

function Write-Step([string]$Message) {
    Write-Host "`n== $Message ==" -ForegroundColor Cyan
}

function Write-Lf([string]$Path, [string]$Content) {
    $dir = Split-Path $Path -Parent
    if (-not (Test-Path -LiteralPath $dir)) { New-Item -ItemType Directory -Path $dir | Out-Null }
    $text = $Content -replace "`r`n", "`n"
    [System.IO.File]::WriteAllText($Path, $text, (New-Object System.Text.UTF8Encoding($false)))
}

function Invoke-Aws {
    param([Parameter(ValueFromRemainingArguments = $true)][string[]]$AwsArgs)
    $prev = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    $out = & aws @AwsArgs 2>&1 | Out-String
    $code = $LASTEXITCODE
    $ErrorActionPreference = $prev
    if ($code -ne 0) { throw "aws $($AwsArgs -join ' ') fallo:`n$out" }
    return $out.Trim()
}

function Try-Aws {
    param([Parameter(ValueFromRemainingArguments = $true)][string[]]$AwsArgs)
    $prev = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    $out = & aws @AwsArgs 2>&1 | Out-String
    $ok = ($LASTEXITCODE -eq 0)
    $ErrorActionPreference = $prev
    if ($ok) { return $out.Trim() }
    return $null
}

function ConvertTo-GzipB64([string]$Text) {
    Add-Type -AssemblyName System.IO.Compression
    $bytes = [Text.Encoding]::UTF8.GetBytes(($Text -replace "`r`n", "`n"))
    $ms = New-Object System.IO.MemoryStream
    $gz = New-Object System.IO.Compression.GZipStream($ms, [System.IO.Compression.CompressionMode]::Compress)
    $gz.Write($bytes, 0, $bytes.Length)
    $gz.Dispose()
    return [Convert]::ToBase64String($ms.ToArray())
}

function Get-OrCreateSecrets {
    if (Test-Path -LiteralPath $script:State) { return }
    $alphabet = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    function New-Token([int]$Length) {
        $buf = New-Object byte[] $Length
        $rng.GetBytes($buf)
        -join ($buf | ForEach-Object { $alphabet[$_ % $alphabet.Length] })
    }
    $db = New-Token 24
    $jwt = New-Token 48
    $body = @"
# Generado por desplegar.ps1. No versionar.
`$DbPass = '$db'
`$JwtSecret = '$jwt'
"@
    Write-Lf $script:State $body
    Write-Host "Credenciales nuevas en $($script:State)" -ForegroundColor Yellow
}

function Import-Secrets {
    if (-not (Test-Path -LiteralPath $script:State)) {
        throw "No esta $($script:State). Corre primero con -Accion Aplicar."
    }
    . $script:State
    if (-not (Get-Variable -Name DbPass -ErrorAction SilentlyContinue) -or -not (Get-Variable -Name JwtSecret -ErrorAction SilentlyContinue)) {
        throw "stack.local.ps1 no tiene DbPass y JwtSecret."
    }
    $script:DbPass = $DbPass
    $script:JwtSecret = $JwtSecret
}

function Save-Id([string]$Name, [string]$Value) {
    Add-Content -Path $script:State -Value "`$$Name = '$Value'" -Encoding utf8
}

function Get-First([string]$Text) {
    if (-not $Text) { return '' }
    $line = ($Text -split "`n" | Where-Object { $_ -and $_.Trim() -ne 'None' } | Select-Object -First 1)
    if (-not $line) { return '' }
    return $line.Trim()
}

function New-BakeScript {
    @'
#!/bin/bash
set -euo pipefail
exec > >(tee /var/log/pv-bake.log | logger -t pv-bake -s 2>/dev/console) 2>&1
echo PV_BAKE_START
dnf install -y docker
systemctl enable --now docker
docker pull miguecaramirez/pulsovecinal:latest
docker pull miguecaramirez/pulsovecinal-backend:latest
docker pull postgres:16-alpine
docker images
echo PV_BAKE_DONE
'@
}

function New-BackScript([string]$DbHost, [string]$DbPass, [string]$Jwt, [string]$AlbDns, [string]$SchemaB64, [string]$SeedB64) {
    $raw = @'
#!/bin/bash
set -euo pipefail
exec > >(tee /var/log/pv-back.log) 2>&1
DB_HOST="@@DB_HOST@@"
DB_PASS="@@DB_PASS@@"
JWT_SECRET="@@JWT@@"
CORS_ORIGINS="http://@@ALB@@"
SCHEMA_B64='@@SCHEMA@@'
SEED_B64='@@SEED@@'
systemctl enable --now docker
for i in $(seq 1 60); do
  docker run --rm -e PGPASSWORD="$DB_PASS" postgres:16-alpine pg_isready -h "$DB_HOST" -U pulso -d pulsovecinal && break
  sleep 10
done
if ! docker run --rm -e PGPASSWORD="$DB_PASS" postgres:16-alpine psql -h "$DB_HOST" -U pulso -d pulsovecinal -tAc "SELECT 1 FROM comunas LIMIT 1" | grep -q 1; then
  echo "$SCHEMA_B64" | base64 -d | gunzip | docker run --rm -i -e PGPASSWORD="$DB_PASS" postgres:16-alpine psql -h "$DB_HOST" -U pulso -d pulsovecinal -v ON_ERROR_STOP=1
  echo "$SEED_B64" | base64 -d | gunzip | docker run --rm -i -e PGPASSWORD="$DB_PASS" postgres:16-alpine psql -h "$DB_HOST" -U pulso -d pulsovecinal -v ON_ERROR_STOP=1
fi
docker rm -f pulso-api >/dev/null 2>&1 || true
docker run -d --name pulso-api --restart unless-stopped -p 8080:8000 \
  -e DATABASE_URL="postgresql+psycopg://pulso:${DB_PASS}@${DB_HOST}:5432/pulsovecinal" \
  -e JWT_SECRET="$JWT_SECRET" \
  -e CORS_ORIGINS="$CORS_ORIGINS" \
  miguecaramirez/pulsovecinal-backend:latest
for i in $(seq 1 30); do curl -fsS http://127.0.0.1:8080/health >/dev/null 2>&1 && break; sleep 5; done
'@
    $raw = $raw.Replace('@@DB_HOST@@', $DbHost).Replace('@@DB_PASS@@', $DbPass).Replace('@@JWT@@', $Jwt).Replace('@@ALB@@', $AlbDns).Replace('@@SCHEMA@@', $SchemaB64).Replace('@@SEED@@', $SeedB64)
    return $raw
}

function New-FrontScript([string]$InternalDns, [string]$NginxB64) {
    $raw = @'
#!/bin/bash
set -euo pipefail
exec > >(tee /var/log/pv-front.log) 2>&1
BACK_HOST="@@BACK@@"
systemctl enable --now docker
mkdir -p /opt/pulso
base64 -d > /opt/pulso/nginx.conf <<'PV_EOF'
@@NGINX@@
PV_EOF
sed -i "s|http://backend:8000|http://${BACK_HOST}:8080|g" /opt/pulso/nginx.conf
grep -q "${BACK_HOST}:8080" /opt/pulso/nginx.conf
docker rm -f pulso-web >/dev/null 2>&1 || true
docker run -d --name pulso-web --restart unless-stopped -p 80:80 \
  -v /opt/pulso/nginx.conf:/etc/nginx/conf.d/default.conf:ro \
  miguecaramirez/pulsovecinal:latest
for i in $(seq 1 30); do curl -fsS http://127.0.0.1/ >/dev/null 2>&1 && break; sleep 5; done
'@
    return $raw.Replace('@@BACK@@', $InternalDns).Replace('@@NGINX@@', $NginxB64)
}

function New-LaunchTemplate([string]$Name, [string]$Ami, [string]$SgId, [string]$UserData, [string]$InstanceName, [string]$InstanceProfile) {
    $b64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes(($UserData -replace "`r`n", "`n")))
    $data = [ordered]@{
        ImageId          = $Ami
        InstanceType     = 't3.micro'
        SecurityGroupIds = @($SgId)
        MetadataOptions  = @{ HttpTokens = 'required'; HttpEndpoint = 'enabled'; HttpPutResponseHopLimit = 2 }
        UserData         = $b64
        TagSpecifications = @(
            @{ ResourceType = 'instance'; Tags = @(
                @{ Key = 'Name'; Value = $InstanceName },
                @{ Key = 'Project'; Value = $script:Project }
            )}
        )
    }
    if ($InstanceProfile) { $data.IamInstanceProfile = @{ Name = $InstanceProfile } }
    $path = Join-Path $script:Gen "$Name.json"
    Write-Lf $path ($data | ConvertTo-Json -Depth 8 -Compress)
    $uri = 'file://' + ((Resolve-Path $path).Path -replace '\\', '/')
    $existing = Try-Aws ec2 describe-launch-templates --region $script:Region --launch-template-names $Name --query "LaunchTemplates[0].LaunchTemplateId" --output text
    if ($existing) {
        Invoke-Aws ec2 create-launch-template-version --region $script:Region --launch-template-id $existing --launch-template-data $uri --query "LaunchTemplateVersion.VersionNumber" --output text | Out-Null
        return (Get-First $existing)
    }
    $id = Get-First (Invoke-Aws ec2 create-launch-template --region $script:Region --launch-template-name $Name --launch-template-data $uri --query "LaunchTemplate.LaunchTemplateId" --output text)
    Write-Host "Launch template $Name = $id" -ForegroundColor Green
    return $id
}

function New-Asg([string]$Name, [string]$LtId, [string]$Subnets, [string]$TgArn) {
    $ltArg = "LaunchTemplateId=$LtId,Version=`$Latest"
    $have = Try-Aws autoscaling describe-auto-scaling-groups --region $script:Region --auto-scaling-group-names $Name --query "AutoScalingGroups[0].AutoScalingGroupName" --output text
    if (-not $have) {
        $ok = $false
        $lastErr = ''
        for ($n = 1; $n -le 3; $n++) {
            $prev = $ErrorActionPreference
            $ErrorActionPreference = 'Continue'
            $lastErr = & aws autoscaling create-auto-scaling-group --region $script:Region `
                --auto-scaling-group-name $Name `
                --launch-template $ltArg `
                --min-size 1 --max-size 6 --desired-capacity 1 `
                --vpc-zone-identifier $Subnets `
                --target-group-arns $TgArn `
                --health-check-type ELB --health-check-grace-period 300 `
                --tags "Key=Name,Value=$Name,PropagateAtLaunch=true" "Key=Project,Value=$($script:Project),PropagateAtLaunch=true" 2>&1 | Out-String
            $code = $LASTEXITCODE
            $ErrorActionPreference = $prev
            if ($code -eq 0) { $ok = $true; break }
            Write-Host "Intento $n de crear $Name fue rechazado. Reintento en 20s.`n$lastErr" -ForegroundColor Yellow
            Start-Sleep -Seconds 20
        }
        if (-not $ok) {
            throw "No se pudo crear $Name.`n$lastErr`nSi el error es explicit deny de una service control policy, crealo en la consola: minimo 1, maximo 6, launch template $LtId, target group ya creado. Ver Contexto/Despliegue_AWS_Resiliente.md seccion 10.3."
        }
        Write-Host "ASG $Name creado (min 1, max 6)" -ForegroundColor Green
    } else {
        Invoke-Aws autoscaling update-auto-scaling-group --region $script:Region --auto-scaling-group-name $Name --launch-template $ltArg --min-size 1 --max-size 6 --vpc-zone-identifier $Subnets --health-check-type ELB --health-check-grace-period 300 | Out-Null
        Write-Host "ASG $Name ya existia; min 1 max 6 confirmados" -ForegroundColor DarkGray
    }
}

function Set-RequestPolicy([string]$Asg, [string]$Policy, [string]$AlbArn, [string]$TgArn) {
    $albPart = ($AlbArn -split 'loadbalancer/')[-1]
    $tgPart = ($TgArn -split 'targetgroup/')[-1]
    $label = "$albPart/targetgroup/$tgPart"
    $file = Join-Path $script:Gen "$Policy.json"
    Write-Lf $file (@{ TargetValue = 20.0; PredefinedMetricSpecification = @{ PredefinedMetricType = 'ALBRequestCountPerTarget'; ResourceLabel = $label } } | ConvertTo-Json -Compress)
    $uri = 'file://' + ((Resolve-Path $file).Path -replace '\\', '/')
    Invoke-Aws autoscaling put-scaling-policy --region $script:Region --auto-scaling-group-name $Asg --policy-name $Policy --policy-type TargetTrackingScaling --target-tracking-configuration $uri | Out-Null
    Write-Host "Politica $Policy en $Asg : 20 peticiones por instancia" -ForegroundColor Green
}

function Ensure-Ingress([string]$GroupId, [string]$Port, [string]$Source) {
    $arg = @('ec2', 'authorize-security-group-ingress', '--region', $script:Region, '--group-id', $GroupId, '--protocol', 'tcp', '--port', $Port)
    if ($Source -like 'sg-*') { $arg += @('--source-group', $Source) } else { $arg += @('--cidr', $Source) }
    Try-Aws @arg | Out-Null
}

function Ensure-SecurityGroup([string]$Name, [string]$Desc, [string]$VpcId) {
    $id = Get-First (Invoke-Aws ec2 describe-security-groups --region $script:Region --filters "Name=vpc-id,Values=$VpcId" "Name=group-name,Values=$Name" --query "SecurityGroups[0].GroupId" --output text)
    if ($id) { return $id }
    $id = Get-First (Invoke-Aws ec2 create-security-group --region $script:Region --group-name $Name --description $Desc --vpc-id $VpcId --query "GroupId" --output text)
    Invoke-Aws ec2 create-tags --region $script:Region --resources $id --tags "Key=Name,Value=$Name" "Key=Project,Value=$($script:Project)" | Out-Null
    return $id
}

function Assert-NoChocaConOtroDespliegue {
    $vpc = Get-First (Invoke-Aws ec2 describe-vpcs --region $script:Region --filters "Name=tag:Name,Values=pv-vpc" --query "Vpcs[0].VpcId" --output text)
    $alb = Try-Aws elbv2 describe-load-balancers --region $script:Region --names pv-alb --query "LoadBalancers[0].VpcId" --output text
    $rds = Try-Aws rds describe-db-instances --region $script:Region --db-instance-identifier pv-postgres --query "DBInstances[0].DBInstanceIdentifier" --output text
    if (-not $vpc -and ($alb -or $rds)) {
        throw "Esta cuenta ya tiene pv-alb o pv-postgres de otro despliegue. El script es para la cuenta de cada companero, vacia de estos nombres. No cree ni borre nada."
    }
}

function Build-UserDataFiles([string]$DbHost, [string]$AlbDns, [string]$InternalDns) {
    Import-Secrets
    $schema = [IO.File]::ReadAllText((Join-Path $script:Repo 'db\init\01-schema.sql'))
    $seed = [IO.File]::ReadAllText((Join-Path $script:Repo 'db\init\02-seed.sql'))
    $nginx = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes(([IO.File]::ReadAllText((Join-Path $script:Repo 'nginx.conf')) -replace "`r`n", "`n")))
    $back = New-BackScript $DbHost $script:DbPass $script:JwtSecret $AlbDns (ConvertTo-GzipB64 $schema) (ConvertTo-GzipB64 $seed)
    $front = New-FrontScript $InternalDns $nginx
    $bake = New-BakeScript
    New-Item -ItemType Directory -Force -Path $script:Gen | Out-Null
    Write-Lf (Join-Path $script:Gen 'back.sh') $back
    Write-Lf (Join-Path $script:Gen 'front.sh') $front
    Write-Lf (Join-Path $script:Gen 'bake.sh') $bake
    $backBytes = [Text.Encoding]::UTF8.GetByteCount($back)
    if ($backBytes -gt 16000) { throw "El user-data del back pesa $backBytes bytes y AWS solo acepta 16384." }
    return @{ Back = $back; Front = $front; Bake = $bake; BackBytes = $backBytes }
}

function Invoke-Aplicar {
    Assert-NoChocaConOtroDespliegue
    $who = Invoke-Aws sts get-caller-identity --query "Account" --output text
    Write-Host "Cuenta $who en $($script:Region). Esto crea NAT, 2 balanceadores y RDS Multi-AZ: gasta credito del laboratorio." -ForegroundColor Yellow
    foreach ($rel in @('nginx.conf', 'db\init\01-schema.sql', 'db\init\02-seed.sql')) {
        if (-not (Test-Path -LiteralPath (Join-Path $script:Repo $rel))) { throw "Falta $rel. Hay que correr el script dentro del repositorio clonado." }
    }
    Get-OrCreateSecrets
    Import-Secrets

    Write-Step '1/9 Red'
    $vpc = Get-First (Invoke-Aws ec2 describe-vpcs --region $script:Region --filters "Name=tag:Name,Values=pv-vpc" --query "Vpcs[0].VpcId" --output text)
    if (-not $vpc) {
        $vpc = Get-First (Invoke-Aws ec2 create-vpc --region $script:Region --cidr-block 10.0.0.0/16 --tag-specifications "ResourceType=vpc,Tags=[{Key=Name,Value=pv-vpc},{Key=Project,Value=$($script:Project)}]" --query "Vpc.VpcId" --output text)
    }
    Invoke-Aws ec2 modify-vpc-attribute --region $script:Region --vpc-id $vpc --enable-dns-hostnames | Out-Null
    Invoke-Aws ec2 modify-vpc-attribute --region $script:Region --vpc-id $vpc --enable-dns-support | Out-Null
    $azs = @(Invoke-Aws ec2 describe-availability-zones --region $script:Region --filters "Name=state,Values=available" --query "AvailabilityZones[].ZoneName" --output text)
    $azA = ($azs -split '\s+')[0]
    $azB = ($azs -split '\s+')[1]
    Write-Host "VPC $vpc en $azA y $azB"

    $igw = Get-First (Invoke-Aws ec2 describe-internet-gateways --region $script:Region --filters "Name=attachment.vpc-id,Values=$vpc" --query "InternetGateways[0].InternetGatewayId" --output text)
    if (-not $igw) {
        $igw = Get-First (Invoke-Aws ec2 create-internet-gateway --region $script:Region --tag-specifications "ResourceType=internet-gateway,Tags=[{Key=Name,Value=pv-igw},{Key=Project,Value=$($script:Project)}]" --query "InternetGateway.InternetGatewayId" --output text)
        Invoke-Aws ec2 attach-internet-gateway --region $script:Region --internet-gateway-id $igw --vpc-id $vpc | Out-Null
    }

    function Ensure-RouteTable([string]$Name) {
        $id = Get-First (Invoke-Aws ec2 describe-route-tables --region $script:Region --filters "Name=vpc-id,Values=$vpc" "Name=tag:Name,Values=$Name" --query "RouteTables[0].RouteTableId" --output text)
        if ($id) { return $id }
        return Get-First (Invoke-Aws ec2 create-route-table --region $script:Region --vpc-id $vpc --tag-specifications "ResourceType=route-table,Tags=[{Key=Name,Value=$Name},{Key=Project,Value=$($script:Project)}]" --query "RouteTable.RouteTableId" --output text)
    }
    $rtPub = Ensure-RouteTable 'pv-rt-public'
    $rtPriv = Ensure-RouteTable 'pv-rt-private'
    Try-Aws ec2 create-route --region $script:Region --route-table-id $rtPub --destination-cidr-block 0.0.0.0/0 --gateway-id $igw | Out-Null

    function Ensure-Subnet([string]$Cidr, [string]$Az, [bool]$Public, [string]$Name, [string]$Rt) {
        $id = Get-First (Invoke-Aws ec2 describe-subnets --region $script:Region --filters "Name=vpc-id,Values=$vpc" "Name=cidr-block,Values=$Cidr" --query "Subnets[0].SubnetId" --output text)
        if (-not $id) {
            $id = Get-First (Invoke-Aws ec2 create-subnet --region $script:Region --vpc-id $vpc --cidr-block $Cidr --availability-zone $Az --tag-specifications "ResourceType=subnet,Tags=[{Key=Name,Value=$Name},{Key=Project,Value=$($script:Project)}]" --query "Subnet.SubnetId" --output text)
        }
        if ($Public) { Invoke-Aws ec2 modify-subnet-attribute --region $script:Region --subnet-id $id --map-public-ip-on-launch | Out-Null }
        Try-Aws ec2 associate-route-table --region $script:Region --route-table-id $Rt --subnet-id $id | Out-Null
        return $id
    }
    $pubA = Ensure-Subnet '10.0.0.0/24' $azA $true  'pv-public-a' $rtPub
    $natS = Ensure-Subnet '10.0.1.0/24' $azA $true  'pv-public-nat' $rtPub
    $pubB = Ensure-Subnet '10.0.4.0/24' $azB $true  'pv-public-b' $rtPub
    $appA = Ensure-Subnet '10.0.5.0/24' $azA $false 'pv-app-a' $rtPriv
    $appB = Ensure-Subnet '10.0.2.0/24' $azB $false 'pv-app-b' $rtPriv
    $dbA  = Ensure-Subnet '10.0.6.0/24' $azA $false 'pv-db-a' $rtPriv
    $dbB  = Ensure-Subnet '10.0.3.0/24' $azB $false 'pv-db-b' $rtPriv

    $nat = Get-First (Invoke-Aws ec2 describe-nat-gateways --region $script:Region --filter "Name=vpc-id,Values=$vpc" "Name=state,Values=available,pending" --query "NatGateways[0].NatGatewayId" --output text)
    if (-not $nat) {
        $eip = Get-First (Invoke-Aws ec2 describe-addresses --region $script:Region --filters "Name=tag:Name,Values=pv-nat-eip" "Name=domain,Values=vpc" --query "Addresses[0].AllocationId" --output text)
        if (-not $eip) {
            $eip = Get-First (Invoke-Aws ec2 allocate-address --region $script:Region --domain vpc --tag-specifications "ResourceType=elastic-ip,Tags=[{Key=Name,Value=pv-nat-eip},{Key=Project,Value=$($script:Project)}]" --query "AllocationId" --output text)
        }
        $nat = Get-First (Invoke-Aws ec2 create-nat-gateway --region $script:Region --subnet-id $natS --allocation-id $eip --query "NatGateway.NatGatewayId" --output text)
        Invoke-Aws ec2 create-tags --region $script:Region --resources $nat --tags "Key=Name,Value=pv-nat" "Key=Project,Value=$($script:Project)" | Out-Null
        Write-Host "Esperando NAT $nat"
        Invoke-Aws ec2 wait nat-gateway-available --region $script:Region --nat-gateway-ids $nat | Out-Null
    }
    Try-Aws ec2 create-route --region $script:Region --route-table-id $rtPriv --destination-cidr-block 0.0.0.0/0 --nat-gateway-id $nat | Out-Null

    Write-Step '2/9 Security groups'
    $sgAlb = Ensure-SecurityGroup 'pv-sg-alb' 'ALB publico 80/443' $vpc
    $sgFront = Ensure-SecurityGroup 'pv-sg-front' 'nginx solo desde el ALB' $vpc
    $sgInt = Ensure-SecurityGroup 'pv-sg-alb-int' 'ALB interno 8080 desde el front' $vpc
    $sgBack = Ensure-SecurityGroup 'pv-sg-back' 'API solo desde el ALB interno' $vpc
    $sgDb = Ensure-SecurityGroup 'pv-sg-db' 'Postgres solo desde el back' $vpc
    $sgBake = Ensure-SecurityGroup 'pv-sg-bake' 'auxiliar de AMI, sin entrada' $vpc
    Ensure-Ingress $sgAlb 80 '0.0.0.0/0'
    Ensure-Ingress $sgAlb 443 '0.0.0.0/0'
    Ensure-Ingress $sgFront 80 $sgAlb
    Ensure-Ingress $sgInt 8080 $sgFront
    Ensure-Ingress $sgBack 8080 $sgInt
    Ensure-Ingress $sgDb 5432 $sgBack

    Write-Step '3/9 RDS PostgreSQL Multi-AZ'
    $dbSub = Get-First (Try-Aws rds describe-db-subnet-groups --region $script:Region --db-subnet-group-name pv-db-subnets --query "DBSubnetGroups[0].DBSubnetGroupName" --output text)
    if (-not $dbSub) {
        Invoke-Aws rds create-db-subnet-group --region $script:Region --db-subnet-group-name pv-db-subnets --db-subnet-group-description "PulsoVecinal Multi-AZ" --subnet-ids $dbA $dbB --tags "Key=Project,Value=$($script:Project)" | Out-Null
    }
    $rds = Try-Aws rds describe-db-instances --region $script:Region --db-instance-identifier pv-postgres --query "DBInstances[0].DBInstanceStatus" --output text
    if (-not $rds) {
        $ver = Get-First (Invoke-Aws rds describe-db-engine-versions --region $script:Region --engine postgres --query "sort_by(DBEngineVersions[?starts_with(EngineVersion, '16.')], &EngineVersion)[-1].EngineVersion" --output text)
        if (-not $ver) { $ver = '16.9' }
        Write-Host "Creando RDS PostgreSQL $ver Multi-AZ (unos 15 min, sigue en segundo plano)"
        Invoke-Aws rds create-db-instance --region $script:Region --db-instance-identifier pv-postgres --db-instance-class db.t3.micro --engine postgres --engine-version $ver --master-username pulso --master-user-password $script:DbPass --db-name pulsovecinal --allocated-storage 20 --storage-type gp3 --db-subnet-group-name pv-db-subnets --vpc-security-group-ids $sgDb --multi-az --no-publicly-accessible --backup-retention-period 1 --tags "Key=Project,Value=$($script:Project)" | Out-Null
    }

    Write-Step '4/9 Balanceadores'
    function Ensure-Tg([string]$Name, [string]$Port, [string]$Health) {
        $arn = Get-First (Try-Aws elbv2 describe-target-groups --region $script:Region --names $Name --query "TargetGroups[0].TargetGroupArn" --output text)
        if ($arn) { return $arn }
        return Get-First (Invoke-Aws elbv2 create-target-group --region $script:Region --name $Name --protocol HTTP --port $Port --vpc-id $vpc --target-type instance --health-check-protocol HTTP --health-check-path $Health --health-check-interval-seconds 15 --health-check-timeout-seconds 5 --healthy-threshold-count 2 --unhealthy-threshold-count 3 --query "TargetGroups[0].TargetGroupArn" --output text)
    }
    $tgFront = Ensure-Tg 'pv-tg-front' 80 '/'
    $tgBack = Ensure-Tg 'pv-tg-back' 8080 '/health'
    function Ensure-Alb([string]$Name, [string]$Scheme, [string]$Sg, [string[]]$Subnets) {
        $arn = Get-First (Try-Aws elbv2 describe-load-balancers --region $script:Region --names $Name --query "LoadBalancers[0].LoadBalancerArn" --output text)
        if (-not $arn) {
            $arn = Get-First (Invoke-Aws elbv2 create-load-balancer --region $script:Region --name $Name --subnets @Subnets --security-groups $Sg --scheme $Scheme --type application --query "LoadBalancers[0].LoadBalancerArn" --output text)
        }
        return $arn
    }
    $alb = Ensure-Alb 'pv-alb' 'internet-facing' $sgAlb @($pubA, $pubB)
    $albInt = Ensure-Alb 'pv-alb-int' 'internal' $sgInt @($appA, $appB)
    Invoke-Aws elbv2 wait load-balancer-available --region $script:Region --load-balancer-arns $alb $albInt | Out-Null
    $albDns = Get-First (Invoke-Aws elbv2 describe-load-balancers --region $script:Region --load-balancer-arns $alb --query "LoadBalancers[0].DNSName" --output text)
    $intDns = Get-First (Invoke-Aws elbv2 describe-load-balancers --region $script:Region --load-balancer-arns $albInt --query "LoadBalancers[0].DNSName" --output text)
    function Ensure-Listener([string]$AlbArn, [string]$Port, [string]$TgArn) {
        $ports = Try-Aws elbv2 describe-listeners --region $script:Region --load-balancer-arn $AlbArn --query "Listeners[].Port" --output text
        if ($ports -and (($ports -split '\s+') -contains "$Port")) { return }
        Invoke-Aws elbv2 create-listener --region $script:Region --load-balancer-arn $AlbArn --protocol HTTP --port $Port --default-actions "Type=forward,TargetGroupArn=$TgArn" | Out-Null
    }
    Ensure-Listener $alb 80 $tgFront
    Ensure-Listener $albInt 8080 $tgBack
    Write-Host "URL http://$albDns" -ForegroundColor Green

    Write-Step '5/9 AMI con Docker y las imagenes'
    $ami = Get-First (Invoke-Aws ec2 describe-images --region $script:Region --owners self --filters "Name=tag:Project,Values=$($script:Project)" "Name=name,Values=pv-golden-*" --query "sort_by(Images,&CreationDate)[-1].ImageId" --output text)
    $profile = Get-First (Try-Aws iam list-instance-profiles --query "InstanceProfiles[?InstanceProfileName=='LabInstanceProfile'].InstanceProfileName" --output text)
    if (-not $ami) {
        $base = Get-First (Invoke-Aws ssm get-parameter --region $script:Region --name /aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-x86_64 --query "Parameter.Value" --output text)
        $files = Build-UserDataFiles 'pendiente' $albDns $intDns
        $bakePath = Join-Path $script:Gen 'bake.sh'
        $bakeUri = 'file://' + ((Resolve-Path $bakePath).Path -replace '\\', '/')
        $run = @('ec2', 'run-instances', '--region', $script:Region, '--image-id', $base, '--instance-type', 't3.micro', '--subnet-id', $pubA, '--security-group-ids', $sgBake, '--associate-public-ip-address', '--user-data', $bakeUri, '--metadata-options', 'HttpTokens=required,HttpEndpoint=enabled,HttpPutResponseHopLimit=2', '--block-device-mappings', 'DeviceName=/dev/xvda,Ebs={VolumeSize=20,VolumeType=gp3,DeleteOnTermination=true}', '--tag-specifications', "ResourceType=instance,Tags=[{Key=Name,Value=pv-bake},{Key=Project,Value=$($script:Project)}]", '--query', 'Instances[0].InstanceId', '--output', 'text')
        if ($profile) { $run += @('--iam-instance-profile', "Name=$profile") }
        $bakeId = Get-First (Invoke-Aws @run)
        Write-Host "Horneando AMI en $bakeId (descarga las imagenes de Docker Hub)"
        Invoke-Aws ec2 wait instance-running --region $script:Region --instance-ids $bakeId | Out-Null
        $done = $false
        $deadline = (Get-Date).AddMinutes(20)
        while ((Get-Date) -lt $deadline) {
            $console = Try-Aws ec2 get-console-output --region $script:Region --instance-id $bakeId --latest --query "Output" --output text
            if ($console -and $console.Contains('PV_BAKE_DONE')) { $done = $true; break }
            if ($profile) {
                $ssmFile = Join-Path $script:Gen 'ssm-bake.json'
                Write-Lf $ssmFile '{"commands":["test -f /var/log/pv-bake.log && grep -q PV_BAKE_DONE /var/log/pv-bake.log && echo PV_BAKE_DONE || echo PENDING"]}'
                $ssmUri = 'file://' + ((Resolve-Path $ssmFile).Path -replace '\\', '/')
                $cid = Try-Aws ssm send-command --region $script:Region --instance-ids $bakeId --document-name AWS-RunShellScript --parameters $ssmUri --query "Command.CommandId" --output text
                if ($cid) {
                    Start-Sleep -Seconds 4
                    $ssmOut = Try-Aws ssm get-command-invocation --region $script:Region --command-id $cid --instance-id $bakeId --query "StandardOutputContent" --output text
                    if ($ssmOut -and $ssmOut.Contains('PV_BAKE_DONE')) { $done = $true; break }
                }
            }
            Start-Sleep -Seconds 20
        }
        if (-not $done) { throw "La AMI no termino de hornearse. Instancia $bakeId. Revisa la consola de la instancia (EC2, Monitor and troubleshoot, Get system log)." }
        $ami = Get-First (Invoke-Aws ec2 create-image --region $script:Region --instance-id $bakeId --name "pv-golden-$(Get-Date -Format yyyyMMdd-HHmmss)" --no-reboot --tag-specifications "ResourceType=image,Tags=[{Key=Name,Value=pv-golden},{Key=Project,Value=$($script:Project)}]" --query "ImageId" --output text)
        Write-Host "AMI $ami. Esperando a que este available."
        Invoke-Aws ec2 wait image-available --region $script:Region --image-ids $ami | Out-Null
        Try-Aws ec2 terminate-instances --region $script:Region --instance-ids $bakeId | Out-Null
    } else {
        Write-Host "AMI reutilizada: $ami" -ForegroundColor DarkGray
    }

    Write-Step '6/9 Esperando a RDS'
    Invoke-Aws rds wait db-instance-available --region $script:Region --db-instance-identifier pv-postgres | Out-Null
    $dbHost = Get-First (Invoke-Aws rds describe-db-instances --region $script:Region --db-instance-identifier pv-postgres --query "DBInstances[0].Endpoint.Address" --output text)
    $multi = Get-First (Invoke-Aws rds describe-db-instances --region $script:Region --db-instance-identifier pv-postgres --query "DBInstances[0].MultiAZ" --output text)
    Write-Host "RDS $dbHost MultiAZ=$multi"

    Write-Step '7/9 Launch templates y Auto Scaling'
    $files = Build-UserDataFiles $dbHost $albDns $intDns
    Write-Host "User-data del back: $($files.BackBytes) bytes"
    $ltBack = New-LaunchTemplate 'pv-lt-back' $ami $sgBack $files.Back 'pv-back' $profile
    $ltFront = New-LaunchTemplate 'pv-lt-front' $ami $sgFront $files.Front 'pv-front' $profile
    New-Asg 'pv-asg-back' $ltBack "$appA,$appB" $tgBack
    New-Asg 'pv-asg-front' $ltFront "$pubA,$pubB" $tgFront
    Set-RequestPolicy 'pv-asg-back' 'pv-back-req' $albInt $tgBack
    Set-RequestPolicy 'pv-asg-front' 'pv-front-req' $alb $tgFront

    Write-Step '8/9 Probando la URL'
    $url = "http://$albDns/api/barrios"
    $alive = $false
    $deadline = (Get-Date).AddMinutes(12)
    while ((Get-Date) -lt $deadline) {
        try {
            $resp = Invoke-WebRequest $url -UseBasicParsing -TimeoutSec 15
            if ($resp.StatusCode -eq 200) { $alive = $true; break }
        } catch { }
        Write-Host "  aun no responde, reintento..." -ForegroundColor DarkGray
        Start-Sleep -Seconds 20
    }

    Write-Step '9/9 Listo'
    Write-Host "Front  http://$albDns" -ForegroundColor Green
    Write-Host "Login  analista / pulso2026"
    Write-Host "ASG    pv-asg-front y pv-asg-back : minimo 1, maximo 6, 20 peticiones por instancia"
    if ($alive) { Write-Host "Prueba /api/barrios = 200" -ForegroundColor Green }
    else { Write-Host "La URL todavia no respondio 200. Las instancias siguen arrancando; abre la URL en unos minutos." -ForegroundColor Yellow }
    Write-Host "Para borrarlo cuando acabe la clase: desplegar.ps1 -Accion Destruir -Confirmar" -ForegroundColor Yellow
}

function Remove-If([string]$What, [scriptblock]$Action) {
    try { & $Action } catch { Write-Host "  (sin $What)" -ForegroundColor DarkGray }
}

function Invoke-Destruir {
    $vpc = Get-First (Invoke-Aws ec2 describe-vpcs --region $script:Region --filters "Name=tag:Name,Values=pv-vpc" --query "Vpcs[0].VpcId" --output text)
    if (-not $vpc) {
        throw "No hay una VPC llamada pv-vpc. No borre el despliegue anterior de otra VPC."
    }
    Write-Host "Voy a borrar solo lo que esta dentro de $vpc" -ForegroundColor Yellow
    foreach ($asg in @('pv-asg-front', 'pv-asg-back')) {
        $subnets = Get-First (Try-Aws autoscaling describe-auto-scaling-groups --region $script:Region --auto-scaling-group-names $asg --query "AutoScalingGroups[0].VPCZoneIdentifier" --output text)
        if ($subnets) {
            $one = ($subnets -split ',')[0]
            $owner = Get-First (Invoke-Aws ec2 describe-subnets --region $script:Region --subnet-ids $one --query "Subnets[0].VpcId" --output text)
            if ($owner -eq $vpc) {
                Invoke-Aws autoscaling delete-auto-scaling-group --region $script:Region --auto-scaling-group-name $asg --force-delete | Out-Null
                Write-Host "ASG $asg en borrado"
            }
        }
    }
    foreach ($lt in @('pv-lt-front', 'pv-lt-back')) {
        Try-Aws ec2 delete-launch-template --region $script:Region --launch-template-name $lt | Out-Null
    }
    foreach ($name in @('pv-alb', 'pv-alb-int')) {
        $arn = Get-First (Try-Aws elbv2 describe-load-balancers --region $script:Region --names $name --query "LoadBalancers[0].LoadBalancerArn" --output text)
        $albVpc = Get-First (Try-Aws elbv2 describe-load-balancers --region $script:Region --names $name --query "LoadBalancers[0].VpcId" --output text)
        if ($arn -and $albVpc -eq $vpc) {
            Invoke-Aws elbv2 delete-load-balancer --region $script:Region --load-balancer-arn $arn | Out-Null
            Invoke-Aws elbv2 wait load-balancers-deleted --region $script:Region --load-balancer-arns $arn | Out-Null
        }
    }
    foreach ($tg in @('pv-tg-front', 'pv-tg-back')) {
        $arn = Get-First (Try-Aws elbv2 describe-target-groups --region $script:Region --names $tg --query "TargetGroups[0].TargetGroupArn" --output text)
        $tgVpc = Get-First (Try-Aws elbv2 describe-target-groups --region $script:Region --names $tg --query "TargetGroups[0].VpcId" --output text)
        if ($arn -and $tgVpc -eq $vpc) { Try-Aws elbv2 delete-target-group --region $script:Region --target-group-arn $arn | Out-Null }
    }
    $ids = @((Invoke-Aws ec2 describe-instances --region $script:Region --filters "Name=vpc-id,Values=$vpc" "Name=instance-state-name,Values=pending,running,stopping,stopped" --query "Reservations[].Instances[].InstanceId" --output text) -split '\s+' | Where-Object { $_ -and $_ -ne 'None' })
    if ($ids.Count -gt 0) {
        Invoke-Aws ec2 terminate-instances --region $script:Region --instance-ids @ids | Out-Null
        Invoke-Aws ec2 wait instance-terminated --region $script:Region --instance-ids @ids | Out-Null
    }
    $rdsVpc = Get-First (Try-Aws rds describe-db-instances --region $script:Region --db-instance-identifier pv-postgres --query "DBInstances[0].DBSubnetGroup.VpcId" --output text)
    if ($rdsVpc -eq $vpc) {
        Try-Aws rds delete-db-instance --region $script:Region --db-instance-identifier pv-postgres --skip-final-snapshot | Out-Null
        Write-Host "Esperando a que RDS se borre"
        Try-Aws rds wait db-instance-deleted --region $script:Region --db-instance-identifier pv-postgres | Out-Null
        Try-Aws rds delete-db-subnet-group --region $script:Region --db-subnet-group-name pv-db-subnets | Out-Null
    }
    $nats = Invoke-Aws ec2 describe-nat-gateways --region $script:Region --filter "Name=vpc-id,Values=$vpc" "Name=state,Values=available,pending" --query "NatGateways[].NatGatewayId" --output text
    foreach ($nat in ($nats -split '\s+')) {
        if (-not $nat -or $nat -eq 'None') { continue }
        $eip = Get-First (Invoke-Aws ec2 describe-nat-gateways --region $script:Region --nat-gateway-ids $nat --query "NatGateways[0].NatGatewayAddresses[0].AllocationId" --output text)
        Invoke-Aws ec2 delete-nat-gateway --region $script:Region --nat-gateway-id $nat | Out-Null
        Try-Aws ec2 wait nat-gateway-deleted --region $script:Region --nat-gateway-ids $nat | Out-Null
        if ($eip) { Try-Aws ec2 release-address --region $script:Region --allocation-id $eip | Out-Null }
    }
    $images = Invoke-Aws ec2 describe-images --region $script:Region --owners self --filters "Name=tag:Project,Values=$($script:Project)" "Name=name,Values=pv-golden-*" --query "Images[].ImageId" --output text
    foreach ($image in ($images -split '\s+')) {
        if (-not $image -or $image -eq 'None') { continue }
        $snaps = Invoke-Aws ec2 describe-images --region $script:Region --image-ids $image --query "Images[0].BlockDeviceMappings[].Ebs.SnapshotId" --output text
        Try-Aws ec2 deregister-image --region $script:Region --image-id $image | Out-Null
        foreach ($snap in ($snaps -split '\s+')) {
            if ($snap -and $snap -ne 'None') { Try-Aws ec2 delete-snapshot --region $script:Region --snapshot-id $snap | Out-Null }
        }
    }
    foreach ($sgName in @('pv-sg-bake', 'pv-sg-front', 'pv-sg-back', 'pv-sg-db', 'pv-sg-alb-int', 'pv-sg-alb')) {
        $sg = Get-First (Invoke-Aws ec2 describe-security-groups --region $script:Region --filters "Name=vpc-id,Values=$vpc" "Name=group-name,Values=$sgName" --query "SecurityGroups[0].GroupId" --output text)
        if ($sg) {
            for ($n = 0; $n -lt 5; $n++) {
                $gone = Try-Aws ec2 delete-security-group --region $script:Region --group-id $sg
                if ($null -ne $gone) { break }
                Start-Sleep -Seconds 10
            }
        }
    }
    $subs = Invoke-Aws ec2 describe-subnets --region $script:Region --filters "Name=vpc-id,Values=$vpc" --query "Subnets[].SubnetId" --output text
    foreach ($s in ($subs -split '\s+')) { if ($s -and $s -ne 'None') { Try-Aws ec2 delete-subnet --region $script:Region --subnet-id $s | Out-Null } }
    $rtJson = Invoke-Aws ec2 describe-route-tables --region $script:Region --filters "Name=vpc-id,Values=$vpc" --output json | ConvertFrom-Json
    foreach ($rt in @($rtJson.RouteTables)) {
        $isMain = $false
        foreach ($assoc in @($rt.Associations)) { if ($assoc.Main) { $isMain = $true } }
        if (-not $isMain) { Try-Aws ec2 delete-route-table --region $script:Region --route-table-id $rt.RouteTableId | Out-Null }
    }
    $igw = Get-First (Invoke-Aws ec2 describe-internet-gateways --region $script:Region --filters "Name=attachment.vpc-id,Values=$vpc" --query "InternetGateways[0].InternetGatewayId" --output text)
    if ($igw) {
        Try-Aws ec2 detach-internet-gateway --region $script:Region --internet-gateway-id $igw --vpc-id $vpc | Out-Null
        Try-Aws ec2 delete-internet-gateway --region $script:Region --internet-gateway-id $igw | Out-Null
    }
    Invoke-Aws ec2 delete-vpc --region $script:Region --vpc-id $vpc | Out-Null
    Write-Host "Stack pv-vpc borrado." -ForegroundColor Green
}

if ($Accion -eq 'Preparar') {
    Get-OrCreateSecrets
    $out = Build-UserDataFiles 'db.ejemplo.rds.amazonaws.com' 'pv-alb-ejemplo.us-east-1.elb.amazonaws.com' 'internal-pv-alb-int-ejemplo.us-east-1.elb.amazonaws.com'
    Write-Host "User-data generado en $($script:Gen). Back = $($out.BackBytes) bytes (limite 16384)."
    return
}

if (-not $Confirmar) {
    Write-Host @"
Uso, desde la raiz del repositorio, con AWS CLI ya configurado (region us-east-1):

  powershell -ExecutionPolicy Bypass -File Contexto\deploy\aws-resilient\desplegar.ps1 -Confirmar

Borrar solo la VPC pv-vpc que crea este script:

  powershell -ExecutionPolicy Bypass -File Contexto\deploy\aws-resilient\desplegar.ps1 -Accion Destruir -Confirmar

Tarda 30-40 minutos. Crea NAT, dos balanceadores y RDS Multi-AZ.
"@
    exit 1
}

if ($Accion -eq 'Destruir') { Invoke-Destruir }
else { Invoke-Aplicar }
