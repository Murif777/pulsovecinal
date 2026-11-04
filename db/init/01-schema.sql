-- 01-schema.sql — Esquema de la capa de datos de PulsoVecinal
-- PostgreSQL 16 + PostGIS 3.4. Se ejecuta automáticamente en el primer
-- arranque del contenedor (volumen vacío), antes que 02-seed.sql.

CREATE EXTENSION IF NOT EXISTS postgis;

-- Catálogo territorial
CREATE TABLE comunas (
  id     SERIAL PRIMARY KEY,
  nombre VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE barrios (
  id        SERIAL PRIMARY KEY,
  nombre    VARCHAR(100) NOT NULL UNIQUE,
  comuna_id INTEGER NOT NULL REFERENCES comunas(id),
  geom      geometry(Point, 4326) NOT NULL      -- SRID 4326 = WGS84 (lat/lng GPS)
);
CREATE INDEX idx_barrios_geom ON barrios USING GIST (geom);   -- índice espacial

-- Dominios del negocio (espejo de los tipos TS)
CREATE TYPE complaint_category AS ENUM
  ('seguridad','alcantarillado','energia','vias','espacios_publicos','otros');
CREATE TYPE severity_level AS ENUM
  ('baja','media','alta','critica');

-- Respuestas de encuestas (reemplaza localStorage)
CREATE TABLE survey_responses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barrio_id   INTEGER NOT NULL REFERENCES barrios(id),
  categoria   complaint_category NOT NULL,
  severidad   severity_level NOT NULL,
  descripcion TEXT,
  encuestador VARCHAR(100),
  lat         DOUBLE PRECISION CHECK (lat BETWEEN -90 AND 90),    -- ubicación opcional del reporte
  lng         DOUBLE PRECISION CHECK (lng BETWEEN -180 AND 180),
  ubicacion_precision_m     DOUBLE PRECISION CHECK (ubicacion_precision_m >= 0),  -- radio GPS (m)
  ubicacion_consent_at      TIMESTAMPTZ,              -- cuándo aceptó el uso de su ubicación
  ubicacion_consent_version VARCHAR(30),              -- versión del texto legal aceptado
  fecha       TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_responses_latlng CHECK ((lat IS NULL) = (lng IS NULL)),
  -- Una ubicación solo existe si hay evidencia de consentimiento (Ley 1581 de 2012).
  CONSTRAINT chk_responses_location_consent CHECK (
    lat IS NULL OR (ubicacion_consent_at IS NOT NULL AND ubicacion_consent_version IS NOT NULL)
  )
);
CREATE INDEX idx_responses_barrio    ON survey_responses (barrio_id);
CREATE INDEX idx_responses_categoria ON survey_responses (categoria);
CREATE INDEX idx_responses_fecha     ON survey_responses (fecha);
CREATE INDEX idx_responses_located   ON survey_responses (fecha) WHERE lat IS NOT NULL;  -- capa de puntos

-- Usuarios (login del dashboard)
CREATE TABLE usuarios (
  id              SERIAL PRIMARY KEY,
  usuario         VARCHAR(50) NOT NULL UNIQUE,
  contrasena_hash VARCHAR(255) NOT NULL,     -- bcrypt (generado con passlib en el backend)
  rol             VARCHAR(30) NOT NULL DEFAULT 'analista',
  nombre          VARCHAR(100),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);