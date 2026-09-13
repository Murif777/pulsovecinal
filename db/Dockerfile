# Imagen propia de la capa de datos: PostGIS + schema y seed de Valledupar.
# Al publicar esta imagen no hace falta clonar el repo ni montar db/init.
FROM postgis/postgis:16-3.4-alpine

COPY init/ /docker-entrypoint-initdb.d/
