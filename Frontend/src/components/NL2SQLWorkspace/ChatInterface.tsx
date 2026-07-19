import { useState, useEffect, useRef } from 'react';
import { Database, Send, Loader2, Terminal } from 'lucide-react';
import type { ChatMessage } from '../../types';

interface ChatInterfaceProps {
  chatHistory: ChatMessage[];
  loading: boolean;
  selectedChatIndex: number | null;
  onSelectChat: (idx: number) => void;
  onSubmit: (message: string) => void;
  isConnected: boolean;
}

export function ChatInterface({ 
  chatHistory, 
  loading, 
  selectedChatIndex, 
  onSelectChat, 
  onSubmit, 
  isConnected 
}: ChatInterfaceProps) {
  const [input, setInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading || !isConnected) return;
    onSubmit(input);
    setInput('');
  };

  const handleSuggestClick = (prompt: string) => {
    if (loading || !isConnected) return;
    onSubmit(prompt);
  };

  return (
    <section className="flex-1 flex flex-col bg-[#060913] border-r border-[rgba(255,255,255,0.06)] h-full overflow-hidden">
      {/* Workspace Header */}
      <div className="px-6 py-4 border-b border-[rgba(255,255,255,0.06)] bg-[#070B14] flex-shrink-0">
        <h2 className="text-md font-bold text-white text-left">NL2SQL Assistant</h2>
        <p className="text-xs text-slate-500 text-left">Generate and execute Postgres queries using natural language</p>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {chatHistory.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto space-y-4">
            <div className="p-4 bg-indigo-500/10 rounded-full text-indigo-400 border border-indigo-500/20">
              <Database className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Ask your Database</h3>
              <p className="text-sm text-slate-500 mt-1">
                Type in plain English to build complex Postgres SELECT queries, retrieve records, and visualize analytics instantly.
              </p>
            </div>

            <div className="w-full grid grid-cols-1 gap-2 pt-2 text-left">
              <button 
                onClick={() => handleSuggestClick("Show all tables in public schema")}
                className="text-xs text-slate-400 hover:text-white p-3 rounded-lg border border-[rgba(255,255,255,0.05)] hover:border-indigo-500/30 bg-slate-900/20 hover:bg-slate-900/60 transition"
              >
                "Show all tables in public schema"
              </button>
              <button 
                onClick={() => handleSuggestClick("Select first 5 columns of the main table")}
                className="text-xs text-slate-400 hover:text-white p-3 rounded-lg border border-[rgba(255,255,255,0.05)] hover:border-indigo-500/30 bg-slate-900/20 hover:bg-slate-900/60 transition"
              >
                "Show structure or sample rows from database"
              </button>
            </div>
          </div>
        ) : (
          chatHistory.map((msg, idx) => (
            <div 
              key={idx} 
              onClick={() => msg.role === 'assistant' && onSelectChat(idx)}
              className={`flex flex-col p-4 rounded-xl border transition-all cursor-pointer ${
                msg.role === 'user'
                  ? 'bg-slate-800/25 border-[rgba(255,255,255,0.05)] ml-12 items-end'
                  : `border-[rgba(255,255,255,0.05)] mr-12 items-start ${
                      selectedChatIndex === idx 
                        ? 'bg-indigo-950/20 border-indigo-500/30 ring-1 ring-indigo-500/30' 
                        : 'bg-slate-900/30 hover:bg-slate-900/50'
                    }`
              }`}
            >
              <div className="flex items-center gap-2 mb-1.5 text-xs text-slate-400">
                <span className="font-semibold text-white">
                  {msg.role === 'user' ? 'You' : 'Nova AI'}
                </span>
                <span>•</span>
                <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              
              <div className="text-sm text-slate-200 text-left whitespace-pre-wrap w-full leading-relaxed">
                {msg.content.includes("```sql") ? msg.content.split("```sql")[0] : msg.content}
              </div>

              {msg.role === 'assistant' && msg.sql && (
                <div className="mt-3 flex items-center gap-1.5 text-xs text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded">
                  <Terminal className="w-3.5 h-3.5" />
                  <span>Generated SQL & Data Available</span>
                </div>
              )}
            </div>
          ))
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input panel */}
      <div className="p-4 border-t border-[rgba(255,255,255,0.06)] bg-[#070B14] flex-shrink-0">
        <form onSubmit={handleSubmit} className="flex gap-2 relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading || !isConnected}
            placeholder={
              isConnected 
                ? "Ask a question (e.g. 'Show me the oldest 5 users')..." 
                : "Connect your database to begin..."
            }
            className="flex-1 bg-[#0c1221] border border-[rgba(255,255,255,0.08)] rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={loading || !input.trim() || !isConnected}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-xl px-5 flex items-center justify-center transition-all shadow-[0_0_15px_rgba(99,102,241,0.2)] disabled:shadow-none"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </form>
      </div>
    </section>
  );
}
