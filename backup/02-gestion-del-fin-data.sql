-- ============================================================
-- SEED DATA — gestion_del_fin
-- 02-gestion-del-fin-data.sql
-- ============================================================
-- Narrativa:
--   Tres campamentos sobreviven al apocalipsis zombie:
--     1. Campamento Alfa   – bosque montañoso, bien establecido
--     2. Campamento Beta   – zona costera, recursos hídricos
--     3. Campamento Gamma  – ciudad abandonada, armamento fuerte
--
--   El seed cubre TODOS los flujos del sistema:
--     ✔ system_config (singleton)
--     ✔ camps, roles, professions
--     ✔ users (uno por rol por campamento relevante)
--     ✔ persons (sobrevivientes con distintos estados)
--     ✔ admission_requests (PENDING, ACCEPTED, REJECTED + revisión)
--     ✔ person_status_log (cambios de estado documentados)
--     ✔ profession_reassignment_log (reasignación temporal)
--     ✔ resource_type, professions_resources_amounts
--     ✔ inventory (bodega por campamento)
--     ✔ inventory_log (DAILY_GAIN, DAILY_RATION, MANUAL_IN, TRANSFER_OUT/IN)
--     ✔ contribution_overrides (override de aporte por persona)
--     ✔ expeditions + members + allocated/found resources
--     ✔ camp_transfers (PENDING, APPROVED, COMPLETED + REJECTED)
--     ✔ camp_transfer_item (RESOURCE y PERSON)
--     ✔ achievements + user_achievements
-- ============================================================

USE `gestion_del_fin`;

SET FOREIGN_KEY_CHECKS = 0;

-- ============================================================
-- 1. SYSTEM CONFIG
-- ============================================================
INSERT INTO `system_config` (`id`, `version`, `server_time`) VALUES
(1, '1.1.0', '2026-03-13 08:00:00');


-- ============================================================
-- 2. CAMPS
-- ============================================================
-- id 1 = Alfa, id 2 = Beta, id 3 = Gamma
INSERT INTO `camps` (`id`, `name`, `location`, `status`, `created_at`) VALUES
(1, 'Campamento Alfa',  'Bosque de las Nieblas, sector norte',    'ACTIVE',    '2026-01-05 09:00:00'),
(2, 'Campamento Beta',  'Costa del Último Sol, bahía sur',        'ACTIVE',    '2026-01-12 14:30:00'),
(3, 'Campamento Gamma', 'Ruinas de Ciudad Esmeralda, bloque 7',   'ACTIVE',    '2026-01-20 07:45:00');


-- ============================================================
-- 3. ROLES
-- ============================================================
-- id 1 = system_admin, id 2 = worker, id 3 = resource_manager, id 4 = travel_coordinator
INSERT INTO `roles` (`id`, `name`, `description`) VALUES
(1, 'system_admin',       'Acceso total. Gestiona ingresos de personas al campamento.'),
(2, 'worker',             'Realiza cambios de inventario autorizados por el gestor de recursos.'),
(3, 'resource_manager',   'Encargado general de traslados y envíos de recursos entre campamentos.'),
(4, 'travel_coordinator', 'Realiza expediciones y negocia con otros campamentos.');


-- ============================================================
-- 4. PROFESSIONS  (oficio físico del sobreviviente)
-- ============================================================
-- id 1=farmer, 2=scout, 3=guard, 4=medic, 5=engineer, 6=cook, 7=hunter
INSERT INTO `professions` (`id`, `name`, `description`) VALUES
(1, 'farmer',    'Cultiva alimentos diariamente. Principal fuente de comida del campamento.'),
(2, 'scout',     'Realiza exploraciones y reconocimiento de zonas. Trae recursos del exterior.'),
(3, 'guard',     'Patrulla el perímetro. Consume munición para defender el campamento.'),
(4, 'medic',     'Atiende heridos y enfermos. Consume medicinas y materiales de higiene.'),
(5, 'engineer',  'Mantiene infraestructura. No produce recursos directamente.'),
(6, 'cook',      'Transforma alimentos crudos. Produce raciones adicionales de comida.'),
(7, 'hunter',    'Sale a cazar. Trae carne fresca y consume munición.');


-- ============================================================
-- 5. USERS  (cuentas del sistema, un admin + roles por campamento)
-- ============================================================
-- Contraseñas: todas son "Apocalipsis2026!" hasheadas con bcrypt (hash de ejemplo)
-- Hash bcrypt real de "Apocalipsis2026!": $2b$12$eImiTXuWVxfM37uY4JANjQ...
-- Para el seed usamos un hash fijo representativo.
INSERT INTO `users` (`id`, `camp_id`, `role_id`, `username`, `password_hash`, `is_active`, `last_activity`, `created_at`) VALUES
-- Campamento Alfa
(1,  1, 1, 'alfa_admin',       '$2b$12$LQv3c1yqBWVHxkd0LQ4YCOuuQ1e6WL5OKsB.GjJm0PcuZYe.Uf2oi', 1, '2026-03-13 07:55:00', '2026-01-05 09:10:00'),
(2,  1, 3, 'alfa_recursos',    '$2b$12$LQv3c1yqBWVHxkd0LQ4YCOuuQ1e6WL5OKsB.GjJm0PcuZYe.Uf2oi', 1, '2026-03-13 07:30:00', '2026-01-05 09:15:00'),
(3,  1, 4, 'alfa_viajes',      '$2b$12$LQv3c1yqBWVHxkd0LQ4YCOuuQ1e6WL5OKsB.GjJm0PcuZYe.Uf2oi', 1, '2026-03-12 22:00:00', '2026-01-05 09:20:00'),
(4,  1, 2, 'alfa_trabajador1', '$2b$12$LQv3c1yqBWVHxkd0LQ4YCOuuQ1e6WL5OKsB.GjJm0PcuZYe.Uf2oi', 1, '2026-03-13 06:00:00', '2026-01-06 08:00:00'),
-- Campamento Beta
(5,  2, 1, 'beta_admin',       '$2b$12$LQv3c1yqBWVHxkd0LQ4YCOuuQ1e6WL5OKsB.GjJm0PcuZYe.Uf2oi', 1, '2026-03-13 07:50:00', '2026-01-12 14:40:00'),
(6,  2, 3, 'beta_recursos',    '$2b$12$LQv3c1yqBWVHxkd0LQ4YCOuuQ1e6WL5OKsB.GjJm0PcuZYe.Uf2oi', 1, '2026-03-13 07:20:00', '2026-01-12 14:45:00'),
(7,  2, 4, 'beta_viajes',      '$2b$12$LQv3c1yqBWVHxkd0LQ4YCOuuQ1e6WL5OKsB.GjJm0PcuZYe.Uf2oi', 1, '2026-03-12 20:00:00', '2026-01-12 14:50:00'),
(8,  2, 2, 'beta_trabajador1', '$2b$12$LQv3c1yqBWVHxkd0LQ4YCOuuQ1e6WL5OKsB.GjJm0PcuZYe.Uf2oi', 1, '2026-03-13 05:30:00', '2026-01-13 08:00:00'),
-- Campamento Gamma
(9,  3, 1, 'gamma_admin',      '$2b$12$LQv3c1yqBWVHxkd0LQ4YCOuuQ1e6WL5OKsB.GjJm0PcuZYe.Uf2oi', 1, '2026-03-13 07:45:00', '2026-01-20 07:55:00'),
(10, 3, 3, 'gamma_recursos',   '$2b$12$LQv3c1yqBWVHxkd0LQ4YCOuuQ1e6WL5OKsB.GjJm0PcuZYe.Uf2oi', 1, '2026-03-13 07:10:00', '2026-01-20 08:00:00'),
(11, 3, 4, 'gamma_viajes',     '$2b$12$LQv3c1yqBWVHxkd0LQ4YCOuuQ1e6WL5OKsB.GjJm0PcuZYe.Uf2oi', 1, '2026-03-12 21:00:00', '2026-01-20 08:05:00'),
(12, 3, 2, 'gamma_trabajador1','$2b$12$LQv3c1yqBWVHxkd0LQ4YCOuuQ1e6WL5OKsB.GjJm0PcuZYe.Uf2oi', 1, '2026-03-13 06:15:00', '2026-01-21 08:00:00');


-- ============================================================
-- 6. PERSONS  (sobrevivientes registrados en el sistema)
-- ============================================================
-- Alfa: id 1-8  |  Beta: id 9-14  |  Gamma: id 15-20
INSERT INTO `persons` (`id`, `camp_id`, `profession_id`, `identification_code`, `full_name`, `age`, `blood_type`, `skills_summary`, `photo_url`, `status`, `admitted_at`) VALUES
-- === CAMPAMENTO ALFA ===
(1,  1, 1, 'ALF-00001', 'Daniela Rojas Méndez',     34, 'O+', 'Agrónoما. 10 años cultivando maíz y frijoles. Conoce técnicas de riego.',                        NULL, 'HEALTHY', '2026-01-06 10:00:00'),
(2,  1, 3, 'ALF-00002', 'Marcos Vega Solís',         28, 'A+', 'Ex-policía. Experto en defensa perimetral y manejo de armas de fuego.',                          NULL, 'HEALTHY', '2026-01-06 10:30:00'),
(3,  1, 2, 'ALF-00003', 'Laura Chinchilla Torres',   25, 'B-', 'Atleta. Buena orientación espacial. Ha completado 3 exploraciones exitosas.',                     NULL, 'HEALTHY', '2026-01-07 08:00:00'),
(4,  1, 4, 'ALF-00004', 'Dr. Ernesto Campos Arias',  52, 'AB+','Médico general. Cirujano de emergencias. Vital para el campamento.',                             NULL, 'HEALTHY', '2026-01-07 08:30:00'),
(5,  1, 5, 'ALF-00005', 'Sofía Vargas Núñez',        30, 'A-', 'Ingeniera civil. Diseñó las barricadas actuales del campamento.',                                 NULL, 'HEALTHY', '2026-01-08 09:00:00'),
(6,  1, 6, 'ALF-00006', 'Tomás Gutiérrez Mora',      45, 'O-', 'Chef profesional. Maximiza el valor nutricional de las raciones.',                               NULL, 'INJURED', '2026-01-08 09:30:00'),
(7,  1, 2, 'ALF-00007', 'Patricia Jiménez Blanco',   22, 'B+', 'Escaladora. Especialista en terrenos difíciles. Líder potencial de expediciones.',               NULL, 'HEALTHY', '2026-01-10 07:00:00'),
(8,  1, 7, 'ALF-00008', 'Diego Alvarado Pérez',      38, 'A+', 'Cazador con 15 años de experiencia. Conoce la fauna local.',                                     NULL, 'AWAY',    '2026-01-10 07:30:00'),
-- === CAMPAMENTO BETA ===
(9,  2, 1, 'BET-00001', 'Carmen Herrera Solano',     41, 'O+', 'Bióloga marina. Cultiva algas comestibles y peces en estanques costeros.',                       NULL, 'HEALTHY', '2026-01-13 09:00:00'),
(10, 2, 3, 'BET-00002', 'Andrés Mora Castillo',      31, 'A+', 'Militar retirado. Especialista en defensa de perímetros costeros.',                              NULL, 'HEALTHY', '2026-01-13 09:30:00'),
(11, 2, 2, 'BET-00003', 'Isabel Brenes Quesada',     27, 'B+', 'Montañista. Ha realizado 5 expediciones. Conoce el mapa de la región.',                         NULL, 'HEALTHY', '2026-01-14 08:00:00'),
(12, 2, 4, 'BET-00004', 'Dra. Viviana Castro León',  48, 'AB-','Médico de urgencias. Especialidad en enfermedades infecciosas post-apocalipsis.',                NULL, 'SICK',    '2026-01-14 08:30:00'),
(13, 2, 6, 'BET-00005', 'Ricardo Soto Bermúdez',     36, 'O+', 'Nutricionista. Conoce sustitutos alimenticios para épocas de escasez.',                         NULL, 'HEALTHY', '2026-01-15 07:00:00'),
(14, 2, 7, 'BET-00006', 'Natalia Ramírez Fonseca',   29, 'A-', 'Guardabosques. Experta en fauna local y rastreo de recursos en el exterior.',                   NULL, 'HEALTHY', '2026-01-15 07:30:00'),
-- === CAMPAMENTO GAMMA ===
(15, 3, 3, 'GAM-00001', 'Comandante Luis Arce Vega', 50, 'O+', 'Ex-militar. Lideró operaciones en zonas urbanas. Estratega de defensa.',                        NULL, 'HEALTHY', '2026-01-21 09:00:00'),
(16, 3, 2, 'GAM-00002', 'Silvia Cordero Rojas',      26, 'B+', 'Atleta de orientación. Conoce las ruinas de la ciudad como la palma de su mano.',               NULL, 'HEALTHY', '2026-01-21 09:30:00'),
(17, 3, 5, 'GAM-00003', 'Ing. Pablo Monge Ulate',    44, 'A+', 'Ingeniero mecánico. Repara vehículos y generadores para el campamento.',                        NULL, 'HEALTHY', '2026-01-22 08:00:00'),
(18, 3, 4, 'GAM-00004', 'Dra. Andrea Salas Mora',    39, 'AB+','Médico cirujano. También conoce medicina de campo bajo condiciones extremas.',                  NULL, 'HEALTHY', '2026-01-22 08:30:00'),
(19, 3, 7, 'GAM-00005', 'Carlos Espinoza Leiva',     33, 'O-', 'Cazador urbano. Experto en rastreo dentro de edificios abandonados.',                           NULL, 'INJURED', '2026-01-23 07:00:00'),
(20, 3, 1, 'GAM-00006', 'Mariela Ugalde Sánchez',    37, 'A+', 'Agrónoma. Cultiva vegetales en espacios urbanos reducidos con técnicas hidropónicas.',          NULL, 'HEALTHY', '2026-01-23 07:30:00');


-- ============================================================
-- 7. ADMISSION REQUESTS
-- ============================================================
-- Flujos: ACCEPTED (con persona creada), REJECTED, PENDING
INSERT INTO `admission_requests` (`id`, `camp_id`, `applicant_name`, `applicant_age`, `applicant_skills`, `health_notes`, `background_notes`, `photo_url`, `id_card_url`, `ai_decision`, `ai_reasoning`, `ai_suggested_profession`, `reviewed_by`, `final_decision`, `reviewed_at`, `created_at`) VALUES
-- Solicitud aceptada → persona id 20 (Mariela, Gamma)
(1, 3, 'Mariela Ugalde Sánchez', 37, 'Agrónoma, hidroponía urbana', 'Sin heridas visibles. Buen estado físico general.', 'Llegó sola desde zona norte. No tiene antecedentes conflictivos.', 'https://storage.gdf.io/photos/req1.jpg', 'https://storage.gdf.io/ids/req1_id.jpg',
 'ACCEPTED',
 'La solicitante posee habilidades agrónomas relevantes. La capacidad de hidroponía en espacios urbanos es crítica para Gamma dado su ubicación en la ciudad. Sin señales de infección. Nivel de riesgo: BAJO. Recomendación: ACEPTAR con rol de farmer.',
 'farmer', 9, 'ACCEPTED', '2026-01-23 07:00:00', '2026-01-22 21:00:00'),

-- Solicitud rechazada por IA y confirmada
(2, 1, 'Roberto Vargas Monge', 19, 'Ninguna habilidad especial declarada', 'Presenta rasguños en el brazo derecho de origen dudoso. Fiebre leve.', 'No puede explicar su ruta de llegada. Evasivo en preguntas.', 'https://storage.gdf.io/photos/req2.jpg', NULL,
 'REJECTED',
 'El solicitante presenta síntomas compatibles con etapas tempranas de infección: fiebre, rasguños de origen desconocido y comportamiento evasivo. Nivel de riesgo: ALTO. Recomendación: RECHAZAR. No admitir hasta obtener confirmación médica externa.',
 NULL, 1, 'REJECTED', '2026-02-01 11:30:00', '2026-02-01 10:00:00'),

-- Solicitud pendiente de revisión humana (IA sugirió aceptar)
(3, 2, 'Fernando Ulate Brenes', 45, 'Mecánico automotriz, electrónica básica', 'Saludable. Sin heridas visibles.', 'Llegó con un grupo de 3 personas. Conoce la ruta del depósito norte.', 'https://storage.gdf.io/photos/req3.jpg', 'https://storage.gdf.io/ids/req3_id.jpg',
 'ACCEPTED',
 'El solicitante tiene habilidades técnicas de alto valor: mecánica y electrónica. Campamento Beta carece de ingenieros. Sin señales de riesgo. Nivel de riesgo: MUY BAJO. Recomendación: ACEPTAR, asignar como engineer.',
 'engineer', NULL, 'PENDING', NULL, '2026-03-12 18:00:00'),

-- Solicitud pendiente, IA la dejó en PENDING por información insuficiente
(4, 1, 'Ana Cecilia Mora Rojas', 31, 'Enfermera', 'No presenta síntomas de infección.', 'Llegó sola. Dice venir del hospital regional pero no tiene documentos.', NULL, NULL,
 'PENDING',
 'Información insuficiente para determinar riesgo. La habilidad de enfermería es valiosa pero no se pudo verificar su procedencia. Se recomienda mantener en cuarentena 48 horas antes de decisión final.',
 'medic', NULL, 'PENDING', NULL, '2026-03-13 06:30:00');


-- ============================================================
-- 8. PERSON STATUS LOG
-- ============================================================
-- Documenta cambios de estado de sobrevivientes
INSERT INTO `person_status_log` (`id`, `person_id`, `old_status`, `new_status`, `reason`, `changed_by`, `changed_at`) VALUES
-- Tomás (id 6, Alfa) se hirió en el perímetro
(1, 6, 'HEALTHY', 'INJURED', 'Herida de corte en el antebrazo derecho durante defensa del sector 3. Atendido por el Dr. Campos.', 1, '2026-03-10 14:20:00'),
-- Diego (id 8, Alfa) salió en expedición → AWAY
(2, 8, 'HEALTHY', 'AWAY', 'Partió en expedición EXP-001 hacia el depósito de la carretera 32.', 3, '2026-03-08 06:00:00'),
-- Dra. Viviana (id 12, Beta) cayó enferma
(3, 12, 'HEALTHY', 'SICK', 'Fiebre alta post-exposición en el exterior. Diagnóstico: infección bacteriana. En tratamiento.', 5, '2026-03-11 09:00:00'),
-- Carlos Espinoza (id 19, Gamma) herido en cacería urbana
(4, 19, 'HEALTHY', 'INJURED', 'Tobillo torcido al caer desde segundo piso durante rastreo en edificio 14. Inmovilizado por 5 días.', 9, '2026-03-12 16:00:00');


-- ============================================================
-- 9. PROFESSION REASSIGNMENT LOG
-- ============================================================
-- Carlos (id 19) está lesionado → guardias de Gamma lo cubren temporalmente
-- La médica de Beta (id 12) enferma → se reasigna a un farmer temporalmente
INSERT INTO `profession_reassignment_log` (`id`, `person_id`, `from_profession_id`, `to_profession_id`, `reason`, `start_date`, `end_date`) VALUES
-- Carlos (hunter id 7) → guard (id 3) temporalmente por lesión de Carlos Espinoza
(1, 16, 2, 3, 'Carlos Espinoza (hunter) lesionado. Silvia Cordero cubre patrullaje temporalmente hasta su recuperación.', '2026-03-12', NULL),
-- En Beta, la médica (id 12) está enferma. Mariela de Gamma no aplica aquí,
-- así que en Beta se mueve al cook (id 13, Ricardo) a apoyar en medicina básica temporalmente
(2, 13, 6, 4, 'Dra. Viviana Castro enferma. Ricardo Soto tiene conocimientos básicos de primeros auxilios. Cubre consultas menores hasta recuperación de la doctora.', '2026-03-11', NULL);


-- ============================================================
-- 10. RESOURCE TYPES
-- ============================================================
-- id: 1=food, 2=water, 3=medicine, 4=ammo, 5=hygiene
INSERT INTO `resource_type` (`id`, `name`, `unit`, `daily_ration`, `minimum_stock`, `auto_daily`) VALUES
(1, 'Comida',    'kg',     0.60, 50.00,  1),
(2, 'Agua',      'litros', 2.00, 200.00, 1),
(3, 'Medicina',  'unidad', 0.10, 30.00,  0),
(4, 'Munición',  'unidad', 2.00, 100.00, 0),
(5, 'Higiene',   'unidad', 0.20, 25.00,  0);


-- ============================================================
-- 11. PROFESSIONS → RESOURCE AMOUNTS
--     Cuánto produce/consume cada profesión por día
-- ============================================================
-- (profession_id, resource_type_id, amount)
-- Positive amounts represent daily gain contributed by that profession
INSERT INTO `professions_resources_amounts` (`professions_id`, `resource_type_id`, `amount`) VALUES
-- farmer produce comida
(1, 1, 4.00),
-- scout produce comida y agua al regresar (promedio diario mientras está en base)
(2, 1, 1.00),
(2, 2, 2.00),
-- guard consume munición
(3, 4, 1.00),
-- medic consume medicina e higiene
(4, 3, 0.50),
(4, 5, 0.30),
-- engineer no produce recursos base (0 registros, usa solo la ración estándar)
-- cook produce comida extra
(6, 1, 3.00),
-- hunter produce comida y consume munición
(7, 1, 2.50),
(7, 4, 1.50);


-- ============================================================
-- 12. INVENTORY  (stock actual por campamento)
-- ============================================================
INSERT INTO `inventory` (`id`, `camp_id`, `resource_type_id`, `quantity`, `last_updated`) VALUES
-- Alfa
(1,  1, 1, 180.00, '2026-03-13 06:00:00'),
(2,  1, 2, 520.00, '2026-03-13 06:00:00'),
(3,  1, 3,  45.00, '2026-03-13 06:00:00'),
(4,  1, 4, 320.00, '2026-03-13 06:00:00'),
(5,  1, 5,  60.00, '2026-03-13 06:00:00'),
-- Beta  (agua abundante por costa, munición baja → alerta)
(6,  2, 1, 140.00, '2026-03-13 06:00:00'),
(7,  2, 2, 980.00, '2026-03-13 06:00:00'),
(8,  2, 3,  28.00, '2026-03-13 06:00:00'),  -- por debajo del mínimo 30 → alerta
(9,  2, 4,  85.00, '2026-03-13 06:00:00'),  -- por debajo del mínimo 100 → alerta
(10, 2, 5,  40.00, '2026-03-13 06:00:00'),
-- Gamma (ciudad, comida escasa → alerta)
(11, 3, 1,  42.00, '2026-03-13 06:00:00'),  -- por debajo del mínimo 50 → alerta
(12, 3, 2, 310.00, '2026-03-13 06:00:00'),
(13, 3, 3,  55.00, '2026-03-13 06:00:00'),
(14, 3, 4, 650.00, '2026-03-13 06:00:00'),  -- Gamma es fuerte militarmente
(15, 3, 5,  22.00, '2026-03-13 06:00:00');  -- por debajo del mínimo 25 → alerta


-- ============================================================
-- 13. INVENTORY LOG
-- ============================================================
INSERT INTO `inventory_log` (`id`, `camp_id`, `resource_type_id`, `logged_by`, `log_type`, `delta`, `logged_at`, `description`) VALUES
-- === ALFA – día 12 de marzo ===
-- Ganancia diaria automática (farmers + cook + hunter en base)
(1,  1, 1, NULL, 'DAILY_GAIN',   +11.50, '2026-03-12 06:00:00', 'Ganancia diaria: 2 farmers (8.00) + 1 cook (3.00) + 1 hunter parcial (0.50)'),
(2,  1, 2, NULL, 'DAILY_GAIN',   +2.00,  '2026-03-12 06:00:00', 'Ganancia diaria: scout en base aporta agua'),
-- Ración diaria automática (8 personas × ración estándar)
(3,  1, 1, NULL, 'DAILY_RATION', -4.80,  '2026-03-12 07:00:00', 'Ración diaria: 8 personas × 0.60 kg comida'),
(4,  1, 2, NULL, 'DAILY_RATION', -16.00, '2026-03-12 07:00:00', 'Ración diaria: 8 personas × 2.00 L agua'),
-- Ingreso manual de suministros encontrados
(5,  1, 4, 4,    'MANUAL_IN',    +50.00, '2026-03-12 10:00:00', 'Ingreso de munición encontrada en bodega sector 2 por Diego Alvarado'),
-- Salida por traslado hacia Beta (ver camp_transfer id 3)
(6,  1, 1, 2,    'TRANSFER_OUT', -30.00, '2026-03-10 08:00:00', 'Traslado aprobado CT-003: envío de comida a Campamento Beta'),
(7,  1, 4, 2,    'TRANSFER_OUT', -80.00, '2026-03-10 08:00:00', 'Traslado aprobado CT-003: envío de munición a Campamento Beta'),

-- === BETA – día 12 de marzo ===
(8,  2, 1, NULL, 'DAILY_GAIN',   +7.00,  '2026-03-12 06:00:00', 'Ganancia diaria: 1 farmer (4.00) + 1 cook (3.00)'),
(9,  2, 2, NULL, 'DAILY_GAIN',   +4.00,  '2026-03-12 06:00:00', 'Ganancia diaria: 2 scouts en base aportan agua'),
(10, 2, 1, NULL, 'DAILY_RATION', -3.60,  '2026-03-12 07:00:00', 'Ración diaria: 6 personas × 0.60 kg comida'),
(11, 2, 2, NULL, 'DAILY_RATION', -12.00, '2026-03-12 07:00:00', 'Ración diaria: 6 personas × 2.00 L agua'),
-- Ingreso de traslado desde Alfa
(12, 2, 1, 6,    'TRANSFER_IN',  +30.00, '2026-03-10 16:00:00', 'Recepción aprobada CT-003: comida recibida de Campamento Alfa'),
(13, 2, 4, 6,    'TRANSFER_IN',  +80.00, '2026-03-10 16:00:00', 'Recepción aprobada CT-003: munición recibida de Campamento Alfa'),

-- === GAMMA – día 12 de marzo ===
(14, 3, 1, NULL, 'DAILY_GAIN',   +4.00,  '2026-03-12 06:00:00', 'Ganancia diaria: 1 farmer (4.00)'),
(15, 3, 2, NULL, 'DAILY_GAIN',   +2.00,  '2026-03-12 06:00:00', 'Ganancia diaria: 1 scout aporta agua'),
(16, 3, 1, NULL, 'DAILY_RATION', -3.60,  '2026-03-12 07:00:00', 'Ración diaria: 6 personas × 0.60 kg comida'),
(17, 3, 2, NULL, 'DAILY_RATION', -12.00, '2026-03-12 07:00:00', 'Ración diaria: 6 personas × 2.00 L agua'),
-- Salida de recursos en expedición
(18, 3, 1, 11,   'EXPEDITION_OUT', -8.00, '2026-03-11 05:30:00', 'Raciones asignadas a expedición EXP-002 (4 scouts × 2 días)'),
(19, 3, 4, 11,   'EXPEDITION_OUT', -20.00,'2026-03-11 05:30:00', 'Munición asignada a expedición EXP-002 para defensa en ruta'),
-- Retorno de expedición con recursos encontrados
(20, 3, 1, 11,   'EXPEDITION_IN',  +35.00,'2026-03-13 07:00:00', 'Recursos traídos por expedición EXP-002: comida enlatada del supermercado norte');


-- ============================================================
-- 14. CONTRIBUTION OVERRIDES
-- ============================================================
-- Tomás (id 6, cocinero de Alfa) está herido, no puede cocinar al 100%
INSERT INTO `contribution_overrides` (`id`, `person_id`, `resource_type_id`, `reason`, `start_date`, `end_date`, `created_by`, `amount`) VALUES
(1, 6, 1, 'Herida en antebrazo. Solo puede supervisar, no cocinar activamente. Aporte reducido de 3.00 a 1.00 kg/día.', '2026-03-10', NULL, 2, 1.00);


-- ============================================================
-- 15. EXPEDITIONS
-- ============================================================
INSERT INTO `expeditions` (`id`, `camp_id`, `destination`, `status`, `created_by`, `departure_date`, `expected_return_date`, `actual_return_date`, `max_return_date`, `notes`, `created_at`) VALUES
-- Alfa: expedición de Diego (hunter) ya en curso → status ONGOING
(1, 1, 'Depósito de carretera 32, zona forestal norte', 'ONGOING',   3, '2026-03-08', '2026-03-14', NULL,         '2026-03-17', 'Buscar comida enlatada y herramientas. Hunter principal: Diego Alvarado.', '2026-03-07 18:00:00'),
-- Gamma: expedición completada y regresada hoy
(2, 3, 'Supermercado norte, bloque 12, ruinas Gamma',   'RETURNED',  11, '2026-03-11', '2026-03-13', '2026-03-13', '2026-03-15', 'Reconocimiento de supermercado. Regresaron con comida enlatada.', '2026-03-10 20:00:00'),
-- Beta: expedición planeada para la próxima semana
(3, 2, 'Puerto viejo, bodegas de suministros costeros', 'PLANNED',   7, '2026-03-20', '2026-03-23', NULL,         '2026-03-26', 'Reconocimiento del puerto. Buscar agua embotellada y medicinas.', '2026-03-13 07:00:00');


-- ============================================================
-- 16. EXPEDITION MEMBERS
-- ============================================================
INSERT INTO `expedition_members` (`expedition_id`, `person_id`) VALUES
-- EXP-001 (Alfa): Diego + Patricia (scouts y hunter)
(1, 8),   -- Diego (hunter, AWAY)
(1, 7),   -- Patricia (scout)
-- EXP-002 (Gamma): Silvia + Carlos (antes de lesionarse) → Carlos regresó lesionado
(2, 16),  -- Silvia Cordero
(2, 19),  -- Carlos Espinoza (se lesionó en esta expedición)
-- EXP-003 (Beta, planeada): Isabel
(3, 11);  -- Isabel Brenes


-- ============================================================
-- 17. EXPEDITION ALLOCATED RESOURCES
-- ============================================================
INSERT INTO `expedition_allocated_resources` (`expedition_id`, `resource_type_id`, `amount`) VALUES
-- EXP-001 Alfa: raciones de comida y agua para el viaje
(1, 1, 6.00),   -- 2 personas × 3 días comida
(1, 2, 12.00),  -- 2 personas × 3 días agua
(1, 4, 30.00),  -- munición de defensa
-- EXP-002 Gamma: lo que salió en inventory_log
(2, 1, 8.00),
(2, 4, 20.00),
-- EXP-003 Beta (planeada): estimado
(3, 1, 9.00),   -- 1 persona × 3 días + margen
(3, 2, 18.00),
(3, 4, 15.00);


-- ============================================================
-- 18. EXPEDITION FOUND RESOURCES
-- ============================================================
INSERT INTO `expedition_found_resources` (`expedition_id`, `resource_type_id`, `amount`) VALUES
-- EXP-002 Gamma: lo que trajeron (coincide con inventory_log id 20)
(2, 1,  35.00),  -- comida enlatada
(2, 3,  12.00),  -- medicinas encontradas
(2, 5,   8.00);  -- productos de higiene


-- ============================================================
-- 19. CAMP TRANSFERS
-- ============================================================
-- CT-001: Beta pide personas a Alfa (PENDING)
-- CT-002: Gamma pide munición a Beta (REJECTED)
-- CT-003: Beta pide recursos a Alfa (COMPLETED) → ya reflejado en inventory_log
-- CT-004: Alfa pide médico a Gamma (APPROVED_SOURCE, pendiente aprobación Gamma)
INSERT INTO `camp_transfers` (`id`, `requesting_camp`, `target_camp`, `status`, `type`, `notes`, `requested_by`, `leader_person_id`, `scheduled_delivery_date`, `approved_by_source`, `approved_by_target`, `approved_source_at`, `approved_target_at`, `created_at`) VALUES
-- CT-001: Beta solicita envío de personas expertas desde Alfa (PENDING)
(1, 2, 1, 'PENDING', 'PERSON', 'Necesitamos un engineer. Tenemos escasez de personal técnico.', 5, NULL, NULL, NULL, NULL, NULL, NULL, '2026-03-12 10:00:00'),

-- CT-002: Gamma solicita munición a Beta (REJECTED – Beta no tiene suficiente)
(2, 3, 2, 'REJECTED', 'RESOURCE', 'Solicitud de 100 unidades de munición. Beta tenía stock bajo y rechazó.', 9, NULL, NULL, 6, 5, '2026-03-09 09:00:00', '2026-03-09 14:00:00', '2026-03-08 18:00:00'),

-- CT-003: Beta solicita comida y munición a Alfa (COMPLETED)
(3, 2, 1, 'COMPLETED', 'RESOURCE', 'Préstamo de recursos urgente. Beta comprometió devolución antes del 30 de marzo.', 5, 7, '2026-03-30 12:00:00', 6, 2, '2026-03-09 10:00:00', '2026-03-10 07:00:00', '2026-03-08 16:00:00'),

-- CT-004: Alfa solicita apoyo médico de Gamma (APPROVED_SOURCE – esperando a Gamma)
(4, 1, 3, 'APPROVED_SOURCE', 'PERSON', 'Tomás herido y el Dr. Campos está al límite. Necesitamos apoyo médico temporal.', 1, 15, NULL, 2, NULL, '2026-03-13 06:00:00', NULL, '2026-03-12 22:00:00');


-- ============================================================
-- 20. CAMP TRANSFER ITEMS
-- ============================================================
INSERT INTO `camp_transfer_item` (`id`, `camp_transfer_id`, `item_type`, `resource_type_id`, `person_id`, `quantity`) VALUES
-- CT-001: Beta pide 1 engineer (person)
(1, 1, 'PERSON',   NULL, NULL, NULL),  -- se llenará person_id cuando se apruebe

-- CT-003 (COMPLETED): comida y munición enviadas de Alfa a Beta
(2, 3, 'RESOURCE', 1,    NULL, 30.00),  -- 30 kg comida
(3, 3, 'RESOURCE', 4,    NULL, 80.00),  -- 80 unidades munición

-- CT-004: Alfa pide a la Dra. Andrea Salas de Gamma (id 18)
(4, 4, 'PERSON',   NULL, 18,   NULL);


-- ============================================================
-- 21. ACHIEVEMENTS
-- ============================================================
INSERT INTO `achievements` (`id`, `name`, `description`, `icon_url`, `trigger_rule`) VALUES
(1, 'Primera Expedición',       'Completaste tu primera expedición y regresaste con vida.',          'https://storage.gdf.io/icons/first_expedition.png',    'first_expedition_returned'),
(2, 'Guardián del Perímetro',   'Llevas 30 días consecutivos defendiendo el campamento.',             'https://storage.gdf.io/icons/guardian.png',             'guard_30_days_streak'),
(3, 'Manos que Alimentan',      'Produjiste más de 100 kg de comida acumulada.',                     'https://storage.gdf.io/icons/farmer_100kg.png',         'farmer_100kg_produced'),
(4, 'Negociador de la Última Hora', 'Aprobaste un traslado de recursos en menos de 24 horas.',       'https://storage.gdf.io/icons/negotiator.png',           'transfer_approved_under_24h'),
(5, 'Médico de Guerra',         'Atendiste a más de 5 personas heridas o enfermas.',                 'https://storage.gdf.io/icons/medic_war.png',            'medic_5_patients'),
(6, 'Superviviente Nato',       'Llevas más de 60 días en el sistema sin ser marcado DEAD.',         'https://storage.gdf.io/icons/survivor.png',             'alive_60_days'),
(7, 'Explorador Élite',         'Completaste 3 o más expediciones exitosas.',                        'https://storage.gdf.io/icons/elite_scout.png',          'scout_3_expeditions'),
(8, 'Stock Crítico Evitado',    'Reabasteciste un recurso que estaba por debajo del mínimo.',        'https://storage.gdf.io/icons/stock_saved.png',          'resource_restocked_from_critical');


-- ============================================================
-- 22. USER ACHIEVEMENTS
-- ============================================================
INSERT INTO `user_achievements` (`id`, `user_id`, `achievement_id`, `earned_at`) VALUES
-- alfa_viajes (user 3) aprobó traslado CT-003 rápido → Negociador
(1, 3, 4, '2026-03-09 10:30:00'),
-- beta_recursos (user 6) reabastece recursos → Stock Crítico Evitado
(2, 6, 8, '2026-03-10 16:30:00'),
-- alfa_admin (user 1) lleva más de 60 días → Superviviente Nato
(3, 1, 6, '2026-03-06 00:00:00'),
-- beta_admin (user 5) lleva más de 60 días
(4, 5, 6, '2026-03-13 00:00:00'),
-- gamma_viajes (user 11) completó expedición EXP-002 → Primera Expedición
(5, 11, 1, '2026-03-13 07:30:00'),
-- gamma_admin (user 9) lleva más de 60 días
(6, 9, 6, '2026-03-21 00:00:00');


SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- FIN DEL SEED
-- Campamentos activos: 3
-- Usuarios del sistema: 12
-- Sobrevivientes registrados: 20
-- Solicitudes de admisión: 4
-- Tipos de recursos: 5
-- Expediciones: 3
-- Traslados entre campamentos: 4
-- Logros desbloqueados: 6
-- ============================================================
