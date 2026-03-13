import { pool } from '../connection.js';

async function seed() {
  const conn = await pool.getConnection();

  try {
    console.log('🌱 Running database seed...');

    await conn.beginTransaction();

    // SYSTEM CONFIG
    await conn.query(`
      INSERT INTO system_config (id, version, server_time)
      VALUES (1, '1.0.0', NOW())
      ON DUPLICATE KEY UPDATE version = VALUES(version)
    `);

    // CAMPS
    await conn.query(`
      INSERT INTO camps (name, location)
      VALUES
      ('Alexandria', 'Virginia'),
      ('Hilltop Colony', 'Virginia'),
      ('Kingdom', 'Washington DC')
      ON DUPLICATE KEY UPDATE location = VALUES(location)
    `);

    // ROLES
    await conn.query(`
      INSERT INTO roles (name, description)
      VALUES
      ('system_admin','Full system access'),
      ('resource_manager','Manages inventory'),
      ('travel_coordinator','Handles expeditions'),
      ('worker','Regular worker')
      ON DUPLICATE KEY UPDATE description = VALUES(description)
    `);

    // PROFESSIONS
    await conn.query(`
      INSERT INTO professions (name, description)
      VALUES
      ('scout','Explores outside areas'),
      ('farmer','Produces food'),
      ('guard','Defends the camp'),
      ('engineer','Maintains equipment'),
      ('medic','Medical specialist')
      ON DUPLICATE KEY UPDATE description = VALUES(description)
    `);

    // RESOURCE TYPES
    await conn.query(`
      INSERT INTO resource_type (name, unit, daily_ration, minimum_stock, auto_daily)
      VALUES
      ('food','kg',1,100,1),
      ('water','liters',2,200,1),
      ('medicine','units',0.1,20,0),
      ('hygiene','units',0.2,30,0),
      ('ammo','units',0,50,0)
      ON DUPLICATE KEY UPDATE
      unit = VALUES(unit),
      daily_ration = VALUES(daily_ration),
      minimum_stock = VALUES(minimum_stock)
    `);

    // ACHIEVEMENTS
    await conn.query(`
      INSERT INTO achievements (name, description, icon_url, trigger_rule)
      VALUES
      ('First Expedition','Send first expedition','icons/expedition.png','first_expedition_created'),
      ('Resource Manager','Maintain safe resources','icons/resources.png','inventory_safe')
      ON DUPLICATE KEY UPDATE description = VALUES(description)
    `);

    await conn.commit();

    console.log(' Seed completed successfully');
  } catch (err) {
    await conn.rollback();
    console.error(' Seed failed:', err);
  } finally {
    conn.release();
    process.exit();
  }
}

seed();
