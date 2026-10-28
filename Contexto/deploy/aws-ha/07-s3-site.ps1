# 07-s3-site.ps1 - Sitio estatico del SPA en S3 (CloudFront esta denegado en el
# laboratorio). Construye el frontend con VITE_API_BASE apuntando al ALB actual
# y publica en un bucket derivado del numero de cuenta.
param(
    [string]$Profile = 'mi-perfil',
    [string]$Region  = 'us-east-1',
    [string]$Prefix  = 'pv',
    [string]$Project = 'pulsovecinal',
    [string]$ApiBase = '',
    [switch]$Rebuild
)
. "$PSScriptRoot\00-vars.ps1"

$albDns = Get-AlbDns
if (-not $albDns) { throw 'No hay ALB. Ejecuta 04-alb-tg.ps1' }
if (-not $ApiBase) { $ApiBase = "http://$albDns" }
$bucket = "$Prefix-front-$(Get-AccountId)"
$site = "http://$bucket.s3-website-$Region.amazonaws.com"
Write-Host "  API=$ApiBase"
Write-Host "  sitio=$site"

# ---------------------------------------------------------------- build del SPA
$dist = Join-Path $RepoRoot 'dist\index.html'
if ($Rebuild -or -not (Test-Path $dist)) {
    Push-Location $RepoRoot
    try {
        Write-Host '[..] instalando dependencias y compilando el frontend'
        if (Test-Path 'package-lock.json') { npm ci } else { npm install }
        $env:VITE_API_BASE = $ApiBase
        npm run build
    } finally { Pop-Location }
} else {
    Write-Host '[skip] dist/ ya existe (usa -Rebuild para recompilar)'
}

# ---------------------------------------------------------------- bucket
$prevEap = $ErrorActionPreference; $ErrorActionPreference = 'Continue'
$null = & aws s3api head-bucket --bucket $bucket --profile $Profile --region $Region 2>&1
$missing = ($LASTEXITCODE -ne 0)
$ErrorActionPreference = $prevEap
if ($missing) {
    Invoke-Aws s3api create-bucket --bucket $bucket --region $Region | Out-Null
    Write-Host "[ok] bucket $bucket creado"
} else {
    Write-Host "[skip] bucket $bucket existe"
}
Invoke-Aws s3api put-public-access-block --bucket $bucket --public-access-block-configuration 'BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=false,RestrictPublicBuckets=false' | Out-Null
$enc = Join-Path $Gen 'bucket-encryption.json'
Write-Lf $enc '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"},"BucketKeyEnabled":true}]}'
Invoke-Aws s3api put-bucket-encryption --bucket $bucket --server-side-encryption-configuration ('file://' + ((Resolve-Path $enc).Path -replace '\\','/')) | Out-Null
$web = Join-Path $Gen 'bucket-website.json'
Write-Lf $web '{"IndexDocument":{"Suffix":"index.html"},"ErrorDocument":{"Key":"index.html"}}'
Invoke-Aws s3api put-bucket-website --bucket $bucket --website-configuration ('file://' + ((Resolve-Path $web).Path -replace '\\','/')) | Out-Null
$pol = Join-Path $Gen 'bucket-policy.json'
Write-Lf $pol ('{"Version":"2012-10-17","Statement":[{"Sid":"PublicReadGetObject","Effect":"Allow","Principal":"*","Action":"s3:GetObject","Resource":"arn:aws:s3:::' + $bucket + '/*"}]}')
Invoke-Aws s3api put-bucket-policy --bucket $bucket --policy ('file://' + ((Resolve-Path $pol).Path -replace '\\','/')) | Out-Null
Write-Host '  hosting (index+error), AES256 y lectura publica configurados'

Invoke-Aws s3 sync (Join-Path $RepoRoot 'dist') "s3://$bucket" --delete | Out-Null
Write-Host '[ok] dist/ publicado'

$r = Invoke-WebRequest $site -UseBasicParsing -TimeoutSec 20
Write-Host "  raiz=$($r.StatusCode) bytes=$($r.Content.Length)"
if ($r.StatusCode -ne 200 -or $r.Content -notmatch 'id="root"') { throw 'El sitio no sirve index.html' }
Write-Host "SITIO_LISTO $site"