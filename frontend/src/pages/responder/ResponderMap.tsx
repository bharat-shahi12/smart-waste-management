import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import api from '../../services/api';
import 'leaflet/dist/leaflet.css';
import { 
  Crosshair, Navigation, Layers, RefreshCw 
} from 'lucide-react';
import { useLiveRefresh } from '../../services/liveEvents';
import type { Dustbin } from '../../types';
import { 
  MAP_LAYERS, 
  getMainBinIcon, 
  getFleetBinIcon, 
  getUserLocationIcon, 
  isMainBin, 
  openInGoogleMaps 
} from '../../utils/mapUtils';
import type { MapTileLayerKey } from '../../utils/mapUtils';

function MapController({ center, zoom = 14 }: { center: [number, number]; zoom?: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, zoom, { duration: 1.2 });
  }, [center, zoom, map]);
  return null;
}

export default function ResponderMap() {
  const [dustbins, setDustbins] = useState<Dustbin[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([28.555467, 77.325600]);
  const [activeLayer, setActiveLayer] = useState<MapTileLayerKey>('google_streets');

  const fetchDustbins = async () => {
    try {
      const response = await api.get('/dustbins');
      setDustbins(response.data);
      const main = response.data.find((b: Dustbin) => isMainBin(b));
      if (main && main.latitude && main.longitude) {
        setMapCenter([main.latitude, main.longitude]);
      }
    } catch (error) {
      console.error('Failed to fetch dustbins', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => setUserLocation([position.coords.latitude, position.coords.longitude]),
        (error) => console.log('Error getting location:', error),
        { enableHighAccuracy: true }
      );
    }
    fetchDustbins();
  }, []);

  useLiveRefresh(() => {
    api.get('/dustbins').then(res => setDustbins(res.data));
  }, ['DUSTBIN', 'BIN', 'RECONNECTED']);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center text-gray-500 font-bold gap-2">
        <RefreshCw className="w-5 h-5 animate-spin text-emerald-600" />
        Loading Collector Navigation Map...
      </div>
    );
  }

  const validBins = dustbins.filter(b => 
    b.latitude != null && b.longitude != null &&
    !isNaN(b.latitude) && !isNaN(b.longitude) &&
    (Math.abs(b.latitude) > 0.0001 || Math.abs(b.longitude) > 0.0001)
  );

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] relative font-sans">
      
      {/* Map Control Toolbar */}
      <div className="absolute top-4 right-4 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-3 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 flex flex-col gap-2.5 max-w-xs w-full">
        <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
          <span className="flex items-center gap-1.5"><Layers className="w-3.5 h-3.5 text-emerald-600" /> Map Type:</span>
          <span className="text-[10px] font-mono text-emerald-600">{MAP_LAYERS[activeLayer].name}</span>
        </div>
        <div className="grid grid-cols-4 gap-1">
          <button
            onClick={() => setActiveLayer('google_streets')}
            className={`py-1 px-1.5 rounded-lg text-xs font-bold transition ${
              activeLayer === 'google_streets' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Google
          </button>
          <button
            onClick={() => setActiveLayer('google_satellite')}
            className={`py-1 px-1.5 rounded-lg text-xs font-bold transition ${
              activeLayer === 'google_satellite' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Satellite
          </button>
          <button
            onClick={() => setActiveLayer('google_terrain')}
            className={`py-1 px-1.5 rounded-lg text-xs font-bold transition ${
              activeLayer === 'google_terrain' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Terrain
          </button>
          <button
            onClick={() => setActiveLayer('osm')}
            className={`py-1 px-1.5 rounded-lg text-xs font-bold transition ${
              activeLayer === 'osm' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            OSM
          </button>
        </div>
      </div>

      {/* Floating GPS Button */}
      {userLocation && (
        <button 
          onClick={() => setMapCenter(userLocation)}
          className="absolute bottom-6 right-4 z-20 bg-white dark:bg-slate-900 p-3.5 rounded-full shadow-xl border border-slate-200 dark:border-slate-700 text-blue-600 hover:scale-105 active:scale-95 transition-all"
          title="Center on my current location"
        >
          <Crosshair className="w-6 h-6" />
        </button>
      )}

      {/* Leaflet Map */}
      <div className="flex-1 rounded-2xl overflow-hidden shadow-xs border border-slate-200 dark:border-slate-800 z-0 relative">
        <MapContainer center={mapCenter} zoom={13} style={{ height: '100%', width: '100%' }}>
          <MapController center={mapCenter} zoom={13} />
          
          <TileLayer 
            key={activeLayer}
            url={MAP_LAYERS[activeLayer].url} 
            attribution={MAP_LAYERS[activeLayer].attribution}
            maxZoom={20}
          />

          {/* User Location */}
          {userLocation && (
            <Marker position={userLocation} icon={getUserLocationIcon()}>
              <Popup>
                <div className="p-2 text-xs font-bold text-blue-600">
                  Collector Vehicle Location
                </div>
              </Popup>
            </Marker>
          )}

          {/* Dustbins */}
          {validBins.map((bin) => {
            const isPrimary = isMainBin(bin);
            const fill = bin.fillLevel || 0;
            const icon = isPrimary 
              ? getMainBinIcon(fill, bin.status) 
              : getFleetBinIcon(fill, bin.status, bin.wasteType);

            return (
              <Marker 
                key={bin.id} 
                position={[bin.latitude, bin.longitude]} 
                icon={icon}
                zIndexOffset={isPrimary ? 1000 : 100}
              >
                <Popup>
                  <div className="p-2.5 min-w-[220px] font-sans">
                    <div className="mb-2 pb-2 border-b border-slate-100">
                      {isPrimary && (
                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 mb-1">
                          ★ MAIN LIVE HARDWARE
                        </span>
                      )}
                      <h3 className="font-extrabold text-base text-slate-900">{bin.name}</h3>
                      <p className="font-mono text-xs text-slate-400">{bin.deviceId}</p>
                    </div>

                    <div className="space-y-1 text-xs mb-3">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Status</span>
                        <span className={`font-bold ${bin.status === 'FULL' ? 'text-rose-600' : 'text-emerald-600'}`}>
                          {bin.status}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Fill Level</span>
                        <span className="font-bold text-slate-900">{fill.toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Waste Type</span>
                        <span className="font-semibold">{bin.wasteType}</span>
                      </div>
                    </div>

                    <button 
                      onClick={() => openInGoogleMaps(bin.latitude, bin.longitude)}
                      className="w-full flex items-center justify-center gap-1.5 bg-[#1a73e8] hover:bg-blue-700 text-white py-2 px-3 rounded-xl text-xs font-bold transition shadow-xs"
                    >
                      <Navigation className="w-3.5 h-3.5" />
                      <span>Navigate with Google Maps</span>
                    </button>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
}
