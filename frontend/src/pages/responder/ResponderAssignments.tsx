import { useState, useEffect } from 'react';
import api from '../../services/api';
import { useLiveRefresh } from '../../services/liveEvents';
import { 
  MapPin, Navigation, Radio, X, CheckCircle2, RefreshCw, 
  AlertTriangle, Compass
} from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { 
  getRealDevicePosition, 
  startLiveGpsBroadcast, 
  stopLiveGpsBroadcast,
  type DeviceGpsPosition 
} from '../../services/gpsService';

export default function ResponderAssignments() {
  const location = useLocation();
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const isHistory = location.pathname.includes('/history');
  const [filter, setFilter] = useState(isHistory ? 'Completed' : 'All');
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  // Active continuous GPS streaming state
  const [streamingAssignmentId, setStreamingAssignmentId] = useState<number | null>(null);
  const [activeGps, setActiveGps] = useState<DeviceGpsPosition | null>(null);

  // Accept & GPS Sharing Modal state
  const [acceptModalAssignment, setAcceptModalAssignment] = useState<any | null>(null);
  const [detectingGps, setDetectingGps] = useState(false);
  const [gpsError, setGpsError] = useState('');
  const [locLat, setLocLat] = useState('');
  const [locLng, setLocLng] = useState('');
  const [locAccuracy, setLocAccuracy] = useState<number | null>(null);
  const [locName, setLocName] = useState('');
  const [locEta, setLocEta] = useState(10);
  const [continuousStream, setContinuousStream] = useState(true);
  const [acceptSubmitting, setAcceptSubmitting] = useState(false);

  // Update Location Modal for active tasks
  const [updateLocAssignment, setUpdateLocAssignment] = useState<any | null>(null);

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
    return () => {
      stopLiveGpsBroadcast();
    };
  }, []);

  useLiveRefresh(fetchAssignments, ['ASSIGNMENT', 'ASSIGNMENT_UPDATED'], 1000);

  // Triggered when driver clicks "Accept"
  const handleInitiateAccept = (assignment: any) => {
    setAcceptModalAssignment(assignment);
    setGpsError('');
    setLocLat('');
    setLocLng('');
    setLocAccuracy(null);
    setLocName('');
    setLocEta(10);
    setContinuousStream(true);

    detectRealGps();
  };

  const detectRealGps = async () => {
    setDetectingGps(true);
    setGpsError('');
    try {
      const pos = await getRealDevicePosition();
      setLocLat(String(pos.latitude.toFixed(6)));
      setLocLng(String(pos.longitude.toFixed(6)));
      setLocAccuracy(pos.accuracy);
      setLocName(pos.locationName);
      setActiveGps(pos);
    } catch (err: any) {
      setGpsError(err.message || 'Failed to get device GPS. Please enable location permissions.');
    } finally {
      setDetectingGps(false);
    }
  };

  const handleConfirmAcceptWithGps = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!acceptModalAssignment) return;

    if (!locLat || !locLng) {
      alert('Please acquire your real GPS location or enter valid coordinates.');
      return;
    }

    setAcceptSubmitting(true);
    const id = acceptModalAssignment.id;

    try {
      const latNum = parseFloat(locLat);
      const lngNum = parseFloat(locLng);

      const params: any = {
        status: 'ACCEPTED',
        latitude: latNum,
        longitude: lngNum,
        locationName: locName || `GPS: ${latNum.toFixed(4)}, ${lngNum.toFixed(4)}`,
        etaMinutes: locEta
      };

      await api.post(`/responder/assignments/${id}/status`, null, { params });

      if (continuousStream) {
        startLiveGpsBroadcast(id, (updatedPos) => {
          setActiveGps(updatedPos);
        });
        setStreamingAssignmentId(id);
      }

      setAcceptModalAssignment(null);
      await fetchAssignments();
    } catch (err: any) {
      alert('Error accepting task: ' + (err.response?.data?.error || err.message));
    } finally {
      setAcceptSubmitting(false);
    }
  };

  const updateStatusSimple = async (id: number, status: string, note?: string) => {
    setUpdatingId(id);
    try {
      const params: any = { status };
      if (note) params.note = note;

      // If active GPS exists, include real coords
      if (activeGps) {
        params.latitude = activeGps.latitude;
        params.longitude = activeGps.longitude;
        params.locationName = activeGps.locationName;
        params.etaMinutes = status === 'ON_THE_WAY' ? 8 : 0;
      }

      await api.post(`/responder/assignments/${id}/status`, null, { params });

      if (status === 'COMPLETED') {
        if (streamingAssignmentId === id) {
          stopLiveGpsBroadcast();
          setStreamingAssignmentId(null);
          setActiveGps(null);
        }
      }

      await fetchAssignments();
    } catch (err) {
      console.error(err);
      alert('Error updating status');
    } finally {
      setUpdatingId(null);
    }
  };

  // Open Update GPS modal
  const handleOpenUpdateModal = (assignment: any) => {
    setUpdateLocAssignment(assignment);
    setLocLat(assignment.responderLatitude ? String(assignment.responderLatitude) : '');
    setLocLng(assignment.responderLongitude ? String(assignment.responderLongitude) : '');
    setLocName(assignment.responderLocationName || '');
    setLocEta(assignment.responderEtaMinutes || 10);
    setGpsError('');
    detectRealGps();
  };

  const handleSaveUpdatedLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!updateLocAssignment) return;
    setAcceptSubmitting(true);
    try {
      const latNum = parseFloat(locLat);
      const lngNum = parseFloat(locLng);
      await api.post(`/responder/assignments/${updateLocAssignment.id}/location`, {
        latitude: latNum,
        longitude: lngNum,
        locationName: locName || `GPS: ${latNum.toFixed(4)}, ${lngNum.toFixed(4)}`,
        etaMinutes: locEta
      });
      alert('📍 Real device GPS location broadcasted to citizen!');
      setUpdateLocAssignment(null);
      await fetchAssignments();
    } catch (err: any) {
      alert('Failed to update location: ' + (err.response?.data?.error || err.message));
    } finally {
      setAcceptSubmitting(false);
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
      
      {/* Real-time GPS Streaming Top Banner */}
      {streamingAssignmentId && (
        <div className="bg-gradient-to-r from-emerald-950/80 via-emerald-900/50 to-slate-900 border border-emerald-500/60 p-4 rounded-2xl shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <Radio className="w-5 h-5 animate-pulse text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-white text-sm">
                  Live Real-time GPS Broadcast Active
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500 text-slate-950">
                  LIVE STREAMING
                </span>
              </div>
              <p className="text-xs text-emerald-200/80 mt-0.5">
                Streaming your real device coordinates ({activeGps ? `${activeGps.latitude.toFixed(5)}, ${activeGps.longitude.toFixed(5)}` : 'Connecting...'}) to citizen.
                {activeGps?.locationName && ` • Near: ${activeGps.locationName}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => detectRealGps()}
              className="px-3 py-1.5 bg-emerald-800/50 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Ping GPS</span>
            </button>
            <button
              onClick={() => {
                stopLiveGpsBroadcast();
                setStreamingAssignmentId(null);
              }}
              className="px-3 py-1.5 bg-rose-600/30 hover:bg-rose-600/50 text-rose-300 border border-rose-500/30 rounded-xl text-xs font-bold transition"
            >
              Pause Stream
            </button>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-black text-white">{pageTitle}</h1>
      </div>

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
        <div className="text-center py-10 text-[#A9A5BA]">Loading assignments...</div>
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
                    <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                      <Radio className="w-3.5 h-3.5 animate-pulse text-emerald-400" />
                      Real GPS Shared ({a.responderEtaMinutes || 10}m ETA)
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
                  <div className="text-xs text-emerald-300/80 font-mono flex items-center gap-2 bg-emerald-950/30 px-3 py-1.5 rounded-xl border border-emerald-500/20 max-w-md">
                    <Navigation className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="truncate">
                      Real Driver GPS: {Number(a.responderLatitude).toFixed(4)}, {Number(a.responderLongitude).toFixed(4)} • {a.responderLocationName || 'Driver Current Location'}
                    </span>
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
                      onClick={() => handleOpenUpdateModal(a)}
                      className="px-3.5 py-2 bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-500/40 text-emerald-300 rounded-xl font-bold text-xs flex items-center gap-1.5 transition"
                      title="Update your live real GPS coordinates for the citizen"
                    >
                      <Navigation className="w-3.5 h-3.5" />
                      <span>Update Real GPS</span>
                    </button>
                  )}

                  {a.status === 'ASSIGNED' && (
                    <button 
                      disabled={updatingId === a.id}
                      onClick={() => handleInitiateAccept(a)} 
                      className="btn-primary w-full md:w-auto px-4 py-2 bg-[#FF7A00] hover:bg-[#FF4D24] text-white rounded-xl font-bold flex items-center justify-center gap-1.5 shadow-md shadow-orange-500/20"
                    >
                      <Navigation className="w-4 h-4" />
                      <span>Accept & Share Real GPS</span>
                    </button>
                  )}

                  {a.status === 'ACCEPTED' && (
                    <button 
                      disabled={updatingId === a.id}
                      onClick={() => updateStatusSimple(a.id, 'ON_THE_WAY')} 
                      className="btn-primary w-full md:w-auto px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-bold flex items-center justify-center gap-1.5"
                    >
                      {updatingId === a.id ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
                      <span>Start Task</span>
                    </button>
                  )}

                  {a.status === 'ON_THE_WAY' && (
                    <button 
                      disabled={updatingId === a.id}
                      onClick={() => updateStatusSimple(a.id, 'ARRIVED')} 
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
                        updateStatusSimple(a.id, 'COMPLETED', note || undefined);
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

      {/* Accept Assignment with REAL Device GPS Modal */}
      {acceptModalAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-[#120822] border border-white/10 rounded-3xl p-6 sm:p-8 w-full max-w-lg shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-orange-500/20 text-[#FF7A00] flex items-center justify-center">
                  <Navigation className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">Accept & Share Real GPS</h3>
                  <p className="text-xs text-[#A9A5BA]">Pickup ID: #{acceptModalAssignment.id}</p>
                </div>
              </div>
              <button 
                onClick={() => setAcceptModalAssignment(null)}
                className="text-gray-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* GPS Detection Status Card */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-300 flex items-center gap-2">
                  <Compass className="w-4 h-4 text-[#FF7A00]" />
                  Device Location Status
                </span>
                {detectingGps ? (
                  <span className="text-xs font-semibold text-orange-400 flex items-center gap-1.5">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Requesting device GPS...
                  </span>
                ) : locLat ? (
                  <span className="text-xs font-extrabold text-emerald-400 flex items-center gap-1.5 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Real GPS Locked
                  </span>
                ) : (
                  <span className="text-xs font-semibold text-amber-400 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" /> Awaiting Permission
                  </span>
                )}
              </div>

              {gpsError && (
                <div className="bg-rose-500/15 border border-rose-500/30 p-3 rounded-xl text-xs text-rose-300 space-y-2">
                  <p className="font-bold flex items-start gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <span>{gpsError}</span>
                  </p>
                  <button
                    type="button"
                    onClick={detectRealGps}
                    className="w-full bg-rose-600/30 hover:bg-rose-600/50 text-white font-bold py-1.5 px-3 rounded-lg text-xs transition"
                  >
                    🔄 Try Detecting GPS Again
                  </button>
                </div>
              )}

              {locLat && (
                <div className="bg-emerald-950/40 border border-emerald-500/30 p-3.5 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400">Real Coordinates:</span>
                    <span className="font-mono font-bold text-emerald-300">{locLat}, {locLng}</span>
                  </div>
                  {locAccuracy && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-400">GPS Accuracy:</span>
                      <span className="font-semibold text-emerald-400">±{locAccuracy} meters</span>
                    </div>
                  )}
                  {locName && (
                    <div className="flex items-start justify-between text-xs pt-1 border-t border-emerald-500/20">
                      <span className="text-gray-400 shrink-0">Real Location:</span>
                      <span className="font-bold text-white text-right ml-2">{locName}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Accept Form */}
            <form onSubmit={handleConfirmAcceptWithGps} className="space-y-4 text-xs font-semibold">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-300 block mb-1">Driver Latitude</label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="e.g. 12.9716"
                    value={locLat}
                    onChange={(e) => setLocLat(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-gray-300 block mb-1">Driver Longitude</label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="e.g. 77.5946"
                    value={locLng}
                    onChange={(e) => setLocLng(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-gray-300 block mb-1">Current Real Landmark / Area</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Indiranagar Main Road"
                  value={locName}
                  onChange={(e) => setLocName(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-gray-300">Estimated Arrival (ETA)</label>
                  <span className="text-[#FF7A00] font-bold">~{locEta} Minutes</span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="45"
                  value={locEta}
                  onChange={(e) => setLocEta(Number(e.target.value))}
                  className="w-full accent-[#FF7A00]"
                />
              </div>

              <div className="p-3 bg-white/5 border border-white/10 rounded-xl flex items-center gap-3 cursor-pointer" onClick={() => setContinuousStream(!continuousStream)}>
                <input
                  type="checkbox"
                  checked={continuousStream}
                  onChange={(e) => setContinuousStream(e.target.checked)}
                  className="accent-[#FF7A00] w-4 h-4 rounded cursor-pointer"
                />
                <div>
                  <p className="text-white font-bold text-xs">Enable Continuous GPS Streaming</p>
                  <p className="text-[#A9A5BA] text-[11px]">Continuously stream updated coordinates as your vehicle travels toward the citizen</p>
                </div>
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setAcceptModalAssignment(null)}
                  className="w-1/3 bg-white/5 hover:bg-white/10 text-gray-300 py-3 rounded-xl font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={acceptSubmitting || !locLat || !locLng}
                  className="w-2/3 bg-[#FF7A00] hover:bg-orange-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition disabled:opacity-50 shadow-lg shadow-orange-500/25"
                >
                  {acceptSubmitting ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Radio className="w-4 h-4 animate-pulse" />
                  )}
                  <span>Accept & Broadcast GPS</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Update Real GPS Modal */}
      {updateLocAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#120822] border border-white/10 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center gap-2 text-white font-bold">
                <Navigation className="w-5 h-5 text-[#FF7A00]" />
                <h3>Broadcast Updated Real GPS</h3>
              </div>
              <button 
                onClick={() => setUpdateLocAssignment(null)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUpdatedLocation} className="space-y-4 text-xs font-semibold">
              <div className="flex justify-between items-center bg-white/5 p-3 rounded-xl">
                <span className="text-gray-300">Device GPS</span>
                <button
                  type="button"
                  onClick={detectRealGps}
                  className="text-xs text-[#FF7A00] font-bold hover:underline flex items-center gap-1"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${detectingGps ? 'animate-spin' : ''}`} />
                  <span>Re-detect Location</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-300 block mb-1">Latitude</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={locLat}
                    onChange={(e) => setLocLat(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white font-mono"
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
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-gray-300 block mb-1">Current Street / Area</label>
                <input
                  type="text"
                  required
                  value={locName}
                  onChange={(e) => setLocName(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="text-gray-300 block mb-1">Estimated Arrival (ETA: {locEta} Mins)</label>
                <input
                  type="range"
                  min="1"
                  max="45"
                  value={locEta}
                  onChange={(e) => setLocEta(Number(e.target.value))}
                  className="w-full accent-[#FF7A00]"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setUpdateLocAssignment(null)}
                  className="w-1/3 bg-white/5 hover:bg-white/10 text-gray-300 py-2.5 rounded-xl font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={acceptSubmitting}
                  className="w-2/3 bg-[#FF7A00] hover:bg-orange-600 text-white py-2.5 rounded-xl font-bold flex items-center justify-center gap-1.5 transition disabled:opacity-50"
                >
                  {acceptSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Radio className="w-4 h-4 animate-pulse" />}
                  <span>Push Real GPS</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
