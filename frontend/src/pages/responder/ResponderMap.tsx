import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import api from '../../services/api';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Crosshair } from 'lucide-react';
import { useLiveRefresh } from '../../services/liveEvents';
import type { Dustbin } from '../../types';

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

export default function ResponderMap() {
  const [dustbins, setDustbins] = useState<Dustbin[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([28.6139, 77.2090]);

  const fetchDustbins = async () => {
    try {
      const response = await api.get('/dustbins');
      setDustbins(response.data);
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
        (error) => console.log('Error getting location:', error)
      );
    }
    fetchDustbins();
  }, []);

  useLiveRefresh(fetchDustbins, ['DUSTBIN', 'BIN', 'RECONNECTED']);

  const assignToMe = async (binId: number) => {
    try {
      await api.post(`/responder/assignments/bin/${binId}/assign`);
      alert("Bin collection scheduled successfully!");
    } catch (error) {
      console.error("Failed to assign bin", error);
      alert("Failed to schedule collection.");
    }
  };

  if (loading) return <div className="text-center py-20 text-[#A9A5BA]">Loading map...</div>;

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto flex flex-col space-y-6" style={{ minHeight: 'calc(100vh - 80px)' }}>
      <h1 className="text-3xl font-black text-white">Live Map (Collector View)</h1>
      <p className="text-[#A9A5BA] mt-1 text-sm font-medium">Click on any <span className="text-red-400 font-bold">FULL</span> bin to assign it to yourself.</p>
      
      <div className="bg-[#120822] rounded-3xl border border-white/5 overflow-hidden relative shadow-xl min-h-[600px] flex-1">
        {userLocation && (
          <button 
            onClick={() => setMapCenter(userLocation)}
            className="absolute bottom-6 right-4 z-[400] bg-white/10 backdrop-blur-md p-3 rounded-full border border-white/20 text-[#FF7A00] hover:bg-white/20 transition-colors"
            title="Go to my location"
          >
            <Crosshair className="w-6 h-6" />
          </button>
        )}

        <MapContainer 
          center={mapCenter}
          zoom={12} 
          className="w-full h-full z-10"
          style={{ minHeight: '600px' }}
        >
          <MapController center={mapCenter} />
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; OpenStreetMap'
            className="map-tiles-dark"
          />
          {dustbins.map(bin => (
            <Marker key={bin.id} position={[bin.latitude || 28.6139, bin.longitude || 77.2090]} icon={getMarkerIcon(bin.status)}>
              <Popup className="custom-popup">
                <div className="p-1 min-w-[200px] text-[#0F172A]">
                  <h4 className="font-bold text-lg">{bin.name}</h4>
                  <p className="text-xs text-gray-500 mb-2 border-b pb-2">{bin.locationName}</p>
                  
                  <div className="space-y-1 mb-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Status</span>
                      <span className={`font-bold ${bin.status === 'FULL' ? 'text-red-600' : bin.status === 'OFFLINE' ? 'text-gray-500' : 'text-green-600'}`}>{bin.status}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Fill Level</span>
                      <span className="font-medium">{bin.fillLevel}%</span>
                    </div>
                  </div>
                  
                  {(bin.status === 'FULL' || bin.fillLevel >= 80) && (
                    <button 
                      onClick={() => assignToMe(bin.id)}
                      className="w-full mt-2 bg-[#FF7A00] hover:bg-[#FF4D24] text-white py-2 rounded-lg font-bold text-sm transition-colors"
                    >
                      Schedule Collection
                    </button>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
