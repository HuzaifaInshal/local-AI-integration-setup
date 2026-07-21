import express from 'express';
import cors from 'cors';
import { config } from './config/env.js';
import { initPool } from './db/connection.js';
import { handleConnectDB, handleGetSchema } from './controllers/dbController.js';
import { handleNl2SqlChat, handleGeneralChat } from './controllers/chatController.js';
import { handleQueryAnalytics } from './controllers/analyticsController.js';

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
app.post('/api/analytics/query', handleQueryAnalytics);

app.get('/health', (req, res) => {
  res.json({ 
    status: "healthy", 
    llmServerUrl: config.LLM_SERVER_URL,
    embeddingServerUrl: config.EMBEDDING_SERVER_URL,
    rerankerServerUrl: config.RERANKER_SERVER_URL,
    port: config.PORT
  });
});

app.listen(config.PORT, () => {
  console.log(`Modular Express Backend running on port ${config.PORT}`);
});
