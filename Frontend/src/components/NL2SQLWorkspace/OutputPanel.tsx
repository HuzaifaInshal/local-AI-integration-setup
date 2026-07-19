import { Terminal, Table, BarChart3, HelpCircle, Copy, XCircle } from 'lucide-react';
import type { ChatMessage } from '../../types';
import { QueryTable } from './QueryTable';
import { SVGChart } from './SVGChart';

interface OutputPanelProps {
  activeMessage: ChatMessage | undefined;
  outputTab: 'sql' | 'table' | 'chart';
  setOutputTab: (tab: 'sql' | 'table' | 'chart') => void;
}

export function OutputPanel({ activeMessage, outputTab, setOutputTab }: OutputPanelProps) {
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const renderSQLHighlight = (code: string) => {
    if (!code) return null;
    const keywords = [
      'SELECT', 'FROM', 'WHERE', 'JOIN', 'ON', 'GROUP BY', 'ORDER BY', 
      'LIMIT', 'AS', 'AND', 'OR', 'INNER', 'LEFT', 'RIGHT', 'OUTER', 
      'HAVING', 'COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'WITH'
    ];
    
    const parts = code.split(/(\s+)/);
    return (
      <pre className="sql-highlight text-left font-mono">
        <code>
          {parts.map((part, i) => {
            const upper = part.toUpperCase();
            if (keywords.includes(upper)) {
              return <span key={i} className="sql-keyword">{part}</span>;
            }
            if (part.startsWith("'") && part.endsWith("'")) {
              return <span key={i} className="sql-string">{part}</span>;
            }
            if (!isNaN(Number(part.trim())) && part.trim() !== '') {
              return <span key={i} className="sql-number">{part}</span>;
            }
            if (part.startsWith('--')) {
              return <span key={i} className="sql-comment">{part}</span>;
            }
            return part;
          })}
        </code>
      </pre>
    );
  };

  return (
    <section className="w-[450px] bg-[#070B14] flex flex-col flex-shrink-0 h-full overflow-hidden border-l border-[rgba(255,255,255,0.06)]">
      {/* Output navigation tabs */}
      <div className="flex border-b border-[rgba(255,255,255,0.06)] bg-[#090F1B] flex-shrink-0">
        <button
          onClick={() => setOutputTab('sql')}
          className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-xs font-semibold uppercase tracking-wider border-b-2 transition ${
            outputTab === 'sql' 
              ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5' 
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <Terminal className="w-4 h-4" />
          SQL Query
        </button>
        <button
          onClick={() => setOutputTab('table')}
          className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-xs font-semibold uppercase tracking-wider border-b-2 transition ${
            outputTab === 'table' 
              ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5' 
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <Table className="w-4 h-4" />
          Data Table
        </button>
        <button
          onClick={() => setOutputTab('chart')}
          className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-xs font-semibold uppercase tracking-wider border-b-2 transition ${
            outputTab === 'chart' 
              ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5' 
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          Visual Chart
        </button>
      </div>

      {/* Pane Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {!activeMessage || !activeMessage.sql ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 p-6">
            <HelpCircle className="w-10 h-10 mb-2 opacity-50 text-indigo-500" />
            <p className="text-sm">Submit a database request to see SQL outputs, records, and analytics charts here.</p>
          </div>
        ) : (
          <div className="space-y-4">
            
            {/* Tab 1: SQL Code Rendering */}
            {outputTab === 'sql' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-400">Generated Query</span>
                  <button
                    onClick={() => copyToClipboard(activeMessage.sql || '')}
                    className="flex items-center gap-1.5 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs rounded transition"
                  >
                    <Copy className="w-3 h-3" />
                    Copy SQL
                  </button>
                </div>
                {renderSQLHighlight(activeMessage.sql)}
                {activeMessage.error && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-xs text-rose-400 flex items-start gap-2 text-left">
                    <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-semibold text-rose-300">Query Execution Error:</div>
                      <div className="font-mono mt-1 whitespace-pre-wrap">{activeMessage.error}</div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: Tabular Grid view */}
            {outputTab === 'table' && (
              <div className="space-y-2 text-left animate-fade">
                <QueryTable results={activeMessage.results || []} />
              </div>
            )}

            {/* Tab 3: Analytic Graphs View */}
            {outputTab === 'chart' && (
              <div className="animate-fade">
                <SVGChart data={activeMessage.results || []} />
              </div>
            )}

          </div>
        )}
      </div>
    </section>
  );
}
