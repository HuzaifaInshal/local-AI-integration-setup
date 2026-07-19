import { useState, useEffect, useRef } from 'react';
import { Send, Loader2 } from 'lucide-react';
import type { ChatMessageItem } from '../hooks/useGeneralChat';

interface GeneralChatPanelProps {
  messages: ChatMessageItem[];
  loading: boolean;
  onSubmit: (content: string) => void;
}

export function GeneralChatPanel({ messages, loading, onSubmit }: GeneralChatPanelProps) {
  const [input, setInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    onSubmit(input);
    setInput('');
  };

  return (
    <div className="flex-1 flex flex-col bg-[#060913] animate-slideup max-w-4xl mx-auto w-full border-x border-[rgba(255,255,255,0.06)] h-screen">
      <header className="px-6 py-4 border-b border-[rgba(255,255,255,0.06)] bg-[#090E1A] flex-shrink-0">
        <h2 className="text-md font-bold text-white text-left">General AI Assistant</h2>
        <p className="text-xs text-slate-500 text-left">Interact with your local loaded model (Qwen 2.5 Coder) for general tasks</p>
      </header>

      {/* Messages viewport */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((msg, idx) => (
          <div 
            key={idx}
            className={`flex flex-col p-4 rounded-xl border max-w-[85%] ${
              msg.role === 'user'
                ? 'bg-indigo-950/15 border-indigo-500/25 self-end ml-auto items-end text-right'
                : 'bg-slate-900/35 border-[rgba(255,255,255,0.05)] self-start mr-auto items-start text-left'
            }`}
          >
            <span className="text-[10px] text-slate-500 mb-1 font-semibold">
              {msg.role === 'user' ? 'YOU' : 'AI MODEL'}
            </span>
            <p className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">{msg.content}</p>
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-2 text-slate-500 p-4 border border-[rgba(255,255,255,0.04)] rounded-xl mr-auto bg-slate-900/10 w-fit">
            <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
            <span className="text-xs">AI is thinking...</span>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Form Area */}
      <div className="p-4 border-t border-[rgba(255,255,255,0.06)] bg-[#070B14] flex-shrink-0">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            placeholder="Ask anything..."
            className="flex-1 bg-[#0c1221] border border-[rgba(255,255,255,0.08)] rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-xl px-5 flex items-center justify-center transition shadow-[0_0_15px_rgba(99,102,241,0.2)] disabled:shadow-none"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
