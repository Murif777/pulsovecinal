-- 02-seed.sql — Carga inicial de PulsoVecinal (Valledupar)
-- Datos copiados EXACTAMENTE de src/lib/mockData.ts (BARRIO_LOCATIONS +
-- mockSurveyResponses), el dataset canónico validado por los tests del frontend.
-- Se ejecuta después de 01-schema.sql, solo en el primer arranque (volumen vacío).

-- 1) Comunas
INSERT INTO comunas (nombre) VALUES
  ('Comuna 1'),('Comuna 2'),('Comuna 3'),('Comuna 4'),('Comuna 5'),('Comuna 6');

-- 2) Barrios con geometría (⚠️ ST_MakePoint(lng, lat) — longitud PRIMERO)
INSERT INTO barrios (nombre, comuna_id, geom) VALUES
  ('La Esperanza',    (SELECT id FROM comunas WHERE nombre='Comuna 2'), ST_SetSRID(ST_MakePoint(-73.2405, 10.4721), 4326)),
  ('El Popul',        (SELECT id FROM comunas WHERE nombre='Comuna 1'), ST_SetSRID(ST_MakePoint(-73.2571, 10.4589), 4326)),
  ('Los Cerros',      (SELECT id FROM comunas WHERE nombre='Comuna 3'), ST_SetSRID(ST_MakePoint(-73.2295, 10.483),  4326)),
  ('Villa Rosa',      (SELECT id FROM comunas WHERE nombre='Comuna 2'), ST_SetSRID(ST_MakePoint(-73.235,  10.4655), 4326)),
  ('Bello Horizonte', (SELECT id FROM comunas WHERE nombre='Comuna 4'), ST_SetSRID(ST_MakePoint(-73.265,  10.4512), 4326)),
  ('La Paz',          (SELECT id FROM comunas WHERE nombre='Comuna 3'), ST_SetSRID(ST_MakePoint(-73.25,   10.476),  4326)),
  ('Cañaveral',       (SELECT id FROM comunas WHERE nombre='Comuna 5'), ST_SetSRID(ST_MakePoint(-73.272,  10.443),  4326)),
  ('La Nevada',       (SELECT id FROM comunas WHERE nombre='Comuna 6'), ST_SetSRID(ST_MakePoint(-73.238,  10.438),  4326)),
  ('Los Cortijos',    (SELECT id FROM comunas WHERE nombre='Comuna 5'), ST_SetSRID(ST_MakePoint(-73.28,   10.447),  4326)),
  ('El Prado',        (SELECT id FROM comunas WHERE nombre='Comuna 1'), ST_SetSRID(ST_MakePoint(-73.262,  10.462),  4326)),
  ('Dangond',         (SELECT id FROM comunas WHERE nombre='Comuna 4'), ST_SetSRID(ST_MakePoint(-73.245,  10.455),  4326)),
  ('Garupal',         (SELECT id FROM comunas WHERE nombre='Comuna 6'), ST_SetSRID(ST_MakePoint(-73.255,  10.433),  4326)),
  ('Villa Castilla',  (SELECT id FROM comunas WHERE nombre='Comuna 4'), ST_SetSRID(ST_MakePoint(-73.23,   10.449),  4326)),
  ('450 Años',        (SELECT id FROM comunas WHERE nombre='Comuna 2'), ST_SetSRID(ST_MakePoint(-73.228,  10.468),  4326)),
  ('Novalito',        (SELECT id FROM comunas WHERE nombre='Comuna 6'), ST_SetSRID(ST_MakePoint(-73.265,  10.44),   4326));

-- 3) Respuestas (las 20 del dataset mock, mapeadas a barrio_id por nombre)
INSERT INTO survey_responses (barrio_id, categoria, severidad, descripcion, encuestador, fecha) VALUES
  ((SELECT id FROM barrios WHERE nombre='La Esperanza'),    'alcantarillado',    'critica', 'Alcantarillado rebosando en la carrera 7 con calle 11', 'Ana Martínez',    '2026-08-01T14:30:00.000Z'),
  ((SELECT id FROM barrios WHERE nombre='La Esperanza'),    'seguridad',         'media',   'Falta alumbrado en el parque y hay hurtos nocturnos', 'Ana Martínez',    '2026-08-02T16:05:00.000Z'),
  ((SELECT id FROM barrios WHERE nombre='El Popul'),        'energia',           'alta',    'Transformador chisporrotea en la carrera 6', 'Carlos Guerra',   '2026-08-03T09:15:00.000Z'),
  ((SELECT id FROM barrios WHERE nombre='El Popul'),        'energia',           'media',   'Apagones diarios en la cuadra 18', 'Carlos Guerra',   '2026-08-04T11:40:00.000Z'),
  ((SELECT id FROM barrios WHERE nombre='Los Cerros'),      'vias',              'alta',    'Vía de acceso destruida por las lluvias', 'Laura Ospino',    '2026-08-05T08:20:00.000Z'),
  ((SELECT id FROM barrios WHERE nombre='Villa Rosa'),      'espacios_publicos', 'baja',    'Parque infantil requiere pintura y juegos nuevos', 'Laura Ospino',    '2026-08-05T15:50:00.000Z'),
  ((SELECT id FROM barrios WHERE nombre='Bello Horizonte'), 'seguridad',         'alta',    'Microtráfico frente al colegio', 'Jorge Daza',      '2026-08-06T19:10:00.000Z'),
  ((SELECT id FROM barrios WHERE nombre='La Paz'),          'alcantarillado',    'media',   'Mal olor permanente por caño destapado', 'María Fuentes',   '2026-08-07T10:35:00.000Z'),
  ((SELECT id FROM barrios WHERE nombre='Cañaveral'),       'otros',             'baja',    'Basuras sin recolección oportuna los fines de semana', 'María Fuentes',   '2026-08-08T13:25:00.000Z'),
  ((SELECT id FROM barrios WHERE nombre='La Nevada'),       'energia',           'critica', 'Cables caídos sobre la vía principal', 'Andrés Rincón',   '2026-08-09T07:55:00.000Z'),
  ((SELECT id FROM barrios WHERE nombre='Los Cortijos'),    'vias',              'media',   'No pasa transporte público por falta de pavimento', 'Andrés Rincón',   '2026-08-10T12:00:00.000Z'),
  ((SELECT id FROM barrios WHERE nombre='El Prado'),        'seguridad',         'media',   'Robo de cables en el barrio', 'Paola Mendoza',   '2026-08-11T17:45:00.000Z'),
  ((SELECT id FROM barrios WHERE nombre='Dangond'),         'espacios_publicos', 'alta',    'Cancha comunal invadida por escombros', 'Paola Mendoza',   '2026-08-12T09:30:00.000Z'),
  ((SELECT id FROM barrios WHERE nombre='Garupal'),         'alcantarillado',    'baja',    'Sumidero obstruido que acumula agua cuando llueve', 'Sofía Arregocés', '2026-08-13T14:15:00.000Z'),
  ((SELECT id FROM barrios WHERE nombre='Villa Castilla'),  'energia',           'media',   'Luminarias quemadas en toda la carrera 5', 'Sofía Arregocés', '2026-08-14T18:20:00.000Z'),
  ((SELECT id FROM barrios WHERE nombre='450 Años'),        'vias',              'alta',    'Baches profundos en la entrada principal', 'Diego Molina',    '2026-08-15T11:05:00.000Z'),
  ((SELECT id FROM barrios WHERE nombre='Novalito'),        'otros',             'media',   'Ruido constante de talleres mecánicos residenciales', 'Diego Molina',    '2026-08-16T16:40:00.000Z'),
  ((SELECT id FROM barrios WHERE nombre='Los Cerros'),      'seguridad',         'alta',    'Pandillismo en la zona alta del barrio', 'Ana Martínez',    '2026-08-17T20:30:00.000Z'),
  ((SELECT id FROM barrios WHERE nombre='Cañaveral'),       'espacios_publicos', 'media',   'Sendero peatonal sin mantenimiento', 'Carlos Guerra',   '2026-08-18T10:10:00.000Z'),
  ((SELECT id FROM barrios WHERE nombre='La Esperanza'),    'energia',           'baja',    'Parpadeos frecuentes del servicio eléctrico', 'Laura Ospino',    '2026-08-19T13:55:00.000Z');

-- 4) Usuario demo (hash bcrypt REAL de 'pulso2026', rounds=12 — generado con Python bcrypt)
INSERT INTO usuarios (usuario, contrasena_hash, rol, nombre) VALUES
  ('analista', '$2b$12$dIUeLEtnCMyUm/cOZQNHM.KQP16HBI7CE/DnYxY38M9XljezJiJa6', 'analista', 'Analista Municipal');