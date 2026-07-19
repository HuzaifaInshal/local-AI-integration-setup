import { useState } from 'react';

interface QueryTableProps {
  results: any[];
}

export function QueryTable({ results }: QueryTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  if (!results || results.length === 0) {
    return (
      <div className="text-center py-10 text-slate-500 italic text-sm">
        No records returned or empty dataset.
      </div>
    );
  }

  // Basic pagination math
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentRows = results.slice(indexOfFirstRow, indexOfLastRow);
  const totalPages = Math.ceil(results.length / rowsPerPage);

  const headers = Object.keys(results[0]);

  return (
    <div className="border border-[rgba(255,255,255,0.06)] rounded-lg overflow-hidden bg-slate-900/10">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#090F1B] border-b border-[rgba(255,255,255,0.06)] text-slate-400 uppercase font-semibold">
            <tr>
              {headers.map((key) => (
                <th key={key} className="px-4 py-3 font-semibold">{key}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[rgba(255,255,255,0.04)] font-mono text-slate-300">
            {currentRows.map((row, idx) => (
              <tr key={idx} className="hover:bg-slate-800/20 transition">
                {Object.values(row).map((val: any, vidx) => (
                  <td key={vidx} className="px-4 py-2.5 max-w-[150px] truncate" title={String(val)}>
                    {val === null ? <span className="text-slate-600">null</span> : String(val)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Footer pagination */}
      <div className="p-3 border-t border-[rgba(255,255,255,0.06)] bg-[#090F1B] flex justify-between items-center text-[10px] text-slate-500">
        <div className="flex gap-1.5">
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="px-2 py-1 bg-slate-800 rounded disabled:opacity-30 hover:bg-slate-700 text-slate-300"
          >
            Prev
          </button>
          <span className="py-1">Page {currentPage} of {totalPages || 1}</span>
          <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages || totalPages === 0}
            className="px-2 py-1 bg-slate-800 rounded disabled:opacity-30 hover:bg-slate-700 text-slate-300"
          >
            Next
          </button>
        </div>
        <span>Total Records: {results.length}</span>
      </div>
    </div>
  );
}
