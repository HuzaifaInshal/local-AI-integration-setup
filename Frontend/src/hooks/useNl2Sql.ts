import { useState } from 'react';
import { submitNlQuery } from '../services/apiService';
import type { ChatMessage } from '../types';

export function useNl2Sql(isConnected: boolean) {
  const [nlChatHistory, setNlChatHistory] = useState<ChatMessage[]>([]);
  const [nlLoading, setNlLoading] = useState<boolean>(false);
  const [selectedChatIndex, setSelectedChatIndex] = useState<number | null>(null);
  const [outputTab, setOutputTab] = useState<'sql' | 'table' | 'chart'>('sql');

  const submitQuery = async (message: string) => {
    if (!message.trim() || nlLoading || !isConnected) return;

    const userMsg: ChatMessage = {
      role: 'user',
      content: message,
      timestamp: new Date().toISOString()
    };

    setNlChatHistory(prev => [...prev, userMsg]);
    setNlLoading(true);

    try {
      const data = await submitNlQuery(message, true);
      
      const aiMsg: ChatMessage = {
        role: 'assistant',
        content: data.aiResponse || (data.success ? 'Query processed successfully.' : 'Query failed.'),
        sql: data.sql || undefined,
        results: data.results || undefined,
        error: data.error || undefined,
        timestamp: new Date().toISOString()
      };

      setNlChatHistory(prev => {
        const nextHistory = [...prev, aiMsg];
        setSelectedChatIndex(nextHistory.length - 1);
        return nextHistory;
      });

      // Automatically switch to table tab if records are returned, otherwise to query SQL view
      if (data.results && data.results.length > 0) {
        setOutputTab('table');
      } else {
        setOutputTab('sql');
      }
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        role: 'assistant',
        content: `Connection failed: ${err.message || 'Check Express backend logs'}`,
        timestamp: new Date().toISOString()
      };
      setNlChatHistory(prev => {
        const nextHistory = [...prev, errorMsg];
        setSelectedChatIndex(nextHistory.length - 1);
        return nextHistory;
      });
      setOutputTab('sql');
    } finally {
      setNlLoading(false);
    }
  };

  return {
    nlChatHistory,
    setNlChatHistory,
    nlLoading,
    selectedChatIndex,
    setSelectedChatIndex,
    outputTab,
    setOutputTab,
    submitQuery
  };
}
