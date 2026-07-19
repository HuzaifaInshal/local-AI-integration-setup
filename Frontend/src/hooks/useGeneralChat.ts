import { useState } from 'react';
import { submitGeneralChat } from '../services/apiService';

export interface ChatMessageItem {
  role: 'user' | 'assistant';
  content: string;
}

export function useGeneralChat() {
  const [generalMessages, setGeneralMessages] = useState<ChatMessageItem[]>([
    { role: 'assistant', content: 'Hello! I am your AI assistant running locally. How can I help you today?' }
  ]);
  const [generalLoading, setGeneralLoading] = useState<boolean>(false);

  const submitGeneralPrompt = async (content: string) => {
    if (!content.trim() || generalLoading) return;

    const userMsg: ChatMessageItem = { role: 'user', content };
    const updatedMessages = [...generalMessages, userMsg];
    
    setGeneralMessages(updatedMessages);
    setGeneralLoading(true);

    try {
      const responseText = await submitGeneralChat(updatedMessages);
      setGeneralMessages(prev => [...prev, { role: 'assistant', content: responseText }]);
    } catch (err: any) {
      setGeneralMessages(prev => [
        ...prev, 
        { role: 'assistant', content: `Request failed: ${err.message || 'Check Express backend connection'}` }
      ]);
    } finally {
      setGeneralLoading(false);
    }
  };

  return {
    generalMessages,
    generalLoading,
    submitGeneralPrompt
  };
}
