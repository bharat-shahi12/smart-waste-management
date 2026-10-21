import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Trash2, AlertTriangle, Plus, X, CheckCircle, Truck, Calendar, Clock, MapPin, ArrowRight, RefreshCw } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import api from '../services/api';
import { useLiveRefresh } from '../services/liveEvents';
import type { PickupRequest } from '../types';

// Fix Leaflet's default icon issue
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

function LocationMarker({ position, setPosition }: any) {
  useMapEvents({
    click(e) {
      setPosition(e.latlng);
    },
  });

  return position === null ? null : (
    <Marker position={position}></Marker>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [envStats, setEnvStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  
  const [binData, setBinData] = useState({
    name: '',
    deviceId: '',
    wasteType: 'MIXED',
    capacityLiters: 100,
    locationName: '',
    address: '',
    latitude: '',
    longitude: '',
    areaType: 'Residential'
  });

  const [chartData, setChartData] = useState<any[]>([]);
  const [recentPickups, setRecentPickups] = useState<PickupRequest[]>([]);

  const fetchStats = async () => {
    try {
      const [adminStats, envResponse, historyResponse, pickupsResponse] = await Promise.all([
          api.get('/analytics/admin'),
          api.get('/environment/current'),
          api.get('/environment/history'),
          api.get('/pickups')
      ]);
      setStats(adminStats.data);
      setEnvStats(envResponse.data);
      setChartData(historyResponse.data);
      const sortedPickups = (pickupsResponse.data || []).sort((a: PickupRequest, b: PickupRequest) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeB - timeA;
      });
      setRecentPickups(sortedPickups.slice(0, 5));
    } catch (error) {
      console.error('Failed to fetch dashboard stats', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  useLiveRefresh(fetchStats, ['DUSTBIN', 'COMPLAINT', 'PICKUP', 'BIN', 'RECONNECTED']);

  const handleAddBin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        name: binData.name,
        deviceId: binData.deviceId,
        wasteType: binData.wasteType,
        capacityLiters: parseInt(binData.capacityLiters.toString()),
        locationName: binData.locationName,
        address: binData.address,
        areaType: binData.areaType,
        latitude: parseFloat(binData.latitude.toString()),
        longitude: parseFloat(binData.longitude.toString()),
        status: 'EMPTY',
        fillLevel: 0
      };
      await api.post('/dustbins', payload);
      setSuccessMsg('Dustbin added successfully!');
      setShowAddModal(false);
      setBinData({ name: '', deviceId: '', wasteType: 'MIXED', capacityLiters: 100, locationName: '', address: '', latitude: '', longitude: '', areaType: 'Residential' });
      // Refresh stats
      const response = await axios.get('http://localhost:8081/api/analytics/dashboard').catch(() => ({data: stats}));
      setStats({...response.data, totalDustbins: response.data.totalDustbins + 1}); // Optimistic update
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      console.error(err);
      alert("Failed to add bin: " + (err.response?.data?.message || err.message));
    }
  };

  if (loading) return <div>Loading dashboard...</div>;

  return (
    <div className="space-y-6 relative">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow transition"
        >
          <Plus className="w-5 h-5" />
          Add New Bin
        </button>
      </div>

      {successMsg && (
        <div className="bg-green-50 text-green-700 p-4 rounded-xl border border-green-200 flex items-center gap-3">
          <CheckCircle className="w-5 h-5" /> {successMsg}
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl mt-10 mb-10">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">Add New Dustbin</h2>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-6 h-6"/></button>
            </div>
            <form onSubmit={handleAddBin} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Bin Name</label>
                  <input type="text" required value={binData.name} onChange={e => setBinData({...binData, name: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="e.g. Bin #101" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Bin ID (Device ID)</label>
                  <input type="text" required value={binData.deviceId} onChange={e => setBinData({...binData, deviceId: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="e.g. ESP32_101" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Bin Type</label>
                  <select value={binData.wasteType} onChange={e => setBinData({...binData, wasteType: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500">
                    <option value="MIXED">Mixed Waste</option>
                    <option value="ORGANIC">Organic</option>
                    <option value="RECYCLABLE">Recyclable</option>
                    <option value="PLASTIC">Plastic</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Capacity (Liters)</label>
                  <input type="number" required value={binData.capacityLiters} onChange={e => setBinData({...binData, capacityLiters: Number(e.target.value)})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Location Name</label>
                  <input type="text" required value={binData.locationName} onChange={e => setBinData({...binData, locationName: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="e.g. Central Park" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Address</label>
                  <input type="text" required value={binData.address} onChange={e => setBinData({...binData, address: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="e.g. Sector 62, Noida" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Select Location on Map (or type below)</label>
                  <div className="h-[250px] w-full rounded-lg overflow-hidden border border-gray-300 mb-2">
                    <MapContainer center={[28.6139, 77.2090]} zoom={11} style={{ height: '100%', width: '100%' }}>
                      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" />
                      <LocationMarker 
                        position={binData.latitude && binData.longitude ? {lat: Number(binData.latitude), lng: Number(binData.longitude)} : null} 
                        setPosition={(latlng: any) => setBinData({...binData, latitude: latlng.lat.toFixed(6), longitude: latlng.lng.toFixed(6)})} 
                      />
                    </MapContainer>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Latitude</label>
                      <input type="number" step="any" required value={binData.latitude} onChange={e => setBinData({...binData, latitude: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="28.6250" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Longitude</label>
                      <input type="number" step="any" required value={binData.longitude} onChange={e => setBinData({...binData, longitude: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="77.3800" />
                    </div>
                  </div>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Area Type</label>
                  <select value={binData.areaType} onChange={e => setBinData({...binData, areaType: e.target.value})} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500">
                    <option value="Residential">Residential</option>
                    <option value="Commercial">Commercial</option>
                    <option value="Industrial">Industrial</option>
                    <option value="Public Park">Public Park</option>
                  </select>
                </div>
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50">Cancel</button>
                <button type="submit" className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow font-bold">Save Bin</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4">
          <div className="p-3 bg-blue-100 rounded-lg"><Trash2 className="w-8 h-8 text-blue-600"/></div>
          <div>
            <p className="text-sm font-medium text-gray-500">Total Bins</p>
            <h3 className="text-2xl font-bold text-gray-900">{stats?.totalBins || 0}</h3>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4">
          <div className="p-3 bg-red-100 rounded-lg"><AlertTriangle className="w-8 h-8 text-red-600"/></div>
          <div>
            <p className="text-sm font-medium text-gray-500">Full Bins</p>
            <h3 className="text-2xl font-bold text-gray-900">{stats?.fullBins || 0}</h3>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4">
          <div className="p-3 bg-green-100 rounded-lg"><CheckCircle className="w-8 h-8 text-green-600"/></div>
          <div>
            <p className="text-xs font-medium text-gray-500">Waste Collected</p>
            <h3 className="text-2xl font-bold text-gray-900">{stats?.totalWasteCollected?.toFixed(1) || 0} kg</h3>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4">
          <div className="p-3 bg-purple-100 rounded-lg"><AlertTriangle className="w-8 h-8 text-purple-600"/></div>
          <div>
            <p className="text-sm font-medium text-gray-500">Total Complaints</p>
            <h3 className="text-2xl font-bold text-gray-900">{stats?.totalComplaints || 0}</h3>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4">
          <div className="p-3 bg-orange-100 rounded-lg"><Truck className="w-8 h-8 text-orange-600"/></div>
          <div>
            <p className="text-sm font-medium text-gray-500">Total Pickups</p>
            <h3 className="text-2xl font-bold text-gray-900">{stats?.totalPickups || 0}</h3>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-800 mb-6">Current Environment Overview</h3>
            {envStats && envStats.status !== "NO DATA" ? (
                <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <p className="text-gray-500 text-sm mb-1">Avg Temperature</p>
                        <p className="text-2xl font-bold text-gray-900">{envStats.temperature?.toFixed(1)}°C</p>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <p className="text-gray-500 text-sm mb-1">Avg Humidity</p>
                        <p className="text-2xl font-bold text-gray-900">{envStats.humidity?.toFixed(1)}%</p>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <p className="text-gray-500 text-sm mb-1">Air Quality / Gas</p>
                        <p className={`text-2xl font-bold ${envStats.status === 'POOR' ? 'text-red-600' : 'text-green-600'}`}>
                            {envStats.status}
                        </p>
                    </div>
                </div>
            ) : (
                <div className="text-center py-10 text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                    No active sensor environment data available
                </div>
            )}
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Weekly Average Fill Level Trend</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Area type="monotone" dataKey="fill" stroke="#16a34a" fill="#bbf7d0" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
      </div>

      {/* Doorstep Pickup Requests Section */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-orange-100 rounded-xl text-orange-600">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-gray-900">Recent Doorstep Pickup Requests</h3>
                <span className="bg-orange-50 text-orange-700 text-xs px-2.5 py-0.5 rounded-full font-bold border border-orange-200">
                  {recentPickups.filter(r => r.status === 'REQUESTED').length} Pending
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Real-time stream of waste pickup requests submitted by citizens.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchStats()}
              className="flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold px-3 py-2 rounded-xl text-xs transition shadow-2xs"
              title="Refresh Doorstep Pickups"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>
            <Link
              to="/admin/pickups"
              className="flex items-center gap-2 bg-orange-50 hover:bg-orange-100 text-orange-700 font-bold px-4 py-2 rounded-xl text-xs sm:text-sm border border-orange-200 transition shadow-sm"
            >
              <span>View All & Assign Collectors</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {recentPickups.length === 0 ? (
          <div className="text-center py-12 text-gray-400 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
            <Truck className="w-12 h-12 mx-auto mb-3 opacity-20 text-orange-500" />
            <p className="text-sm font-semibold text-gray-600">No pickup requests recorded yet</p>
            <p className="text-xs text-gray-400 mt-1">When citizens schedule a waste pickup, it will appear here in real-time.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  <th className="pb-3 pl-2">Pickup ID</th>
                  <th className="pb-3">Citizen / Requester</th>
                  <th className="pb-3">Waste Type & Qty</th>
                  <th className="pb-3">Address</th>
                  <th className="pb-3">Preferred Schedule</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-right pr-2">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-sm">
                {recentPickups.map((r) => {
                  const getBadge = (status: string) => {
                    switch (status) {
                      case 'REQUESTED': return 'bg-amber-100 text-amber-800 border-amber-200';
                      case 'ASSIGNED': return 'bg-purple-100 text-purple-800 border-purple-200';
                      case 'ON_THE_WAY': return 'bg-blue-100 text-blue-800 border-blue-200';
                      case 'COLLECTED': return 'bg-indigo-100 text-indigo-800 border-indigo-200';
                      case 'COMPLETED': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
                      case 'CANCELLED': return 'bg-rose-100 text-rose-800 border-rose-200';
                      default: return 'bg-gray-100 text-gray-800 border-gray-200';
                    }
                  };

                  return (
                    <tr key={r.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="py-3.5 pl-2 font-mono font-bold text-xs text-orange-600">
                        {r.pickupId}
                      </td>
                      <td className="py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-bold text-xs">
                            {(r.user?.name || r.user?.email || 'C')[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-gray-900 text-xs sm:text-sm">
                              {r.user?.name || 'Citizen'}
                            </p>
                            <p className="text-[11px] text-gray-400">{r.user?.email || `User #${r.userId || r.user?.id}`}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5">
                        <span className="font-semibold text-gray-800 block text-xs sm:text-sm">{r.wasteType}</span>
                        {r.quantity && (
                          <span className="text-[11px] text-gray-500 font-medium bg-gray-100 px-2 py-0.5 rounded">
                            {r.quantity}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 max-w-[200px]">
                        <p className="text-xs text-gray-600 truncate flex items-center gap-1" title={r.address}>
                          <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <span>{r.address}</span>
                        </p>
                      </td>
                      <td className="py-3.5">
                        <div className="text-xs text-gray-600 flex flex-col gap-0.5">
                          <span className="flex items-center gap-1 font-medium">
                            <Calendar className="w-3 h-3 text-gray-400" />
                            {r.preferredDate ? new Date(r.preferredDate).toLocaleDateString() : 'Flexible'}
                          </span>
                          {r.preferredTime && (
                            <span className="flex items-center gap-1 text-[11px] text-gray-400">
                              <Clock className="w-3 h-3 text-gray-400" />
                              {r.preferredTime}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5">
                        <span className={`text-[11px] px-2.5 py-1 rounded-full font-bold border ${getBadge(r.status)}`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="py-3.5 text-right pr-2">
                        <Link
                          to="/admin/pickups"
                          className="inline-flex items-center gap-1 bg-white hover:bg-orange-50 text-gray-700 hover:text-orange-700 px-3 py-1.5 rounded-lg text-xs font-bold border border-gray-200 hover:border-orange-300 transition shadow-2xs"
                        >
                          <span>Manage</span>
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
