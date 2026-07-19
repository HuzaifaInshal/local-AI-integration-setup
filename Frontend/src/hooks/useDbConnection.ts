import { useState, useEffect, useCallback } from 'react';
import { connectDatabase, fetchDatabaseSchema } from '../services/apiService';
import type { DatabaseSchema } from '../types';

export function useDbConnection() {
  const [connectionString, setConnectionString] = useState<string>(
    'postgresql://postgres:postgres@localhost:5432/postgres'
  );
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [checking, setChecking] = useState<boolean>(false);
  const [connMessage, setConnMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [schema, setSchema] = useState<DatabaseSchema>({});
  const [schemaLoading, setSchemaLoading] = useState<boolean>(false);

  const refreshSchema = useCallback(async () => {
    setSchemaLoading(true);
    try {
      const data = await fetchDatabaseSchema();
      setSchema(data);
      setIsConnected(true);
    } catch (err) {
      setIsConnected(false);
      setSchema({});
      console.warn('Failed to load database schema:', err);
    } finally {
      setSchemaLoading(false);
    }
  }, []);

  const connect = async (connStr: string): Promise<boolean> => {
    setChecking(true);
    setConnMessage(null);
    try {
      const response = await connectDatabase(connStr);
      if (response.success) {
        setIsConnected(true);
        setConnMessage({ type: 'success', text: response.message || 'Connected successfully!' });
        setConnectionString(connStr);
        await refreshSchema();
        return true;
      } else {
        setIsConnected(false);
        setConnMessage({ type: 'error', text: response.error || 'Connection failed' });
        return false;
      }
    } catch (err: any) {
      setIsConnected(false);
      setConnMessage({ type: 'error', text: err.message || 'Network error connecting to Express' });
      return false;
    } finally {
      setChecking(false);
    }
  };

  // Attempt initial schema loading on mount
  useEffect(() => {
    refreshSchema();
  }, [refreshSchema]);

  return {
    connectionString,
    setConnectionString,
    isConnected,
    checking,
    connMessage,
    schema,
    schemaLoading,
    connect,
    refreshSchema
  };
}
