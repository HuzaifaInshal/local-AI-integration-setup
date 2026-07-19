import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

let pool: pg.Pool | null = null;
let currentDbUrl: string = process.env.DATABASE_URL || '';

// Initialize pool
export function initPool(connectionString?: string) {
  if (pool) {
    pool.end();
  }

  const url = connectionString || currentDbUrl;
  if (!url) {
    console.warn("No DATABASE_URL configured yet.");
    return null;
  }

  currentDbUrl = url;
  pool = new pg.Pool({
    connectionString: url,
    // Add brief timeout for local queries
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
  });

  pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
  });

  return pool;
}

// Ensure pool is initialized
function getPool(): pg.Pool {
  if (!pool) {
    const initialized = initPool();
    if (!initialized) {
      throw new Error("Database pool not initialized. Please connect first.");
    }
  }
  return pool!;
}

// Test database connection
export async function testConnection(connectionString: string): Promise<boolean> {
  const tempPool = new pg.Pool({
    connectionString,
    connectionTimeoutMillis: 5000,
  });

  try {
    const client = await tempPool.connect();
    client.release();
    await tempPool.end();
    
    // If successful, update our active pool
    initPool(connectionString);
    return true;
  } catch (error) {
    await tempPool.end();
    throw error;
  }
}

// Execute query (read-only enforcement is done in caller or by connection privileges)
export async function query(text: string, params?: any[]) {
  const activePool = getPool();
  return activePool.query(text, params);
}

// Fetch schema for Frontend UI
export async function getTablesAndColumns() {
  const sql = `
    SELECT 
      table_name, 
      column_name, 
      data_type, 
      is_nullable
    FROM 
      information_schema.columns
    WHERE 
      table_schema = 'public'
    ORDER BY 
      table_name, ordinal_position;
  `;
  
  const res = await query(sql);
  const tables: Record<string, any[]> = {};
  
  res.rows.forEach((row: any) => {
    if (!tables[row.table_name]) {
      tables[row.table_name] = [];
    }
    tables[row.table_name].push({
      column: row.column_name,
      type: row.data_type,
      nullable: row.is_nullable === 'YES'
    });
  });
  
  return tables;
}

// Fetch schema in Markdown format for the AI prompt
export async function getDBSchemaPrompt(): Promise<string> {
  const tables = await getTablesAndColumns();
  
  // Get foreign keys for relations
  const fkSql = `
    SELECT
        tc.table_name, 
        kcu.column_name, 
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name 
    FROM 
        information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema='public';
  `;
  
  let foreignKeys: any[] = [];
  try {
    const fkRes = await query(fkSql);
    foreignKeys = fkRes.rows;
  } catch (err) {
    console.error("Error fetching foreign keys schema", err);
  }

  let schemaPrompt = "";
  
  for (const tableName of Object.keys(tables)) {
    schemaPrompt += `Table: ${tableName}\nColumns:\n`;
    tables[tableName].forEach((col: any) => {
      // Check if this column is a foreign key
      const fk = foreignKeys.find(
        (f) => f.table_name === tableName && f.column_name === col.column
      );
      if (fk) {
        schemaPrompt += `  - ${col.column} (${col.type}) -> references ${fk.foreign_table_name}(${fk.foreign_column_name})\n`;
      } else {
        schemaPrompt += `  - ${col.column} (${col.type})\n`;
      }
    });
    schemaPrompt += "\n";
  }
  
  return schemaPrompt || "No tables found in public schema.";
}
