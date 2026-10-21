import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { dustbinService } from '../../services/dustbinService';
import type { Dustbin  } from '../../types';
import L from 'leaflet';
import { Filter, Navigation, Search, Crosshair } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLiveRefresh } from '../../services/liveEvents';

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

export default function UserLiveMap() {
  const [dustbins, setDustbins] = useState<Dustbin[]>([]);
  const [filteredBins, setFilteredBins] = useState<Dustbin[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([28.6139, 77.2090]);
  
  function MapController({ center }: { center: [number, number] }) {
    const map = useMap();
    useEffect(() => {
      map.flyTo(center, 14);
    }, [center, map]);
    return null;
  }

  // Haversine formula to calculate distance in km
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Radius of the earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const d = R * c; // Distance in km
    return d.toFixed(2);
  };

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation([position.coords.latitude, position.coords.longitude]);
        },
        (error) => console.log('Error getting location:', error)
      );
    }
    const fetchBins = () => {
      dustbinService.getAllDustbins().then(data => {
        setDustbins(data);
        setFilteredBins(data);
        setLoading(false);
      });
    };
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
    
    if (searchQuery) {
      result = result.filter(b => b.name.toLowerCase().includes(searchQuery.toLowerCase()) || b.deviceId.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    
    setFilteredBins(result);
  }, [filter, searchQuery, dustbins]);

  if (loading) return <div className="flex h-full items-center justify-center">Loading map...</div>;

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] relative">
      <div className="absolute top-4 right-4 z-10 bg-white p-3 rounded-lg shadow-lg border border-gray-200 flex flex-col gap-3 max-w-sm sm:max-w-md">
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search bins by name or ID..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <div className="flex items-center text-sm font-bold text-gray-700 mr-1"><Filter className="w-4 h-4 mr-1"/> Filters:</div>
          <button onClick={() => setFilter('ALL')} className={`text-xs px-3 py-1 rounded-full font-medium ${filter === 'ALL' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>All</button>
          <button onClick={() => setFilter('AVAILABLE')} className={`text-xs px-3 py-1 rounded-full font-medium ${filter === 'AVAILABLE' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>Available</button>
          <button onClick={() => setFilter('FULL')} className={`text-xs px-3 py-1 rounded-full font-medium ${filter === 'FULL' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>Full</button>
          <button onClick={() => setFilter('OFFLINE')} className={`text-xs px-3 py-1 rounded-full font-medium ${filter === 'OFFLINE' ? 'bg-gray-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>Offline</button>
        </div>
      </div>

      {userLocation && (
        <button 
          onClick={() => setMapCenter(userLocation)}
          className="absolute bottom-6 right-4 z-10 bg-white p-3 rounded-full shadow-lg border border-gray-200 text-blue-600 hover:bg-blue-50 transition-colors"
          title="Go to my location"
        >
          <Crosshair className="w-6 h-6" />
        </button>
      )}

      <div className="flex-1 bg-gray-100 rounded-2xl overflow-hidden shadow-sm border border-gray-200 z-0">
        <MapContainer center={mapCenter} zoom={12} style={{ height: '100%', width: '100%' }}>
          <MapController center={mapCenter} />
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" />
          {filteredBins.map(bin => (
            <Marker key={bin.id} position={[bin.latitude, bin.longitude]} icon={getMarkerIcon(bin.status)}>
              <Popup>
                <div className="p-2 min-w-[220px]">
                  <h3 className="font-bold text-lg text-gray-900">{bin.name}</h3>
                  <p className="text-xs text-gray-500 mb-3 border-b pb-2">{bin.deviceId}</p>
                  
                  <div className="space-y-1 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Status</span>
                      <span className={`font-bold ${bin.status === 'FULL' ? 'text-red-600' : bin.status === 'OFFLINE' ? 'text-gray-500' : 'text-green-600'}`}>{bin.status}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Fill Level</span>
                      <span className="font-medium text-gray-900">{bin.fillLevel}%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Waste Type</span>
                      <span className="font-medium text-gray-900">{bin.wasteType}</span>
                    </div>
                    {userLocation && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Distance</span>
                        <span className="font-medium text-blue-600">{calculateDistance(userLocation[0], userLocation[1], bin.latitude, bin.longitude)} km</span>
                      </div>
                    )}
                  </div>

                  <div className="flex space-x-2">
                    <Link to={`/user/dustbins/${bin.id}`} className="flex-1 text-center bg-gray-100 hover:bg-gray-200 text-gray-800 py-2 rounded-lg text-sm font-semibold transition-colors">
                      Details
                    </Link>
                    <a href={`https://www.google.com/maps/dir/?api=1&destination=${bin.latitude},${bin.longitude}`} target="_blank" rel="noreferrer" className="flex-1 flex items-center justify-center bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg text-sm font-semibold transition-colors">
                      <Navigation className="w-4 h-4 mr-1" />
                      Navigate
                    </a>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
