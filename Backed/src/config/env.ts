import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config();

export const config = {
  PORT: parseInt(process.env.PORT || '5000', 10),
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/postgres',
  AI_SERVER_URL: process.env.AI_SERVER_URL || 'http://localhost:8000',
};

// Validate that database connection placeholder can be overwritten
if (!config.DATABASE_URL) {
  console.warn("WARNING: DATABASE_URL env variable is missing. Database integration will require active config injection from UI.");
}
