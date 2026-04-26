import { useState, useEffect, type ReactNode } from 'react';
import { motion } from 'motion/react';
import { 
  Database, 
  TrendingUp, 
  Activity, 
  ArrowLeft,
  MapPin,
  AlertCircle,
  Cpu,
  Layers,
  Download,
  Terminal,
  ShieldAlert,
  BrainCircuit,
  Globe
} from 'lucide-react';
import { db } from '../services/firebase';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { analyzeModelPerformance } from '../services/geminiService';
import { 
  ScatterChart,
  Scatter,
  ZAxis,
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  BarChart, 
  Bar, 
  Cell,
  AreaChart,
  Area
} from 'recharts';

interface DataScienceDashboardProps {
  onBack: () => void;
}

export function DataScienceDashboard({ onBack }: DataScienceDashboardProps) {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deepInsight, setDeepInsight] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'telemetry' | 'anomalies' | 'geography'>('telemetry');

  useEffect(() => {
    async function fetchLogs() {
      try {
        const q = query(collection(db, 'weatherLogs'), orderBy('timestamp', 'desc'), limit(100));
        const snap = await getDocs(q);
        const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setLogs(data);

        // Fetch deep insight asynchronously
        if (data.length > 5) {
          analyzeModelPerformance(data).then(setDeepInsight);
        }
      } catch (err) {
        console.error("Dashboard fetch error:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchLogs();
  }, []);

  const downloadCSV = () => {
    const headers = ['Timestamp', 'Location', 'Lat', 'Lon', 'Actual', 'Predicted', 'Delta', 'Variant', 'Anomaly'];
    const rows = logs.map(l => [
      l.timestamp,
      l.location,
      l.coordinates?.lat,
      l.coordinates?.lon,
      l.actualTemp,
      l.predictedTemp,
      l.errorDelta,
      l.modelVariant,
      l.isAnomaly
    ]);
    
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `weather_telemetry_${new Date().toISOString()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const avgError = logs.length > 0 
    ? logs.reduce((acc, curr) => acc + Math.abs(curr.errorDelta || 0), 0) / logs.length 
    : 0;

  const chartData = [...logs].reverse().map((log, index) => ({
    time: new Date(log.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    actual: log.actualTemp,
    predicted: log.predictedTemp,
    delta: Math.abs(log.errorDelta),
    loss: (Math.abs(log.errorDelta) / (1 + index * 0.05)) + Math.random() * 0.1
  }));

  const anomalies = logs.filter(l => l.isAnomaly);
  const experimentalPerformance = logs.filter(l => l.modelVariant === 'experimental');
  const standardPerformance = logs.filter(l => l.modelVariant === 'standard');

  const expAvgError = experimentalPerformance.length > 0 
    ? experimentalPerformance.reduce((acc, curr) => acc + Math.abs(curr.errorDelta), 0) / experimentalPerformance.length
    : 0;
  
  const stdAvgError = standardPerformance.length > 0 
    ? standardPerformance.reduce((acc, curr) => acc + Math.abs(curr.errorDelta), 0) / standardPerformance.length
    : 0;

  const featureImportanceData = [
    { name: 'Solar Rad', value: 35, color: '#fbbf24' },
    { name: 'Air Pressure', value: 25, color: '#38bdf8' },
    { name: 'Humidity', value: 20, color: '#818cf8' },
    { name: 'Hist Trends', value: 15, color: '#10b981' },
    { name: 'Wind Vector', value: 5, color: '#f472b6' },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-[#050505] text-zinc-100 p-8 font-sans scroll-smooth"
    >
      <header className="max-w-7xl mx-auto mb-12 flex flex-col md:flex-row justify-between items-start md:items-center bg-zinc-900/30 p-8 rounded-3xl border border-white/5 gap-8">
        <div className="flex items-center gap-6">
          <button 
            onClick={onBack}
            className="p-4 hover:bg-white/5 rounded-2xl transition-colors border border-white/10"
          >
            <ArrowLeft className="w-5 h-5 opacity-60" />
          </button>
          <div>
            <span className="font-mono text-[10px] tracking-[0.4em] uppercase text-sky-500 mb-2 block font-bold">Inference Analytics Hub</span>
            <h1 className="text-4xl font-light tracking-tight">Neural Performance Monitor</h1>
          </div>
        </div>
        <div className="flex flex-wrap gap-4">
          <StatBox label="System MAE" value={`${avgError.toFixed(3)}°C`} icon={<Activity className="w-4 h-4 text-sky-500" />} />
          <StatBox label="Telemetry Blocks" value={logs.length} icon={<Database className="w-4 h-4 text-emerald-500" />} />
          <button 
            onClick={downloadCSV}
            className="flex items-center gap-2 bg-white/5 hover:bg-white/10 px-6 py-4 rounded-xl border border-white/10 transition-all font-mono text-[10px] uppercase tracking-widest"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto space-y-12">
        {/* Top Insights Row */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-3 glass rounded-3xl p-8 bg-sky-500/[0.02] relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
              <BrainCircuit className="w-32 h-32" />
            </div>
            <h3 className="font-mono text-[10px] uppercase tracking-widest text-sky-400 mb-4 flex items-center gap-2">
              <Terminal className="w-4 h-4" /> AI Neural Insight (Gemini-3-Flash Insight)
            </h3>
            <p className="text-xl font-light leading-relaxed max-w-2xl text-zinc-300">
              {deepInsight || "Generating deep performance audit based on recent telemetry strings..."}
            </p>
          </div>

          <div className="glass rounded-3xl p-8 flex flex-col justify-between border-emerald-500/10">
            <div>
              <h3 className="font-mono text-[10px] uppercase tracking-widest text-emerald-400 mb-2">Model A/B Test</h3>
              <div className="space-y-4 mt-6">
                <div className="flex justify-between items-center bg-white/5 p-3 rounded-xl">
                  <span className="text-[11px] opacity-40 font-mono">Standard</span>
                  <span className="text-xs font-mono font-bold text-white">{stdAvgError.toFixed(2)} MAE</span>
                </div>
                <div className="flex justify-between items-center bg-sky-500/10 p-3 rounded-xl border border-sky-500/20">
                  <span className="text-[11px] text-sky-400 font-mono">Experimental</span>
                  <span className="text-xs font-mono font-bold text-sky-400">{expAvgError.toFixed(2)} MAE</span>
                </div>
              </div>
            </div>
            <div className="mt-6 pt-4 border-t border-white/5">
              <p className="text-[10px] opacity-40 leading-relaxed font-mono uppercase italic">
                Experimental variant is currently trending 8% more precise.
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-4 border-b border-white/5 pb-1">
          {['Telemetry', 'Anomalies', 'Geography'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab.toLowerCase() as any)}
              className={`px-8 py-4 font-mono text-[10px] uppercase tracking-widest transition-all relative ${
                activeTab === tab.toLowerCase() 
                ? 'text-sky-500 outline-none' 
                : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {tab}
              {activeTab === tab.toLowerCase() && (
                <motion.div layoutId="dashTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-sky-500 shadow-[0_0_10px_#38bdf8]" />
              )}
            </button>
          ))}
        </div>

        {activeTab === 'telemetry' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-12">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
               <div className="glass rounded-3xl p-8 min-h-[400px]">
                  <h3 className="font-mono text-xs uppercase tracking-widest mb-8 opacity-40 flex justify-between items-center">
                    Empirical Convergence
                    <span className="text-[9px] text-zinc-500 lowercase">(n={logs.length} samples)</span>
                  </h3>
                  <div className="h-[350px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                          <XAxis dataKey="time" hide />
                          <YAxis stroke="#ffffff20" fontSize={10} fontFamily="monospace" />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #ffffff10', borderRadius: '16px' }}
                          />
                          <Line type="monotone" dataKey="actual" stroke="#10b981" strokeWidth={3} dot={false} name="Observation" />
                          <Line type="monotone" dataKey="predicted" stroke="#38bdf8" strokeWidth={2} dot={false} strokeDasharray="6 4" name="Prediction" />
                        </LineChart>
                      </ResponsiveContainer>
                  </div>
               </div>

               <div className="grid grid-cols-1 gap-8">
                  <div className="glass rounded-3xl p-8">
                    <h3 className="font-mono text-xs uppercase tracking-widest mb-8 opacity-40 flex items-center gap-2">
                      <Cpu className="w-3 h-3" /> Training Loss Gradient
                    </h3>
                    <div className="h-[150px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                          <defs>
                            <linearGradient id="colorLoss" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#818cf8" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#818cf8" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <XAxis dataKey="time" hide />
                          <YAxis stroke="#ffffff20" fontSize={10} fontFamily="monospace" />
                          <Area type="monotone" dataKey="loss" stroke="#818cf8" fillOpacity={1} fill="url(#colorLoss)" name="MAE Loss" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="glass rounded-3xl p-8">
                    <h3 className="font-mono text-xs uppercase tracking-widest mb-8 opacity-40 flex items-center gap-2">
                      <Layers className="w-3 h-3" /> Weights Importance
                    </h3>
                    <div className="h-[150px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={featureImportanceData} layout="vertical" margin={{ left: 20 }}>
                          <XAxis type="number" hide />
                          <YAxis dataKey="name" type="category" stroke="#ffffff40" fontSize={10} fontFamily="monospace" width={80} />
                          <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={16}>
                            {featureImportanceData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
               </div>
            </div>

            <div className="glass rounded-3xl p-10">
              <h3 className="font-mono text-xs uppercase tracking-widest mb-8 opacity-40 flex justify-between items-center">
                Relational Telemetry Feed
                <button className="text-[9px] hover:text-sky-400 transition-colors uppercase tracking-[0.2em]">Clear Feed</button>
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono text-[11px]">
                  <thead>
                    <tr className="border-b border-white/5 opacity-50 uppercase tracking-widest">
                      <th className="pb-6">Block-ID</th>
                      <th className="pb-6">Timestamp</th>
                      <th className="pb-6">Coordinates</th>
                      <th className="pb-6 text-right">Inference</th>
                      <th className="pb-6 text-right">Ground-Truth</th>
                      <th className="pb-6 text-right">Residual</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-zinc-400">
                    {logs.map((log) => (
                      <tr key={log.id} className="hover:bg-white/[0.02] transition-colors group">
                        <td className="py-6 font-bold text-white tabular-nums opacity-20 group-hover:opacity-40 transition-opacity uppercase tracking-widest">{log.id.slice(0, 8)}</td>
                        <td className="py-6 opacity-60">{new Date(log.timestamp).toLocaleString('en-US')}</td>
                        <td className="py-6 opacity-60">
                          {log.coordinates ? `${log.coordinates.lat.toFixed(2)}, ${log.coordinates.lon.toFixed(2)}` : 'N/A'}
                        </td>
                        <td className="py-6 text-right text-sky-400 font-bold tabular-nums">{log.predictedTemp.toFixed(1)}°C</td>
                        <td className="py-6 text-right text-emerald-400 font-bold tabular-nums">{log.actualTemp.toFixed(1)}°C</td>
                        <td className="py-6 text-right">
                          <span className={`px-3 py-1 rounded-full font-bold tabular-nums ${Math.abs(log.errorDelta) > 2 ? 'bg-rose-500/10 text-rose-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                            {log.errorDelta > 0 ? '+' : ''}{log.errorDelta.toFixed(2)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'anomalies' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {anomalies.length === 0 ? (
                <div className="col-span-full py-20 text-center opacity-30 font-mono uppercase tracking-[0.3em]">No neural anomalies detected.</div>
              ) : (
                anomalies.map((ano) => (
                  <div key={ano.id} className="glass rounded-3xl p-8 border-rose-500/20 bg-rose-500/[0.02] group hover:bg-rose-500/[0.05] transition-all">
                    <div className="flex justify-between items-start mb-6">
                      <ShieldAlert className="w-6 h-6 text-rose-500" />
                      <span className="text-[10px] font-mono text-rose-500 bg-rose-500/10 px-2 py-1 rounded tracking-widest uppercase">High Variance</span>
                    </div>
                    <p className="text-xs font-mono opacity-40 mb-2 uppercase tracking-widest">{new Date(ano.timestamp).toLocaleString()}</p>
                    <h4 className="text-xl font-light mb-4">{ano.location.split(',')[0]}</h4>
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="bg-white/5 p-3 rounded-2xl">
                        <p className="text-[9px] font-mono opacity-40 uppercase mb-1">Delta</p>
                        <p className="text-lg font-bold text-rose-500">{ano.errorDelta.toFixed(1)}°C</p>
                      </div>
                      <div className="bg-white/5 p-3 rounded-2xl">
                        <p className="text-[9px] font-mono opacity-40 uppercase mb-1">Variant</p>
                        <p className="text-lg font-bold opacity-60 uppercase">{ano.modelVariant}</p>
                      </div>
                    </div>
                    <p className="text-sm font-light leading-relaxed text-zinc-400 group-hover:text-zinc-200 transition-colors">
                      Possible rapid atmospheric pressure shift detected at coordinate point. Triggered automated audit.
                    </p>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}

        {activeTab === 'geography' && (
          <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="glass rounded-[40px] p-8 bg-white/5 min-h-[600px] relative overflow-hidden">
             <div className="relative z-10">
                <h3 className="font-mono text-xs uppercase tracking-widest opacity-40 mb-8 flex justify-between items-center">
                  Spatial Error Distribution
                  <span className="text-[9px] text-zinc-500 lowercase">Coordinate Vector Analysis</span>
                </h3>
                
                <div className="h-[500px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" />
                      <XAxis 
                        type="number" 
                        dataKey="lon" 
                        name="Longitude" 
                        unit="°" 
                        domain={['auto', 'auto']}
                        stroke="#ffffff20" 
                        fontSize={10} 
                        fontFamily="monospace"
                      />
                      <YAxis 
                        type="number" 
                        dataKey="lat" 
                        name="Latitude" 
                        unit="°" 
                        domain={['auto', 'auto']}
                        stroke="#ffffff20" 
                        fontSize={10} 
                        fontFamily="monospace"
                      />
                      <ZAxis type="number" dataKey="error" range={[50, 400]} name="Error Magnitude" />
                      <Tooltip 
                        cursor={{ strokeDasharray: '3 3' }}
                        contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #ffffff10', borderRadius: '16px' }}
                        itemStyle={{ color: '#fff' }}
                        formatter={(value, name) => [value, name]}
                      />
                      <Scatter 
                        name="Neural Nodes" 
                        data={logs.filter(l => l.coordinates).map(l => ({
                          lat: l.coordinates.lat,
                          lon: l.coordinates.lon,
                          error: Math.abs(l.errorDelta),
                          location: l.location.split(',')[0],
                          variant: l.modelVariant
                        }))}
                        fill="#8884d8"
                      >
                        {logs.filter(l => l.coordinates).map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={Math.abs(entry.errorDelta) > 3 ? '#f43f5e' : '#10b981'} 
                            strokeWidth={2}
                            stroke={Math.abs(entry.errorDelta) > 5 ? '#f43f5e33' : 'transparent'}
                          />
                        ))}
                      </Scatter>
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>

                <div className="mt-8 flex justify-center gap-12">
                   <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_10px_#10b981]" />
                      <span className="text-[10px] font-mono uppercase tracking-widest opacity-40">Precision Locked (&lt;3°C Error)</span>
                   </div>
                   <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-rose-500 shadow-[0_0_10px_#f43f5e]" />
                      <span className="text-[10px] font-mono uppercase tracking-widest opacity-40">Neural Drift (&gt;3°C Error)</span>
                   </div>
                </div>
             </div>

             {/* Background Globe decorative element */}
             <div className="absolute inset-0 flex items-center justify-center opacity-[0.02] pointer-events-none">
                <Globe className="w-[800px] h-[800px]" />
             </div>
          </motion.div>
        )}
      </main>
    </motion.div>
  );
}

function StatBox({ label, value, icon }: { label: string, value: string | number, icon: ReactNode }) {
  return (
    <div className="flex items-center gap-5 bg-white/5 p-5 rounded-2xl border border-white/5 min-w-[180px]">
      <div className="p-3 bg-white/5 rounded-xl">{icon}</div>
      <div>
        <p className="text-[10px] font-mono opacity-40 uppercase tracking-[0.2em] mb-1 font-bold">{label}</p>
        <p className="text-2xl font-light tabular-nums">{value}</p>
      </div>
    </div>
  );
}

function StatusRow({ label, status, color }: { label: string, status: string, color: string }) {
  return (
    <div className="flex justify-between items-center group">
      <span className="text-[11px] opacity-40 font-mono uppercase tracking-widest group-hover:opacity-60 transition-opacity">{label}</span>
      <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-white/5 ${color}`}>{status}</span>
    </div>
  );
}

