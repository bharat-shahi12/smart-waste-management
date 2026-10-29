import api from './api';

export interface DeviceGpsPosition {
  latitude: number;
  longitude: number;
  accuracy: number;
  locationName: string;
}

let activeWatchId: number | null = null;
let activeTrackingAssignmentId: number | null = null;
let lastPushedCoords: { lat: number; lng: number } | null = null;

/**
 * Request real device GPS coordinates with high accuracy from the browser.
 * Throws a user-friendly error if permission is denied or location is off.
 */
export const getRealDevicePosition = (): Promise<DeviceGpsPosition> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Your browser or device does not support GPS geolocation."));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const accuracy = Math.round(pos.coords.accuracy || 10);
        
        let locationName = `GPS: ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        try {
          locationName = await reverseGeocode(lat, lng);
        } catch {
          // fallback to coordinates if reverse geocode fails
        }

        resolve({
          latitude: lat,
          longitude: lng,
          accuracy,
          locationName
        });
      },
      (err) => {
        let errorMsg = "Unable to retrieve device GPS.";
        if (err.code === 1) {
          errorMsg = "Location permission was denied. Please allow location access in your browser settings so your real location can be shared with the citizen.";
        } else if (err.code === 2) {
          errorMsg = "GPS position unavailable. Please ensure your device's location/GPS is turned ON.";
        } else if (err.code === 3) {
          errorMsg = "Location request timed out. Please check your GPS signal and retry.";
        }
        reject(new Error(errorMsg));
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      }
    );
  });
};

/**
 * Reverse-geocodes real coordinates to a readable street/neighborhood name using OpenStreetMap.
 */
export const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
      { headers: { 'Accept': 'application/json' } }
    );
    if (!res.ok) throw new Error('Reverse geocoding failed');
    const data = await res.json();
    const addr = data.address;
    if (addr) {
      const road = addr.road || addr.suburb || addr.neighbourhood || addr.village || addr.city_district || '';
      const city = addr.city || addr.town || addr.county || addr.state || '';
      if (road && city) return `${road}, ${city}`;
      if (road) return road;
      if (city) return city;
    }
    if (data.display_name) {
      return data.display_name.split(',').slice(0, 3).join(',').trim();
    }
  } catch (err) {
    console.warn('Reverse geocode error:', err);
  }
  return `Real GPS (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
};

/**
 * Forward-geocodes an address to latitude and longitude.
 */
export const forwardGeocode = async (address: string): Promise<{ latitude: number; longitude: number } | null> => {
  if (!address || address.trim().length === 0) return null;
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(address)}`,
      { headers: { 'Accept': 'application/json' } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (data && data.length > 0 && data[0].lat && data[0].lon) {
      return {
        latitude: parseFloat(data[0].lat),
        longitude: parseFloat(data[0].lon)
      };
    }
  } catch (err) {
    console.warn('Forward geocode error for address:', address, err);
  }
  return null;
};

/**
 * Starts continuous live GPS broadcasting for an assignment.
 * When the driver moves, coordinates are streamed to the backend.
 */
export const startLiveGpsBroadcast = (
  assignmentId: number,
  onGpsUpdate?: (pos: DeviceGpsPosition) => void
) => {
  stopLiveGpsBroadcast();
  activeTrackingAssignmentId = assignmentId;

  if (!navigator.geolocation) return;

  activeWatchId = navigator.geolocation.watchPosition(
    async (pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      const accuracy = Math.round(pos.coords.accuracy || 10);

      // Check distance moved to prevent spamming backend if stationary (< 5 meters)
      if (lastPushedCoords) {
        const dLat = Math.abs(lat - lastPushedCoords.lat);
        const dLng = Math.abs(lng - lastPushedCoords.lng);
        // Approximately 5 meters threshold (~0.00005 deg)
        if (dLat < 0.00005 && dLng < 0.00005) {
          return;
        }
      }

      lastPushedCoords = { lat, lng };

      let locationName = `GPS: ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      try {
        locationName = await reverseGeocode(lat, lng);
      } catch {
        // fallback
      }

      try {
        await api.post(`/responder/assignments/${assignmentId}/location`, {
          latitude: lat,
          longitude: lng,
          locationName,
          etaMinutes: 10
        });
      } catch (e) {
        console.warn('Failed to stream live GPS update:', e);
      }

      if (onGpsUpdate) {
        onGpsUpdate({ latitude: lat, longitude: lng, accuracy, locationName });
      }
    },
    (err) => {
      console.warn('watchPosition error:', err);
    },
    {
      enableHighAccuracy: true,
      maximumAge: 5000,
      timeout: 10000
    }
  );
};

/**
 * Stops any ongoing GPS broadcasting watcher.
 */
export const stopLiveGpsBroadcast = () => {
  if (activeWatchId !== null && navigator.geolocation) {
    navigator.geolocation.clearWatch(activeWatchId);
    activeWatchId = null;
  }
  activeTrackingAssignmentId = null;
  lastPushedCoords = null;
};

export const getActiveTrackingAssignmentId = () => activeTrackingAssignmentId;
