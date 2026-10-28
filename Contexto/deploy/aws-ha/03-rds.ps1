# 03-rds.ps1 - PostgreSQL Multi-AZ + secretos generados en el despliegue.
# Los secretos NO se versionan: se crean aqui y quedan en state.local.ps1.
# La migracion corre desde el user-data del backend (siembra idempotente); con
# -Seed se puede forzar por SSM una vez que exista una instancia del ASG.
param(
    [string]$Profile = 'mi-perfil',
    [string]$Region  = 'us-east-1',
    [string]$Prefix  = 'pv',
    [string]$Project = 'pulsovecinal',
    [double]$StorageGb = 20,
    [int]$BackupRetentionDays = 1,
    [switch]$Seed
)
. "$PSScriptRoot\00-vars.ps1"
Import-State

$vpc = Get-VpcId
if (-not $vpc) { throw 'No hay VPC. Ejecuta primero 01-network.ps1' }
$sgDb = Get-SgId 'db'
if (-not $sgDb) { throw 'Falta SG-DB. Ejecuta 02-security-groups.ps1' }
$dbA = Get-SubnetId 'db-a'; $dbB = Get-SubnetId 'db-b'
if (-not $dbA -or -not $dbB) { throw 'Faltan las subredes de datos' }

# --- secretos nuevos, solo si no existen ---
if (-not (Get-Variable -Name DbPass -ErrorAction SilentlyContinue)) {
    $alphabet = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    function New-Token([int]$Length) {
        $buf = New-Object byte[] $Length
        $rng.GetBytes($buf)
        return (-join ($buf | ForEach-Object { $alphabet[$_ % $alphabet.Length] }))
    }
    $DbPass = New-Token 24
    $JwtSecret = New-Token 48
    Save-State 'DbUser' $DbUser
    Save-State 'DbName' $DbName
    Save-State 'DbPass' $DbPass
    Save-State 'JwtSecret' $JwtSecret
    Write-Host '[ok] credenciales de base y secreto JWT generados en state.local.ps1'
} else {
    Write-Host '[skip] credenciales ya presentes en state.local.ps1'
}

# --- grupo de subredes ---
$grp = First (Try-Aws rds describe-db-subnet-groups --db-subnet-group-name "$Prefix-db-subnets" --query 'DBSubnetGroups[0].DBSubnetGroupName' --output text)
if ($grp) {
    Write-Host "[skip] $Prefix-db-subnets ya existe"
} else {
    Invoke-Aws rds create-db-subnet-group --db-subnet-group-name "$Prefix-db-subnets" --db-subnet-group-description 'PulsoVecinal Multi-AZ' --subnet-ids $dbA $dbB --tags "Key=Project,Value=$Project" | Out-Null
    Write-Host "[ok] $Prefix-db-subnets creado"
}

# --- instancia ---
$st = First (Try-Aws rds describe-db-instances --db-instance-identifier $DbInstanceId --query 'DBInstances[0].DBInstanceStatus' --output text)
if ($st) {
    Write-Host "[skip] RDS $DbInstanceId ya existe (estado $st)"
} else {
    $ver = First (Invoke-Aws rds describe-db-engine-versions --engine postgres --query "sort_by(DBEngineVersions[?starts_with(EngineVersion, '16.')], &EngineVersion)[-1].EngineVersion" --output text)
    if (-not $ver) { $ver = '16.9' }
    Write-Host "[..] creando $DbInstanceId PostgreSQL $ver Multi-AZ (10-20 min)"
    Invoke-Aws rds create-db-instance --db-instance-identifier $DbInstanceId --db-instance-class db.t3.micro --engine postgres --engine-version $ver --master-username $DbUser --master-user-password $DbPass --db-name $DbName --allocated-storage $StorageGb --storage-type gp3 --db-subnet-group-name "$Prefix-db-subnets" --vpc-security-group-ids $sgDb --multi-az --no-publicly-accessible --backup-retention-period $BackupRetentionDays --tags "Key=Name,Value=$DbInstanceId" "Key=Project,Value=$Project" 'Key=Capa,Value=datos' | Out-Null
    Write-Host "[ok] solicitud de creacion enviada"
}

$st = Wait-Until -Label 'RDS available' -TimeoutSec 2400 -IntervalSec 45 -Check {
    $s = First (Invoke-Aws rds describe-db-instances --db-instance-identifier $DbInstanceId --query 'DBInstances[0].DBInstanceStatus' --output text)
    Write-Host "  RDS estado=$s"
    if ($s -eq 'available') { $true } elseif ($s -eq 'failed') { throw 'RDS fallo' } else { $false }
}
$host_ = Get-DbHost
Write-Host "RDS_LISTO $host_"

if ($Seed) {
    $ids = First (Invoke-Aws ec2 describe-instances --filters "Name=tag:aws:autoscaling:groupName,Values=$Prefix-asg-back" 'Name=instance-state-name,Values=running' --query 'Reservations[0].Instances[0].InstanceId' --output text)
    if (-not $ids) { Write-Host '[seed] no hay instancias del backend todavia; el user-data del backend siembra solo al arrancar' }
    else {
        $schemaB64 = ConvertTo-GzipB64 ([IO.File]::ReadAllText((Join-Path $RepoRoot 'db\init\01-schema.sql')))
        $seedB64   = ConvertTo-GzipB64 ([IO.File]::ReadAllText((Join-Path $RepoRoot 'db\init\02-seed.sql')))
        $cmds = @(
            "echo '$schemaB64' | base64 -d | gunzip > /tmp/pv-schema.sql",
            "echo '$seedB64' | base64 -d | gunzip > /tmp/pv-seed.sql",
            "docker run --rm -v /tmp:/sql -e PGPASSWORD='$DbPass' postgres:16-alpine psql -h $host_ -U $DbUser -d $DbName -f /sql/pv-schema.sql -v ON_ERROR_STOP=1",
            "docker run --rm -v /tmp:/sql -e PGPASSWORD='$DbPass' postgres:16-alpine psql -h $host_ -U $DbUser -d $DbName -f /sql/pv-seed.sql -v ON_ERROR_STOP=1"
        )
        $f = Join-Path $Gen 'seed.json'
        Write-Lf $f (@{ commands = $cmds } | ConvertTo-Json -Compress)
        $cid = First (Invoke-Aws ssm send-command --instance-ids $ids --document-name AWS-RunShellScript --parameters ('file://' + ((Resolve-Path $f).Path -replace '\\','/')) --query 'Command.CommandId' --output text)
        Write-Host "[seed] comando $cid enviado a $ids"
    }
}
Write-Host 'RDS_OK'