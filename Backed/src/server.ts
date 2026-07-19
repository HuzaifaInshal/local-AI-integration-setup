import express from 'express';
import cors from 'cors';
import { config } from './config/env.js';
import { initPool } from './db/connection.js';
import { handleConnectDB, handleGetSchema } from './controllers/dbController.js';
import { handleNl2SqlChat, handleGeneralChat } from './controllers/chatController.js';

const app = express();

app.use(cors());
app.use(express.json());

// Initialize dynamic pool on launch
initPool();

// Define clean REST resource paths
app.post('/api/connect', handleConnectDB);
app.get('/api/schema', handleGetSchema);
app.post('/api/chat', handleNl2SqlChat);
app.post('/api/general-chat', handleGeneralChat);

app.get('/health', (req, res) => {
  res.json({ 
    status: "healthy", 
    aiServerUrl: config.AI_SERVER_URL,
    port: config.PORT
  });
});

app.listen(config.PORT, () => {
  console.log(`Modular Express Backend running on port ${config.PORT}`);
});
