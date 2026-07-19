import axios from 'axios';
import { config } from '../config/env.js';

export interface ChatCompletionMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export async function callAIServer(messages: ChatCompletionMessage[], temperature = 0.0): Promise<string> {
  const url = `${config.AI_SERVER_URL}/generate`;
  try {
    const response = await axios.post(url, {
      messages,
      temperature,
      max_new_tokens: 512
    });
    
    if (response.data && response.data.success) {
      return response.data.response;
    } else {
      throw new Error(response.data.error_message || "Unknown model exception");
    }
  } catch (error: any) {
    console.error("AI Completion Request Failed:", error.message);
    throw new Error(`AI Server connection failed: ${error.message}`);
  }
}
