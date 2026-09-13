# PulsoVecinal — Capa de Datos (PostgreSQL + PostGIS)

La capa de datos de PulsoVecinal: un contenedor **PostgreSQL 16 + PostGIS 3.4**
que persiste las respuestas de encuestas, el catálogo territorial de Valledupar
(comunas + barrios con geometría) y los usuarios del dashboard. Es la **fuente
de verdad** de la arquitectura de 3 capas: reemplaza a `localStorage` como
almacén de datos (el frontend solo conserva el token JWT de sesión).

## Estructura

```
db/
├── Dockerfile                 ← imagen propia (PostGIS + schema + seed)
├── .dockerignore
├── init/
│   ├── 01-schema.sql          ← extensión PostGIS + tipos ENUM + 4 tablas + índices
│   └── 02-seed.sql            ← 6 comunas + 15 barrios (geom) + 20 respuestas + 1 usuario
├── checks/
│   └── verify.sql             ← consultas de verificación (tablas, conteos, PostGIS, geo-query)
├── README.md                  ← este archivo
└── .env.example               ← plantilla de variables de entorno (sin secretos reales)
```

## Levantar la base de datos

Requisito: **Docker Desktop** (motor en marcha).

**Paso 1 — configura tu entorno** (una sola vez): copia la plantilla a la raíz
del repo y asigna una contraseña local:

```bash
# Windows (PowerShell)
Copy-Item db\.env.example .env
# Git Bash / Linux / macOS
cp db/.env.example .env
```

Edita `.env` y dale un valor a `POSTGRES_PASSWORD` (la que quieras; es local).
El archivo `.env` **no se versiona** — las credenciales nunca entran al repo.

**Paso 2 — levanta el servicio:**

```bash
docker compose up -d --build db   # construye pulsovecinal-db:local y la levanta
docker compose ps                 # → db debe quedar "healthy"
```

Compose ya no monta `db/init`: esos SQL van **dentro de la imagen**. En el
primer arranque (volumen vacío) PostgreSQL ejecuta `/docker-entrypoint-initdb.d/`
(schema + seed). El resultado: 4 tablas (`comunas`, `barrios`,
`survey_responses`, `usuarios`), PostGIS activo y el seed de Valledupar.

> ⚠️ **Los scripts de init solo corren con el volumen vacío.** Si cambias el
> esquema o el seed, reconstruye la imagen y resetea el volumen (ver
> [Resetear](#resetear-la-base-de-datos)).

## Publicar la imagen en Docker Hub

Tras mergear a `main`, GitHub Actions construye y sube
`miguecaramirez/pulsovecinal-db` (`latest` y el SHA) con los mismos secrets
que el front (`DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN`).

A mano, con Docker Desktop abierto y `docker login` hecho:

```powershell
cd C:\Users\great\Desktop\pulsovecinal
docker build -t miguecaramirez/pulsovecinal-db:latest ./db
docker push miguecaramirez/pulsovecinal-db:latest
```

Quien no tenga el repo puede bajarla (la contraseña sigue yendo por entorno;
nunca va en la imagen):

```powershell
docker pull miguecaramirez/pulsovecinal-db:latest
docker run --rm -d --name pulso-db -e POSTGRES_USER=pulso -e POSTGRES_PASSWORD=TU_PASSWORD -e POSTGRES_DB=pulsovecinal -p 5433:5432 miguecaramirez/pulsovecinal-db:latest
```

## Conectar

El puerto **5433** del host apunta al 5432 interno del contenedor (para no
chocar con un PostgreSQL local en 5432).

### psql

```bash
docker compose exec db psql -U pulso -d pulsovecinal
```

### DBeaver (u otro cliente)

| Campo | Valor |
|---|---|
| Host | `localhost` |
| Puerto | `5433` |
| Base de datos | `pulsovecinal` |
| Usuario | `pulso` |
| Contraseña | la que definiste en tu `.env` (`POSTGRES_PASSWORD`) |

### DSN para el backend (contrato de conexión)

```
postgresql+psycopg://pulso:${POSTGRES_PASSWORD}@db:5432/pulsovecinal
```

Dentro de la red de compose el hostname es `db` (no `localhost`) y el puerto
interno es `5432`. Variables equivalentes: `POSTGRES_USER`, `POSTGRES_PASSWORD`,
`POSTGRES_DB`, `POSTGRES_HOST=db`.

## Verificar

Script de verificación completo (falla con exit code ≠ 0 si algo no cumple):

```bash
docker compose up -d db
Get-Content db/checks/verify.sql | docker compose exec -T db psql -U pulso -d pulsovecinal
```

Comprueba: PostGIS instalado · las 4 tablas · conteos del seed (6 comunas /
15 barrios / 20 respuestas / 1 usuario) · `barrios.geom` con SRID 4326 e índice
GIST · que toda respuesta tenga barrio con coordenadas · el usuario `analista`
· y una consulta geoespacial demostrativa (barrios a menos de 3 km del centro
de Valledupar con `ST_DWithin` sobre `geography`).

Consultas manuales útiles:

```bash
docker compose exec db psql -U pulso -d pulsovecinal -c "\dt"
docker compose exec db psql -U pulso -d pulsovecinal -c "SELECT PostGIS_Version();"
docker compose exec db psql -U pulso -d pulsovecinal -c "SELECT count(*) FROM barrios;"
docker compose exec db psql -U pulso -d pulsovecinal -c "SELECT nombre, ST_AsText(geom) FROM barrios ORDER BY nombre LIMIT 3;"
```

## Resetear la base de datos

> ⚠️ **ADVERTENCIA: `-v` destruye TODOS los datos** (volumen `pgdata`). Solo
> para desarrollo.

```bash
docker compose down -v              # borra el contenedor Y el volumen
docker compose up -d --build db     # reconstruye la imagen y vuelve a sembrar
```

Sin `-v`, `docker compose down` + `up` conserva los datos (el volumen persiste).

## Troubleshooting

| Problema | Solución |
|---|---|
| `docker compose up` falla con "Falta POSTGRES_PASSWORD…" | No existe `.env` en la raíz: créalo desde la plantilla (`Copy-Item db\.env.example .env`) y asigna un valor a `POSTGRES_PASSWORD`. |
| `docker compose up -d db` no queda `healthy` | Revisa los logs: `docker compose logs db`. El healthcheck usa `pg_isready -U pulso -d pulsovecinal`. |
| Los cambios en `db/init/*.sql` no se aplican | Hay que **reconstruir** la imagen (`docker compose build db`) y, si el volumen ya existía, resetear con `docker compose down -v` (¡pierde datos!). |
| Puerto 5433 ocupado en el host | Cambia `DB_PORT` en tu `.env` (raíz del repo) o define la variable de entorno `DB_PORT`. |
| El backend no conecta | Verifica que use el DSN con hostname `db` (red interna de compose) y `depends_on: db (condition: service_healthy)`. |
| Acentos raros en los datos | Los `.sql` deben estar en UTF-8 sin BOM; la imagen ya usa `client_encoding=UTF8`. |

## Credenciales

**Ninguna credencial se versiona en este repositorio.** La contraseña de
PostgreSQL se define en el archivo `.env` de la raíz (no versionado; el
compose la exige con `${POSTGRES_PASSWORD:?…}`). `db/.env.example` es solo la
plantilla. El usuario demo del dashboard es `analista` / `pulso2026` (hash
bcrypt real en el seed — credencial académica de demostración).