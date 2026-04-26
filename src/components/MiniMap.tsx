
interface MiniMapProps {
  lat: number;
  lon: number;
}

export function MiniMap({ lat, lon }: MiniMapProps) {
  // Using an iframe with OpenStreetMap for interactivity without heavy dependencies
  const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${lon - 0.01}%2C${lat - 0.01}%2C${lon + 0.01}%2C${lat + 0.01}&layer=mapnik&marker=${lat}%2C${lon}`;
  
  return (
    <div className="relative w-full h-32 rounded-xl overflow-hidden glass border border-white/5 mb-6 group">
      <iframe 
        title="Location Map"
        width="100%" 
        height="100%" 
        frameBorder="0" 
        scrolling="no" 
        marginHeight={0} 
        marginWidth={0} 
        src={mapUrl}
        className="grayscale invert contrast-125 opacity-40 hover:opacity-100 transition-opacity duration-700"
      />
      <div className="absolute inset-0 pointer-events-none border border-sky-500/10 rounded-xl" />
      <div className="absolute top-2 right-2 p-1.5 glass rounded-md pointer-events-none">
        <div className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-ping" />
      </div>
    </div>
  );
}
