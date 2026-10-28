# 04-alb-tg.ps1 - Target group del backend y balanceador publico con listener :80.
# No se crea balanceador interno: en v1 se elimino y su funcion la cumple el
# reparto directo del ALB publico al backend (ahorro de 16,43 USD/mes).
param(
    [string]$Profile = 'mi-perfil',
    [string]$Region  = 'us-east-1',
    [string]$Prefix  = 'pv',
    [string]$Project = 'pulsovecinal'
)
. "$PSScriptRoot\00-vars.ps1"

$vpc = Get-VpcId
if (-not $vpc) { throw 'No hay VPC. Ejecuta primero 01-network.ps1' }
$sgAlb = Get-SgId 'alb'
if (-not $sgAlb) { throw 'Falta SG-ALB. Ejecuta 02-security-groups.ps1' }
$pubA = Get-SubnetId 'public-a'; $pubB = Get-SubnetId 'public-b'

$tg = Get-TgArn
if ($tg) {
    Write-Host "[skip] $Prefix-tg-back ya existe: $tg"
} else {
    $tg = First (Invoke-Aws elbv2 create-target-group --name "$Prefix-tg-back" --protocol HTTP --port 8080 --vpc-id $vpc --target-type instance --health-check-protocol HTTP --health-check-path /health --health-check-interval-seconds 15 --health-check-timeout-seconds 5 --healthy-threshold-count 2 --unhealthy-threshold-count 3 --tags "Key=Name,Value=$Prefix-tg-back" "Key=Project,Value=$Project" --query 'TargetGroups[0].TargetGroupArn' --output text)
    Write-Host "[ok] target group creado: $tg"
}

$alb = Get-AlbArn
if ($alb) {
    Write-Host "[skip] $Prefix-alb ya existe: $alb"
} else {
    $alb = First (Invoke-Aws elbv2 create-load-balancer --name "$Prefix-alb" --scheme internet-facing --type application --ip-address-type ipv4 --subnets $pubA $pubB --security-groups $sgAlb --tags "Key=Name,Value=$Prefix-alb" "Key=Project,Value=$Project" --query 'LoadBalancers[0].LoadBalancerArn' --output text)
    Write-Host "[ok] ALB creado: $alb"
}
$null = Wait-Until -Label 'ALB active' -TimeoutSec 600 -IntervalSec 15 -Check {
    (First (Invoke-Aws elbv2 describe-load-balancers --load-balancer-arns $alb --query 'LoadBalancers[0].State.Code' --output text)) -eq 'active'
}

$ports = Try-Aws elbv2 describe-listeners --load-balancer-arn $alb --query 'Listeners[].Port' --output text
if ($ports -and (($ports -split '\s+') -contains '80')) {
    Write-Host '[skip] listener :80 ya existe'
} else {
    Invoke-Aws elbv2 create-listener --load-balancer-arn $alb --protocol HTTP --port 80 --default-actions "Type=forward,TargetGroupArn=$tg" | Out-Null
    Write-Host '[ok] listener :80 -> target group del backend'
}

$dns = Get-AlbDns
Write-Host "ALB_LISTO http://$dns"