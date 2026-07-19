import pg from 'pg';
import { config } from '../config/env.js';

let pool: pg.Pool | null = null;
let currentDbUrl: string = config.DATABASE_URL;

export function initPool(connectionString?: string) {
  if (pool) {
    pool.end();
  }

  const url = connectionString || currentDbUrl;
  if (!url) {
    console.warn("No database connection string provided.");
    return null;
  }

  currentDbUrl = url;
  pool = new pg.Pool({
    connectionString: url,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
  });

  pool.on('error', (err) => {
    console.error('Unexpected error on idle Postgres client:', err);
  });

  return pool;
}

export function getPool(): pg.Pool {
  if (!pool) {
    const initialized = initPool();
    if (!initialized) {
      throw new Error("PostgreSQL pool not initialized. Please connect a database first.");
    }
  }
  return pool!;
}

export async function testConnection(connectionString: string): Promise<boolean> {
  const tempPool = new pg.Pool({
    connectionString,
    connectionTimeoutMillis: 5000,
  });

  try {
    const client = await tempPool.connect();
    client.release();
    await tempPool.end();
    
    // Success, shift default pool to new settings
    initPool(connectionString);
    return true;
  } catch (error) {
    await tempPool.end();
    throw error;
  }
}

export async function query(text: string, params?: any[]) {
  const activePool = getPool();
  return activePool.query(text, params);
}
