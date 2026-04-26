
import { motion } from 'motion/react';
import { MapPin, X, Bookmark } from 'lucide-react';

interface SavedLocationsProps {
  locations: string[];
  onSelect: (location: string) => void;
  onRemove: (location: string) => void;
  onAddCurrent: () => void;
  currentLocation: string;
}

export function SavedLocations({ locations, onSelect, onRemove, onAddCurrent, currentLocation }: SavedLocationsProps) {
  const isCurrentSaved = locations.includes(currentLocation);

  return (
    <div className="glass rounded-2xl p-6 flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <h3 className="font-mono text-[11px] uppercase tracking-widest text-emerald-500">Saved Nodes</h3>
        <Bookmark className="w-4 h-4 text-emerald-500" />
      </div>

      <div className="space-y-3">
        {locations.length === 0 ? (
          <p className="text-[10px] opacity-40 font-mono uppercase text-center py-4">No saved coordinates</p>
        ) : (
          locations.map((loc) => (
            <div 
              key={loc}
              className="flex items-center justify-between group p-2 hover:bg-white/5 rounded-lg transition-colors border border-transparent hover:border-white/10"
            >
              <button 
                onClick={() => onSelect(loc)}
                className="flex items-center gap-3 text-xs font-light text-slate-300 hover:text-emerald-400 transition-colors flex-grow text-left"
              >
                <MapPin className="w-3 h-3 opacity-40" />
                {loc.split(',')[0]}
              </button>
              <button 
                onClick={() => onRemove(loc)}
                className="opacity-0 group-hover:opacity-40 hover:opacity-100 p-1 transition-all"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))
        )}
      </div>

      {!isCurrentSaved && currentLocation && (
        <button 
          onClick={onAddCurrent}
          className="w-full py-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-500 rounded-xl text-[10px] font-mono uppercase tracking-widest transition-all"
        >
          + Save current location
        </button>
      )}
    </div>
  );
}
