# PulsoVecinal — Capa de Datos (PostgreSQL + PostGIS)

> Documentación inicial — se completa en el commit final de la capa (docs).

La capa de datos de PulsoVecinal: un contenedor PostgreSQL 16 con PostGIS 3.4
que persiste las respuestas de encuestas, el catálogo territorial de Valledupar
(comunas + barrios con geometría) y los usuarios del dashboard.

## Estructura

```
db/
├── init/
│   ├── 01-schema.sql          ← extensión PostGIS + tipos ENUM + 4 tablas + índices
│   └── 02-seed.sql            ← 6 comunas + 15 barrios (geom) + 20 respuestas + 1 usuario
├── checks/
│   └── verify.sql             ← consultas de verificación (tablas, conteos, PostGIS, geo-query)
├── README.md                  ← este archivo
└── .env.example               ← plantilla de variables de entorno (sin secretos reales)
```

## Estado

- [ ] Esquema (`01-schema.sql`)
- [ ] Seed (`02-seed.sql`)
- [ ] Servicio `db` en `docker-compose.yml`
- [ ] Script de verificación (`checks/verify.sql`)
- [ ] Documentación completa (up / connect / verify / reset / DSN)