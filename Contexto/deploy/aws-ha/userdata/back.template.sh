#!/bin/bash
# userdata/back.template.sh - Arranque del backend. Tokens @@...@@ los reemplaza
# 05-launch-templates.ps1 antes de codificar el user-data.
# Autocorregible: verifica que las imagenes realmente ARRANQUEN y re-descarga si
# una capa llego corrupta (leccion aprendida: AMI capturada en caliente).
set -uo pipefail
exec > >(tee /var/log/pv-back.log) 2>&1
echo "PV_BACK_START $(date -u +%FT%TZ)"
DB_HOST="@@DB_HOST@@"
DB_PASS="@@DB_PASS@@"
DB_USER="@@DB_USER@@"
DB_NAME="@@DB_NAME@@"
JWT_SECRET="@@JWT@@"
CORS_ORIGINS="@@CORS@@"
SCHEMA_B64='@@SCHEMA@@'
SEED_B64='@@SEED@@'
systemctl enable --now docker

ensure_image() {
  img="$1"; probe="$2"
  if timeout 120 docker run --rm --entrypoint /bin/sh "$img" -c "$probe" >/dev/null 2>&1; then
    echo "[img] OK $img"
  else
    echo "[img] DEFECTUOSA $img -> re-descarga"
    docker rm -f pulso-api >/dev/null 2>&1 || true
    docker rmi -f "$img" >/dev/null 2>&1 || true
    docker pull "$img" || return 1
    timeout 120 docker run --rm --entrypoint /bin/sh "$img" -c "$probe" >/dev/null 2>&1 && echo "[img] REPARADA $img"
  fi
  return 0
}
ensure_image postgres:16-alpine 'test -s /usr/local/bin/docker-entrypoint.sh && test -x /usr/local/bin/postgres'
ensure_image miguecaramirez/pulsovecinal-backend:latest 'python -c "import app.main"'

for i in $(seq 1 60); do
  if docker run --rm -e PGPASSWORD="$DB_PASS" postgres:16-alpine pg_isready -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" >/dev/null 2>&1; then
    echo "[db] lista tras $i intentos"; break
  fi
  sleep 10
done

seed_ok=0
if docker run --rm -e PGPASSWORD="$DB_PASS" postgres:16-alpine psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -tAc "SELECT 1 FROM comunas LIMIT 1" 2>/dev/null | grep -q 1; then
  echo "[seed] ya aplicado"; seed_ok=1
else
  echo "[seed] aplicando 01-schema.sql"
  if echo "$SCHEMA_B64" | base64 -d | gunzip | docker run --rm -i -e PGPASSWORD="$DB_PASS" postgres:16-alpine psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1; then
    echo "[seed] aplicando 02-seed.sql"
    if echo "$SEED_B64" | base64 -d | gunzip | docker run --rm -i -e PGPASSWORD="$DB_PASS" postgres:16-alpine psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1; then
      seed_ok=1
    fi
  fi
fi
echo "[seed] seed_ok=$seed_ok"

docker rm -f pulso-api >/dev/null 2>&1 || true
docker run -d --name pulso-api --restart unless-stopped -p 8080:8000 \
  -e DATABASE_URL="postgresql+psycopg://${DB_USER}:${DB_PASS}@${DB_HOST}:5432/${DB_NAME}" \
  -e JWT_SECRET="$JWT_SECRET" \
  -e CORS_ORIGINS="$CORS_ORIGINS" \
  miguecaramirez/pulsovecinal-backend:latest
for i in $(seq 1 40); do curl -fsS http://127.0.0.1:8080/health >/dev/null 2>&1 && break; sleep 5; done
curl -s -o /dev/null -w "health=%{http_code}\n" http://127.0.0.1:8080/health
echo "PV_BACK_DONE $(date -u +%FT%TZ)"