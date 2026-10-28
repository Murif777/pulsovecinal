# 01-network.ps1 - VPC, IGW, tablas de rutas, 7 subredes en 2 AZ y NAT unico.
# Idempotente: describe-first, imprime [skip] en lo que ya existe.
param(
    [string]$Profile = 'mi-perfil',
    [string]$Region  = 'us-east-1',
    [string]$Prefix  = 'pv',
    [string]$Project = 'pulsovecinal'
)
. "$PSScriptRoot\00-vars.ps1"

$vpc = Get-VpcId
if ($vpc) {
    Write-Host "[skip] VPC $Prefix-vpc ya existe: $vpc"
} else {
    $vpc = First (Invoke-Aws ec2 create-vpc --cidr-block 10.0.0.0/16 --tag-specifications "ResourceType=vpc,Tags=[{Key=Name,Value=$Prefix-vpc},{Key=Project,Value=$Project}]" --query 'Vpc.VpcId' --output text)
    Write-Host "[ok] VPC $vpc creada"
}
Invoke-Aws ec2 modify-vpc-attribute --vpc-id $vpc --enable-dns-hostnames | Out-Null
Invoke-Aws ec2 modify-vpc-attribute --vpc-id $vpc --enable-dns-support | Out-Null

$azs = (First (Invoke-Aws ec2 describe-availability-zones --filters 'Name=state,Values=available' --query 'AvailabilityZones[].ZoneName' --output text)) -split '\s+'
$azA = $azs[0]; $azB = $azs[1]
if (-not $azB) { throw 'Se necesitan al menos dos zonas de disponibilidad' }
Write-Host "  zonas: $azA / $azB"

$igw = First (Try-Aws ec2 describe-internet-gateways --filters "Name=attachment.vpc-id,Values=$vpc" --query 'InternetGateways[0].InternetGatewayId' --output text)
if ($igw) {
    Write-Host "[skip] IGW $igw ya existe"
} else {
    $igw = First (Invoke-Aws ec2 create-internet-gateway --tag-specifications "ResourceType=internet-gateway,Tags=[{Key=Name,Value=$Prefix-igw},{Key=Project,Value=$Project}]" --query 'InternetGateway.InternetGatewayId' --output text)
    Invoke-Aws ec2 attach-internet-gateway --internet-gateway-id $igw --vpc-id $vpc | Out-Null
    Write-Host "[ok] IGW $igw creado y asociado"
}

function Ensure-Rt([string]$Name) {
    $id = First (Try-Aws ec2 describe-route-tables --filters "Name=vpc-id,Values=$vpc" "Name=tag:Name,Values=$Name" --query 'RouteTables[0].RouteTableId' --output text)
    if ($id) { Write-Host "[skip] tabla $Name existe: $id"; return $id }
    $id = First (Invoke-Aws ec2 create-route-table --vpc-id $vpc --tag-specifications "ResourceType=route-table,Tags=[{Key=Name,Value=$Name},{Key=Project,Value=$Project}]" --query 'RouteTable.RouteTableId' --output text)
    Write-Host "[ok] tabla $Name creada: $id"
    return $id
}
$rtPub  = Ensure-Rt "$Prefix-rt-public"
$rtPriv = Ensure-Rt "$Prefix-rt-private"
Try-Aws ec2 create-route --route-table-id $rtPub --destination-cidr-block 0.0.0.0/0 --gateway-id $igw | Out-Null

function Ensure-Subnet([string]$Cidr, [string]$Az, [bool]$Public, [string]$Suffix, [string]$Rt) {
    $name = "$Prefix-$Suffix"
    $id = Get-SubnetId $Suffix
    if ($id) {
        Write-Host "[skip] subred $name existe: $id"
    } else {
        $id = First (Invoke-Aws ec2 create-subnet --vpc-id $vpc --cidr-block $Cidr --availability-zone $Az --tag-specifications "ResourceType=subnet,Tags=[{Key=Name,Value=$name},{Key=Project,Value=$Project}]" --query 'Subnet.SubnetId' --output text)
        Write-Host "[ok] subred $name ($Cidr, $Az) creada: $id"
    }
    if ($Public) { Invoke-Aws ec2 modify-subnet-attribute --subnet-id $id --map-public-ip-on-launch | Out-Null }
    Try-Aws ec2 associate-route-table --route-table-id $Rt --subnet-id $id | Out-Null
    return $id
}

# Tabla 9 del diseno: publicas y NAT en un bloque, aplicacion y datos en otro.
$null = Ensure-Subnet '10.0.0.0/24' $azA $true  'public-a'   $rtPub
$null = Ensure-Subnet '10.0.1.0/24' $azA $true  'public-nat' $rtPub
$null = Ensure-Subnet '10.0.4.0/24' $azB $true  'public-b'   $rtPub
$null = Ensure-Subnet '10.0.5.0/24' $azA $false 'app-a'      $rtPriv
$null = Ensure-Subnet '10.0.2.0/24' $azB $false 'app-b'      $rtPriv
$null = Ensure-Subnet '10.0.6.0/24' $azA $false 'db-a'       $rtPriv
$null = Ensure-Subnet '10.0.3.0/24' $azB $false 'db-b'       $rtPriv

$natS = Get-SubnetId 'public-nat'
$nat = First (Try-Aws ec2 describe-nat-gateways --filter "Name=vpc-id,Values=$vpc" "Name=state,Values=available,pending" --query 'NatGateways[0].NatGatewayId' --output text)
if ($nat) {
    Write-Host "[skip] NAT $nat ya existe"
} else {
    $eip = First (Try-Aws ec2 describe-addresses --filters "Name=tag:Name,Values=$Prefix-nat-eip" 'Name=domain,Values=vpc' --query 'Addresses[0].AllocationId' --output text)
    if (-not $eip) {
        $eip = First (Invoke-Aws ec2 allocate-address --domain vpc --tag-specifications "ResourceType=elastic-ip,Tags=[{Key=Name,Value=$Prefix-nat-eip},{Key=Project,Value=$Project}]" --query 'AllocationId' --output text)
        Save-State 'EipAlloc' $eip
    }
    $nat = First (Invoke-Aws ec2 create-nat-gateway --subnet-id $natS --allocation-id $eip --connectivity-type public --tag-specifications "ResourceType=natgateway,Tags=[{Key=Name,Value=$Prefix-nat},{Key=Project,Value=$Project}]" --query 'NatGateway.NatGatewayId' --output text)
    Write-Host "[ok] NAT $nat creado (1 NAT: decision de costo, ver README)"
    $null = Wait-Until -Label 'NAT disponible' -TimeoutSec 900 -IntervalSec 20 -Check {
        (First (Invoke-Aws ec2 describe-nat-gateways --nat-gateway-ids $nat --query 'NatGateways[0].State' --output text)) -eq 'available'
    }
}
Try-Aws ec2 create-route --route-table-id $rtPriv --destination-cidr-block 0.0.0.0/0 --nat-gateway-id $nat | Out-Null

# Correccion de la deuda de v1: una ruta blackhole en la tabla privada hacia un NAT
# borrado descarta el trafico en silencio. Aqui se verifica el estado de la ruta.
$routeState = First (Invoke-Aws ec2 describe-route-tables --route-table-ids $rtPriv --query 'RouteTables[0].Routes[?DestinationCidrBlock==`0.0.0.0/0`].State' --output text)
Write-Host "  ruta privada 0.0.0.0/0 estado=$routeState"
if ($routeState -ne 'active') { throw "La ruta por defecto privada no esta activa ($routeState)" }

Write-Host 'RED_LISTA'
Write-Host "VPC=$vpc RT_PUB=$rtPub RT_PRIV=$rtPriv NAT=$nat"