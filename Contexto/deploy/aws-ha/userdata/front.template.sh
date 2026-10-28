#!/bin/bash
# userdata/front.template.sh - nginx que sirve el SPA y proxya /api al ALB.
# Solo se usa si el plan de reversion enciende el ASG de presentacion; en
# operacion normal el sitio estatico lo sirve S3.
set -uo pipefail
exec > >(tee /var/log/pv-front.log) 2>&1
BACK_HOST="@@ALB@@"
systemctl enable --now docker
mkdir -p /opt/pulso
cat > /opt/pulso/default.conf <<'PVEOF'
server {
  listen 80;
  server_name _;
  root /usr/share/nginx/html;
  index index.html;
  location /api/ {
    proxy_pass http://BACK_HOST/api/;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  }
  location / { try_files $uri $uri/ /index.html; }
}
PVEOF
docker rm -f pulso-web >/dev/null 2>&1 || true
docker run -d --name pulso-web --restart unless-stopped -p 80:80 \
  -v /opt/pulso/default.conf:/etc/nginx/conf.d/default.conf:ro \
  miguecaramirez/pulsovecinal:latest
for i in $(seq 1 30); do curl -fsS http://127.0.0.1/ >/dev/null 2>&1 && break; sleep 5; done
curl -s -o /dev/null -w "front=%{http_code}\n" http://127.0.0.1/