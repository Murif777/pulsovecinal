-- 001-survey-location.sql
-- ESTADO: REGISTRADA, NO APLICADA (ver db/migrations/README.md).
-- Para bases YA creadas (los scripts de db/init solo corren con volumen vacio).
-- Agrega la ubicacion opcional del reporte. Es idempotente y no toca filas existentes.

ALTER TABLE survey_responses
  ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION CHECK (lat BETWEEN -90 AND 90),
  ADD COLUMN IF NOT EXISTS lng DOUBLE PRECISION CHECK (lng BETWEEN -180 AND 180);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_responses_latlng') THEN
    ALTER TABLE survey_responses
      ADD CONSTRAINT chk_responses_latlng CHECK ((lat IS NULL) = (lng IS NULL));
  END IF;
END $$;
