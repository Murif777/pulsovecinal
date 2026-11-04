-- 002-survey-location-consent.sql
-- ESTADO: REGISTRADA, NO APLICADA. Requiere que 001 ya esté aplicada.
-- Agrega la evidencia de consentimiento y la precisión de la ubicación, la
-- restricción que impide guardar una ubicación sin consentimiento y el índice
-- de la capa de puntos del mapa. Idempotente; no modifica filas existentes.

ALTER TABLE survey_responses
  ADD COLUMN IF NOT EXISTS ubicacion_precision_m     DOUBLE PRECISION CHECK (ubicacion_precision_m >= 0),
  ADD COLUMN IF NOT EXISTS ubicacion_consent_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ubicacion_consent_version VARCHAR(30);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_responses_location_consent') THEN
    ALTER TABLE survey_responses
      ADD CONSTRAINT chk_responses_location_consent CHECK (
        lat IS NULL OR (ubicacion_consent_at IS NOT NULL AND ubicacion_consent_version IS NOT NULL)
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_responses_located
  ON survey_responses (fecha) WHERE lat IS NOT NULL;
