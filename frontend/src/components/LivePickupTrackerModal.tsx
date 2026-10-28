import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { 
  X, Truck, Phone, Navigation, Clock, ShieldCheck, 
  MapPin, CheckCircle2, AlertCircle, RefreshCw, Radio 
} from 'lucide-react';
import api, { WS_URL } from '../services/api';
import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';
import { ref, onValue } from 'firebase/database';
import { database } from '../firebase';
import { MAP_LAYERS, openInGoogleMaps } from '../utils/mapUtils';

interface LivePickupTrackerModalProps {
  pickupId: number | string;
  onClose: () => void;
}

function MapController({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, 14, { duration: 1.0 });
  }, [center, map]);
  return null;
}

const getCollectorTruckIcon = () => {
  return L.divIcon({
    className: 'collector-truck-marker',
    html: `
      <div style="position: relative; width: 48px; height: 48px; display: flex; align-items: center; justify-content: center;">
        <span style="position: absolute; width: 44px; height: 44px; border-radius: 9999px; background-color: #f97316; opacity: 0.65; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></span>
        <div style="position: relative; width: 36px; height: 36px; border-radius: 9999px; background: linear-gradient(135deg, #ea580c, #c2410c); color: white; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 14px rgba(234,88,12,0.5); border: 2.5px solid white;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/>
            <path d="M15 18H9"/>
            <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.62l-3.48-4.35A1 1 0 0 0 17.52 8H14v10Z"/>
            <circle cx="17" cy="18" r="2"/>
            <circle cx="7" cy="18" r="2"/>
          </svg>
        </div>
        <div style="position: absolute; bottom: -8px; background: #9a3412; color: white; font-family: ui-monospace, monospace; font-size: 8px; font-weight: 800; padding: 1.5px 5px; border-radius: 9999px; white-space: nowrap; border: 1px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);">
          🚛 LIVE COLLECTOR
        </div>
      </div>
    `,
    iconSize: [48, 48],
    iconAnchor: [24, 24],
    popupAnchor: [0, -24]
  });
};

const getCitizenHomeIcon = () => {
  return L.divIcon({
    className: 'citizen-home-marker',
    html: `
      <div style="position: relative; width: 42px; height: 42px; display: flex; align-items: center; justify-content: center;">
        <div style="position: relative; width: 32px; height: 32px; border-radius: 9999px; background: linear-gradient(135deg, #2563eb, #1d4ed8); color: white; display: flex; align-items: center; justify-content: center; box-shadow: 0 3px 10px rgba(37,99,235,0.45); border: 2.5px solid white;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
        </div>
        <div style="position: absolute; bottom: -6px; background: #1e3a8a; color: white; font-size: 8px; font-weight: 800; padding: 1px 5px; border-radius: 9999px; white-space: nowrap; border: 1px solid white;">
          🏠 PICKUP POINT
        </div>
      </div>
    `,
    iconSize: [42, 42],
    iconAnchor: [21, 21],
    popupAnchor: [0, -21]
  });
};

export default function LivePickupTrackerModal({ pickupId, onClose }: LivePickupTrackerModalProps) {
  const [tracking, setTracking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Default coordinate center (Bengaluru or Noida fallback)
  const defaultHomeCoords: [number, number] = [28.555467, 77.325600];
  const [responderCoords, setResponderCoords] = useState<[number, number]>([28.5592, 77.3298]);
  const [homeCoords, setHomeCoords] = useState<[number, number]>(defaultHomeCoords);

  const fetchTracking = async () => {
    try {
      const res = await api.get(`/pickups/${pickupId}/tracking`);
      setTracking(res.data);
      if (res.data.responderLocation?.latitude && res.data.responderLocation?.longitude) {
        setResponderCoords([
          res.data.responderLocation.latitude,
          res.data.responderLocation.longitude
        ]);
      }
      if (res.data.pickupLatitude && res.data.pickupLongitude) {
        setHomeCoords([res.data.pickupLatitude, res.data.pickupLongitude]);
      }
    } catch (err: any) {
      setError('Unable to load live tracking details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTracking();

    // 1. Subscribe to STOMP WebSocket for real-time tracking updates
    let stompClient: Client | null = null;
    try {
      stompClient = new Client({
        webSocketFactory: () => new SockJS(WS_URL),
        reconnectDelay: 3000,
        onConnect: () => {
          stompClient?.subscribe(`/topic/pickups/${pickupId}/tracking`, (message) => {
            const data = JSON.parse(message.body);
            setTracking(data);
            if (data.responderLocation?.latitude && data.responderLocation?.longitude) {
              setResponderCoords([data.responderLocation.latitude, data.responderLocation.longitude]);
            }
          });
        }
      });
      stompClient.activate();
    } catch (e) {
      console.log('WS error:', e);
    }

    // 2. Subscribe to Firebase Realtime Database livePickups
    let unsubscribeFirebase: (() => void) | null = null;
    if (database && tracking?.pickupId) {
      const liveRef = ref(database, `livePickups/${tracking.pickupId}`);
      unsubscribeFirebase = onValue(liveRef, (snapshot) => {
        if (snapshot.exists()) {
          const val = snapshot.val();
          setTracking((prev: any) => ({ ...prev, ...val }));
          if (val.responderLocation?.latitude && val.responderLocation?.longitude) {
            setResponderCoords([val.responderLocation.latitude, val.responderLocation.longitude]);
          }
        }
      });
    }

    return () => {
      stompClient?.deactivate();
      if (unsubscribeFirebase) unsubscribeFirebase();
    };
  }, [pickupId, tracking?.pickupId]);

  // Haversine distance
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return (R * c).toFixed(1);
  };

  const distanceKm = calculateDistance(
    responderCoords[0], responderCoords[1],
    homeCoords[0], homeCoords[1]
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl relative my-6 flex flex-col font-sans">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-orange-50/50 to-white dark:from-slate-800/50 dark:to-slate-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center">
              <Truck className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  Live Collector Tracking
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300 flex items-center gap-1">
                  <Radio className="w-3 h-3 animate-pulse text-orange-600" />
                  GPS STREAM ACTIVE
                </span>
              </div>
              <p className="text-xs text-slate-500 font-mono">
                Request ID: {tracking?.pickupId || pickupId}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center gap-3 text-slate-500">
            <RefreshCw className="w-8 h-8 animate-spin text-orange-500" />
            <p className="text-sm font-semibold">Connecting to responder GPS broadcast...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-600">
            <AlertCircle className="w-8 h-8 mx-auto mb-2" />
            <p className="font-bold text-sm">{error}</p>
          </div>
        ) : (
          <div className="flex flex-col">
            {/* Live Interactive Google Map */}
            <div className="h-72 w-full relative z-0">
              <MapContainer center={responderCoords} zoom={14} style={{ height: '100%', width: '100%' }}>
                <MapController center={responderCoords} />
                <TileLayer 
                  url={MAP_LAYERS.google_streets.url} 
                  attribution={MAP_LAYERS.google_streets.attribution} 
                />

                {/* Citizen Destination Marker */}
                <Marker position={homeCoords} icon={getCitizenHomeIcon()}>
                  <Popup>
                    <div className="p-1 font-sans text-xs">
                      <p className="font-bold text-blue-600 mb-0.5">Your Doorstep Address</p>
                      <p className="text-slate-600">{tracking?.pickupAddress || 'Requested pickup location'}</p>
                    </div>
                  </Popup>
                </Marker>

                {/* Collector Live Moving Marker */}
                <Marker position={responderCoords} icon={getCollectorTruckIcon()} zIndexOffset={500}>
                  <Popup>
                    <div className="p-1 font-sans text-xs">
                      <p className="font-bold text-orange-600 mb-0.5">Waste Collection Vehicle</p>
                      <p className="font-semibold text-slate-900">{tracking?.responder?.name || 'Assigned Collector'}</p>
                      <p className="text-slate-500 text-[11px]">{tracking?.responderLocation?.locationName || 'En route'}</p>
                    </div>
                  </Popup>
                </Marker>
              </MapContainer>

              {/* Floating ETA Banner */}
              <div className="absolute bottom-3 left-3 z-10 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-3.5 py-2 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 flex items-center gap-3 text-xs font-bold">
                <div className="flex items-center gap-1.5 text-orange-600">
                  <Clock className="w-4 h-4 animate-spin text-orange-500" />
                  <span>ETA: ~{tracking?.responderLocation?.etaMinutes || 10} Mins</span>
                </div>
                <span className="text-slate-300">|</span>
                <span className="text-slate-600 dark:text-slate-300">{distanceKm} km away</span>
              </div>
            </div>

            {/* Responder & Status Details Panel */}
            <div className="p-6 bg-slate-50/50 dark:bg-slate-900/50 space-y-4">
              
              {/* Status Alert */}
              <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-3.5 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                      Collector is En Route ({tracking?.status || 'ACCEPTED'})
                    </p>
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                      Vehicle location is updating in real-time. Please keep your waste segregated.
                    </p>
                  </div>
                </div>
                <span className="text-xs font-mono font-extrabold text-emerald-800 dark:text-emerald-300 bg-emerald-200/60 dark:bg-emerald-900/60 px-2.5 py-1 rounded-lg">
                  {tracking?.status}
                </span>
              </div>

              {/* Responder Profile & Contact Info */}
              <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-orange-500 to-amber-400 text-white font-extrabold text-lg flex items-center justify-center shadow-sm">
                    {tracking?.responder?.name ? tracking.responder.name.charAt(0) : 'C'}
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">
                      {tracking?.responder?.name || 'Assigned Collector Team'}
                    </h4>
                    <p className="text-xs text-slate-500 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
                      Verified Municipal Waste Partner
                    </p>
                    <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                      Vehicle: {tracking?.responder?.vehicle || 'Eco Waste Truck #104'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  {tracking?.responder?.phone && (
                    <a
                      href={`tel:${tracking.responder.phone}`}
                      className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 px-4 rounded-xl shadow-xs transition"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>Call Driver</span>
                    </a>
                  )}
                  <button
                    onClick={() => openInGoogleMaps(responderCoords[0], responderCoords[1])}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 bg-[#1a73e8] hover:bg-blue-700 text-white font-bold text-xs py-2.5 px-4 rounded-xl shadow-xs transition"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    <span>Google Maps</span>
                  </button>
                </div>
              </div>

              {/* Pickup Address & Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                  <span className="text-slate-400 font-medium block mb-1">Destination Address:</span>
                  <p className="font-semibold text-slate-800 dark:text-slate-200 flex items-start gap-1">
                    <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                    <span>{tracking?.pickupAddress || 'Address specified in request'}</span>
                  </p>
                </div>

                <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                  <span className="text-slate-400 font-medium block mb-1">Waste Details:</span>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">
                    {tracking?.wasteType || 'Household Waste'} {tracking?.quantity ? `• Qty: ${tracking.quantity}` : ''}
                  </p>
                </div>
              </div>

            </div>
          </div>
        )}
      </div>
    </div>
  );
}
