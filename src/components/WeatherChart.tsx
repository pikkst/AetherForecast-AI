import { useState } from 'react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ReferenceArea,
  ReferenceLine
} from 'recharts';

interface WeatherChartProps {
  data: {
    time: string;
    temp: number;
    humidity: number;
    wind: number;
  }[];
  activeHourIndex?: number;
}

export function WeatherChart({ data, activeHourIndex }: WeatherChartProps) {
  const [zoomState, setZoomState] = useState<{
    left: string | number | null;
    right: string | number | null;
    refLeft: string | number | null;
    refRight: string | number | null;
    top: number | 'auto';
    bottom: number | 'auto';
  }>({
    left: 'dataMin',
    right: 'dataMax',
    refLeft: null,
    refRight: null,
    top: 'auto',
    bottom: 'auto',
  });

  const zoom = () => {
    let { refLeft, refRight } = zoomState;

    if (refLeft === refRight || refRight === null) {
      setZoomState((prev) => ({ ...prev, refLeft: null, refRight: null }));
      return;
    }

    // Ensure left is always smaller than right
    if (refLeft !== null && refRight !== null && refLeft > refRight) {
      [refLeft, refRight] = [refRight, refLeft];
    }

    setZoomState((prev) => ({
      ...prev,
      refLeft: null,
      refRight: null,
      left: refLeft,
      right: refRight,
    }));
  };

  const zoomOut = () => {
    setZoomState({
      left: 'dataMin',
      right: 'dataMax',
      refLeft: null,
      refRight: null,
      top: 'auto',
      bottom: 'auto',
    });
  };

  return (
    <div className="h-full w-full min-h-[300px] select-none cursor-crosshair" onDoubleClick={zoomOut}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart 
          data={data}
          onMouseDown={(e) => e && setZoomState((prev) => ({ ...prev, refLeft: e.activeLabel || null }))}
          onMouseMove={(e) => zoomState.refLeft && e && setZoomState((prev) => ({ ...prev, refRight: e.activeLabel || null }))}
          onMouseUp={zoom}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
          <XAxis 
            dataKey="time" 
            stroke="#475569" 
            fontSize={9} 
            tickFormatter={(str) => {
              const date = new Date(str);
              return date.getHours() + "h";
            }}
            domain={[zoomState.left, zoomState.right]}
            axisLine={false}
            tickLine={false}
            allowDataOverflow
          />
          <YAxis 
            stroke="#475569" 
            fontSize={9} 
            axisLine={false}
            tickLine={false}
            tickFormatter={(val) => `${val}°`}
            domain={[zoomState.bottom, zoomState.top]}
            allowDataOverflow
          />
          <Tooltip 
            contentStyle={{ backgroundColor: '#050505', border: '1px solid #1e293b', borderRadius: '8px', fontSize: '10px' }}
            itemStyle={{ fontSize: '10px', color: '#e2e8f0' }}
          />
          <Line 
            name="Temp" 
            type="monotone" 
            dataKey="temp" 
            stroke="#38bdf8" 
            strokeWidth={2} 
            dot={false}
            animationDuration={300}
            activeDot={{ r: 4, stroke: '#38bdf8', strokeWidth: 2, fill: '#050505' }} 
          />
          <Line 
            name="Humidity" 
            type="monotone" 
            dataKey="humidity" 
            stroke="#10b981" 
            strokeWidth={1} 
            strokeDasharray="4 4"
            dot={false} 
            animationDuration={300}
          />
          
          {zoomState.refLeft && zoomState.refRight ? (
            <ReferenceArea {...({ x1: zoomState.refLeft, x2: zoomState.refRight, fill: "#38bdf8", fillOpacity: 0.1 } as any)} />
          ) : null}

          {activeHourIndex !== undefined && data[activeHourIndex] && (
            <ReferenceLine 
              x={data[activeHourIndex].time} 
              stroke="#0ea5e9" 
              strokeDasharray="3 3" 
              label={{ value: 'NOW', position: 'top', fill: '#0ea5e9', fontSize: 8 }}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
      <div className="absolute top-2 right-2 flex gap-2">
         <span className="text-[8px] font-mono text-sky-500/50 uppercase tracking-widest bg-sky-500/5 px-2 py-1 rounded border border-sky-500/10">
           Drag to Zoom • Dbl-Click to Reset
         </span>
      </div>
    </div>
  );
}
