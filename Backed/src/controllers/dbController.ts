import { Request, Response } from 'express';
import { testConnection } from '../db/connection.js';
import { getTablesAndColumns } from '../db/schema.js';

export async function handleConnectDB(req: Request, res: Response) {
  const { connectionString } = req.body;
  if (!connectionString) {
    return res.status(400).json({ success: false, error: "Connection string is required." });
  }
  
  try {
    const success = await testConnection(connectionString);
    res.json({ success, message: "Database connected successfully!" });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function handleGetSchema(req: Request, res: Response) {
  try {
    const schema = await getTablesAndColumns();
    res.json({ success: true, schema });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}
