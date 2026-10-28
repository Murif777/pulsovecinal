# 10-teardown.ps1 - Borrado en orden inverso al de construccion.
# Solo toca recursos del prefijo indicado dentro de la VPC del stack. Nunca borra
# la VPC por defecto. Requiere -Confirmar para ejecutar.
param(
    [string]$Profile = 'mi-perfil',
    [string]$Region  = 'us-east-1',
    [string]$Prefix  = 'pv',
    [string]$Project = 'pulsovecinal',
    [switch]$Confirmar
)
. "$PSScriptRoot\00-vars.ps1"

if (-not $Confirmar) {
    Write-Host 'Uso: .\10-teardown.ps1 -Profile <perfil> -Region <region> -Confirmar'
    Write-Host 'Borra ASG, plantillas, ALB/TG, instancias, RDS, NAT, AMI, SGs, subredes, VPC y bucket.'
    return
}

$vpc = Get-VpcId
if (-not $vpc) { throw "No hay VPC $Prefix-vpc: no hay nada que borrar con este prefijo." }
$defaultVpc = First (Invoke-Aws ec2 describe-vpcs --filters 'Name=is-default,Values=true' --query 'Vpcs[0].VpcId' --output text)
if ($vpc -eq $defaultVpc) { throw 'La VPC del stack es la VPC por defecto: se aborta por seguridad.' }
Write-Host "Borrando el stack dentro de $vpc (perfil $Profile, region $Region)"

# 1) autoescalado
foreach ($asg in @("$Prefix-asg-back", "$Prefix-asg-front")) {
    $have = First (Try-Aws autoscaling describe-auto-scaling-groups --auto-scaling-group-names $asg --query 'AutoScalingGroups[0].AutoScalingGroupName' --output text)
    if ($have) {
        Try-Aws autoscaling resume-processes --auto-scaling-group-name $asg --scaling-processes Launch ReplaceUnhealthy | Out-Null
        Try-Aws autoscaling update-auto-scaling-group --auto-scaling-group-name $asg --min-size 0 --desired-capacity 0 | Out-Null
        Invoke-Aws autoscaling delete-auto-scaling-group --auto-scaling-group-name $asg --force-delete | Out-Null
        Write-Host "[ok] ASG $asg borrado"
    }
}
foreach ($lt in @("$Prefix-lt-back", "$Prefix-lt-front")) {
    Try-Aws ec2 delete-launch-template --launch-template-name $lt | Out-Null
    Write-Host "[ok] plantilla $lt borrada"
}

# 2) balanceo
$alb = Get-AlbArn
if ($alb) {
    Invoke-Aws elbv2 delete-load-balancer --load-balancer-arn $alb | Out-Null
    $null = Wait-Until -Label 'ALB borrado' -TimeoutSec 600 -IntervalSec 15 -Check {
        -not (Get-AlbArn)
    }
    Write-Host '[ok] ALB borrado'
}
$tg = Get-TgArn
if ($tg) { Try-Aws elbv2 delete-target-group --target-group-arn $tg | Out-Null; Write-Host '[ok] target group borrado' }

# 3) instancias
$ids = (First (Invoke-Aws ec2 describe-instances --filters "Name=vpc-id,Values=$vpc" 'Name=instance-state-name,Values=pending,running,stopping,stopped' --query 'Reservations[].Instances[].InstanceId' --output text)) -split '\s+' | Where-Object { $_ -and $_ -ne 'None' }
if ($ids) {
    Invoke-Aws ec2 terminate-instances --instance-ids @ids | Out-Null
    $null = Wait-Until -Label 'instancias terminadas' -TimeoutSec 600 -IntervalSec 15 -Check {
        $n = First (Invoke-Aws ec2 describe-instances --filters "Name=vpc-id,Values=$vpc" 'Name=instance-state-name,Values=pending,running,stopping,stopped' --query 'length(Reservations[].Instances[])' --output text)
        $n -eq '0'
    }
    Write-Host "[ok] $($ids.Count) instancias terminadas"
}

# 4) base de datos
$rdsVpc = First (Try-Aws rds describe-db-instances --db-instance-identifier $DbInstanceId --query 'DBInstances[0].DBSubnetGroup.VpcId' --output text)
if ($rdsVpc -eq $vpc) {
    Try-Aws rds delete-db-instance --db-instance-identifier $DbInstanceId --skip-final-snapshot | Out-Null
    $null = Wait-Until -Label 'RDS borrado' -TimeoutSec 1800 -IntervalSec 45 -Check {
        -not (First (Try-Aws rds describe-db-instances --db-instance-identifier $DbInstanceId --query 'DBInstances[0].DBInstanceIdentifier' --output text))
    }
    Try-Aws rds delete-db-subnet-group --db-subnet-group-name "$Prefix-db-subnets" | Out-Null
    Write-Host '[ok] RDS y grupo de subredes borrados'
}

# 5) red de salida
$nats = (First (Invoke-Aws ec2 describe-nat-gateways --filter "Name=vpc-id,Values=$vpc" 'Name=state,Values=available,pending' --query 'NatGateways[].NatGatewayId' --output text)) -split '\s+' | Where-Object { $_ -and $_ -ne 'None' }
foreach ($nat in $nats) {
    $eip = First (Invoke-Aws ec2 describe-nat-gateways --nat-gateway-ids $nat --query 'NatGateways[0].NatGatewayAddresses[0].AllocationId' --output text)
    Invoke-Aws ec2 delete-nat-gateway --nat-gateway-id $nat | Out-Null
    $null = Wait-Until -Label 'NAT borrado' -TimeoutSec 600 -IntervalSec 20 -Check {
        (First (Invoke-Aws ec2 describe-nat-gateways --nat-gateway-ids $nat --query 'NatGateways[0].State' --output text)) -eq 'deleted'
    }
    if ($eip) { Try-Aws ec2 release-address --allocation-id $eip | Out-Null }
    Write-Host "[ok] NAT $nat y su EIP liberados"
}

# 6) AMI doradas del proyecto
$images = (First (Invoke-Aws ec2 describe-images --owners self --filters "Name=tag:Project,Values=$Project" "Name=name,Values=$Prefix-golden*" --query 'Images[].ImageId' --output text)) -split '\s+' | Where-Object { $_ -and $_ -ne 'None' }
foreach ($img in $images) {
    $snaps = (First (Invoke-Aws ec2 describe-images --image-ids $img --query 'Images[0].BlockDeviceMappings[].Ebs.SnapshotId' --output text)) -split '\s+' | Where-Object { $_ -and $_ -ne 'None' }
    Try-Aws ec2 deregister-image --image-id $img | Out-Null
    foreach ($snap in $snaps) { Try-Aws ec2 delete-snapshot --snapshot-id $snap | Out-Null }
    Write-Host "[ok] AMI $img y sus snapshots borrados"
}

# 7) grupos de seguridad
foreach ($suffix in @('bake','front','back','db','alb')) {
    $sg = Get-SgId $suffix
    if ($sg) {
        for ($i = 0; $i -lt 6; $i++) {
            if ((Try-Aws ec2 delete-security-group --group-id $sg) -ne $null) { break }
            Start-Sleep -Seconds 10
        }
        Write-Host "[ok] SG $Prefix-sg-$suffix borrado"
    }
}

# 8) subredes, tablas de rutas, IGW y VPC
$subs = (First (Invoke-Aws ec2 describe-subnets --filters "Name=vpc-id,Values=$vpc" --query 'Subnets[].SubnetId' --output text)) -split '\s+' | Where-Object { $_ -and $_ -ne 'None' }
foreach ($sn in $subs) { Try-Aws ec2 delete-subnet --subnet-id $sn | Out-Null }
$rts = Invoke-Aws ec2 describe-route-tables --filters "Name=vpc-id,Values=$vpc" --query 'RouteTables[?Associations[?Main==`true`]==`[]`].RouteTableId' --output text
foreach ($rt in (($rts -split '\s+') | Where-Object { $_ -and $_ -ne 'None' })) { Try-Aws ec2 delete-route-table --route-table-id $rt | Out-Null }
$igw = First (Invoke-Aws ec2 describe-internet-gateways --filters "Name=attachment.vpc-id,Values=$vpc" --query 'InternetGateways[0].InternetGatewayId' --output text)
if ($igw) {
    Try-Aws ec2 detach-internet-gateway --internet-gateway-id $igw --vpc-id $vpc | Out-Null
    Try-Aws ec2 delete-internet-gateway --internet-gateway-id $igw | Out-Null
}
Invoke-Aws ec2 delete-vpc --vpc-id $vpc | Out-Null
Write-Host "[ok] VPC $vpc borrada"

# 9) sitio y gobierno
$bucket = "$Prefix-front-$(Get-AccountId)"
if ((Try-Aws s3api head-bucket --bucket $bucket) -ne $null) {
    Try-Aws s3 rm "s3://$bucket" --recursive | Out-Null
    Try-Aws s3api delete-bucket --bucket $bucket | Out-Null
    Write-Host "[ok] bucket $bucket borrado"
}
Try-Aws budgets delete-budget --account-id (Get-AccountId) --budget-name "$Prefix-mensual-130" | Out-Null
Try-Aws cloudwatch delete-alarms --alarm-names "$Prefix-alb-unhealthy" | Out-Null
Write-Host 'TEARDOWN_OK'