import * as mariadb from 'mariadb';
import { dbConfig } from '../config/db.config.js';

export const pool = mariadb.createPool(dbConfig);

export const query = async (sql: string, params?: unknown[]) => {
  let conn: mariadb.PoolConnection | undefined;

  try {
    conn = await pool.getConnection();
    const result = await conn.query(sql, params);
    return result;
  } catch (error) {
    console.error('Database error:', error);
    throw error;
  } finally {
    if (conn) conn.release();
  }
};

export const testConnection = async () => {
  try {
    const conn = await pool.getConnection();
    console.log('Database connected');
    conn.release();
  } catch (error) {
    console.error('Database connection failed:', error);
  }
};
