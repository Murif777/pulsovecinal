# 09-verify.ps1 - Verificacion funcional de punta a punta. No crea infraestructura.
# Todo se descubre en tiempo de ejecucion: DNS del ALB, origen del sitio, etc.
param(
    [string]$Profile = 'mi-perfil',
    [string]$Region  = 'us-east-1',
    [string]$Prefix  = 'pv',
    [string]$Usuario = 'analista',
    [string]$Contrasena = 'pulso2026',
    [switch]$SkipWrite
)
. "$PSScriptRoot\00-vars.ps1"

$albDns = Get-AlbDns; $tgArn = Get-TgArn
if (-not $albDns) { throw 'No hay ALB. Ejecuta 04-alb-tg.ps1' }
$api = "http://$albDns"
$site = Get-SiteOrigin
$fail = @()

Write-Host '1) destinos sanos en el target group'
# Ojo: no usar First aqui, la salida es multilinea (una fila por destino).
$s = Invoke-Aws elbv2 describe-target-health --target-group-arn $tgArn --query 'TargetHealthDescriptions[].[Target.Id,TargetHealth.State]' --output text
$healthy = ([regex]::Matches($s, '(?m)^\S+\s+healthy')).Count
Write-Host "   sanos=$healthy"
if ($healthy -lt 2) { $fail += "sanos=$healthy" }

Write-Host '2) GET /api/barrios'
$j = (Invoke-WebRequest "$api/api/barrios" -UseBasicParsing -TimeoutSec 20).Content | ConvertFrom-Json
Write-Host "   barrios=$($j.Count)"
if ($j.Count -ne 15) { $fail += "barrios=$($j.Count)" }

Write-Host '3) login y perfil'
$login = Invoke-RestMethod -Uri "$api/api/auth/login" -Method Post -Body (@{ usuario = $Usuario; contrasena = $Contrasena } | ConvertTo-Json -Compress) -ContentType 'application/json' -TimeoutSec 25
$hdr = @{ Authorization = "Bearer $($login.token)" }
$me = Invoke-RestMethod -Uri "$api/api/auth/me" -Headers $hdr -TimeoutSec 20
Write-Host "   token len=$($login.token.Length) usuario=$($me.usuario)"
$neg = 0
try { Invoke-RestMethod -Uri "$api/api/auth/me" -TimeoutSec 20 | Out-Null } catch { $neg = [int]$_.Exception.Response.StatusCode }
Write-Host "   401 sin token=$neg"
if ($neg -ne 401) { $fail += "negativo=$neg" }

Write-Host '4) CORS con el origen exacto del sitio'
$pre = Invoke-WebRequest -Uri "$api/api/encuestas" -Method Options -Headers @{ Origin = $site; 'Access-Control-Request-Method' = 'POST'; 'Access-Control-Request-Headers' = 'content-type,authorization' } -UseBasicParsing -TimeoutSec 20
$acao = $pre.Headers['Access-Control-Allow-Origin']
Write-Host "   preflight=$($pre.StatusCode) ACAO=$acao"
if ($acao -ne $site) { $fail += "ACAO=$acao" }

if (-not $SkipWrite) {
    Write-Host '5) escritura y relectura'
    $marker = "verificacion-$((Get-Date).ToString('yyyyMMdd-HHmmss'))"
    $body = @{ barrio = 'La Esperanza'; category = 'vias'; severity = 'media'; description = $marker } | ConvertTo-Json -Compress
    $created = Invoke-RestMethod -Uri "$api/api/encuestas" -Method Post -Headers $hdr -Body $body -ContentType 'application/json' -TimeoutSec 25
    $list = Invoke-RestMethod -Uri "$api/api/encuestas" -Headers $hdr -TimeoutSec 25
    $found = @($list | Where-Object { $_.description -eq $marker }).Count
    Write-Host "   id=$($created.id) encontrada=$found"
    if ($found -ne 1) { $fail += 'no se releyo la encuesta' }
}

Write-Host '6) sitio estatico'
$r = Invoke-WebRequest $site -UseBasicParsing -TimeoutSec 20
Write-Host "   raiz=$($r.StatusCode)"
if ($r.StatusCode -ne 200) { $fail += "sitio=$($r.StatusCode)" }

if ($fail.Count -gt 0) { throw ('Fallos: ' + ($fail -join ' | ')) }
Write-Host 'VERIFICACION_OK'