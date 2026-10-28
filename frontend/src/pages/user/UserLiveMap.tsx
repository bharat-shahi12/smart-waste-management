import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { dustbinService } from '../../services/dustbinService';
import type { Dustbin } from '../../types';
import 'leaflet/dist/leaflet.css';
import { 
  Navigation, Search, Crosshair, Map as MapIcon, 
  Satellite, Layers, Sparkles, Radio, CheckCircle2, AlertTriangle 
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLiveRefresh } from '../../services/liveEvents';
import api from '../../services/api';
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

export default function UserLiveMap() {
  const [dustbins, setDustbins] = useState<Dustbin[]>([]);
  const [filteredBins, setFilteredBins] = useState<Dustbin[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([28.555467, 77.325600]);
  const [activeLayer, setActiveLayer] = useState<MapTileLayerKey>('google_streets');
  const [syncingLocation, setSyncingLocation] = useState(false);
  const [seedingMock, setSeedingMock] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Haversine formula to calculate distance in km
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return (R * c).toFixed(2);
  };

  const fetchBins = () => {
    dustbinService.getAllDustbins().then(data => {
      setDustbins(data);
      setFilteredBins(data);
      const main = data.find(b => isMainBin(b));
      if (main && main.latitude && main.longitude) {
        setMapCenter([main.latitude, main.longitude]);
      }
      setLoading(false);
    });
  };

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords: [number, number] = [position.coords.latitude, position.coords.longitude];
          setUserLocation(coords);
        },
        (error) => console.log('Geolocation notice:', error.message),
        { enableHighAccuracy: true }
      );
    }
    fetchBins();
  }, []);

  useLiveRefresh(() => {
    dustbinService.getAllDustbins().then(data => {
      setDustbins(data);
      setFilteredBins(data);
    });
  }, ['DUSTBIN', 'BIN', 'RECONNECTED']);

  useEffect(() => {
    let result = dustbins.filter(b => 
      b.latitude != null && b.longitude != null &&
      !isNaN(b.latitude) && !isNaN(b.longitude) &&
      (Math.abs(b.latitude) > 0.0001 || Math.abs(b.longitude) > 0.0001)
    );

    if (filter === 'AVAILABLE') result = result.filter(b => b.status === 'AVAILABLE');
    else if (filter === 'FULL') result = result.filter(b => b.status === 'FULL');
    else if (filter === 'OFFLINE') result = result.filter(b => b.status === 'OFFLINE');
    else if (filter === 'MAIN_ONLY') result = result.filter(b => isMainBin(b));
    
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(b => 
        (b.name && b.name.toLowerCase().includes(q)) || 
        (b.deviceId && b.deviceId.toLowerCase().includes(q)) ||
        (b.locationName && b.locationName.toLowerCase().includes(q))
      );
    }
    
    setFilteredBins(result);
  }, [filter, searchQuery, dustbins]);

  // Set Main Dustbin ESP32_1001 to user's current GPS location
  const handleSetMainBinToCurrentLocation = () => {
    if (!navigator.geolocation) {
      setFeedbackMsg({ text: 'Geolocation is not supported by your browser.', type: 'error' });
      return;
    }

    setSyncingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setUserLocation([lat, lng]);
        setMapCenter([lat, lng]);

        try {
          const res = await api.post('/dustbins/set-main-location', {
            latitude: lat,
            longitude: lng,
            locationName: 'My Live GPS Location',
            address: `Lat: ${lat.toFixed(5)}, Lng: ${lng.toFixed(5)}`
          });

          setFeedbackMsg({ 
            text: `📍 Primary Smart Bin (${res.data.name}) pinned to your location!`, 
            type: 'success' 
          });
          fetchBins();
        } catch (err: any) {
          setFeedbackMsg({ text: 'Failed to update dustbin location.', type: 'error' });
        } finally {
          setSyncingLocation(false);
          setTimeout(() => setFeedbackMsg(null), 5000);
        }
      },
      (err) => {
        setSyncingLocation(false);
        setFeedbackMsg({ text: `GPS error: ${err.message}`, type: 'error' });
        setTimeout(() => setFeedbackMsg(null), 5000);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Seed 8 surrounding mock bins around current center
  const handleSeedMockBins = async () => {
    setSeedingMock(true);
    try {
      const coords = userLocation ? { latitude: userLocation[0], longitude: userLocation[1] } : undefined;
      const res = await api.post('/dustbins/seed-mock', coords);
      setFeedbackMsg({ 
        text: `✨ Successfully populated ${res.data.length} smart mock bins on the map!`, 
        type: 'success' 
      });
      fetchBins();
    } catch (err) {
      setFeedbackMsg({ text: 'Failed to seed mock bins.', type: 'error' });
    } finally {
      setSeedingMock(false);
      setTimeout(() => setFeedbackMsg(null), 5000);
    }
  };

  if (loading) return <div className="flex h-full items-center justify-center font-bold text-gray-500">Loading citizen map...</div>;

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] relative font-sans">
      
      {/* Toast Alert Feedback */}
      {feedbackMsg && (
        <div className={`absolute top-4 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 text-xs font-bold transition-all border animate-in fade-in duration-200 ${
          feedbackMsg.type === 'success' 
            ? 'bg-emerald-900/90 text-white border-emerald-400 backdrop-blur-md' 
            : 'bg-rose-900/90 text-white border-rose-400 backdrop-blur-md'
        }`}>
          {feedbackMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-rose-400" />}
          <span>{feedbackMsg.text}</span>
        </div>
      )}

      {/* Floating Control Toolbar */}
      <div className="absolute top-4 right-4 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-3.5 rounded-2xl shadow-xl border border-slate-200/80 dark:border-slate-800 flex flex-col gap-3 max-w-sm sm:max-w-md w-full">
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search nearby bins by name or ID..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-slate-100"
          />
        </div>

        {/* Map Type Switcher (Google Maps, Satellite, Terrain, OSM) */}
        <div>
          <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">
            <span className="flex items-center gap-1.5"><Layers className="w-3.5 h-3.5 text-emerald-600" /> Map Type:</span>
            <span className="text-[10px] font-mono font-normal text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded">
              {MAP_LAYERS[activeLayer].name}
            </span>
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            <button
              onClick={() => setActiveLayer('google_streets')}
              className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-xs font-bold transition ${
                activeLayer === 'google_streets'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              <MapIcon className="w-3 h-3" />
              <span>Google</span>
            </button>
            <button
              onClick={() => setActiveLayer('google_satellite')}
              className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-xs font-bold transition ${
                activeLayer === 'google_satellite'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              <Satellite className="w-3 h-3" />
              <span>Satellite</span>
            </button>
            <button
              onClick={() => setActiveLayer('google_terrain')}
              className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-xs font-bold transition ${
                activeLayer === 'google_terrain'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              <span>Terrain</span>
            </button>
            <button
              onClick={() => setActiveLayer('osm')}
              className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-xs font-bold transition ${
                activeLayer === 'osm'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              <span>OSM</span>
            </button>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap gap-1.5 items-center pt-1 border-t border-slate-100 dark:border-slate-800">
          <button 
            onClick={() => setFilter('ALL')} 
            className={`text-[11px] px-2.5 py-1 rounded-full font-bold transition ${
              filter === 'ALL' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            All ({dustbins.length})
          </button>
          <button 
            onClick={() => setFilter('MAIN_ONLY')} 
            className={`text-[11px] px-2.5 py-1 rounded-full font-bold flex items-center gap-1 transition ${
              filter === 'MAIN_ONLY' ? 'bg-emerald-700 text-white shadow-xs' : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
            }`}
          >
            ★ Main Live Bin
          </button>
          <button 
            onClick={() => setFilter('AVAILABLE')} 
            className={`text-[11px] px-2.5 py-1 rounded-full font-bold transition ${
              filter === 'AVAILABLE' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Available
          </button>
          <button 
            onClick={() => setFilter('FULL')} 
            className={`text-[11px] px-2.5 py-1 rounded-full font-bold transition ${
              filter === 'FULL' ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Full
          </button>
        </div>

        {/* Action Controls */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={handleSetMainBinToCurrentLocation}
            disabled={syncingLocation}
            className="flex items-center justify-center gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-xs py-2 px-3 rounded-xl shadow-xs transition disabled:opacity-50"
            title="Set main smart bin coordinates to your current GPS position"
          >
            <Radio className={`w-3.5 h-3.5 ${syncingLocation ? 'animate-spin' : ''}`} />
            <span>{syncingLocation ? 'Locating...' : '📍 Pin Main Bin Here'}</span>
          </button>
          <button
            onClick={handleSeedMockBins}
            disabled={seedingMock}
            className="flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs py-2 px-3 rounded-xl transition disabled:opacity-50"
            title="Populate 8 smart mock dustbins around the map"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>{seedingMock ? 'Seeding...' : '+8 Mock Bins'}</span>
          </button>
        </div>
      </div>

      {/* Floating GPS Crosshair Button */}
      {userLocation && (
        <button 
          onClick={() => setMapCenter(userLocation)}
          className="absolute bottom-6 right-4 z-20 bg-white dark:bg-slate-900 p-3.5 rounded-full shadow-xl border border-slate-200 dark:border-slate-700 text-blue-600 dark:text-blue-400 hover:scale-105 active:scale-95 transition-all"
          title="Go to my location"
        >
          <Crosshair className="w-6 h-6" />
        </button>
      )}

      {/* Map Container */}
      <div className="flex-1 bg-slate-100 dark:bg-slate-900 rounded-2xl overflow-hidden shadow-xs border border-slate-200 dark:border-slate-800 z-0 relative">
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
                <div className="p-2 min-w-[180px] font-sans">
                  <div className="flex items-center gap-2 text-blue-600 font-extrabold text-sm mb-1">
                    <Crosshair className="w-4 h-4" />
                    <span>Your Current Location</span>
                  </div>
                  <p className="text-xs text-slate-500 mb-2">
                    Lat: {userLocation[0].toFixed(5)}, Lng: {userLocation[1].toFixed(5)}
                  </p>
                  <button
                    onClick={handleSetMainBinToCurrentLocation}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-1.5 px-3 rounded-lg shadow-xs transition"
                  >
                    📍 Place Main Bin Here
                  </button>
                </div>
              </Popup>
            </Marker>
          )}

          {/* Dustbins */}
          {filteredBins.map(bin => {
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
                  <div className="p-2.5 min-w-[240px] font-sans">
                    {/* Header */}
                    <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-slate-100">
                      <div>
                        {isPrimary ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800">
                            ★ MAIN LIVE HARDWARE
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                            SMART FLEET
                          </span>
                        )}
                        <h3 className="font-extrabold text-base text-slate-900 mt-1">
                          {bin.name}
                        </h3>
                        <p className="font-mono text-xs text-slate-400">
                          {bin.deviceId}
                        </p>
                      </div>
                    </div>

                    {/* Telemetry info */}
                    <div className="space-y-1.5 text-xs mb-3">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Status</span>
                        <span className={`font-bold ${
                          bin.status === 'FULL' ? 'text-rose-600' : 'text-emerald-600'
                        }`}>
                          {bin.status}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Fill Level</span>
                        <span className="font-bold text-slate-900">{fill.toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Waste Type</span>
                        <span className="font-semibold text-slate-800">{bin.wasteType || 'MIXED'}</span>
                      </div>
                      {userLocation && (
                        <div className="flex justify-between text-blue-600 font-semibold">
                          <span>Distance From You</span>
                          <span>{calculateDistance(userLocation[0], userLocation[1], bin.latitude, bin.longitude)} km</span>
                        </div>
                      )}
                    </div>

                    {/* Navigation Buttons */}
                    <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                      <Link 
                        to={`/user/dustbins/${bin.id}`} 
                        className="flex-1 text-center bg-slate-100 hover:bg-slate-200 text-slate-800 py-2 rounded-xl text-xs font-bold transition"
                      >
                        Details
                      </Link>
                      <button 
                        onClick={() => openInGoogleMaps(bin.latitude, bin.longitude)}
                        className="flex-1 flex items-center justify-center gap-1 bg-[#1a73e8] hover:bg-blue-700 text-white py-2 px-3 rounded-xl text-xs font-bold transition shadow-xs"
                      >
                        <Navigation className="w-3.5 h-3.5" />
                        <span>Google Maps</span>
                      </button>
                    </div>
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
