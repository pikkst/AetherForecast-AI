import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';

interface PrecipitationChartProps {
  data: {
    day: string;
    amount: number;
  }[];
}

export function PrecipitationChart({ data }: PrecipitationChartProps) {
  return (
    <div className="h-32 w-full mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <XAxis 
            dataKey="day" 
            hide 
          />
          <YAxis hide domain={[0, 'dataMax + 2']} />
          <Tooltip 
            cursor={{ fill: 'rgba(56, 189, 248, 0.1)' }}
            contentStyle={{ backgroundColor: '#050505', border: '1px solid #1e293b', borderRadius: '4px', fontSize: '9px' }}
            formatter={(value: number) => [`${value} mm`, 'Rain']}
            labelStyle={{ display: 'none' }}
          />
          <Bar dataKey="amount" radius={[2, 2, 0, 0]}>
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={entry.amount > 0 ? '#38bdf8' : '#334155'} 
                fillOpacity={entry.amount > 0 ? 0.6 : 0.2}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="flex justify-between px-1 mt-1 font-mono text-[7px] opacity-30 uppercase tracking-widest">
        {data.map((d, i) => (
          <span key={i}>{d.day}</span>
        ))}
      </div>
    </div>
  );
}
