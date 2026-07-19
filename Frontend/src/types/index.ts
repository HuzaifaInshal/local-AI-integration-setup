export interface ColumnMetadata {
  column: string;
  type: string;
  nullable: boolean;
}

export interface DatabaseSchema {
  [tableName: string]: ColumnMetadata[];
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  sql?: string;
  results?: any[];
  error?: string;
  timestamp: string; // ISO string
}

export interface ConnectionResponse {
  success: boolean;
  message: string;
  error?: string;
}

export interface ChatResponse {
  success: boolean;
  sql: string;
  executed: boolean;
  results: any[];
  error?: string;
  aiResponse: string;
}
