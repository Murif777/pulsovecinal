# 02-security-groups.ps1 - Cadena de grupos de seguridad por referencia.
# Internet -> SG-ALB -> SG-Back -> SG-DB. Ningun grupo salvo el ALB acepta
# trafico desde un rango de direcciones.
param(
    [string]$Profile = 'mi-perfil',
    [string]$Region  = 'us-east-1',
    [string]$Prefix  = 'pv',
    [string]$Project = 'pulsovecinal'
)
. "$PSScriptRoot\00-vars.ps1"

$vpc = Get-VpcId
if (-not $vpc) { throw 'No hay VPC. Ejecuta primero 01-network.ps1' }

function Ensure-Sg([string]$Suffix, [string]$Desc) {
    $name = "$Prefix-sg-$Suffix"
    $id = Get-SgId $Suffix
    if ($id) { Write-Host "[skip] $name existe: $id"; return $id }
    $id = First (Invoke-Aws ec2 create-security-group --group-name $name --description $Desc --vpc-id $vpc --tag-specifications "ResourceType=security-group,Tags=[{Key=Name,Value=$name},{Key=Project,Value=$Project}]" --query 'GroupId' --output text)
    Write-Host "[ok] $name creado: $id"
    return $id
}
function Ensure-Ingress([string]$Sg, [int]$Port, [string]$Source) {
    $a = @('ec2','authorize-security-group-ingress','--group-id',$Sg,'--protocol','tcp','--port',"$Port")
    if ($Source -like 'sg-*') { $a += @('--source-group',$Source) } else { $a += @('--cidr',$Source) }
    Try-Aws @a | Out-Null
}

$sgAlb   = Ensure-Sg 'alb'   'ALB publico 80/443 desde Internet'
$sgFront = Ensure-Sg 'front' 'nginx solo desde el ALB (plan de reversion)'
$sgBack  = Ensure-Sg 'back'  'API 8080 solo desde el ALB'
$sgDb    = Ensure-Sg 'db'    'PostgreSQL 5432 solo desde la API'
$sgBake  = Ensure-Sg 'bake'  'auxiliar de horneado de AMI, sin ingreso'

Ensure-Ingress $sgAlb 80 '0.0.0.0/0'
Ensure-Ingress $sgAlb 443 '0.0.0.0/0'
Ensure-Ingress $sgFront 80 $sgAlb
Ensure-Ingress $sgBack 8080 $sgAlb
Ensure-Ingress $sgDb 5432 $sgBack

Write-Host 'SG_LISTOS'
Write-Host "ALB=$sgAlb FRONT=$sgFront BACK=$sgBack DB=$sgDb BAKE=$sgBake"