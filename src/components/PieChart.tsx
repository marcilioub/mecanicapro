import React from 'react';

interface PieChartProps {
  title: string;
  data: { label: string; value: number }[];
  colors: string[];
}

const PieChart: React.FC<PieChartProps> = ({ title, data, colors }) => {
  const total = data.reduce((acc, cur) => acc + cur.value, 0);
  let currentAngle = 0;

  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-4">
        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-4 uppercase tracking-wider">{title}</h3>
        <div className="text-slate-400 text-xs">Sem dados para exibir</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center">
      <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-6 uppercase tracking-wider">{title}</h3>
      <div className="relative size-48">
        <svg viewBox="-1 -1 2 2" className="transform -rotate-90 w-full h-full">
          {data.map((item, index) => {
            const sliceAngle = (item.value / total) * 2 * Math.PI;
            const x1 = Math.cos(currentAngle);
            const y1 = Math.sin(currentAngle);
            const x2 = Math.cos(currentAngle + sliceAngle);
            const y2 = Math.sin(currentAngle + sliceAngle);
            const largeArcFlag = sliceAngle > Math.PI ? 1 : 0;
            
            const pathData = `M 0 0 L ${x1} ${y1} A 1 1 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
            const pathColor = colors[index % colors.length];
            
            currentAngle += sliceAngle;
            
            return (
              <path
                key={index}
                d={pathData}
                fill={pathColor}
                className="transition-all duration-300 hover:opacity-80"
              />
            );
          })}
        </svg>
      </div>
      <div className="mt-6 grid grid-cols-2 gap-x-8 gap-y-2">
        {data.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <span 
              className="size-3 rounded-full" 
              style={{ backgroundColor: colors[index % colors.length] }}
            />
            <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
              {item.label} ({Math.round((item.value / total) * 100)}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PieChart;
