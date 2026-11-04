# Migraciones de la base de datos

Los scripts de `db/init/` solo corren cuando el volumen de Postgres está vacío.
Una base que **ya existe** (local, EC2 o RDS) no recibe esos cambios sola: cada
cambio de esquema queda aquí como un script numerado, idempotente
(`IF NOT EXISTS`) y se aplica **a mano**, en orden.

| Script | Qué hace | Estado |
|---|---|---|
| `001-survey-location.sql` | Columnas `lat`, `lng` (ubicación opcional del reporte) | Registrada, **no aplicada** |
| `002-survey-location-consent.sql` | Precisión, evidencia de consentimiento, restricción e índice | Registrada, **no aplicada** |

Cuando se aplique una migración, cambiar su estado en esta tabla con la fecha y
el entorno (por ejemplo: `Aplicada en producción el 2026-11-20`).

## Cómo aplicarlas (cuando se decida)

```bash
# 1) respaldo antes de tocar producción
pg_dump -h <host> -U pulso pulsovecinal > respaldo-antes-de-migrar.sql
# 2) en orden
psql -h <host> -U pulso -d pulsovecinal -f db/migrations/001-survey-location.sql
psql -h <host> -U pulso -d pulsovecinal -f db/migrations/002-survey-location-consent.sql
```

**Orden de despliegue:** primero la migración, después el backend nuevo. El
backend nuevo escribe y lee las columnas; sin la migración falla.

## Datos de prueba de ubicaciones

`db/init/03-seed-points.sql` carga reportes de demostración con coordenadas
(`encuestador = 'Demo GPS'`). Se ejecuta solo en bases nuevas; para una base
existente correrlo a mano **después** de las migraciones. Es idempotente y se
borra con `DELETE FROM survey_responses WHERE encuestador = 'Demo GPS';`.

## Mantenimiento

`db/maintenance/purge-old-locations.sql` anula las coordenadas de reportes
antiguos (retención). No se programa ni se ejecuta automáticamente.
