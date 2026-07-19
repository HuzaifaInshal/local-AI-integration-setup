import { useState } from 'react';
import { Settings, Play, Loader2, CheckCircle, XCircle } from 'lucide-react';

interface DBConfigPanelProps {
  connectionString: string;
  checking: boolean;
  connMessage: { type: 'success' | 'error'; text: string } | null;
  onConnect: (connectionString: string) => Promise<boolean>;
}

export function DBConfigPanel({ 
  connectionString: initialConnStr, 
  checking, 
  connMessage, 
  onConnect 
}: DBConfigPanelProps) {
  const [localConnStr, setLocalConnStr] = useState(initialConnStr);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConnect(localConnStr);
  };

  return (
    <div className="flex-1 flex items-center justify-center p-6 overflow-y-auto animate-fade">
      <div className="max-w-xl w-full glass-panel p-8 bg-slate-900/15">
        
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-400 border border-indigo-500/20">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Database Settings</h2>
            <p className="text-xs text-slate-500">Configure connection strings to access schemas and run SQL queries.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5 text-left">
              PostgreSQL Connection URI
            </label>
            <input
              type="text"
              value={localConnStr}
              onChange={(e) => setLocalConnStr(e.target.value)}
              required
              placeholder="postgresql://username:password@localhost:5432/dbname"
              className="w-full bg-[#0c1221] border border-[rgba(255,255,255,0.08)] rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-mono"
            />
            <p className="text-[11px] text-slate-500 mt-2 leading-relaxed text-left">
              💡 **Security Advice:** We highly recommend connecting with a database user that only has **read-only SELECT** privileges (e.g. `pg_read_all_data`). This ensures full protection from accidental mutations.
            </p>
          </div>

          {connMessage && (
            <div className={`p-4 rounded-xl border flex items-start gap-2.5 text-sm animate-fade text-left ${
              connMessage.type === 'success' 
                ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400' 
                : 'bg-rose-500/10 border-rose-500/25 text-rose-400'
            }`}>
              {connMessage.type === 'success' ? (
                <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              )}
              <div>
                <div className="font-semibold">
                  {connMessage.type === 'success' ? 'Connection Successful' : 'Connection Failed'}
                </div>
                <div className="text-xs mt-1 leading-relaxed">{connMessage.text}</div>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={checking}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white rounded-xl py-3 font-semibold text-sm transition shadow-[0_0_15px_rgba(99,102,241,0.2)] disabled:shadow-none flex items-center justify-center gap-2"
          >
            {checking ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Testing connection...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                <span>Connect Database & Save</span>
              </>
            )}
          </button>
        </form>

      </div>
    </div>
  );
}
