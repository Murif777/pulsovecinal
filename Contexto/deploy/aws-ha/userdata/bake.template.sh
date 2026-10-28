#!/bin/bash
# userdata/bake.template.sh - Horneado de la AMI dorada.
# Verifica FUNCIONALMENTE cada imagen: si un contenedor no arranca, el horneado
# falla y no se publica una AMI rota.
set -euo pipefail
exec > >(tee /var/log/pv-bake.log) 2>&1
echo PV_BAKE_START
dnf install -y docker
systemctl enable --now docker
docker pull miguecaramirez/pulsovecinal:latest
docker pull miguecaramirez/pulsovecinal-backend:latest
docker pull postgres:16-alpine
echo "[bake] verificando postgres"
docker run --rm postgres:16-alpine postgres --version
echo "[bake] verificando backend (import real de la app)"
docker run --rm --entrypoint python miguecaramirez/pulsovecinal-backend:latest -c "import app.main; print('IMPORT_OK')"
echo "[bake] verificando front"
docker run --rm --entrypoint /bin/sh miguecaramirez/pulsovecinal:latest -c "test -f /usr/share/nginx/html/index.html && echo FRONT_OK"
docker images
echo PV_BAKE_DONE