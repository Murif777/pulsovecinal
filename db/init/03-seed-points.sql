-- 03-seed-points.sql — Reportes de DEMOSTRACIÓN con ubicación (capa de puntos del mapa).
-- Coordenadas ficticias cerca del centro de cada barrio; precisión simulada de 4-18 m.
-- Idempotente: no inserta si ya existen filas marcadas con encuestador = 'Demo GPS'.
-- Borrar: DELETE FROM survey_responses WHERE encuestador = 'Demo GPS';
-- Requiere las columnas de ubicación (01-schema.sql o migraciones 001 y 002).

INSERT INTO survey_responses
  (barrio_id, categoria, severidad, descripcion, encuestador, lat, lng,
   ubicacion_precision_m, fecha, ubicacion_consent_at, ubicacion_consent_version)
SELECT barrio_id, categoria::complaint_category, severidad::severity_level, descripcion,
       encuestador, lat, lng, ubicacion_precision_m, fecha::timestamptz,
       ubicacion_consent_at::timestamptz, ubicacion_consent_version
FROM (VALUES
  ((SELECT id FROM barrios WHERE nombre='La Esperanza'), 'espacios_publicos', 'critica', 'Parque sin mantenimiento', 'Demo GPS', 10.46867, -73.24048, 12.7, '2026-10-08T21:38:00Z', '2026-10-08T21:38:00Z', '2026-11-v1'),
  ((SELECT id FROM barrios WHERE nombre='El Popul'), 'otros', 'alta', 'Perros callejeros en grupo', 'Demo GPS', 10.45819, -73.25645, 12.6, '2026-10-15T10:00:00Z', '2026-10-15T10:00:00Z', '2026-11-v1'),
  ((SELECT id FROM barrios WHERE nombre='Los Cerros'), 'vias', 'baja', 'Andén destruido', 'Demo GPS', 10.4795, -73.22665, 6.9, '2026-10-16T17:20:00Z', '2026-10-16T17:20:00Z', '2026-11-v1'),
  ((SELECT id FROM barrios WHERE nombre='Villa Rosa'), 'energia', 'alta', 'Luminaria apagada hace semanas', 'Demo GPS', 10.46326, -73.23068, 14.1, '2026-10-17T17:04:00Z', '2026-10-17T17:04:00Z', '2026-11-v1'),
  ((SELECT id FROM barrios WHERE nombre='Bello Horizonte'), 'energia', 'alta', 'Poste inclinado con cables sueltos', 'Demo GPS', 10.44751, -73.26466, 12.1, '2026-10-21T18:45:00Z', '2026-10-21T18:45:00Z', '2026-11-v1'),
  ((SELECT id FROM barrios WHERE nombre='La Paz'), 'energia', 'alta', 'Cortes de luz todas las tardes', 'Demo GPS', 10.47172, -73.2481, 12.2, '2026-10-03T13:57:00Z', '2026-10-03T13:57:00Z', '2026-11-v1'),
  ((SELECT id FROM barrios WHERE nombre='Cañaveral'), 'espacios_publicos', 'alta', 'Cancha con basura acumulada', 'Demo GPS', 10.44299, -73.27545, 7.6, '2026-10-13T21:33:00Z', '2026-10-13T21:33:00Z', '2026-11-v1'),
  ((SELECT id FROM barrios WHERE nombre='La Nevada'), 'vias', 'alta', 'Andén destruido', 'Demo GPS', 10.43728, -73.23416, 14.7, '2026-10-01T16:14:00Z', '2026-10-01T16:14:00Z', '2026-11-v1'),
  ((SELECT id FROM barrios WHERE nombre='Los Cortijos'), 'espacios_publicos', 'critica', 'Parque sin mantenimiento', 'Demo GPS', 10.44986, -73.27584, 10.6, '2026-10-23T16:27:00Z', '2026-10-23T16:27:00Z', '2026-11-v1'),
  ((SELECT id FROM barrios WHERE nombre='El Prado'), 'seguridad', 'critica', 'Motos sospechosas en la noche', 'Demo GPS', 10.46184, -73.26444, 14.0, '2026-10-15T17:30:00Z', '2026-10-15T17:30:00Z', '2026-11-v1'),
  ((SELECT id FROM barrios WHERE nombre='Dangond'), 'energia', 'alta', 'Cortes de luz todas las tardes', 'Demo GPS', 10.45914, -73.24069, 15.2, '2026-10-22T11:35:00Z', '2026-10-22T11:35:00Z', '2026-11-v1'),
  ((SELECT id FROM barrios WHERE nombre='Garupal'), 'vias', 'alta', 'Hueco grande en la calzada', 'Demo GPS', 10.43302, -73.25519, 4.1, '2026-10-10T20:17:00Z', '2026-10-10T20:17:00Z', '2026-11-v1'),
  ((SELECT id FROM barrios WHERE nombre='Villa Castilla'), 'vias', 'alta', 'Calle sin pavimentar', 'Demo GPS', 10.44585, -73.22656, 7.6, '2026-10-12T21:12:00Z', '2026-10-12T21:12:00Z', '2026-11-v1'),
  ((SELECT id FROM barrios WHERE nombre='450 Años'), 'vias', 'alta', 'Andén destruido', 'Demo GPS', 10.46787, -73.2279, 15.6, '2026-10-22T21:02:00Z', '2026-10-22T21:02:00Z', '2026-11-v1'),
  ((SELECT id FROM barrios WHERE nombre='Novalito'), 'seguridad', 'alta', 'Motos sospechosas en la noche', 'Demo GPS', 10.43835, -73.26125, 7.6, '2026-10-23T19:32:00Z', '2026-10-23T19:32:00Z', '2026-11-v1'),
  ((SELECT id FROM barrios WHERE nombre='La Esperanza'), 'vias', 'critica', 'Calle sin pavimentar', 'Demo GPS', 10.4759, -73.24335, 16.6, '2026-10-03T17:17:00Z', '2026-10-03T17:17:00Z', '2026-11-v1'),
  ((SELECT id FROM barrios WHERE nombre='El Popul'), 'vias', 'media', 'Calle sin pavimentar', 'Demo GPS', 10.45773, -73.25985, 10.3, '2026-10-01T08:00:00Z', '2026-10-01T08:00:00Z', '2026-11-v1'),
  ((SELECT id FROM barrios WHERE nombre='Los Cerros'), 'espacios_publicos', 'media', 'Parque sin mantenimiento', 'Demo GPS', 10.48342, -73.22647, 14.5, '2026-10-04T16:02:00Z', '2026-10-04T16:02:00Z', '2026-11-v1'),
  ((SELECT id FROM barrios WHERE nombre='Villa Rosa'), 'otros', 'media', 'Basura sin recoger', 'Demo GPS', 10.46961, -73.23348, 12.2, '2026-10-01T12:42:00Z', '2026-10-01T12:42:00Z', '2026-11-v1'),
  ((SELECT id FROM barrios WHERE nombre='Bello Horizonte'), 'vias', 'critica', 'Andén destruido', 'Demo GPS', 10.45363, -73.26095, 10.6, '2026-10-05T15:14:00Z', '2026-10-05T15:14:00Z', '2026-11-v1'),
  ((SELECT id FROM barrios WHERE nombre='La Paz'), 'otros', 'alta', 'Ruido de taller hasta tarde', 'Demo GPS', 10.47268, -73.24912, 6.2, '2026-10-03T13:42:00Z', '2026-10-03T13:42:00Z', '2026-11-v1'),
  ((SELECT id FROM barrios WHERE nombre='Cañaveral'), 'espacios_publicos', 'media', 'Zona verde invadida', 'Demo GPS', 10.43972, -73.26946, 6.1, '2026-10-14T13:51:00Z', '2026-10-14T13:51:00Z', '2026-11-v1'),
  ((SELECT id FROM barrios WHERE nombre='La Nevada'), 'seguridad', 'alta', 'Hurtos frecuentes en la esquina', 'Demo GPS', 10.44076, -73.23912, 13.0, '2026-10-02T20:22:00Z', '2026-10-02T20:22:00Z', '2026-11-v1'),
  ((SELECT id FROM barrios WHERE nombre='Los Cortijos'), 'seguridad', 'alta', 'Poca iluminación en el parque', 'Demo GPS', 10.45091, -73.27599, 10.3, '2026-10-11T17:19:00Z', '2026-10-11T17:19:00Z', '2026-11-v1'),
  ((SELECT id FROM barrios WHERE nombre='El Prado'), 'vias', 'alta', 'Andén destruido', 'Demo GPS', 10.46573, -73.26202, 11.3, '2026-10-06T09:37:00Z', '2026-10-06T09:37:00Z', '2026-11-v1'),
  ((SELECT id FROM barrios WHERE nombre='Dangond'), 'espacios_publicos', 'media', 'Zona verde invadida', 'Demo GPS', 10.4544, -73.24647, 9.6, '2026-10-23T08:35:00Z', '2026-10-23T08:35:00Z', '2026-11-v1'),
  ((SELECT id FROM barrios WHERE nombre='Garupal'), 'seguridad', 'critica', 'Motos sospechosas en la noche', 'Demo GPS', 10.43026, -73.25121, 14.6, '2026-10-02T14:55:00Z', '2026-10-02T14:55:00Z', '2026-11-v1'),
  ((SELECT id FROM barrios WHERE nombre='Villa Castilla'), 'seguridad', 'media', 'Motos sospechosas en la noche', 'Demo GPS', 10.4462, -73.2281, 16.4, '2026-10-17T10:50:00Z', '2026-10-17T10:50:00Z', '2026-11-v1'),
  ((SELECT id FROM barrios WHERE nombre='450 Años'), 'otros', 'media', 'Ruido de taller hasta tarde', 'Demo GPS', 10.47155, -73.23126, 9.8, '2026-10-09T13:34:00Z', '2026-10-09T13:34:00Z', '2026-11-v1'),
  ((SELECT id FROM barrios WHERE nombre='Novalito'), 'energia', 'media', 'Cortes de luz todas las tardes', 'Demo GPS', 10.43621, -73.26676, 15.4, '2026-10-15T14:49:00Z', '2026-10-15T14:49:00Z', '2026-11-v1'),
  ((SELECT id FROM barrios WHERE nombre='La Esperanza'), 'espacios_publicos', 'alta', 'Cancha con basura acumulada', 'Demo GPS', 10.47019, -73.24341, 11.3, '2026-10-04T15:50:00Z', '2026-10-04T15:50:00Z', '2026-11-v1'),
  ((SELECT id FROM barrios WHERE nombre='El Popul'), 'alcantarillado', 'media', 'Caño desbordado frente a las casas', 'Demo GPS', 10.45686, -73.26075, 13.0, '2026-10-03T21:29:00Z', '2026-10-03T21:29:00Z', '2026-11-v1'),
  ((SELECT id FROM barrios WHERE nombre='Los Cerros'), 'otros', 'media', 'Basura sin recoger', 'Demo GPS', 10.48217, -73.22695, 8.9, '2026-10-12T20:10:00Z', '2026-10-12T20:10:00Z', '2026-11-v1'),
  ((SELECT id FROM barrios WHERE nombre='Villa Rosa'), 'alcantarillado', 'baja', 'Mal olor en la cuadra', 'Demo GPS', 10.46718, -73.23237, 14.5, '2026-10-23T11:35:00Z', '2026-10-23T11:35:00Z', '2026-11-v1'),
  ((SELECT id FROM barrios WHERE nombre='Bello Horizonte'), 'espacios_publicos', 'media', 'Zona verde invadida', 'Demo GPS', 10.45328, -73.26437, 14.9, '2026-10-18T09:06:00Z', '2026-10-18T09:06:00Z', '2026-11-v1'),
  ((SELECT id FROM barrios WHERE nombre='La Paz'), 'seguridad', 'critica', 'Hurtos frecuentes en la esquina', 'Demo GPS', 10.47237, -73.25058, 15.2, '2026-10-25T12:46:00Z', '2026-10-25T12:46:00Z', '2026-11-v1'),
  ((SELECT id FROM barrios WHERE nombre='Cañaveral'), 'energia', 'media', 'Luminaria apagada hace semanas', 'Demo GPS', 10.44431, -73.27554, 8.4, '2026-10-03T11:59:00Z', '2026-10-03T11:59:00Z', '2026-11-v1'),
  ((SELECT id FROM barrios WHERE nombre='La Nevada'), 'vias', 'media', 'Calle sin pavimentar', 'Demo GPS', 10.43585, -73.24193, 7.3, '2026-10-01T07:06:00Z', '2026-10-01T07:06:00Z', '2026-11-v1'),
  ((SELECT id FROM barrios WHERE nombre='Los Cortijos'), 'espacios_publicos', 'alta', 'Cancha con basura acumulada', 'Demo GPS', 10.44529, -73.28366, 12.5, '2026-10-11T19:29:00Z', '2026-10-11T19:29:00Z', '2026-11-v1'),
  ((SELECT id FROM barrios WHERE nombre='El Prado'), 'vias', 'media', 'Andén destruido', 'Demo GPS', 10.46339, -73.26096, 10.0, '2026-10-07T16:29:00Z', '2026-10-07T16:29:00Z', '2026-11-v1'),
  ((SELECT id FROM barrios WHERE nombre='Dangond'), 'energia', 'alta', 'Luminaria apagada hace semanas', 'Demo GPS', 10.45658, -73.24843, 17.3, '2026-10-09T13:18:00Z', '2026-10-09T13:18:00Z', '2026-11-v1'),
  ((SELECT id FROM barrios WHERE nombre='Garupal'), 'vias', 'baja', 'Calle sin pavimentar', 'Demo GPS', 10.43171, -73.25288, 14.2, '2026-10-23T12:18:00Z', '2026-10-23T12:18:00Z', '2026-11-v1'),
  ((SELECT id FROM barrios WHERE nombre='Villa Castilla'), 'energia', 'alta', 'Cortes de luz todas las tardes', 'Demo GPS', 10.45142, -73.22626, 11.6, '2026-10-19T21:01:00Z', '2026-10-19T21:01:00Z', '2026-11-v1'),
  ((SELECT id FROM barrios WHERE nombre='450 Años'), 'otros', 'baja', 'Basura sin recoger', 'Demo GPS', 10.46658, -73.22745, 4.5, '2026-10-20T08:07:00Z', '2026-10-20T08:07:00Z', '2026-11-v1'),
  ((SELECT id FROM barrios WHERE nombre='Novalito'), 'otros', 'media', 'Basura sin recoger', 'Demo GPS', 10.4402, -73.26413, 9.0, '2026-10-14T16:08:00Z', '2026-10-14T16:08:00Z', '2026-11-v1')
) AS demo(barrio_id, categoria, severidad, descripcion, encuestador, lat, lng,
          ubicacion_precision_m, fecha, ubicacion_consent_at, ubicacion_consent_version)
WHERE NOT EXISTS (SELECT 1 FROM survey_responses WHERE encuestador = 'Demo GPS');
