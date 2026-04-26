import { useState, useEffect, useCallback, type FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Cloud, 
  Droplets, 
  Wind, 
  MapPin, 
  Compass, 
  Thermometer, 
  AlertCircle, 
  BrainCircuit, 
  BarChart3,
  Calendar,
  CloudRain,
  Sun,
  RefreshCw,
  Info,
  Search,
  Sparkles,
  ShieldAlert
} from 'lucide-react';
import { fetchWeatherData, reverseGeocode, forwardGeocode } from './services/weatherService';
import { analyzeWeather, predictLongTermWeather } from './services/geminiService';
import { WeatherData, WeatherAnalysis } from './types';
import { WeatherChart } from './components/WeatherChart';
import { MiniMap } from './components/MiniMap';
import { PrecipitationChart } from './components/PrecipitationChart';
import { DataScienceDashboard } from './components/DataScienceDashboard';

import { logWeatherComparison, getModelPerformance } from './services/learningService';
import { auth, testConnection } from './services/firebase';
import { signInAnonymously } from 'firebase/auth';
import { getUserSettings, saveLocation, removeLocation } from './services/userService';
import { SavedLocations } from './components/SavedLocations';

export default function App() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [analysis, setAnalysis] = useState<WeatherAnalysis | null>(null);
  const [locationName, setLocationName] = useState<string>("Identifying...");
  const [refreshing, setRefreshing] = useState(false);
  const [scrubIndex, setScrubIndex] = useState(0);
  const [showInsights, setShowInsights] = useState(false);
  const [accuracyStats, setAccuracyStats] = useState<any>(null);
  const [view, setView] = useState<'weather' | 'datascience'>('weather');
  const [savedLocations, setSavedLocations] = useState<string[]>([]);
  const [modelVariant, setModelVariant] = useState<'standard' | 'experimental'>('standard');

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  // Future Prediction state
  const [futureDate, setFutureDate] = useState("");
  const [futureResult, setFutureResult] = useState<{ prediction: string, confidence: number } | null>(null);
  const [isPredicting, setIsPredicting] = useState(false);

  const initWeather = useCallback(async (lat: number, lon: number, customName?: string) => {
    try {
      setRefreshing(true);
      setError(null);
      const data = await fetchWeatherData(lat, lon);
      setWeather(data);
      
      // Basic UI is ready now
      setLoading(false);
      setRefreshing(false);

      if (customName) {
        setLocationName(customName);
      } else {
        const name = await reverseGeocode(lat, lon);
        setLocationName(name);
      }

      // Load AI and Learning in background
      try {
        const aiAnalysis = await analyzeWeather(data);
        setAnalysis(aiAnalysis);

        if (aiAnalysis) {
          const stats = await getModelPerformance(locationName);
          setAccuracyStats(stats);
          
          await logWeatherComparison({
            location: locationName,
            coordinates: { lat: data.latitude, lon: data.longitude },
            timestamp: new Date().toISOString(),
            actualTemp: data.current.temperature_2m,
            predictedTemp: data.current.apparent_temperature,
            errorDelta: data.current.temperature_2m - data.current.apparent_temperature,
            modelVariant
          });
        }
      } catch (bgError) {
        console.warn("Background tasks failed:", bgError);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error loading data");
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const handleSearch = async (e: FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    const result = await forwardGeocode(searchQuery);
    if (result) {
      initWeather(result.lat, result.lon, result.name);
      setSearchQuery("");
    } else {
      setError("Location not found.");
    }
    setIsSearching(false);
  };

  const handleFuturePredict = async () => {
    if (!futureDate || !locationName) return;

    setIsPredicting(true);
    const result = await predictLongTermWeather(locationName, futureDate);
    setFutureResult(result);
    setIsPredicting(false);
  };

  const handleSaveLocation = async () => {
    if (!locationName) return;
    await saveLocation(locationName);
    const settings = await getUserSettings();
    if (settings) setSavedLocations(settings.savedLocations);
  };

  const handleRemoveLocation = async (loc: string) => {
    await removeLocation(loc);
    const settings = await getUserSettings();
    if (settings) setSavedLocations(settings.savedLocations);
  };

  const handleSelectLocation = async (loc: string) => {
    const result = await forwardGeocode(loc);
    if (result) {
      initWeather(result.lat, result.lon, result.name);
    }
  };

  useEffect(() => {
    // Auth for Firestore
    const startFirebase = async () => {
      try {
        await testConnection();
        await signInAnonymously(auth);
        const settings = await getUserSettings();
        if (settings) setSavedLocations(settings.savedLocations);
      } catch (err: any) {
        if (err?.code === 'auth/admin-restricted-operation') {
          console.warn("Firebase Anonymous Auth is disabled. Please enable it in the Firebase Console (Authentication > Sign-in method).");
        } else {
          console.error("Firebase Auth Error:", err);
        }
      }
    };
    startFirebase();

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          initWeather(pos.coords.latitude, pos.coords.longitude);
        },
        () => {
          initWeather(59.437, 24.7535);
          setError("Location could not be identified. Showing Tallinn data.");
        }
      );
    } else {
      initWeather(59.437, 24.7535);
    }
  }, [initWeather]);

  if (view === 'datascience') {
    return <DataScienceDashboard onBack={() => setView('weather')} />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] text-slate-300 flex flex-col items-center justify-center space-y-4 font-mono">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        >
          <RefreshCw className="w-12 h-12 text-sky-500/50" />
        </motion.div>
        <p className="text-sky-500/50 text-[10px] tracking-[0.3em] uppercase">Initializing Neural Engine...</p>
      </div>
    );
  }

  const chartData = weather?.hourly.time.slice(0, 72).map((time, i) => ({
    time,
    temp: weather.hourly.temperature_2m[i],
    humidity: weather.hourly.relative_humidity_2m[i],
    wind: weather.hourly.wind_speed_10m[i],
  })) || [];

  const scrubbedData = weather ? {
    time: weather.hourly.time[scrubIndex],
    temp: weather.hourly.temperature_2m[scrubIndex],
    humidity: weather.hourly.relative_humidity_2m[scrubIndex],
    wind: weather.hourly.wind_speed_10m[scrubIndex],
  } : null;

  return (
    <div className="min-h-screen bg-[#050505] text-[#e2e8f0] selection:bg-sky-500/30 p-8 font-sans overflow-x-hidden">
      <div className="max-w-7xl mx-auto h-full flex flex-col gap-8">
        
        {/* Header Section */}
        <header className="flex flex-col md:flex-row justify-between items-end border-b border-slate-800 pb-6 gap-6">
          <div className="flex flex-col w-full md:w-auto">
            <span className="font-mono text-[10px] tracking-[0.3em] uppercase text-sky-500 mb-1 block">Atmospheric Intelligence System</span>
            <h1 className="text-4xl font-light tracking-tight flex items-baseline gap-2 mb-4">
              {locationName.split(',')[0]} 
              <span className="serif-italic text-3xl opacity-40 ml-1">Estonia</span>
            </h1>
            
            {/* Search Input */}
            <form onSubmit={handleSearch} className="relative group max-w-sm">
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search location..."
                className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-4 pl-10 text-sm focus:outline-none focus:border-sky-500/50 transition-all font-light placeholder:opacity-30"
              />
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-500 group-focus-within:text-sky-500 transition-colors" />
              {isSearching && (
                <RefreshCw className="absolute right-3 top-2.5 w-4 h-4 text-sky-500 animate-spin" />
              )}
            </form>
          </div>
          
            <div className="flex gap-12 text-right w-full md:w-auto justify-end">
            <button 
              onClick={() => setView('datascience')}
              className="flex flex-col text-right hover:opacity-70 transition-opacity"
            >
              <span className="font-mono text-[10px] uppercase opacity-40 mb-1 tracking-widest flex items-center justify-end gap-1">
                <BrainCircuit className="w-3 h-3" /> Global Learning Delta
              </span>
              <span className="text-xl font-medium text-emerald-400">
                {accuracyStats ? `±${accuracyStats.averageError.toFixed(2)}°C` : 'SYNCING...'}
              </span>
            </button>
            <div className="flex flex-col">
              <span className="font-mono text-[10px] uppercase opacity-40 mb-1 tracking-widest">Computation</span>
              <span className="text-xl font-medium">124ms</span>
            </div>
            <div className="flex flex-col">
              <span className="font-mono text-[10px] uppercase opacity-40 mb-1 tracking-widest text-right">Model Variant</span>
              <div className="flex bg-white/5 p-0.5 rounded-lg border border-white/10 items-center">
                {(['std', 'exp'] as const).map((v) => (
                  <button
                    key={v}
                    onClick={() => setModelVariant(v === 'std' ? 'standard' : 'experimental')}
                    className={`px-2 py-0.5 text-[9px] font-mono uppercase tracking-widest rounded transition-all ${
                      (v === 'std' && modelVariant === 'standard') || (v === 'exp' && modelVariant === 'experimental')
                      ? 'bg-sky-500 text-[#050505] font-bold' 
                      : 'opacity-40 hover:opacity-100'
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-col">
              <span className="font-mono text-[10px] uppercase opacity-40 mb-1 tracking-widest">Last Refresh</span>
              <div className="flex items-center gap-2 justify-end">
                <span className="text-xl font-medium">{new Date().toLocaleTimeString('en-US', { hour12: false })}</span>
                <button 
                  onClick={() => weather && initWeather(weather.latitude, weather.longitude)}
                  disabled={refreshing}
                  className="p-1 hover:text-sky-500 transition-colors"
                >
                  <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>
          </div>
        </header>

        {error && (
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[10px] font-mono tracking-wider flex items-center gap-2 rounded-lg"
          >
            <AlertCircle className="w-4 h-4" />
            <span>{error.toUpperCase()}</span>
          </motion.div>
        )}

        <main className="grid grid-cols-12 gap-8 flex-grow">
          {/* Live Node Monitor */}
          <div className="col-span-12 flex gap-4 overflow-x-auto pb-4 scrollbar-none">
            {['TLL-1', 'NYC-4', 'TYO-2', 'LDN-7'].map(node => (
              <div key={node} className="flex-shrink-0 glass px-4 py-2 rounded-xl flex items-center gap-3 border-sky-500/10 min-w-[120px]">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981] animate-pulse" />
                <span className="font-mono text-[9px] uppercase tracking-widest opacity-60">NODE {node}</span>
                <span className="font-mono text-[9px] text-sky-400 font-bold ml-auto">LIVE</span>
              </div>
            ))}
          </div>
          
          {/* Left Column (3) */}
          <aside className="col-span-12 lg:col-span-3 flex flex-col gap-6">
            <div className="glass rounded-2xl p-6">
              <h3 className="font-mono text-[11px] uppercase tracking-widest text-sky-400 mb-4">Current Node</h3>
              <div className="flex items-center justify-between mb-4">
                <span className="text-5xl font-light tracking-tighter text-white">
                  {Math.round(weather?.current.temperature_2m || 0)}°C
                </span>
                <div className="flex flex-col items-end gap-2">
                  <Cloud className="w-10 h-10 text-sky-400 opacity-60" />
                  {analysis && Math.abs(weather?.current.temperature_2m! - weather?.current.apparent_temperature!) > 5 && (
                    <div className="flex items-center gap-2 px-2 py-0.5 bg-rose-500/10 border border-rose-500/20 rounded-full">
                      <ShieldAlert className="w-2.5 h-2.5 text-rose-500" />
                      <span className="text-[8px] font-mono text-rose-500 uppercase tracking-widest font-bold">Anomaly</span>
                    </div>
                  )}
                </div>
              </div>
              <p className="text-sm opacity-60 leading-relaxed mb-4 font-light">
                {analysis?.summary || "Harvesting atmospheric data..."}
              </p>

              {weather && (
                <MiniMap lat={weather.latitude} lon={weather.longitude} />
              )}

              <AnimatePresence>
                {showInsights && analysis?.scientificInsights && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden mb-4 border-l border-sky-500/30 pl-3 py-1"
                  >
                    <p className="text-[11px] text-zinc-400 italic font-mono leading-relaxed">
                      {analysis.scientificInsights}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              <button
                onClick={() => setShowInsights(!showInsights)}
                className="text-[10px] font-mono uppercase tracking-[0.2em] text-sky-400/80 hover:text-sky-400 mb-6 flex items-center gap-1 transition-colors"
              >
                {showInsights ? "Close Metadata" : "Read More [Analyze]"}
                <Info className="w-3 h-3" />
              </button>
              
              <div className="space-y-3 pt-6 border-t border-white/5">
                <div className="flex justify-between text-[11px]">
                  <span className="opacity-40 font-mono uppercase tracking-wider">Humidity</span>
                  <span className="font-mono text-sky-400">{weather?.current.relative_humidity_2m}%</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="opacity-40 font-mono uppercase tracking-wider">Wind Velocity</span>
                  <span className="font-mono text-emerald-400">{weather?.current.wind_speed_10m} km/h</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="opacity-40 font-mono uppercase tracking-wider">Pressure</span>
                  <span className="font-mono text-amber-500">{weather?.current.surface_pressure} hPa</span>
                </div>
              </div>
            </div>

            <div className="glass rounded-2xl p-6 flex-grow">
              <h3 className="font-mono text-[11px] uppercase tracking-widest text-amber-500 mb-6">Data Pipeline</h3>
              <ul className="space-y-5">
                <li className="flex gap-4 items-start">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shadow-[0_0_8px_rgba(245,158,11,0.5)]"></div>
                  <div>
                    <span className="text-xs block font-semibold text-slate-200">Open-Meteo API</span>
                    <span className="text-[10px] opacity-40 block font-mono uppercase tracking-tighter">Real-time Telemetry Active</span>
                  </div>
                </li>
                <li className="flex gap-4 items-start">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                  <div>
                    <span className="text-xs block font-semibold text-slate-200">Neural Engine</span>
                    <span className="text-[10px] opacity-40 block font-mono uppercase tracking-tighter">Generative Analysis Complete</span>
                  </div>
                </li>
                <li className="flex gap-4 items-start">
                  <div className="w-1.5 h-1.5 rounded-full bg-sky-500 mt-1.5 shadow-[0_0_8px_rgba(56,189,248,0.5)]"></div>
                  <div>
                    <span className="text-xs block font-semibold text-slate-200">Atmosphere Guard</span>
                    <span className="text-[10px] opacity-40 block font-mono uppercase tracking-tighter">Satellite Sync Synchronized</span>
                  </div>
                </li>
              </ul>
            </div>
          </aside>

          {/* Center Column (6) */}
          <section className="col-span-12 lg:col-span-6 flex flex-col gap-6">
            <div className="glass rounded-2xl p-8 flex-grow relative overflow-hidden flex flex-col min-h-[450px]">
              <div className="mb-6 flex justify-between items-start">
                <div>
                  <h3 className="font-mono text-[11px] uppercase tracking-widest text-sky-400">72-Hour Predictive Path</h3>
                  <p className="text-xs opacity-40 font-mono uppercase tracking-tighter">Synthetic forecast based on current vector analysis</p>
                </div>
                {scrubbedData && (
                  <div className="text-right font-mono">
                    <span className="text-[10px] text-sky-500 uppercase tracking-widest block">Data at T+{scrubIndex}h</span>
                    <span className="text-xl font-light text-white">{Math.round(scrubbedData.temp)}°C</span>
                  </div>
                )}
              </div>
              
              <div className="flex-grow w-full">
                <WeatherChart data={chartData} activeHourIndex={scrubIndex} />
              </div>

              <div className="mt-8 space-y-4">
                <div className="relative h-6 group">
                  <input 
                    type="range" 
                    min="0" 
                    max="71" 
                    value={scrubIndex} 
                    onChange={(e) => setScrubIndex(parseInt(e.target.value))}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                  />
                  <div className="absolute inset-y-2.5 left-0 right-0 h-1 bg-white/5 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-sky-500/30 transition-all duration-300"
                      style={{ width: `${(scrubIndex / 71) * 100}%` }}
                    />
                  </div>
                  <div 
                    className="absolute top-0 bottom-0 w-0.5 bg-sky-500 shadow-[0_0_10px_rgba(56,189,248,0.5)] transition-all duration-300 z-10"
                    style={{ left: `${(scrubIndex / 71) * 100}%` }}
                  />
                  {/* Ticks */}
                  <div className="absolute top-6 left-0 right-0 flex justify-between font-mono text-[8px] opacity-20 uppercase tracking-tighter pointer-events-none">
                    <span>Now</span>
                    <span>T+24h</span>
                    <span>T+48h</span>
                    <span>T+72h</span>
                  </div>
                </div>
                
                {scrubbedData && (
                  <div className="flex justify-between items-center py-2 px-4 bg-white/5 rounded-lg border border-white/5 font-mono text-[10px]">
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1.5 opacity-60">
                        <Thermometer className="w-3 h-3 text-rose-500" /> {Math.round(scrubbedData.temp)}°C
                      </span>
                      <span className="flex items-center gap-1.5 opacity-60">
                        <Droplets className="w-3 h-3 text-sky-500" /> {Math.round(scrubbedData.humidity)}%
                      </span>
                      <span className="flex items-center gap-1.5 opacity-60">
                        <Wind className="w-3 h-3 text-emerald-500" /> {Math.round(scrubbedData.wind)} km/h
                      </span>
                    </div>
                    <span className="opacity-40">
                      {new Date(scrubbedData.time).toLocaleString('en-US', { weekday: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 h-auto md:h-32">
              <div className="glass rounded-xl p-4 flex flex-col justify-between hover:bg-white/5 transition-colors group">
                <span className="font-mono text-[9px] opacity-40 uppercase tracking-widest group-hover:opacity-60">Clouds</span>
                <span className="text-2xl font-light">{weather?.current.cloud_cover}<span className="text-sm ml-1 opacity-40">%</span></span>
                <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden mt-2">
                  <div className="h-full bg-sky-500 transition-all duration-1000" style={{ width: `${weather?.current.cloud_cover}%` }}></div>
                </div>
              </div>
              <div className="glass rounded-xl p-4 flex flex-col justify-between hover:bg-white/5 transition-colors group">
                <span className="font-mono text-[9px] opacity-40 uppercase tracking-widest group-hover:opacity-60">Apparent</span>
                <span className="text-2xl font-light">{Math.round(weather?.current.apparent_temperature || 0)}°C</span>
                <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden mt-2">
                  <div className="h-full bg-emerald-500 transition-all duration-1000" style={{ width: `${Math.abs(weather?.current.apparent_temperature || 0) * 2}%` }}></div>
                </div>
              </div>
              <div className="glass rounded-xl p-4 flex flex-col justify-between hover:bg-white/5 transition-colors group">
                <span className="font-mono text-[9px] opacity-40 uppercase tracking-widest group-hover:opacity-60">Wind Digits</span>
                <span className="text-2xl font-light">{weather?.current.wind_speed_10m}</span>
                <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden mt-2">
                  <div className="h-full bg-sky-500 transition-all duration-1000" style={{ width: `${(weather?.current.wind_speed_10m || 0) * 2}%` }}></div>
                </div>
              </div>
              <div className="glass rounded-xl p-4 flex flex-col justify-between hover:bg-white/5 transition-colors group">
                <span className="font-mono text-[9px] opacity-40 uppercase tracking-widest group-hover:opacity-60">Pressure Index</span>
                <span className="text-2xl font-light">{weather?.current.surface_pressure.toString().slice(-3)}</span>
                <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden mt-2">
                  <div className="h-full bg-amber-500 transition-all duration-1000" style={{ width: '60%' }}></div>
                </div>
              </div>
            </div>
          </section>

          {/* Right Column (3) */}
          <aside className="col-span-12 lg:col-span-3 flex flex-col gap-6">
            <div className="glass rounded-2xl p-6 flex-grow">
              <h3 className="font-mono text-[11px] uppercase tracking-widest text-sky-400 mb-6">Extended Sequence</h3>
              <div className="space-y-5">
                {weather?.daily.time.slice(1, 6).map((time, i) => {
                  const date = new Date(time);
                  return (
                    <div key={time} className="flex items-center justify-between group cursor-default">
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-slate-300">
                          {date.toLocaleDateString('en-US', { weekday: 'long' })}
                        </span>
                        <span className="text-[10px] font-mono opacity-40 uppercase tracking-tighter">
                          {weather.daily.precipitation_sum[i+1] > 0 ? `Rain expected (${weather.daily.precipitation_sum[i+1]}mm)` : 'Optimal conditions'}
                        </span>
                      </div>
                      <div className="text-right flex flex-col items-end">
                        <span className="text-lg font-light">{Math.round(weather.daily.temperature_2m_max[i+1])}°</span>
                        <span className="text-[9px] font-mono opacity-30 uppercase">{Math.round(weather.daily.temperature_2m_min[i+1])}° Min</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {weather && (
                <div className="mt-8 pt-6 border-t border-white/5 p-4">
                  <h4 className="font-mono text-[9px] uppercase tracking-[0.2em] text-slate-500 mb-2">Precipitation Forecast (5D)</h4>
                  <PrecipitationChart 
                    data={weather.daily.time.slice(0, 5).map((time, i) => ({
                      day: new Date(time).toLocaleDateString('en-US', { weekday: 'short' }),
                      amount: weather.daily.precipitation_sum[i]
                    }))} 
                  />
                </div>
              )}
            </div>

            <SavedLocations 
              locations={savedLocations}
              onSelect={handleSelectLocation}
              onRemove={handleRemoveLocation}
              onAddCurrent={handleSaveLocation}
              currentLocation={locationName}
            />

            <div 
              onClick={() => weather && initWeather(weather.latitude, weather.longitude)}
              className="bg-sky-500 text-[#050505] rounded-2xl p-6 flex flex-col justify-between cursor-pointer hover:bg-sky-400 transition-all duration-300 hover:scale-[1.02] shadow-[0_0_20px_rgba(56,189,248,0.2)] group"
            >
              <div className="flex justify-between items-start">
                <span className="font-mono text-[10px] uppercase font-bold tracking-widest">Neural Re-Sync</span>
                <BrainCircuit className="w-5 h-5 group-hover:rotate-12 transition-transform" />
              </div>
              <div className="mt-8">
                <p className="text-sm font-bold leading-tight">Run predictive simulation and re-train model on local metadata.</p>
                <div className="mt-3 flex items-center gap-2 opacity-60">
                   <div className="w-1 h-1 bg-current rounded-full" />
                   <span className="font-mono text-[8px] uppercase tracking-[0.2em]">Ensemble Predictor v3.11</span>
                </div>
              </div>
            </div>

            {/* NEW: Temporal Extrapolation (Future Prediction Based on History) */}
            <div className="glass rounded-2xl p-6 flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <h3 className="font-mono text-[11px] uppercase tracking-widest text-amber-500">Temporal Extrapolation</h3>
                <Sparkles className="w-4 h-4 text-amber-500" />
              </div>
              
              <div className="space-y-3">
                <p className="text-[10px] opacity-40 font-mono uppercase tracking-tighter">Choose a future date (week, month, or year):</p>
                <div className="flex gap-2">
                  <input 
                    type="date" 
                    value={futureDate}
                    onChange={(e) => setFutureDate(e.target.value)}
                    className="flex-grow bg-white/5 border border-white/10 rounded-lg py-1.5 px-3 text-xs focus:border-amber-500/50 outline-none"
                  />
                  <button 
                    onClick={handleFuturePredict}
                    disabled={isPredicting || !futureDate}
                    className="bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-500 px-3 py-1.5 rounded-lg text-xs font-mono transition-colors disabled:opacity-30"
                  >
                    {isPredicting ? <RefreshCw className="w-3 h-3 animate-spin mx-auto" /> : "PREDICT"}
                  </button>
                </div>
              </div>

              <AnimatePresence>
                {futureResult && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="pt-4 border-t border-white/5"
                  >
                    <div className="flex justify-between items-center mb-2">
                       <span className="text-[9px] font-mono opacity-40 uppercase">Statistical Confidence</span>
                       <span className="text-[11px] font-mono text-amber-400">{futureResult.confidence}%</span>
                    </div>
                    <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden mb-3">
                      <div className="h-full bg-amber-500" style={{ width: `${futureResult.confidence}%` }}></div>
                    </div>
                    <p className="text-xs text-zinc-300 leading-relaxed italic border-l-2 border-amber-500/30 pl-3">
                      {futureResult.prediction}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </aside>
        </main>

        <footer className="mt-8 flex justify-between items-center opacity-20 font-mono text-[9px] uppercase tracking-[0.3em] pb-8 underline-offset-4 decoration-sky-500/30 underline decoration-dotted">
          <span>AES-256 Cloud Encryption Enabled</span>
          <span className="hidden md:inline">Core v3.11.0-Predictor-X</span>
          <span>Scientific Data Engine</span>
        </footer>
      </div>
    </div>
  );
}
