-- Migración Prisma para Sistema de Achievements
-- Fichero: prisma/migrations/20260526_add_achievement_system/migration.sql

-- 1. Tabla de Mapeo: Achievement -> Role
-- (Enlaza qué logros son válidos para qué roles)

CREATE TABLE achievement_roles (
  achievement_id INTEGER NOT NULL,
  role_id INTEGER NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (achievement_id, role_id),
  CONSTRAINT fk_achievement_roles_achievement 
    FOREIGN KEY (achievement_id) 
    REFERENCES achievements(id) 
    ON DELETE CASCADE 
    ON UPDATE CASCADE,
  CONSTRAINT fk_achievement_roles_role 
    FOREIGN KEY (role_id) 
    REFERENCES roles(id) 
    ON DELETE CASCADE 
    ON UPDATE CASCADE
);

CREATE INDEX idx_achievement_roles_role_id 
ON achievement_roles(role_id);

-- 2. Tabla de Notificaciones de Achievements
-- (Rastrea qué notificaciones se han enviado al usuario)

CREATE TABLE achievement_notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  achievement_id INTEGER NOT NULL,
  notification_sent BOOLEAN DEFAULT FALSE,
  sent_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_achievement_notifications_user 
    FOREIGN KEY (user_id) 
    REFERENCES users(id) 
    ON DELETE CASCADE 
    ON UPDATE CASCADE,
  CONSTRAINT fk_achievement_notifications_achievement 
    FOREIGN KEY (achievement_id) 
    REFERENCES achievements(id) 
    ON DELETE CASCADE 
    ON UPDATE CASCADE,

  UNIQUE (user_id, achievement_id, created_at)
);

CREATE INDEX idx_achievement_notifications_unsent 
ON achievement_notifications(notification_sent, created_at);

CREATE INDEX idx_achievement_notifications_user_id 
ON achievement_notifications(user_id);

-- 3. Tabla de Estadísticas de Achievement (Opcional para Performance)
-- Denormalización para queries rápidas de análisis

CREATE TABLE achievement_stats (
  id SERIAL PRIMARY KEY,
  achievement_id INTEGER NOT NULL,
  total_unlocks INTEGER DEFAULT 0,
  unlock_rate DECIMAL(5, 2) DEFAULT 0.00,
  average_unlock_days INTEGER DEFAULT 0,
  last_unlock_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_achievement_stats_achievement 
    FOREIGN KEY (achievement_id) 
    REFERENCES achievements(id) 
    ON DELETE CASCADE 
    ON UPDATE CASCADE,

  UNIQUE (achievement_id)
);

-- 4. Extender enum audit_log_action (si PostgreSQL)
-- (Para PostgreSQL, necesitamos ALTER TYPE)

DO $$
BEGIN
  -- Si el tipo no existe, crearlo con el valor nuevo ya incluido
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'audit_log_action') THEN
    CREATE TYPE audit_log_action AS ENUM (
      'CREATE_CAMP', 'UPDATE_CAMP', 'DELETE_CAMP',
      'CREATE_USER', 'UPDATE_USER', 'DELETE_USER',
      'CREATE_TRANSFER', 'APPROVE_TRANSFER_SOURCE', 
      'APPROVE_TRANSFER_TARGET', 'COMPLETE_TRANSFER', 'REJECT_TRANSFER',
      'LOGIN', 'LOGOUT',
      'CREATE_ADMISSION', 'REVIEW_ADMISSION', 'OVERRIDE_ADMISSION',
      'CREATE_EXPEDITION', 'UPDATE_EXPEDITION_STATUS', 'CANCEL_EXPEDITION',
      'CREATE_PERSON', 'UPDATE_PERSON', 'DELETE_PERSON',
      'CHANGE_PERSON_STATUS', 'REASSIGN_PROFESSION',
      'CREATE_OVERRIDE', 'MANUAL_INVENTORY_ADJUST',
      'ACHIEVEMENT_UNLOCKED'
    );
  ELSE
    -- Si ya existe, agregar solo si el valor no está presente
    IF NOT EXISTS (
      SELECT 1
      FROM pg_enum e
      JOIN pg_type t ON e.enumtypid = t.oid
      WHERE t.typname = 'audit_log_action' AND e.enumlabel = 'ACHIEVEMENT_UNLOCKED'
    ) THEN
      ALTER TYPE audit_log_action ADD VALUE 'ACHIEVEMENT_UNLOCKED';
    END IF;
  END IF;
END
$$;

-- 5. Agregar índices para queries de achievement performance

CREATE INDEX idx_user_achievements_user_id_earned 
ON user_achievements(user_id, earned_at DESC);

CREATE INDEX idx_user_achievements_achievement_id 
ON user_achievements(achievement_id);

CREATE INDEX idx_achievements_trigger_rule 
ON achievements(trigger_rule, deleted_at);

-- 6. Crear vista para análisis rápido de estadísticas

CREATE VIEW achievement_completion_stats AS
SELECT 
  a.id,
  a.name,
  a.trigger_rule,
  COUNT(DISTINCT ua.user_id) as total_unlocked,
  COUNT(DISTINCT u.id) as total_users,
  ROUND(
    (COUNT(DISTINCT ua.user_id)::DECIMAL / 
     NULLIF(COUNT(DISTINCT u.id), 0)) * 100, 
    2
  ) as completion_percentage,
  MIN(ua.earned_at) as first_unlock_at,
  MAX(ua.earned_at) as last_unlock_at

FROM achievements a
LEFT JOIN user_achievements ua ON a.id = ua.achievement_id
LEFT JOIN users u ON u.is_active = TRUE
WHERE a.deleted_at IS NULL

GROUP BY a.id, a.name, a.trigger_rule
ORDER BY completion_percentage DESC;

-- 7. Crear función para actualizar estadísticas automáticamente (PostgreSQL)

CREATE OR REPLACE FUNCTION update_achievement_stats()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE achievement_stats
  SET 
    total_unlocks = (
      SELECT COUNT(*) FROM user_achievements 
      WHERE achievement_id = NEW.achievement_id
    ),
    last_unlock_at = NEW.earned_at,
    updated_at = CURRENT_TIMESTAMP
  WHERE achievement_id = NEW.achievement_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_achievement_stats
AFTER INSERT ON user_achievements
FOR EACH ROW
EXECUTE FUNCTION update_achievement_stats();

-- 8. Insertar estadísticas iniciales

INSERT INTO achievement_stats (achievement_id, total_unlocks, updated_at)
SELECT id, 0, CURRENT_TIMESTAMP FROM achievements
WHERE id NOT IN (SELECT achievement_id FROM achievement_stats)
ON CONFLICT (achievement_id) DO NOTHING;
