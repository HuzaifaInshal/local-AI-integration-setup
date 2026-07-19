import { query } from './connection.js';

export interface ColumnMetadata {
  column: string;
  type: string;
  nullable: boolean;
}

export interface SchemaMap {
  [tableName: string]: ColumnMetadata[];
}

export async function getTablesAndColumns(): Promise<SchemaMap> {
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
  const tables: SchemaMap = {};
  
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

export async function getDBSchemaPrompt(): Promise<string> {
  const tables = await getTablesAndColumns();
  
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
    console.error("Error fetching foreign keys list:", err);
  }

  let schemaPrompt = "";
  
  for (const tableName of Object.keys(tables)) {
    schemaPrompt += `Table: ${tableName}\nColumns:\n`;
    tables[tableName].forEach((col) => {
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
