import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config();

export const config = {
  PORT: parseInt(process.env.PORT || '5000', 10),
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/postgres',
  LLM_SERVER_URL: process.env.LLM_SERVER_URL || 'http://localhost:8000',
  EMBEDDING_SERVER_URL: process.env.EMBEDDING_SERVER_URL || 'http://localhost:8000',
  RERANKER_SERVER_URL: process.env.RERANKER_SERVER_URL || 'http://localhost:8001',
  QDRANT_URL: process.env.QDRANT_URL || 'http://localhost:6333',
};

// Validate that database connection placeholder can be overwritten
if (!config.DATABASE_URL) {
  console.warn("WARNING: DATABASE_URL env variable is missing. Database integration will require active config injection from UI.");
}
