import { useState } from 'react';
import { Table, Terminal, Loader2, ChevronRight, ChevronDown } from 'lucide-react';
import type { DatabaseSchema } from '../types';

interface SchemaExplorerProps {
  schema: DatabaseSchema;
  loading: boolean;
  onNavigateToSettings: () => void;
}

export function SchemaExplorer({ schema, loading, onNavigateToSettings }: SchemaExplorerProps) {
  const [expandedTables, setExpandedTables] = useState<Record<string, boolean>>({});

  const toggleTableExpand = (tableName: string) => {
    setExpandedTables(prev => ({
      ...prev,
      [tableName]: !prev[tableName]
    }));
  };

  return (
    <aside className="w-72 border-r border-[rgba(255,255,255,0.06)] bg-[#070B14] flex flex-col flex-shrink-0 h-full overflow-hidden">
      <div className="p-4 border-b border-[rgba(255,255,255,0.06)] flex items-center justify-between bg-[#090F1B]">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5 text-indigo-400" />
          <span>Database Tables</span>
        </h3>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
          </div>
        ) : Object.keys(schema).length === 0 ? (
          <div className="text-center py-10">
            <p className="text-xs text-slate-500">No active connection or schemas detected.</p>
            <button 
              onClick={onNavigateToSettings}
              className="mt-2 text-xs text-indigo-400 hover:text-indigo-300 font-medium underline"
            >
              Configure Connection
            </button>
          </div>
        ) : (
          Object.keys(schema).map(tableName => (
            <div key={tableName} className="rounded-lg border border-[rgba(255,255,255,0.04)] bg-slate-900/20 overflow-hidden">
              <button
                onClick={() => toggleTableExpand(tableName)}
                className="w-full flex items-center justify-between px-3 py-2 text-sm text-left hover:bg-slate-800/40 text-slate-200 transition"
              >
                <span className="font-semibold flex items-center gap-1.5 truncate">
                  <Table className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                  {tableName}
                </span>
                {expandedTables[tableName] ? (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                )}
              </button>
              
              {expandedTables[tableName] && (
                <div className="bg-[#090E1A] p-2 space-y-1.5 border-t border-[rgba(255,255,255,0.03)] font-mono text-[11px] text-slate-400">
                  {schema[tableName].map(col => (
                    <div key={col.column} className="flex justify-between px-2 py-0.5 hover:bg-slate-800 rounded">
                      <span className="text-slate-300 truncate" title={col.column}>{col.column}</span>
                      <span className="text-indigo-400 flex-shrink-0">{col.type}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </aside>
  );
}
