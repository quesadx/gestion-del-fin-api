-- Add missing permission rows for inventory_adjustment_requests workflow
INSERT INTO permissions (name, description, created_at, updated_at)
VALUES
  ('inventory_adjustment_requests.create', 'inventory adjustment requests create', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('inventory_adjustment_requests.read_own', 'inventory adjustment requests read own', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('inventory_adjustment_requests.read', 'inventory adjustment requests read', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('inventory_adjustment_requests.review', 'inventory adjustment requests review', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (name) DO NOTHING;

-- Assign to worker role: create + read_own
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'worker'
  AND p.name IN ('inventory_adjustment_requests.create', 'inventory_adjustment_requests.read_own')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Assign to resource_manager role: read + review
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'resource_manager'
  AND p.name IN ('inventory_adjustment_requests.read', 'inventory_adjustment_requests.review')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Assign all 4 to system_admin
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'system_admin'
  AND p.name IN (
    'inventory_adjustment_requests.create',
    'inventory_adjustment_requests.read_own',
    'inventory_adjustment_requests.read',
    'inventory_adjustment_requests.review'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;
