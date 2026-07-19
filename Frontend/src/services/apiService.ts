import { API_BASE } from '../config/api';
import type { DatabaseSchema, ConnectionResponse, ChatResponse } from '../types';

export async function connectDatabase(connectionString: string): Promise<ConnectionResponse> {
  const res = await fetch(`${API_BASE}/connect`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ connectionString })
  });
  
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error ${res.status}`);
  }
  
  return res.json();
}

export async function fetchDatabaseSchema(): Promise<DatabaseSchema> {
  const res = await fetch(`${API_BASE}/schema`);
  
  if (!res.ok) {
    throw new Error(`HTTP error ${res.status} retrieving database schema`);
  }
  
  const data = await res.json();
  if (data.success) {
    return data.schema;
  } else {
    throw new Error(data.error || 'Failed to load database schema');
  }
}

export async function submitNlQuery(message: string, execute = true): Promise<ChatResponse> {
  const res = await fetch(`${API_BASE}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, execute })
  });
  
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error ${res.status}`);
  }
  
  return res.json();
}

export async function submitGeneralChat(messages: { role: string; content: string }[]): Promise<string> {
  const res = await fetch(`${API_BASE}/general-chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages })
  });
  
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error ${res.status}`);
  }
  
  const data = await res.json();
  if (data.success) {
    return data.response;
  } else {
    throw new Error(data.error || 'Server error during chat response');
  }
}
