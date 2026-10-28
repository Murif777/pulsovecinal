# 00-vars.ps1 - Configuracion compartida y utilidades comunes del despliegue HA.
# Cada script declara su propio param() y luego hace:  . "$PSScriptRoot\00-vars.ps1"
# Este archivo solo completa valores por defecto que falten: nunca sobreescribe lo
# que el operador paso por linea de comandos. Es agnostico de cuenta y de region.

$ErrorActionPreference = 'Stop'

if (-not $Region)          { $Region = 'us-east-1' }
if (-not $Prefix)          { $Prefix = 'pv' }
if (-not $Project)         { $Project = 'pulsovecinal' }
if (-not $InstanceProfile) { $InstanceProfile = 'LabInstanceProfile' }
if (-not $InstanceType)    { $InstanceType = 't3.micro' }
if (-not $DbUser)          { $DbUser = 'pulso' }
if (-not $DbName)          { $DbName = 'pulsovecinal' }
if (-not $DbInstanceId)    { $DbInstanceId = "$Prefix-postgres" }
if (-not $Responsable)     { $Responsable = 'equipo-pulsovecinal' }
if (-not $Expira)          { $Expira = (Get-Date).AddMonths(6).ToString('yyyy-MM-dd') }

$DeployDir = $PSScriptRoot
$Gen       = Join-Path $DeployDir 'userdata\generated'
$State     = Join-Path $DeployDir 'state.local.ps1'
$RepoRoot  = (Resolve-Path (Join-Path $DeployDir '..\..\..')).Path
New-Item -ItemType Directory -Force -Path $Gen | Out-Null

if (-not $Profile) { throw 'Falta -Profile. Ejemplo: .\01-network.ps1 -Profile mi-perfil -Region us-east-1' }

# ---------------------------------------------------------------- utilidades AWS
function Invoke-Aws {
    param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Cli)
    $prev = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    $out = & aws @Cli --profile $Profile --region $Region 2>&1 | Out-String
    $code = $LASTEXITCODE
    $ErrorActionPreference = $prev
    if ($code -ne 0) { throw "aws $($Cli -join ' ') fallo: $out" }
    return $out.Trim()
}
function Try-Aws {
    param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Cli)
    $prev = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    $out = & aws @Cli --profile $Profile --region $Region 2>&1 | Out-String
    $code = $LASTEXITCODE
    $ErrorActionPreference = $prev
    if ($code -ne 0) { return $null }
    return $out.Trim()
}
function First {
    param([string]$Text)
    if (-not $Text) { return '' }
    $line = ($Text -split "`n" | Where-Object { $_ -and $_.Trim() -ne 'None' } | Select-Object -First 1)
    if (-not $line) { return '' }
    return $line.Trim()
}
function Write-Lf {
    param([string]$Path, [string]$Text)
    [IO.File]::WriteAllText($Path, ($Text -replace "`r`n", "`n"), (New-Object Text.UTF8Encoding($false)))
}
function ConvertTo-GzipB64 {
    param([string]$Text)
    Add-Type -AssemblyName System.IO.Compression
    $bytes = [Text.Encoding]::UTF8.GetBytes(($Text -replace "`r`n", "`n"))
    $ms = New-Object System.IO.MemoryStream
    $gz = New-Object System.IO.Compression.GZipStream($ms, [System.IO.Compression.CompressionMode]::Compress)
    $gz.Write($bytes, 0, $bytes.Length)
    $gz.Dispose()
    return [Convert]::ToBase64String($ms.ToArray())
}
# Espera activa: prohibido "aws wait" en el laboratorio. Repite un bloque hasta que
# devuelva un valor verdadero o se agote el tiempo.
function Wait-Until {
    param([scriptblock]$Check, [int]$TimeoutSec = 900, [int]$IntervalSec = 20, [string]$Label = 'recurso')
    $deadline = (Get-Date).AddSeconds($TimeoutSec)
    while ((Get-Date) -lt $deadline) {
        $r = & $Check
        if ($r) { return $r }
        Write-Host "  [$Label] aun no, reintento en $IntervalSec s"
        Start-Sleep -Seconds $IntervalSec
    }
    throw "[$Label] tiempo agotado ($TimeoutSec s)"
}
function Save-State {
    param([string]$Key, [string]$Value)
    Add-Content -Path $State -Value "`$$Key = '$Value'" -Encoding utf8
}
function Import-State {
    if (Test-Path -LiteralPath $State) { . $State }
}

# ------------------------------------------------------- descubrimiento por nombre
function Get-AccountId { First (Invoke-Aws sts get-caller-identity --query 'Account' --output text) }
function Get-VpcId { First (Try-Aws ec2 describe-vpcs --filters "Name=tag:Name,Values=$Prefix-vpc" --query 'Vpcs[0].VpcId' --output text) }
function Get-SubnetId([string]$Suffix) { First (Try-Aws ec2 describe-subnets --filters "Name=tag:Name,Values=$Prefix-$Suffix" --query 'Subnets[0].SubnetId' --output text) }
function Get-SgId([string]$Suffix) { First (Try-Aws ec2 describe-security-groups --filters "Name=group-name,Values=$Prefix-sg-$Suffix" --query 'SecurityGroups[0].GroupId' --output text) }
function Get-AlbArn { First (Try-Aws elbv2 describe-load-balancers --names "$Prefix-alb" --query 'LoadBalancers[0].LoadBalancerArn' --output text) }
function Get-AlbDns { First (Try-Aws elbv2 describe-load-balancers --names "$Prefix-alb" --query 'LoadBalancers[0].DNSName' --output text) }
function Get-TgArn { First (Try-Aws elbv2 describe-target-groups --names "$Prefix-tg-back" --query 'TargetGroups[0].TargetGroupArn' --output text) }
function Get-DbHost { First (Try-Aws rds describe-db-instances --db-instance-identifier $DbInstanceId --query 'DBInstances[0].Endpoint.Address' --output text) }
function Get-SiteOrigin { "http://$Prefix-front-$(Get-AccountId).s3-website-$Region.amazonaws.com" }