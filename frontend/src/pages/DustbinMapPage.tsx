import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import api from '../services/api';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Search, Crosshair } from 'lucide-react';
import { useLiveRefresh } from '../services/liveEvents';
import type { Dustbin } from '../types';

const getMarkerIcon = (status: string) => {
  let color = 'green';
  if (status === 'AVAILABLE') color = 'green';
  else if (status === 'FULL') color = 'red';
  else if (status === 'OFFLINE') color = 'grey';
  
  return new L.Icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });
};

function MapController({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, 14);
  }, [center, map]);
  return null;
}

export default function DustbinMapPage() {
  const [dustbins, setDustbins] = useState<Dustbin[]>([]);
  const [filteredBins, setFilteredBins] = useState<Dustbin[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([28.6139, 77.2090]);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation([position.coords.latitude, position.coords.longitude]);
        },
        (error) => console.log('Error getting location:', error)
      );
    }

    const fetchDustbins = async () => {
      try {
        const response = await api.get('/dustbins');
        setDustbins(response.data);
        setFilteredBins(response.data);
      } catch (error) {
        console.error('Failed to fetch dustbins', error);
      } finally {
        setLoading(false);
      }
    };
    fetchDustbins();

  }, []);

  useLiveRefresh(() => {
    api.get('/dustbins').then(res => {
      setDustbins(res.data);
      setFilteredBins(res.data);
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
    
    if (searchQuery) {
      result = result.filter(b => b.name.toLowerCase().includes(searchQuery.toLowerCase()) || (b.deviceId && b.deviceId.toLowerCase().includes(searchQuery.toLowerCase())));
    }
    
    setFilteredBins(result);
  }, [filter, searchQuery, dustbins]);

  if (loading) return <div className="flex h-full items-center justify-center p-10">Loading map...</div>;

  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 h-[calc(100vh-8rem)] relative flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-800">Admin Live Map</h3>
        
        <div className="flex gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search by name or ID..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
            />
          </div>
          
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button onClick={() => setFilter('ALL')} className={`text-xs px-3 py-1 rounded-md font-medium ${filter === 'ALL' ? 'bg-white shadow text-gray-800' : 'text-gray-500'}`}>All</button>
            <button onClick={() => setFilter('AVAILABLE')} className={`text-xs px-3 py-1 rounded-md font-medium ${filter === 'AVAILABLE' ? 'bg-green-100 text-green-700 shadow' : 'text-gray-500'}`}>Available</button>
            <button onClick={() => setFilter('FULL')} className={`text-xs px-3 py-1 rounded-md font-medium ${filter === 'FULL' ? 'bg-red-100 text-red-700 shadow' : 'text-gray-500'}`}>Full</button>
            <button onClick={() => setFilter('OFFLINE')} className={`text-xs px-3 py-1 rounded-md font-medium ${filter === 'OFFLINE' ? 'bg-gray-200 text-gray-700 shadow' : 'text-gray-500'}`}>Offline</button>
          </div>
        </div>
      </div>

      <div className="flex-1 relative rounded-lg overflow-hidden border border-gray-200">
        {userLocation && (
          <button 
            onClick={() => setMapCenter(userLocation)}
            className="absolute bottom-6 right-4 z-[400] bg-white p-3 rounded-full shadow-lg border border-gray-200 text-blue-600 hover:bg-blue-50 transition-colors"
            title="Go to my location"
          >
            <Crosshair className="w-6 h-6" />
          </button>
        )}

        <MapContainer 
          center={mapCenter}
          zoom={12} 
          style={{ height: '100%', width: '100%' }}
        >
          <MapController center={mapCenter} />
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; OpenStreetMap'
          />
          {filteredBins.map(bin => (
            <Marker key={bin.id} position={[bin.latitude, bin.longitude]} icon={getMarkerIcon(bin.status)}>
              <Popup>
                <div className="p-1 min-w-[200px]">
                  <h4 className="font-bold text-lg">{bin.name}</h4>
                  <p className="text-xs text-gray-500 mb-2 border-b pb-2">{bin.deviceId} • {bin.wasteType}</p>
                  
                  <div className="space-y-1 mb-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Status</span>
                      <span className={`font-bold ${bin.status === 'FULL' ? 'text-red-600' : bin.status === 'OFFLINE' ? 'text-gray-500' : 'text-green-600'}`}>{bin.status}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Fill Level</span>
                      <span className="font-medium">{bin.fillLevel}%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Air Quality</span>
                      <span className="font-medium">{bin.airQuality || 0} PPM</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Temperature</span>
                      <span className="font-medium">{bin.temperature || 0}°C</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 text-right mt-2 pt-2 border-t">Capacity: {bin.capacityLiters}L</p>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
