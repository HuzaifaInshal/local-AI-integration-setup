
import { TrendingUp } from 'lucide-react';

interface SVGChartProps {
  data: any[];
}

export function SVGChart({ data }: SVGChartProps) {
  if (!data || data.length === 0) {
    return <div className="text-gray-400 italic py-10 text-center">No data available to chart</div>;
  }

  // 1. Identify columns
  const columns = Object.keys(data[0]);
  
  // Find numeric columns
  const numericCols = columns.filter(col => {
    return data.some(row => !isNaN(parseFloat(row[col])) && typeof row[col] !== 'boolean');
  });

  // Find string/category column for labeling
  const labelCol = columns.find(col => !numericCols.includes(col)) || columns[0];
  const valCol = numericCols[0] || columns[1];

  if (!valCol) {
    return <div className="text-gray-500 italic py-10 text-center">No numeric metrics detected to plot</div>;
  }

  // Prepare chart coordinates
  const width = 600;
  const height = 300;
  const paddingLeft = 60;
  const paddingRight = 30;
  const paddingTop = 35;
  const paddingBottom = 50;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  // Convert values and limit to top 10 items for readability
  const points = data
    .map(row => ({
      label: String(row[labelCol] || ''),
      value: parseFloat(row[valCol]) || 0
    }))
    .slice(0, 10);

  const maxVal = Math.max(...points.map(p => p.value), 1) * 1.15; // Provide headroom

  return (
    <div className="flex flex-col items-center justify-center p-4 bg-[#0a0f1d] border border-[rgba(255,255,255,0.04)] rounded-xl">
      <h4 className="text-xs font-semibold text-slate-400 mb-4 flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-cyan-400" />
        <span className="uppercase">{valCol}</span> BY <span className="uppercase">{labelCol}</span> (TOP {points.length})
      </h4>
      
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full max-w-lg select-none">
        <defs>
          <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366F1" />
            <stop offset="100%" stopColor="#06B6D4" />
          </linearGradient>
        </defs>

        {/* Horizontal grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => {
          const y = paddingTop + chartHeight * (1 - ratio);
          return (
            <g key={index}>
              <line 
                x1={paddingLeft} 
                y1={y} 
                x2={width - paddingRight} 
                y2={y} 
                stroke="rgba(255,255,255,0.05)" 
                strokeDasharray="4 4" 
              />
              <text 
                x={paddingLeft - 10} 
                y={y + 4} 
                fill="#64748B" 
                fontSize="9" 
                fontWeight="500"
                textAnchor="end"
              >
                {Math.round(maxVal * ratio)}
              </text>
            </g>
          );
        })}

        {/* Y Axis line */}
        <line 
          x1={paddingLeft} 
          y1={paddingTop} 
          x2={paddingLeft} 
          y2={height - paddingBottom} 
          stroke="rgba(255,255,255,0.12)" 
        />

        {/* X Axis line */}
        <line 
          x1={paddingLeft} 
          y1={height - paddingBottom} 
          x2={width - paddingRight} 
          y2={height - paddingBottom} 
          stroke="rgba(255,255,255,0.12)" 
        />

        {/* Bars */}
        {points.map((pt, i) => {
          const barCount = points.length;
          const barSpacing = chartWidth / barCount;
          const barWidth = barSpacing * 0.55;
          const x = paddingLeft + (i * barSpacing) + (barSpacing * 0.2);
          
          const barHeight = (pt.value / maxVal) * chartHeight;
          const y = height - paddingBottom - barHeight;

          return (
            <g key={i} className="group cursor-pointer">
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={Math.max(barHeight, 2)}
                fill="url(#barGradient)"
                rx="3"
                className="transition-all duration-300 hover:opacity-85"
              />
              
              {/* Tooltip value */}
              <text
                x={x + barWidth / 2}
                y={y - 6}
                fill="#E2E8F0"
                fontSize="9"
                fontWeight="bold"
                textAnchor="middle"
                className="opacity-0 group-hover:opacity-100 transition-opacity duration-200"
              >
                {pt.value}
              </text>

              {/* Label */}
              <text
                x={x + barWidth / 2}
                y={height - paddingBottom + 16}
                fill="#94A3B8"
                fontSize="9"
                textAnchor="middle"
              >
                {pt.label.length > 8 ? `${pt.label.substring(0, 7)}...` : pt.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
