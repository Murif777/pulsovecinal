# 05-launch-templates.ps1 - AMI dorada (horneada y verificada), plantillas de
# lanzamiento y grupos de autoescalado.
#   back : min 2 / desired 2 / max 6, health check ELB, gracia 300
#   front: min 0 / desired 0 / max 6 y procesos Launch/ReplaceUnhealthy suspendidos
#          (plan de reversion dormido; no consume capacidad)
param(
    [string]$Profile = 'mi-perfil',
    [string]$Region  = 'us-east-1',
    [string]$Prefix  = 'pv',
    [string]$Project = 'pulsovecinal',
    [string]$DbUser  = 'pulso',
    [string]$DbName  = 'pulsovecinal'
)
. "$PSScriptRoot\00-vars.ps1"
Import-State

if (-not $DbPass) { throw 'Faltan secretos. Ejecuta 03-rds.ps1 primero.' }
$vpc = Get-VpcId
$sgBack = Get-SgId 'back'; $sgFront = Get-SgId 'front'; $sgBake = Get-SgId 'bake'
$tg = Get-TgArn; $albDns = Get-AlbDns
if (-not $vpc -or -not $sgBack -or -not $tg -or -not $albDns) { throw 'Faltan red, SGs, TG o ALB. Ejecuta 01, 02 y 04.' }
$dbHost = Get-DbHost
if (-not $dbHost) { throw 'RDS no tiene endpoint. Ejecuta 03-rds.ps1.' }
$pubA = Get-SubnetId 'public-a'; $appA = Get-SubnetId 'app-a'; $appB = Get-SubnetId 'app-b'

# ---------------------------------------------------------------- 1) AMI dorada
$ami = First (Try-Aws ec2 describe-images --owners self --filters "Name=tag:Project,Values=$Project" "Name=name,Values=$Prefix-golden*" --query 'sort_by(Images,&CreationDate)[-1].ImageId' --output text)
if ($ami) {
    Write-Host "[skip] AMI dorada existente: $ami"
} else {
    $base = First (Invoke-Aws ssm get-parameter --name /aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-x86_64 --query 'Parameter.Value' --output text)
    $bakePath = Join-Path $Gen 'bake.sh'
    Copy-Item (Join-Path $DeployDir 'userdata\bake.template.sh') $bakePath -Force
    $bakeId = First (Invoke-Aws ec2 run-instances --image-id $base --instance-type $InstanceType --subnet-id $pubA --security-group-ids $sgBake --associate-public-ip-address --user-data ('file://' + ((Resolve-Path $bakePath).Path -replace '\\','/')) --iam-instance-profile "Name=$InstanceProfile" --metadata-options 'HttpTokens=required,HttpEndpoint=enabled,HttpPutResponseHopLimit=2' --block-device-mappings 'DeviceName=/dev/xvda,Ebs={VolumeSize=20,VolumeType=gp3,DeleteOnTermination=true}' --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=$Prefix-bake},{Key=Project,Value=$Project}]" --query 'Instances[0].InstanceId' --output text)
    Write-Host "[..] horneando AMI en $bakeId (descarga imagenes y las prueba)"
    $null = Wait-Until -Label 'horneado' -TimeoutSec 1500 -IntervalSec 30 -Check {
        $f = Join-Path $Gen 'bakecheck.json'
        Write-Lf $f '{"commands":["grep -q PV_BAKE_DONE /var/log/pv-bake.log 2>/dev/null && echo DONE || echo PENDING"]}'
        $cid = First (Try-Aws ssm send-command --instance-ids $bakeId --document-name AWS-RunShellScript --parameters ('file://' + ((Resolve-Path $f).Path -replace '\\','/')) --query 'Command.CommandId' --output text)
        if (-not $cid) { $false } else {
            Start-Sleep -Seconds 6
            ((Try-Aws ssm get-command-invocation --command-id $cid --instance-id $bakeId --query 'StandardOutputContent' --output text) -match 'DONE')
        }
    }
    # Captura consistente: la instancia se DETIENE antes de crear la imagen.
    # Capturarla encendida (--no-reboot) produjo capas de 0 bytes y contenedores
    # que fallaban con "exec format error".
    Invoke-Aws ec2 stop-instances --instance-ids $bakeId | Out-Null
    $null = Wait-Until -Label 'instancia detenida' -TimeoutSec 600 -IntervalSec 10 -Check {
        (First (Invoke-Aws ec2 describe-instances --instance-ids $bakeId --query 'Reservations[0].Instances[0].State.Name' --output text)) -eq 'stopped'
    }
    $ami = First (Invoke-Aws ec2 create-image --instance-id $bakeId --name ("$Prefix-golden-" + (Get-Date -Format 'yyyyMMdd-HHmmss')) --description 'PulsoVecinal golden AMI (snapshot consistente)' --tag-specifications "ResourceType=image,Tags=[{Key=Name,Value=$Prefix-golden},{Key=Project,Value=$Project}]" --query 'ImageId' --output text)
    $null = Wait-Until -Label 'AMI available' -TimeoutSec 1800 -IntervalSec 20 -Check {
        (First (Invoke-Aws ec2 describe-images --image-ids $ami --query 'Images[0].State' --output text)) -eq 'available'
    }
    Invoke-Aws ec2 terminate-instances --instance-ids $bakeId | Out-Null
    Write-Host "[ok] AMI dorada: $ami"
}
Save-State 'GoldenAmi' $ami

# ------------------------------------------------- 2) user-data del backend
$schemaB64 = ConvertTo-GzipB64 ([IO.File]::ReadAllText((Join-Path $RepoRoot 'db\init\01-schema.sql')))
$seedB64   = ConvertTo-GzipB64 ([IO.File]::ReadAllText((Join-Path $RepoRoot 'db\init\02-seed.sql')))
$cors = "http://$albDns,$(Get-SiteOrigin)"
$tpl = [IO.File]::ReadAllText((Join-Path $DeployDir 'userdata\back.template.sh'))
$back = $tpl.Replace('@@DB_HOST@@', $dbHost).Replace('@@DB_PASS@@', $DbPass).Replace('@@DB_USER@@', $DbUser).Replace('@@DB_NAME@@', $DbName).Replace('@@JWT@@', $JwtSecret).Replace('@@CORS@@', $cors).Replace('@@SCHEMA@@', $schemaB64).Replace('@@SEED@@', $seedB64)
$backPath = Join-Path $Gen 'back.sh'
Write-Lf $backPath $back
$bytes = [Text.Encoding]::UTF8.GetByteCount($back)
Write-Host "  user-data backend = $bytes bytes (limite 16384)"
if ($bytes -gt 16384) { throw 'El user-data del backend excede el limite de 16384 bytes' }

# ------------------------------------------------- 3) plantillas de lanzamiento
function New-Lt([string]$Name, [string]$SgId, [string]$UserData, [string]$TagName, [string]$Capa) {
    $data = [ordered]@{
        ImageId            = $ami
        InstanceType       = $InstanceType
        IamInstanceProfile = @{ Name = $InstanceProfile }
        SecurityGroupIds   = @($SgId)
        MetadataOptions    = @{ HttpTokens = 'required'; HttpEndpoint = 'enabled'; HttpPutResponseHopLimit = 2 }
        UserData           = ([Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes(($UserData -replace "`r`n", "`n"))))
        TagSpecifications  = @(@{ ResourceType = 'instance'; Tags = @(
            @{ Key = 'Name'; Value = $TagName }, @{ Key = 'Project'; Value = $Project },
            @{ Key = 'Capa'; Value = $Capa }, @{ Key = 'Ambiente'; Value = 'produccion' },
            @{ Key = 'Responsable'; Value = $Responsable }, @{ Key = 'Expiracion'; Value = $Expira }) })
    }
    $file = Join-Path $Gen "$Name.json"
    Write-Lf $file ($data | ConvertTo-Json -Depth 8 -Compress)
    $uri = 'file://' + ((Resolve-Path $file).Path -replace '\\','/')
    $id = First (Try-Aws ec2 describe-launch-templates --launch-template-names $Name --query 'LaunchTemplates[0].LaunchTemplateId' --output text)
    if ($id) {
        $v = First (Invoke-Aws ec2 create-launch-template-version --launch-template-id $id --source-version '1' --launch-template-data $uri --query 'LaunchTemplateVersion.VersionNumber' --output text)
        Write-Host "[ok] $Name version $v"
    } else {
        $id = First (Invoke-Aws ec2 create-launch-template --launch-template-name $Name --launch-template-data $uri --query 'LaunchTemplate.LaunchTemplateId' --output text)
        Write-Host "[ok] $Name creado: $id"
    }
    return $id
}
$ltBack  = New-Lt "$Prefix-lt-back"  $sgBack  $back  "$Prefix-back"  'backend'
$frontTpl = [IO.File]::ReadAllText((Join-Path $DeployDir 'userdata\front.template.sh')).Replace('@@ALB@@', $albDns)
$ltFront = New-Lt "$Prefix-lt-front" $sgFront $frontTpl "$Prefix-front" 'frontend'
Save-State 'LtBack' $ltBack
Save-State 'LtFront' $ltFront

# ------------------------------------------------- 4) ASG del backend
$asgBack = "$Prefix-asg-back"
$haveBack = First (Try-Aws autoscaling describe-auto-scaling-groups --auto-scaling-group-names $asgBack --query 'AutoScalingGroups[0].AutoScalingGroupName' --output text)
if ($haveBack) {
    Invoke-Aws autoscaling update-auto-scaling-group --auto-scaling-group-name $asgBack --launch-template "LaunchTemplateId=$ltBack,Version=`$Latest" --min-size 2 --max-size 6 --desired-capacity 2 --vpc-zone-identifier "$appA,$appB" --health-check-type ELB --health-check-grace-period 300 | Out-Null
    Write-Host "[skip] $asgBack existe; min 2 / max 6 confirmados"
} else {
    Invoke-Aws autoscaling create-auto-scaling-group --auto-scaling-group-name $asgBack --launch-template "LaunchTemplateId=$ltBack,Version=`$Latest" --min-size 2 --max-size 6 --desired-capacity 2 --vpc-zone-identifier "$appA,$appB" --target-group-arns $tg --health-check-type ELB --health-check-grace-period 300 --tags "Key=Name,Value=$asgBack,PropagateAtLaunch=true" "Key=Project,Value=$Project,PropagateAtLaunch=true" "Key=Capa,Value=backend,PropagateAtLaunch=true" "Key=Ambiente,Value=produccion,PropagateAtLaunch=true" "Key=Responsable,Value=$Responsable,PropagateAtLaunch=true" "Key=Expiracion,Value=$Expira,PropagateAtLaunch=true" | Out-Null
    Write-Host "[ok] $asgBack creado (2/2/6)"
}

# Instancias que quedaron con una version anterior de la plantilla se reemplazan
# para que el grupo converja al user-data vigente.
$latest = [int](First (Invoke-Aws ec2 describe-launch-template-versions --launch-template-id $ltBack --versions '$Latest' --query 'LaunchTemplateVersions[0].VersionNumber' --output text))
$stale = (Try-Aws ec2 describe-instances --filters "Name=tag:aws:autoscaling:groupName,Values=$asgBack" 'Name=instance-state-name,Values=running' --query "Reservations[].Instances[?LaunchTemplate.Version!='$latest'].InstanceId" --output text)
if ($stale -and $stale -ne 'None') {
    $ids = ($stale -split '\s+') | Where-Object { $_ -and $_ -ne 'None' }
    if ($ids) { Invoke-Aws ec2 terminate-instances --instance-ids @ids | Out-Null; Write-Host "[..] reemplazando instancias con version anterior: $($ids -join ',')" }
}

# ------------------------------------------------- 5) ASG del frontend (dormido)
$asgFront = "$Prefix-asg-front"
$haveFront = First (Try-Aws autoscaling describe-auto-scaling-groups --auto-scaling-group-names $asgFront --query 'AutoScalingGroups[0].AutoScalingGroupName' --output text)
if ($haveFront) {
    Invoke-Aws autoscaling update-auto-scaling-group --auto-scaling-group-name $asgFront --launch-template "LaunchTemplateId=$ltFront,Version=`$Latest" --min-size 0 --max-size 6 --desired-capacity 0 | Out-Null
    Write-Host "[skip] $asgFront existe (0/6/0)"
} else {
    Invoke-Aws autoscaling create-auto-scaling-group --auto-scaling-group-name $asgFront --launch-template "LaunchTemplateId=$ltFront,Version=`$Latest" --min-size 0 --max-size 6 --desired-capacity 0 --vpc-zone-identifier "$pubA,$(Get-SubnetId 'public-b')" --health-check-type EC2 --health-check-grace-period 300 --tags "Key=Name,Value=$asgFront,PropagateAtLaunch=true" "Key=Project,Value=$Project,PropagateAtLaunch=true" "Key=Capa,Value=frontend,PropagateAtLaunch=true" | Out-Null
    Write-Host "[ok] $asgFront creado (0/6/0)"
}
Try-Aws autoscaling suspend-processes --auto-scaling-group-name $asgFront --scaling-processes Launch ReplaceUnhealthy | Out-Null
Write-Host '  ASG del frontend suspendido (Launch, ReplaceUnhealthy) como plan de reversion'

Write-Host 'COMPUTE_LISTO'
Write-Host "AMI=$ami LT_BACK=$ltBack LT_FRONT=$ltFront"