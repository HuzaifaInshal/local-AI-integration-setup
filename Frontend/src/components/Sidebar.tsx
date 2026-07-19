
import { Database, MessageSquare, Settings, RefreshCw } from 'lucide-react';

interface SidebarProps {
  activeTab: 'nlsql' | 'chat' | 'settings';
  setActiveTab: (tab: 'nlsql' | 'chat' | 'settings') => void;
  isConnected: boolean;
  onRefresh: () => void;
}

export function Sidebar({ activeTab, setActiveTab, isConnected, onRefresh }: SidebarProps) {
  return (
    <aside className="w-64 bg-[#090E1A] border-r border-[rgba(255,255,255,0.06)] flex flex-col justify-between flex-shrink-0 h-screen sticky top-0">
      <div>
        {/* App Title Header */}
        <div className="p-6 border-b border-[rgba(255,255,255,0.06)]">
          <h1 className="text-xl font-bold flex items-center gap-2 text-white">
            <Database className="w-6 h-6 text-indigo-400" />
            <span>Nova<span className="text-indigo-400">SQL</span> AI</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">Local AI Agent Platform</p>
        </div>

        {/* Action Navigation */}
        <nav className="p-4 space-y-1">
          <button
            onClick={() => setActiveTab('nlsql')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'nlsql'
                ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.1)]'
                : 'text-slate-400 hover:bg-slate-800/40 hover:text-white border border-transparent'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>NL2SQL Workspace</span>
          </button>

          <button
            onClick={() => setActiveTab('chat')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'chat'
                ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.1)]'
                : 'text-slate-400 hover:bg-slate-800/40 hover:text-white border border-transparent'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>General Assistant</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'settings'
                ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.1)]'
                : 'text-slate-400 hover:bg-slate-800/40 hover:text-white border border-transparent'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Database Config</span>
          </button>
        </nav>
      </div>

      {/* Database Connection status */}
      <div className="p-4 border-t border-[rgba(255,255,255,0.06)] bg-[#070B14]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-slate-500">Database Connection</span>
          <button 
            onClick={onRefresh} 
            title="Refresh database schema" 
            className="p-1 rounded text-slate-500 hover:text-white hover:bg-slate-800 transition"
          >
            <RefreshCw className="w-3 h-3" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          {isConnected ? (
            <>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-xs font-semibold text-emerald-400">Connected</span>
            </>
          ) : (
            <>
              <span className="h-2 w-2 rounded-full bg-rose-500"></span>
              <span className="text-xs font-semibold text-rose-400">Disconnected</span>
            </>
          )}
        </div>
      </div>
    </aside>
  );
}
