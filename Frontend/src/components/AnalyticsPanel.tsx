import { useState } from 'react';
import { Search, Sparkles, FileText, Calendar, Building, ListFilter, AlertCircle, Bookmark } from 'lucide-react';

interface Source {
  document_name: string;
  page_number: number;
  section: string;
  text: string;
}

export function AnalyticsPanel() {
  const [query, setQuery] = useState('');
  const [company, setCompany] = useState('');
  const [year, setYear] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [answer, setAnswer] = useState<string | null>(null);
  const [sources, setSources] = useState<Source[]>([]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setAnswer(null);
    setSources([]);

    try {
      // Backend resides on the same origin (relative path)
      const response = await fetch('/api/analytics/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: query.trim(),
          company: company.trim() || undefined,
          year: year ? parseInt(year, 10) : undefined,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to complete analytics search.');
      }

      setAnswer(data.answer);
      setSources(data.sources || []);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An unexpected connection error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-[#070A15] p-8">
      {/* Premium Header */}
      <div className="max-w-4xl w-full mx-auto mb-8 animate-slideup">
        <div className="flex items-center gap-3 mb-2">
          <div className="bg-indigo-600/10 p-2.5 rounded-xl border border-indigo-500/20 shadow-[0_0_20px_rgba(99,102,241,0.15)]">
            <Sparkles className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Document Intelligence</h1>
            <p className="text-sm text-slate-400 mt-0.5">Ask questions across your parsed corporate PDF archives using hybrid vector search & reranking.</p>
          </div>
        </div>
      </div>

      {/* Main Search Panel */}
      <div className="max-w-4xl w-full mx-auto space-y-6 animate-slideup" style={{ animationDelay: '100ms' }}>
        <form onSubmit={handleSearch} className="bg-[#0D1325] border border-[rgba(255,255,255,0.06)] rounded-2xl p-6 shadow-2xl backdrop-blur-xl">
          
          {/* Query input field */}
          <div className="relative mb-6">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. What is the net profit growth and dividends declared for FFC?"
              className="w-full bg-[#090D1A] border border-[rgba(255,255,255,0.08)] rounded-xl pl-12 pr-4 py-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all text-base shadow-inner"
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
          </div>

          {/* Filtering row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            {/* Company filter */}
            <div className="flex items-center gap-2.5 bg-[#090D1A] border border-[rgba(255,255,255,0.06)] rounded-xl px-3 py-2">
              <Building className="w-4 h-4 text-indigo-400 flex-shrink-0" />
              <div className="flex-1">
                <span className="text-[10px] text-slate-500 block uppercase tracking-wider font-semibold">Company</span>
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="All Companies"
                  className="bg-transparent text-sm text-white focus:outline-none placeholder-slate-600 w-full mt-0.5"
                />
              </div>
            </div>

            {/* Year filter */}
            <div className="flex items-center gap-2.5 bg-[#090D1A] border border-[rgba(255,255,255,0.06)] rounded-xl px-3 py-2">
              <Calendar className="w-4 h-4 text-indigo-400 flex-shrink-0" />
              <div className="flex-1">
                <span className="text-[10px] text-slate-500 block uppercase tracking-wider font-semibold">Report Year</span>
                <input
                  type="number"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  placeholder="All Years"
                  className="bg-transparent text-sm text-white focus:outline-none placeholder-slate-600 w-full mt-0.5 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="w-full h-12 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:from-slate-800 disabled:to-slate-800 text-white font-medium rounded-xl transition-all shadow-[0_4px_20px_rgba(99,102,241,0.2)] disabled:shadow-none flex items-center justify-center gap-2 border border-indigo-500/20 disabled:border-transparent active:scale-[0.98]"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Analyzing Documents...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Analyze Query</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Error message */}
        {error && (
          <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-4 flex items-start gap-3 animate-fadein">
            <AlertCircle className="w-5 h-5 text-rose-400 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-semibold text-rose-300">Analysis Failed</h4>
              <p className="text-xs text-rose-400/90 mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Loading skeleton wrapper */}
        {loading && (
          <div className="bg-[#0D1325] border border-[rgba(255,255,255,0.06)] rounded-2xl p-6 space-y-4 animate-pulse">
            <div className="h-4 bg-slate-800/80 rounded w-1/4"></div>
            <div className="space-y-2">
              <div className="h-3 bg-slate-800/50 rounded w-full"></div>
              <div className="h-3 bg-slate-800/50 rounded w-5/6"></div>
              <div className="h-3 bg-slate-800/50 rounded w-2/3"></div>
            </div>
          </div>
        )}

        {/* Answer section */}
        {answer && (
          <div className="bg-[#0D1325] border border-[rgba(255,255,255,0.06)] rounded-2xl overflow-hidden shadow-xl animate-fadein">
            {/* Header label */}
            <div className="bg-gradient-to-r from-indigo-950/40 to-slate-900/40 px-6 py-4 border-b border-[rgba(255,255,255,0.06)] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <span className="text-sm font-semibold text-white">Synthesized Insights</span>
              </div>
              <span className="text-xs text-slate-500 font-mono">Grounded locally</span>
            </div>
            
            {/* Answer Content */}
            <div className="p-6 text-slate-200 leading-relaxed text-sm whitespace-pre-line select-text">
              {answer}
            </div>
          </div>
        )}

        {/* Sources citation panel */}
        {answer && sources.length > 0 && (
          <div className="space-y-3 animate-fadein" style={{ animationDelay: '150ms' }}>
            <div className="flex items-center gap-2 px-1">
              <ListFilter className="w-4 h-4 text-indigo-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Cited Document Excerpts</h3>
            </div>
            
            <div className="grid grid-cols-1 gap-4">
              {sources.map((source, idx) => (
                <div 
                  key={idx} 
                  className="bg-[#0D1325] border border-[rgba(255,255,255,0.05)] hover:border-indigo-500/20 rounded-xl p-5 transition-all shadow-md group relative overflow-hidden"
                >
                  {/* Subtle background glow on hover */}
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/0 to-indigo-600/0 group-hover:from-indigo-600/2 group-hover:to-violet-600/2 transition-all duration-300 pointer-events-none" />
                  
                  {/* Citation Info Row */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[rgba(255,255,255,0.05)] pb-3 mb-3 relative z-10">
                    <div className="flex items-center gap-2">
                      <div className="bg-[#090D1A] p-1.5 rounded-lg border border-[rgba(255,255,255,0.06)]">
                        <FileText className="w-3.5 h-3.5 text-indigo-400" />
                      </div>
                      <span className="text-xs font-semibold text-white group-hover:text-indigo-300 transition-colors">{source.document_name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="bg-indigo-950/50 text-indigo-300 text-[10px] font-bold px-2.5 py-1 rounded-full border border-indigo-800/30">
                        Page {source.page_number}
                      </span>
                      <span className="bg-slate-900/60 text-slate-400 text-[10px] font-medium px-2 py-0.5 rounded border border-slate-800/50 max-w-[200px] truncate" title={source.section}>
                        {source.section}
                      </span>
                    </div>
                  </div>
                  
                  {/* Snippet Content */}
                  <p className="text-xs text-slate-400 leading-relaxed font-mono select-text whitespace-pre-line relative z-10 pl-2 border-l-2 border-indigo-500/40">
                    {source.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}