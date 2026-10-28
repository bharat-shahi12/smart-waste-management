import { useState, useEffect } from 'react';
import api from '../../services/api';
import { useLiveRefresh } from '../../services/liveEvents';
import { MapPin, Navigation, Radio, X, CheckCircle2, RefreshCw } from 'lucide-react';
import { useLocation } from 'react-router-dom';

const getCurrentGpsPosition = (): Promise<{ latitude: number; longitude: number } | null> => {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({ latitude: 28.5592, longitude: 77.3298 });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      (err) => {
        console.warn('Geolocation error / permission denied, using default fallback:', err.message);
        resolve({ latitude: 28.5592, longitude: 77.3298 });
      },
      { timeout: 7000, enableHighAccuracy: true }
    );
  });
};

export default function ResponderAssignments() {
  const location = useLocation();
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const isHistory = location.pathname.includes('/history');
  const [filter, setFilter] = useState(isHistory ? 'Completed' : 'All');
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  
  // Location sharing modal state
  const [locationModalAssignment, setLocationModalAssignment] = useState<any | null>(null);
  const [locLat, setLocLat] = useState('28.5592');
  const [locLng, setLocLng] = useState('77.3298');
  const [locName, setLocName] = useState('Sector 62 Main Road');
  const [locEta, setLocEta] = useState(10);
  const [updatingLoc, setUpdatingLoc] = useState(false);
  const [locSuccess, setLocSuccess] = useState('');

  const fetchAssignments = async () => {
    try {
      const res = await api.get('/responder/assignments');
      setAssignments(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, []);

  useLiveRefresh(fetchAssignments, ['ASSIGNMENT', 'ASSIGNMENT_UPDATED'], 1000);

  const updateStatus = async (id: number, status: string, note?: string) => {
    setUpdatingId(id);
    try {
      let coords: { latitude: number; longitude: number } | null = null;
      if (['ACCEPTED', 'ON_THE_WAY', 'ARRIVED'].includes(status)) {
        coords = await getCurrentGpsPosition();
      }

      const params: any = { status };
      if (note) params.note = note;
      if (coords) {
        params.latitude = coords.latitude;
        params.longitude = coords.longitude;
        params.locationName = status === 'ACCEPTED' ? 'Collector Accepted / Starting Depot' : status === 'ON_THE_WAY' ? 'En Route to Pickup' : 'Arrived at Citizen Location';
        params.etaMinutes = status === 'ACCEPTED' ? 15 : status === 'ON_THE_WAY' ? 10 : 0;
      }

      await api.post(`/responder/assignments/${id}/status`, null, { params });
      await fetchAssignments();
    } catch (err) {
      console.error(err);
      alert('Error updating status');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleOpenLocationModal = (assignment: any) => {
    setLocationModalAssignment(assignment);
    setLocLat(assignment.responderLatitude ? String(assignment.responderLatitude) : '28.5592');
    setLocLng(assignment.responderLongitude ? String(assignment.responderLongitude) : '77.3298');
    setLocName(assignment.responderLocationName || 'Sector 62 Main Road');
    setLocEta(assignment.responderEtaMinutes || 10);
    setLocSuccess('');
    
    // Auto-query current GPS
    getCurrentGpsPosition().then(coords => {
      if (coords) {
        setLocLat(String(coords.latitude.toFixed(6)));
        setLocLng(String(coords.longitude.toFixed(6)));
      }
    });
  };

  const handleSaveLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!locationModalAssignment) return;
    setUpdatingLoc(true);
    setLocSuccess('');
    try {
      await api.post(`/responder/assignments/${locationModalAssignment.id}/location`, {
        latitude: parseFloat(locLat),
        longitude: parseFloat(locLng),
        locationName: locName,
        etaMinutes: parseInt(String(locEta))
      });
      setLocSuccess('📍 Live GPS location broadcasted to citizen!');
      await fetchAssignments();
      setTimeout(() => {
        setLocationModalAssignment(null);
      }, 1500);
    } catch (err: any) {
      alert('Failed to update location: ' + (err.response?.data?.error || err.message));
    } finally {
      setUpdatingLoc(false);
    }
  };

  const filtered = assignments.filter(a => {
    if (isHistory && a.status !== 'COMPLETED') return false;
    
    if (location.pathname.includes('/complaints') && a.type !== 'COMPLAINT') return false;
    if (location.pathname.includes('/pickups') && a.type !== 'PICKUP') return false;
    if (location.pathname.includes('/bin-alerts') && a.type !== 'BIN_COLLECTION') return false;

    if (filter === 'All') return true;
    if (filter === 'Pending') return a.status === 'ASSIGNED';
    if (filter === 'Accepted') return a.status === 'ACCEPTED';
    if (filter === 'In Progress') return ['ON_THE_WAY', 'ARRIVED'].includes(a.status);
    if (filter === 'Completed') return a.status === 'COMPLETED';
    return true;
  });

  const isComplaints = location.pathname.includes('/complaints');
  const isPickups = location.pathname.includes('/pickups');
  const isBinAlerts = location.pathname.includes('/bin-alerts');

  let pageTitle = "My Assignments";
  if (isHistory) pageTitle = "History (Completed Tasks)";
  if (isComplaints) pageTitle = "Complaint Tasks";
  if (isPickups) pageTitle = "Pickup Tasks";
  if (isBinAlerts) pageTitle = "Smart Bin Collections";

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-6">
      <h1 className="text-3xl font-black text-white mb-6">{pageTitle}</h1>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {['All', 'Pending', 'Accepted', 'In Progress', 'Completed'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${
              filter === f 
                ? 'bg-[#FF7A00] text-white' 
                : 'bg-white/5 text-[#A9A5BA] hover:bg-white/10 hover:text-white'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-10 text-[#A9A5BA]">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-10 text-[#A9A5BA]">No assignments found.</div>
      ) : (
        <div className="grid gap-4">
          {filtered.map(a => (
            <div key={a.id} className="bg-[#120822] p-6 rounded-2xl border border-white/5 flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
              <div>
                <div className="flex items-center gap-3 mb-2 flex-wrap">
                  <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-[#FF7A00]/20 text-[#FF7A00]">
                    {a.type}
                  </span>
                  <span className="text-xs text-[#A9A5BA] font-mono">
                    #{a.id}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                    a.priority === 'HIGH' ? 'bg-red-500/20 text-red-500' : 'bg-blue-500/20 text-blue-500'
                  }`}>
                    {a.priority} Priority
                  </span>
                  {a.responderLatitude && (
                    <span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-500/20 text-emerald-400 flex items-center gap-1">
                      <Radio className="w-3 h-3 animate-pulse" />
                      GPS Active ({a.responderEtaMinutes || 10}m ETA)
                    </span>
                  )}
                </div>
                
                <h3 className="text-lg font-bold text-white mb-1">
                  {a.type === 'COMPLAINT' ? a.complaint?.title : 
                   a.type === 'PICKUP' ? `Waste Pickup: ${a.pickup?.wasteType || 'General Waste'}` : 
                   'Bin Collection'}
                </h3>
                
                <div className="flex items-center gap-2 text-sm text-[#A9A5BA] mb-2">
                  <MapPin className="w-4 h-4 text-[#FF7A00]" />
                  {a.type === 'COMPLAINT' ? (a.complaint?.dustbin?.locationName || 'Unknown Complaint Location') : 
                   a.type === 'PICKUP' ? (a.pickup?.address || 'Pickup Address Not Provided') : 
                   (a.dustbin?.locationName || 'Unknown Bin Location')}
                </div>

                {a.responderLatitude && (
                  <div className="text-xs text-[#A9A5BA] font-mono flex items-center gap-2">
                    <Navigation className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Last Coords: {Number(a.responderLatitude).toFixed(4)}, {Number(a.responderLongitude).toFixed(4)} ({a.responderLocationName || 'En route'})</span>
                  </div>
                )}
              </div>

              <div className="flex flex-col items-end gap-3 w-full md:w-auto">
                <span className="text-sm font-bold text-white bg-white/10 px-3 py-1 rounded-full">
                  Status: {a.status}
                </span>

                <div className="flex gap-2 flex-wrap w-full md:w-auto">
                  {['ACCEPTED', 'ON_THE_WAY', 'ARRIVED'].includes(a.status) && (
                    <button 
                      onClick={() => handleOpenLocationModal(a)}
                      className="px-3 py-2 bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-500/40 text-emerald-300 rounded-xl font-bold text-xs flex items-center gap-1.5 transition"
                      title="Update your live coordinates for the citizen to track"
                    >
                      <Navigation className="w-3.5 h-3.5" />
                      <span>Share / Update GPS</span>
                    </button>
                  )}

                  {a.status === 'ASSIGNED' && (
                    <button 
                      disabled={updatingId === a.id}
                      onClick={() => updateStatus(a.id, 'ACCEPTED')} 
                      className="btn-primary w-full md:w-auto px-4 py-2 bg-[#FF7A00] hover:bg-[#FF4D24] text-white rounded-xl font-bold flex items-center justify-center gap-1.5"
                    >
                      {updatingId === a.id ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
                      <span>Accept & Share GPS</span>
                    </button>
                  )}
                  {a.status === 'ACCEPTED' && (
                    <button 
                      disabled={updatingId === a.id}
                      onClick={() => updateStatus(a.id, 'ON_THE_WAY')} 
                      className="btn-primary w-full md:w-auto px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-bold flex items-center justify-center gap-1.5"
                    >
                      {updatingId === a.id ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
                      <span>Start Task</span>
                    </button>
                  )}
                  {a.status === 'ON_THE_WAY' && (
                    <button 
                      disabled={updatingId === a.id}
                      onClick={() => updateStatus(a.id, 'ARRIVED')} 
                      className="btn-primary w-full md:w-auto px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-xl font-bold flex items-center justify-center gap-1.5"
                    >
                      {updatingId === a.id ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
                      <span>Mark Arrived</span>
                    </button>
                  )}
                  {a.status === 'ARRIVED' && (
                    <button 
                      disabled={updatingId === a.id}
                      onClick={() => {
                        const note = prompt('Completion note (optional):');
                        updateStatus(a.id, 'COMPLETED', note || undefined);
                      }} 
                      className="btn-primary w-full md:w-auto px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold flex items-center justify-center gap-1.5"
                    >
                      {updatingId === a.id ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
                      <span>Complete Task</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Share / Update GPS Modal */}
      {locationModalAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#120822] border border-white/10 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center gap-2 text-white font-bold">
                <Navigation className="w-5 h-5 text-[#FF7A00]" />
                <h3>Broadcast Live GPS to Citizen</h3>
              </div>
              <button 
                onClick={() => setLocationModalAssignment(null)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {locSuccess && (
              <div className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 p-3 rounded-xl text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{locSuccess}</span>
              </div>
            )}

            <form onSubmit={handleSaveLocation} className="space-y-4 text-xs font-semibold">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-300 block mb-1">Latitude</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={locLat}
                    onChange={(e) => setLocLat(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="text-gray-300 block mb-1">Longitude</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={locLng}
                    onChange={(e) => setLocLng(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-gray-300 block mb-1">Current Street / Landmark</label>
                <input
                  type="text"
                  required
                  value={locName}
                  onChange={(e) => setLocName(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white"
                  placeholder="e.g. Ring Road near Metro Station"
                />
              </div>

              <div>
                <label className="text-gray-300 block mb-1">Estimated Arrival (ETA: {locEta} Mins)</label>
                <input
                  type="range"
                  min="1"
                  max="60"
                  value={locEta}
                  onChange={(e) => setLocEta(Number(e.target.value))}
                  className="w-full accent-[#FF7A00]"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setLocationModalAssignment(null)}
                  className="w-1/3 bg-white/5 hover:bg-white/10 text-gray-300 py-2.5 rounded-xl font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingLoc}
                  className="w-2/3 bg-[#FF7A00] hover:bg-orange-600 text-white py-2.5 rounded-xl font-bold flex items-center justify-center gap-1.5 transition disabled:opacity-50"
                >
                  {updatingLoc ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Radio className="w-4 h-4 animate-pulse" />}
                  <span>Broadcast GPS</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

