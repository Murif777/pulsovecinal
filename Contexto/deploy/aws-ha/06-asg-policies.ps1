# 06-asg-policies.ps1 - Las dos politicas de escalado del backend, con
# ResourceLabel resuelto en tiempo de ejecucion (nunca escrito a mano).
#   pv-back-req : peticiones por destino en el ALB = 1000 (valor de operacion)
#   pv-back-cpu : CPU media del grupo = 65 %
# La deuda de v1 fue dejar etiquetas que apuntaban a un ALB ya borrado: por eso
# aqui se leen los identificadores reales, se construye la etiqueta y se verifica
# leyendo la politica recien escrita.
param(
    [string]$Profile = 'mi-perfil',
    [string]$Region  = 'us-east-1',
    [string]$Prefix  = 'pv',
    [string]$Project = 'pulsovecinal',
    [double]$RequestsPerTarget = 1000,
    [double]$CpuPercent = 65
)
. "$PSScriptRoot\00-vars.ps1"

$asg = "$Prefix-asg-back"
$have = First (Try-Aws autoscaling describe-auto-scaling-groups --auto-scaling-group-names $asg --query 'AutoScalingGroups[0].AutoScalingGroupName' --output text)
if (-not $have) { throw "No existe $asg. Ejecuta 05-launch-templates.ps1" }
$albArn = Get-AlbArn; $tgArn = Get-TgArn
if (-not $albArn -or -not $tgArn) { throw 'Faltan ALB o target group. Ejecuta 04-alb-tg.ps1' }

# app/<nombre>/<id>/targetgroup/<nombre>/<id>
$albPart = ($albArn -split 'loadbalancer/')[-1]
$tgPart  = ($tgArn -split 'targetgroup/')[-1]
$label   = "$albPart/targetgroup/$tgPart"
Write-Host "  ResourceLabel resuelto: $label"

$reqFile = Join-Path $Gen 'policy-req.json'
Write-Lf $reqFile (@{ TargetValue = $RequestsPerTarget; PredefinedMetricSpecification = @{ PredefinedMetricType = 'ALBRequestCountPerTarget'; ResourceLabel = $label } } | ConvertTo-Json -Compress)
$cpuFile = Join-Path $Gen 'policy-cpu.json'
Write-Lf $cpuFile (@{ TargetValue = $CpuPercent; PredefinedMetricSpecification = @{ PredefinedMetricType = 'ASGAverageCPUUtilization' } } | ConvertTo-Json -Compress)
Invoke-Aws autoscaling put-scaling-policy --auto-scaling-group-name $asg --policy-name "$Prefix-back-req" --policy-type TargetTrackingScaling --target-tracking-configuration ('file://' + ((Resolve-Path $reqFile).Path -replace '\\','/')) | Out-Null
Invoke-Aws autoscaling put-scaling-policy --auto-scaling-group-name $asg --policy-name "$Prefix-back-cpu" --policy-type TargetTrackingScaling --target-tracking-configuration ('file://' + ((Resolve-Path $cpuFile).Path -replace '\\','/')) | Out-Null
Write-Host "[ok] $Prefix-back-req ($RequestsPerTarget peticiones/destino) y $Prefix-back-cpu ($CpuPercent %)"

# Verificacion: la etiqueta leida debe coincidir con los identificadores reales.
$read = First (Invoke-Aws autoscaling describe-policies --auto-scaling-group-name $asg --policy-names "$Prefix-back-req" --query 'ScalingPolicies[0].TargetTrackingConfiguration.PredefinedMetricSpecification.ResourceLabel' --output text)
Write-Host "  etiqueta leida: $read"
if ($read -ne $label) { throw "La etiqueta de la politica no coincide con el ALB/TG actuales ($read != $label)" }
Invoke-Aws autoscaling describe-policies --auto-scaling-group-name $asg --query 'ScalingPolicies[].[PolicyName,TargetTrackingConfiguration.PredefinedMetricSpecification.PredefinedMetricType,TargetTrackingConfiguration.TargetValue]' --output text
Write-Host 'POLITICAS_OK'