-- verify.sql — Verificación de la capa de datos de PulsoVecinal
-- Uso:  Get-Content db/checks/verify.sql | docker compose exec -T db psql -U pulso -d pulsovecinal
-- Falla con RAISE EXCEPTION (exit code != 0) si alguna comprobación no cumple.
-- Todo en ASCII para evitar problemas de encoding al canalizar por stdin.

\set ON_ERROR_STOP on

-- 1) PostGIS instalado
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'postgis') THEN
    RAISE EXCEPTION 'FAIL: la extension postgis no esta instalada';
  END IF;
  RAISE NOTICE 'OK: postgis instalado (%)', (SELECT postgis_version());
END $$;

-- 2) Las 4 tablas existen
DO $$
DECLARE
  missing text;
BEGIN
  SELECT string_agg(t, ', ') INTO missing
  FROM unnest(ARRAY['comunas','barrios','survey_responses','usuarios']) AS t
  WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = t
  );
  IF missing IS NOT NULL THEN
    RAISE EXCEPTION 'FAIL: faltan tablas: %', missing;
  END IF;
  RAISE NOTICE 'OK: las 4 tablas existen (comunas, barrios, survey_responses, usuarios)';
END $$;

-- 3) Conteos del seed
DO $$
DECLARE
  c_comunas int; c_barrios int; c_resp int; c_usu int;
BEGIN
  SELECT count(*) INTO c_comunas FROM comunas;
  SELECT count(*) INTO c_barrios FROM barrios;
  SELECT count(*) INTO c_resp   FROM survey_responses;
  SELECT count(*) INTO c_usu    FROM usuarios;
  IF c_comunas <> 6  THEN RAISE EXCEPTION 'FAIL: comunas = % (esperado 6)',  c_comunas; END IF;
  IF c_barrios <> 15 THEN RAISE EXCEPTION 'FAIL: barrios = % (esperado 15)', c_barrios; END IF;
  IF c_resp    <> 20 THEN RAISE EXCEPTION 'FAIL: survey_responses = % (esperado 20)', c_resp; END IF;
  IF c_usu     <> 1  THEN RAISE EXCEPTION 'FAIL: usuarios = % (esperado 1)', c_usu; END IF;
  RAISE NOTICE 'OK: conteos 6 comunas / 15 barrios / 20 respuestas / 1 usuario';
END $$;

-- 4) barrios.geom con SRID 4326 e índice GIST
DO $$
DECLARE
  srid int;
  has_gist boolean;
BEGIN
  SELECT g.srid INTO srid FROM geometry_columns g
  WHERE g.f_table_name = 'barrios' AND g.f_geometry_column = 'geom';
  IF srid IS DISTINCT FROM 4326 THEN
    RAISE EXCEPTION 'FAIL: SRID de barrios.geom = % (esperado 4326)', srid;
  END IF;
  SELECT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'barrios' AND indexdef ILIKE '%USING gist (geom)%'
  ) INTO has_gist;
  IF NOT has_gist THEN
    RAISE EXCEPTION 'FAIL: falta el indice GIST sobre barrios.geom';
  END IF;
  RAISE NOTICE 'OK: barrios.geom SRID 4326 con indice GIST';
END $$;

-- 5) Cada respuesta referencia un barrio con coordenadas
DO $$
DECLARE
  n int;
BEGIN
  SELECT count(*) INTO n
  FROM survey_responses r
  JOIN barrios b ON b.id = r.barrio_id
  WHERE b.geom IS NULL;
  IF n > 0 THEN
    RAISE EXCEPTION 'FAIL: % respuestas apuntan a barrios sin geometria', n;
  END IF;
  RAISE NOTICE 'OK: todas las respuestas tienen barrio con coordenadas';
END $$;

-- 6) Usuario demo existe
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM usuarios WHERE usuario = 'analista') THEN
    RAISE EXCEPTION 'FAIL: no existe el usuario analista';
  END IF;
  RAISE NOTICE 'OK: usuario analista presente';
END $$;

-- 7) Consulta geoespacial demostrativa: barrios a menos de 3 km del centro de Valledupar
--    (centro ~ -73.25, 10.46; ST_DWithin sobre geography devuelve metros)
SELECT b.nombre,
       c.nombre AS comuna,
       round((ST_Distance(b.geom::geography,
                          ST_SetSRID(ST_MakePoint(-73.25, 10.46), 4326)::geography) / 1000)::numeric, 2) AS distancia_km
FROM barrios b
JOIN comunas c ON c.id = b.comuna_id
WHERE ST_DWithin(b.geom::geography,
                 ST_SetSRID(ST_MakePoint(-73.25, 10.46), 4326)::geography,
                 3000)
ORDER BY distancia_km;