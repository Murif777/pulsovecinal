# 08-tags-budgets.ps1 - Etiquetado por capa y control de gasto.
# Etiquetas: Name, Project, Capa, Ambiente, Responsable, Expiracion.
# Presupuesto y alarma se intentan; si el laboratorio los deniega se reporta
# como deuda y el script continua (no bloquea el despliegue).
param(
    [string]$Profile = 'mi-perfil',
    [string]$Region  = 'us-east-1',
    [string]$Prefix  = 'pv',
    [string]$Project = 'pulsovecinal',
    [string]$Responsable = 'equipo-pulsovecinal',
    [string]$Expira  = '',
    [double]$BudgetUsd = 130,
    [string]$EmailAlerta = ''
)
. "$PSScriptRoot\00-vars.ps1"

$common = @("Key=Project,Value=$Project", 'Key=Ambiente,Value=produccion', "Key=Responsable,Value=$Responsable", "Key=Expiracion,Value=$Expira")
$vpc = Get-VpcId
if (-not $vpc) { throw 'No hay VPC. Ejecuta 01-network.ps1' }

$subnets = (First (Invoke-Aws ec2 describe-subnets --filters "Name=vpc-id,Values=$vpc" --query 'Subnets[].SubnetId' --output text)) -split '\s+' | Where-Object { $_ -and $_ -ne 'None' }
$sgs = (First (Invoke-Aws ec2 describe-security-groups --filters "Name=vpc-id,Values=$vpc" --query 'SecurityGroups[].GroupId' --output text)) -split '\s+' | Where-Object { $_ -and $_ -ne 'None' }

$ec2Targets = @($vpc) + $subnets + $sgs
$a = @('ec2','create-tags','--resources') + $ec2Targets + @('--tags') + $common
Try-Aws @a | Out-Null
Write-Host "[ok] etiquetas en VPC, $($subnets.Count) subredes y $($sgs.Count) grupos de seguridad"

$albArn = Get-AlbArn; $tgArn = Get-TgArn
if ($albArn) { Try-Aws elbv2 add-tags --resource-arns $albArn $tgArn --tags $common | Out-Null; Write-Host '[ok] etiquetas en ALB y target group' }

$rdsArn = First (Try-Aws rds describe-db-instances --db-instance-identifier $DbInstanceId --query 'DBInstances[0].DBInstanceArn' --output text)
if ($rdsArn) {
    Try-Aws rds add-tags-to-resource --resource-name $rdsArn --tags "Key=Name,Value=$DbInstanceId" $common | Out-Null
    Write-Host '[ok] etiquetas en RDS'
}

$bucket = "$Prefix-front-$(Get-AccountId)"
$bt = Join-Path $Gen 'bucket-tags.json'
Write-Lf $bt ('{"TagSet":[{"Key":"Name","Value":"' + $Prefix + '-front"},{"Key":"Project","Value":"' + $Project + '"},{"Key":"Capa","Value":"frontend"},{"Key":"Ambiente","Value":"produccion"},{"Key":"Responsable","Value":"' + $Responsable + '"},{"Key":"Expiracion","Value":"' + $Expira + '"}]}')
if (Try-Aws s3api put-bucket-tagging --bucket $bucket --tagging ('file://' + ((Resolve-Path $bt).Path -replace '\\','/')) -ne $null) { Write-Host '[ok] etiquetas en el bucket' }

# ------------------------------------------------------------------ presupuesto
$acct = Get-AccountId
$budget = Join-Path $Gen 'budget.json'
Write-Lf $budget ('{"BudgetName":"' + $Prefix + '-mensual-' + [int]$BudgetUsd + '","BudgetLimit":{"Amount":"' + $BudgetUsd + '","Unit":"USD"},"TimeUnit":"MONTHLY","BudgetType":"COST"}')
$subs = @()
foreach ($pct in @(50,75,100)) {
    $subs += @{ Notification = @{ NotificationType = 'ACTUAL'; ComparisonOperator = 'GREATER_THAN'; Threshold = $pct; ThresholdType = 'PERCENTAGE' }; Subscribers = @(@{ SubscriptionType = 'EMAIL'; Address = $EmailAlerta }) }
}
if ($EmailAlerta) {
    $nf = Join-Path $Gen 'budget-notifications.json'
    Write-Lf $nf (ConvertTo-Json -InputObject $subs -Depth 6 -Compress)
    $ok = Try-Aws budgets create-budget --account-id $acct --budget ('file://' + ((Resolve-Path $budget).Path -replace '\\','/')) --notifications-with-subscribers ('file://' + ((Resolve-Path $nf).Path -replace '\\','/'))
} else {
    $ok = Try-Aws budgets create-budget --account-id $acct --budget ('file://' + ((Resolve-Path $budget).Path -replace '\\','/'))
}
if ($ok -ne $null) { Write-Host "[ok] presupuesto de $BudgetUsd USD/mes" } else { Write-Host '[DEUDA] el laboratorio denego budgets: create-budget' }

# ---------------------------------------------------------------------- alarma
if ($albArn -and $tgArn) {
    $albDim = ($albArn -split 'loadbalancer/')[-1]
    $tgDim  = ($tgArn -split 'targetgroup/')[-1]
    $al = Try-Aws cloudwatch put-metric-alarm --alarm-name "$Prefix-alb-unhealthy" --alarm-description 'Destinos no sanos tras el balanceador' --namespace AWS/ApplicationELB --metric-name UnHealthyHostCount --dimensions "Name=LoadBalancer,Value=$albDim" "Name=TargetGroup,Value=$tgDim" --statistic Average --period 60 --evaluation-periods 3 --threshold 1 --comparison-operator GreaterThanOrEqualToThreshold --treat-missing-data notBreaching
    if ($al -ne $null) { Write-Host "[ok] alarma $Prefix-alb-unhealthy" } else { Write-Host '[DEUDA] el laboratorio denego cloudwatch: put-metric-alarm' }
}
Write-Host 'GOBIERNO_OK'