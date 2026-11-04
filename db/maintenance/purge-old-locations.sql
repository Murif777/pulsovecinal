-- purge-old-locations.sql
-- Retención de ubicaciones: borra coordenadas, precisión y consentimiento de los
-- reportes con más de N días, conservando el reporte (barrio, categoría, severidad).
-- NO se ejecuta automáticamente. Ajustar el intervalo a lo que diga la política.

BEGIN;

UPDATE survey_responses
SET lat = NULL,
    lng = NULL,
    ubicacion_precision_m = NULL,
    ubicacion_consent_at = NULL,
    ubicacion_consent_version = NULL
WHERE lat IS NOT NULL
  AND fecha < now() - INTERVAL '365 days';

-- Revisar cuántas filas cambió y confirmar con COMMIT (o ROLLBACK).
COMMIT;

-- Supresión a solicitud del titular: identificar el reporte por id y anular su
-- ubicación (o borrarlo):
--   UPDATE survey_responses SET lat=NULL, lng=NULL, ubicacion_precision_m=NULL,
--     ubicacion_consent_at=NULL, ubicacion_consent_version=NULL WHERE id = '<uuid>';
