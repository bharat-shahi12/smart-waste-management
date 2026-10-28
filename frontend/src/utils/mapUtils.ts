import L from 'leaflet';
import type { Dustbin } from '../types';

export type MapTileLayerKey = 'google_streets' | 'google_satellite' | 'google_terrain' | 'osm';

export interface MapTileOption {
  id: MapTileLayerKey;
  name: string;
  url: string;
  attribution: string;
  iconName: string;
}

export const MAP_LAYERS: Record<MapTileLayerKey, MapTileOption> = {
  google_streets: {
    id: 'google_streets',
    name: 'Google Maps',
    url: 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
    attribution: '&copy; Google Maps',
    iconName: 'Map'
  },
  google_satellite: {
    id: 'google_satellite',
    name: 'Google Satellite',
    url: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
    attribution: '&copy; Google Maps Imagery',
    iconName: 'Satellite'
  },
  google_terrain: {
    id: 'google_terrain',
    name: 'Google Terrain',
    url: 'https://mt1.google.com/vt/lyrs=p&x={x}&y={y}&z={z}',
    attribution: '&copy; Google Maps Terrain',
    iconName: 'Mountain'
  },
  osm: {
    id: 'osm',
    name: 'OpenStreetMap',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
    iconName: 'Globe'
  }
};

export const isMainBin = (bin: Dustbin): boolean => {
  return bin.deviceId === 'ESP32_1001' || bin.deviceId === 'ESP32_101' || bin.name?.includes('BIN1001');
};

/**
 * Custom Animated Radar Icon for the Primary Active Hardware Dustbin
 */
export const getMainBinIcon = (fillLevel: number = 0, status: string = 'AVAILABLE') => {
  const isFull = fillLevel >= 80 || status === 'FULL';
  const ringColor = isFull ? '#ef4444' : '#10b981';
  const bgGradient = isFull 
    ? 'linear-gradient(135deg, #ef4444, #991b1b)' 
    : 'linear-gradient(135deg, #10b981, #047857)';
  const badgeBg = isFull ? '#b91c1c' : '#065f46';

  return L.divIcon({
    className: 'main-dustbin-custom-marker',
    html: `
      <div style="position: relative; width: 52px; height: 52px; display: flex; align-items: center; justify-content: center;">
        <!-- Pulsing radar wave -->
        <span style="position: absolute; width: 48px; height: 48px; border-radius: 9999px; background-color: ${ringColor}; opacity: 0.55; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></span>
        
        <!-- Center badge with bin icon -->
        <div style="position: relative; width: 38px; height: 38px; border-radius: 9999px; background: ${bgGradient}; color: white; display: flex; flex-direction: column; align-items: center; justify-content: center; box-shadow: 0 4px 14px rgba(0,0,0,0.45); border: 2.5px solid white; z-index: 2;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 6h18"/>
            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
            <line x1="10" y1="11" x2="10" y2="17"/>
            <line x1="14" y1="11" x2="14" y2="17"/>
          </svg>
        </div>

        <!-- Pill label -->
        <div style="position: absolute; bottom: -8px; background: ${badgeBg}; color: white; font-family: ui-monospace, monospace; font-size: 9px; font-weight: 800; padding: 2px 6px; border-radius: 9999px; white-space: nowrap; box-shadow: 0 2px 6px rgba(0,0,0,0.35); border: 1.5px solid white; z-index: 3;">
          ★ MAIN LIVE (${Math.round(fillLevel)}%)
        </div>
      </div>
    `,
    iconSize: [52, 52],
    iconAnchor: [26, 26],
    popupAnchor: [0, -26]
  });
};

/**
 * Standard Fleet & Mock Dustbin Marker
 */
export const getFleetBinIcon = (fillLevel: number = 0, status: string = 'AVAILABLE', _wasteType: string = 'MIXED') => {
  const isFull = fillLevel >= 80 || status === 'FULL';
  const isWarning = fillLevel >= 60 && !isFull;
  const isOffline = status === 'OFFLINE';

  const bgColor = isOffline ? '#6b7280' : isFull ? '#dc2626' : isWarning ? '#d97706' : '#16a34a';

  return L.divIcon({
    className: 'fleet-dustbin-custom-marker',
    html: `
      <div style="position: relative; width: 38px; height: 38px; display: flex; align-items: center; justify-content: center;">
        <div style="width: 32px; height: 32px; border-radius: 9999px; background-color: ${bgColor}; color: white; display: flex; flex-direction: column; align-items: center; justify-content: center; box-shadow: 0 3px 10px rgba(0,0,0,0.35); border: 2px solid white;">
          <span style="font-size: 11px; font-weight: 800; font-family: sans-serif;">${Math.round(fillLevel)}%</span>
        </div>
        <div style="position: absolute; bottom: -2px; right: -2px; width: 11px; height: 11px; border-radius: 9999px; background: ${isFull ? '#ef4444' : '#22c55e'}; border: 1.5px solid white;"></div>
      </div>
    `,
    iconSize: [38, 38],
    iconAnchor: [19, 19],
    popupAnchor: [0, -19]
  });
};

/**
 * User Geolocation Marker (Pulsing blue radar)
 */
export const getUserLocationIcon = () => {
  return L.divIcon({
    className: 'user-geolocation-marker',
    html: `
      <div style="position: relative; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;">
        <span style="position: absolute; width: 36px; height: 36px; border-radius: 9999px; background-color: #3b82f6; opacity: 0.55; animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></span>
        <div style="position: relative; width: 18px; height: 18px; border-radius: 9999px; background: linear-gradient(135deg, #2563eb, #1d4ed8); border: 3px solid white; box-shadow: 0 2px 10px rgba(37,99,235,0.7); z-index: 2;"></div>
        <div style="position: absolute; bottom: -6px; background: #1e3a8a; color: white; font-size: 8px; font-weight: 800; padding: 1px 5px; border-radius: 9999px; border: 1px solid white; white-space: nowrap; z-index: 3;">
          YOU ARE HERE
        </div>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20]
  });
};

export const openInGoogleMaps = (lat: number, lng: number) => {
  window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank', 'noopener,noreferrer');
};
