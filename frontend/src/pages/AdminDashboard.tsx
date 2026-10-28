import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Trash2, AlertTriangle, Plus, X, CheckCircle, Truck, Calendar, Clock, 
  MapPin, ArrowRight, RefreshCw, Edit2, Search, Key, Check, 
  Copy, Eye, EyeOff, Droplets, Thermometer, Wind, CheckCircle2, ExternalLink 
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import api from '../services/api';
import { dustbinService } from '../services/dustbinService';
import { useLiveRefresh } from '../services/liveEvents';
import type { PickupRequest, Dustbin } from '../types';
import LiveDustbin from '../components/LiveDustbin';

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
  
  // Dustbin list and filters
  const [dustbins, setDustbins] = useState<Dustbin[]>([]);
  const [dustbinsLoading, setDustbinsLoading] = useState(false);
  const [dustbinSearch, setDustbinSearch] = useState('');
  const [dustbinStatusFilter, setDustbinStatusFilter] = useState('ALL');
  const [dustbinWasteFilter, setDustbinWasteFilter] = useState('ALL');

  // Edit Dustbin Modal State
  const [editingBin, setEditingBin] = useState<Dustbin | null>(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    deviceId: '',
    apiKey: '',
    wasteType: 'MIXED',
    capacityLiters: 100,
    locationName: '',
    address: '',
    latitude: '28.6139',
    longitude: '77.2090',
    areaType: 'Residential',
    status: 'AVAILABLE',
    fillLevel: 0,
    isActive: true,
  });
  const [editSaving, setEditSaving] = useState(false);

  // Delete Confirm Modal State
  const [deleteConfirmBin, setDeleteConfirmBin] = useState<Dustbin | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // API Key reveal & copy states
  const [revealedKeyId, setRevealedKeyId] = useState<number | null>(null);
  const [copiedKeyId, setCopiedKeyId] = useState<number | null>(null);

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

  const fetchDustbins = async () => {
    try {
      setDustbinsLoading(true);
      const data = await dustbinService.getAllDustbins();
      setDustbins(data);
    } catch (err) {
      console.error('Failed to fetch dustbins', err);
    } finally {
      setDustbinsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchDustbins();
  }, []);

  // Listen to live WebSocket events - auto-refreshes when any dustbin is edited, created, or telemetry is received!
  useLiveRefresh(() => {
    fetchStats();
    fetchDustbins();
  }, ['DUSTBIN', 'COMPLAINT', 'PICKUP', 'BIN', 'RECONNECTED']);

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
        status: 'AVAILABLE',
        fillLevel: 0
      };
      await dustbinService.createDustbin(payload);
      setSuccessMsg('New smart dustbin added and broadcasted live across the network!');
      setShowAddModal(false);
      setBinData({ name: '', deviceId: '', wasteType: 'MIXED', capacityLiters: 100, locationName: '', address: '', latitude: '', longitude: '', areaType: 'Residential' });
      fetchDustbins();
      fetchStats();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      console.error(err);
      alert("Failed to add bin: " + (err.response?.data?.message || err.message));
    }
  };

  const handleOpenEdit = (bin: Dustbin) => {
    setEditingBin(bin);
    setEditFormData({
      name: bin.name || '',
      deviceId: bin.deviceId || '',
      apiKey: bin.apiKey || '',
      wasteType: bin.wasteType || 'MIXED',
      capacityLiters: bin.capacityLiters || 100,
      locationName: bin.locationName || '',
      address: bin.address || '',
      latitude: (bin.latitude != null ? bin.latitude : 28.6139).toString(),
      longitude: (bin.longitude != null ? bin.longitude : 77.2090).toString(),
      areaType: bin.areaType || 'Residential',
      status: bin.status || 'AVAILABLE',
      fillLevel: bin.fillLevel != null ? bin.fillLevel : 0,
      isActive: bin.isActive !== false,
    });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBin) return;
    setEditSaving(true);
    try {
      const payload: Partial<Dustbin> = {
        name: editFormData.name,
        deviceId: editFormData.deviceId,
        apiKey: editFormData.apiKey,
        wasteType: editFormData.wasteType,
        capacityLiters: parseInt(editFormData.capacityLiters.toString()),
        locationName: editFormData.locationName,
        address: editFormData.address,
        areaType: editFormData.areaType,
        latitude: parseFloat(editFormData.latitude.toString()),
        longitude: parseFloat(editFormData.longitude.toString()),
        status: editFormData.status,
        fillLevel: parseFloat(editFormData.fillLevel.toString()),
        isActive: editFormData.isActive,
      };

      const updated = await dustbinService.updateDustbin(editingBin.id, payload);
      
      // Optimistic update
      setDustbins(prev => prev.map(b => b.id === updated.id ? { ...b, ...updated } : b));
      setSuccessMsg(`Dustbin "${updated.name}" updated successfully! Changes are now live on user & citizen panels.`);
      setEditingBin(null);
      fetchStats();
      setTimeout(() => setSuccessMsg(''), 4500);
    } catch (err: any) {
      console.error(err);
      alert("Failed to update dustbin: " + (err.response?.data?.message || err.message));
    } finally {
      setEditSaving(false);
    }
  };

  const handleDeleteBin = async () => {
    if (!deleteConfirmBin) return;
    setDeleteLoading(true);
    try {
      await dustbinService.deleteDustbin(deleteConfirmBin.id);
      setSuccessMsg(`Dustbin "${deleteConfirmBin.name}" removed from the active network.`);
      setDustbins(prev => prev.filter(b => b.id !== deleteConfirmBin.id));
      setDeleteConfirmBin(null);
      fetchStats();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      console.error(err);
      alert("Failed to delete dustbin: " + (err.response?.data?.message || err.message));
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleCopyKey = (id: number, key?: string) => {
    if (!key) return;
    navigator.clipboard.writeText(key);
    setCopiedKeyId(id);
    setTimeout(() => setCopiedKeyId(null), 2500);
  };

  const filteredDustbins = dustbins.filter(b => {
    const matchesSearch = !dustbinSearch || 
      b.name?.toLowerCase().includes(dustbinSearch.toLowerCase()) ||
      b.deviceId?.toLowerCase().includes(dustbinSearch.toLowerCase()) ||
      (b.locationName && b.locationName.toLowerCase().includes(dustbinSearch.toLowerCase())) ||
      (b.address && b.address.toLowerCase().includes(dustbinSearch.toLowerCase()));

    const matchesStatus = dustbinStatusFilter === 'ALL' || b.status === dustbinStatusFilter;
    const matchesWaste = dustbinWasteFilter === 'ALL' || b.wasteType === dustbinWasteFilter;

    return matchesSearch && matchesStatus && matchesWaste;
  });

  const getProgressColor = (fill: number, status: string) => {
    if (status === 'OFFLINE') return 'bg-gray-400';
    if (fill >= 80) return 'bg-red-500';
    if (fill >= 60) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'FULL':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200">
            <AlertTriangle className="w-3 h-3" /> Full
          </span>
        );
      case 'OFFLINE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-700 border border-gray-200">
            Offline
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" /> Available
          </span>
        );
    }
  };

  const getWasteBadge = (type: string) => {
    switch (type) {
      case 'ORGANIC':
      case 'WET':
        return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">Organic</span>;
      case 'RECYCLABLE':
        return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">Recyclable</span>;
      case 'PLASTIC':
        return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">Plastic</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">Mixed</span>;
    }
  };

  if (loading) return (
    <div className="flex h-96 items-center justify-center">
      <div className="flex items-center gap-3 text-gray-500 font-medium">
        <RefreshCw className="w-6 h-6 animate-spin text-green-600" />
        Loading Admin Operations Control Center...
      </div>
    </div>
  );

  return (
    <div className="space-y-8 relative pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-xs border border-gray-100">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Operations Dashboard</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Real-time telemetry, smart bin management, and waste network orchestration.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => { fetchStats(); fetchDustbins(); }}
            className="flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2.5 px-3.5 rounded-xl text-xs transition shadow-2xs"
            title="Refresh All Real-time Data"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 px-5 rounded-xl shadow-sm transition text-xs sm:text-sm"
          >
            <Plus className="w-4 h-4" />
            Deploy New Smart Bin
          </button>
        </div>
      </div>

      {/* Live Toast Notification */}
      {successMsg && (
        <div className="bg-emerald-50 text-emerald-800 p-4 rounded-xl border border-emerald-200 flex items-center justify-between shadow-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="text-sm font-semibold">{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')} className="text-emerald-600 hover:text-emerald-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-5">
        <div className="bg-white p-5 rounded-2xl shadow-xs border border-gray-100 flex items-center space-x-4">
          <div className="p-3 bg-blue-100 rounded-xl"><Trash2 className="w-7 h-7 text-blue-600"/></div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Bins</p>
            <h3 className="text-2xl font-extrabold text-gray-900 mt-0.5">{stats?.totalBins || dustbins.length || 0}</h3>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-xs border border-gray-100 flex items-center space-x-4">
          <div className="p-3 bg-red-100 rounded-xl"><AlertTriangle className="w-7 h-7 text-red-600"/></div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Full Bins</p>
            <h3 className="text-2xl font-extrabold text-gray-900 mt-0.5">
              {dustbins.filter(b => b.status === 'FULL').length || stats?.fullBins || 0}
            </h3>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-xs border border-gray-100 flex items-center space-x-4">
          <div className="p-3 bg-green-100 rounded-xl"><CheckCircle className="w-7 h-7 text-green-600"/></div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Waste Collected</p>
            <h3 className="text-2xl font-extrabold text-gray-900 mt-0.5">{stats?.totalWasteCollected?.toFixed(1) || 0} kg</h3>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-xs border border-gray-100 flex items-center space-x-4">
          <div className="p-3 bg-purple-100 rounded-xl"><AlertTriangle className="w-7 h-7 text-purple-600"/></div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Complaints</p>
            <h3 className="text-2xl font-extrabold text-gray-900 mt-0.5">{stats?.totalComplaints || 0}</h3>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-xs border border-gray-100 flex items-center space-x-4">
          <div className="p-3 bg-orange-100 rounded-xl"><Truck className="w-7 h-7 text-orange-600"/></div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Pickups</p>
            <h3 className="text-2xl font-extrabold text-gray-900 mt-0.5">{stats?.totalPickups || 0}</h3>
          </div>
        </div>
      </div>

      {/* Real-time Firebase Telemetry Box */}
      <LiveDustbin />

      {/* Environment Overview & Weekly Trends */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-xs border border-gray-100">
          <h3 className="text-base font-bold text-gray-900 mb-5 flex items-center gap-2">
            <Wind className="w-5 h-5 text-green-600" />
            <span>Current Environment Overview</span>
          </h3>
          {envStats && envStats.status !== "NO DATA" ? (
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-xl border border-gray-100">
                <p className="text-gray-500 text-xs font-semibold mb-1">Avg Temperature</p>
                <p className="text-2xl font-extrabold text-gray-900">{envStats.temperature?.toFixed(1)}°C</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-xl border border-gray-100">
                <p className="text-gray-500 text-xs font-semibold mb-1">Avg Humidity</p>
                <p className="text-2xl font-extrabold text-gray-900">{envStats.humidity?.toFixed(1)}%</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-xl border border-gray-100">
                <p className="text-gray-500 text-xs font-semibold mb-1">Air Quality / Gas</p>
                <p className={`text-2xl font-extrabold ${envStats.status === 'POOR' ? 'text-red-600' : 'text-green-600'}`}>
                  {envStats.status}
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center py-10 text-gray-500 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
              No active environmental sensor data available yet
            </div>
          )}
        </div>
        
        <div className="bg-white p-6 rounded-2xl shadow-xs border border-gray-100">
          <h3 className="text-base font-bold text-gray-900 mb-4">Weekly Average Fill Level Trend</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Area type="monotone" dataKey="fill" stroke="#16a34a" strokeWidth={2} fill="#dcfce7" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SMART DUSTBINS MANAGEMENT & LIVE EDIT SECTION                            */}
      {/* ========================================================================= */}
      <div className="bg-white p-6 rounded-2xl shadow-xs border border-gray-100 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-gray-100">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-green-100 text-green-700 rounded-xl">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-gray-900">Smart Dustbin Management & Telemetry</h2>
                  <span className="bg-green-100 text-green-800 text-xs px-2.5 py-0.5 rounded-full font-bold">
                    {filteredDustbins.length} of {dustbins.length} Bins
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  View, configure, calibrate, and edit all deployed smart bins. Any edit propagates live instantly to citizens.
                </p>
              </div>
            </div>
          </div>

          {/* Action Tools & Filters */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search */}
            <div className="relative min-w-[200px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search by name, ID, or location..."
                value={dustbinSearch}
                onChange={e => setDustbinSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-green-500 focus:outline-hidden"
              />
              {dustbinSearch && (
                <button onClick={() => setDustbinSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl text-xs font-medium text-gray-600">
              {['ALL', 'AVAILABLE', 'FULL', 'OFFLINE'].map((status) => (
                <button
                  key={status}
                  onClick={() => setDustbinStatusFilter(status)}
                  className={`px-3 py-1.5 rounded-lg transition text-xs font-bold ${
                    dustbinStatusFilter === status 
                      ? 'bg-white text-gray-900 shadow-2xs' 
                      : 'hover:text-gray-900'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>

            {/* Waste Filter */}
            <select
              value={dustbinWasteFilter}
              onChange={e => setDustbinWasteFilter(e.target.value)}
              className="px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-green-500 font-medium"
            >
              <option value="ALL">All Waste Types</option>
              <option value="MIXED">Mixed</option>
              <option value="ORGANIC">Organic</option>
              <option value="RECYCLABLE">Recyclable</option>
              <option value="PLASTIC">Plastic</option>
            </select>
          </div>
        </div>

        {/* Dustbins Table */}
        {dustbinsLoading ? (
          <div className="text-center py-12 text-gray-400">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-green-600" />
            <p className="text-xs font-semibold">Refreshing smart bins fleet...</p>
          </div>
        ) : filteredDustbins.length === 0 ? (
          <div className="text-center py-16 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
            <Trash2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-gray-700">No smart dustbins found</h3>
            <p className="text-xs text-gray-500 mt-1">Try adjusting your search criteria or add a new bin to the network.</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="mt-4 inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-xl text-xs"
            >
              <Plus className="w-4 h-4" />
              Add First Dustbin
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  <th className="pb-3 pl-2">Dustbin & Hardware</th>
                  <th className="pb-3">Location & Address</th>
                  <th className="pb-3">Waste & Capacity</th>
                  <th className="pb-3">Fill Level</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Telemetry</th>
                  <th className="pb-3 text-right pr-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-sm">
                {filteredDustbins.map((bin) => {
                  const fill = bin.fillLevel ?? 0;
                  const isRevealed = revealedKeyId === bin.id;
                  const isCopied = copiedKeyId === bin.id;

                  return (
                    <tr key={bin.id} className="hover:bg-gray-50/70 transition-colors">
                      {/* Name & Hardware info */}
                      <td className="py-4 pl-2">
                        <div className="flex items-start gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                            bin.status === 'FULL' ? 'bg-red-100 text-red-600' :
                            bin.status === 'OFFLINE' ? 'bg-gray-100 text-gray-500' : 'bg-green-100 text-green-700'
                          }`}>
                            <Trash2 className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-gray-900 text-sm">{bin.name}</span>
                              {bin.isActive === false && (
                                <span className="bg-gray-200 text-gray-600 text-[10px] px-1.5 py-0.2 rounded font-bold">Inactive</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="font-mono text-[11px] font-bold text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                                {bin.deviceId}
                              </span>
                              {bin.areaType && (
                                <span className="text-[11px] text-gray-400 font-medium">
                                  {bin.areaType}
                                </span>
                              )}
                            </div>
                            {/* Device API Key row */}
                            {bin.apiKey && (
                              <div className="flex items-center gap-1.5 mt-1 text-[10px] text-gray-500 font-mono">
                                <Key className="w-3 h-3 text-gray-400" />
                                <span>{isRevealed ? bin.apiKey : `••••••••${bin.apiKey.slice(-6)}`}</span>
                                <button 
                                  onClick={() => setRevealedKeyId(isRevealed ? null : bin.id)}
                                  className="text-gray-400 hover:text-gray-600"
                                  title={isRevealed ? "Hide key" : "Show full API key"}
                                >
                                  {isRevealed ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                </button>
                                <button 
                                  onClick={() => handleCopyKey(bin.id, bin.apiKey)}
                                  className="text-gray-400 hover:text-gray-600"
                                  title="Copy Device API Key"
                                >
                                  {isCopied ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Location & Address */}
                      <td className="py-4 max-w-[220px]">
                        <p className="font-semibold text-xs text-gray-800 truncate" title={bin.locationName}>
                          {bin.locationName || 'Unspecified Location'}
                        </p>
                        <p className="text-[11px] text-gray-500 truncate flex items-center gap-1 mt-0.5" title={bin.address}>
                          <MapPin className="w-3 h-3 text-gray-400 shrink-0" />
                          <span>{bin.address || 'Coordinates only'}</span>
                        </p>
                        {bin.latitude && bin.longitude && (
                          <Link
                            to="/admin/map"
                            className="inline-flex items-center gap-1 text-[10px] text-blue-600 hover:underline mt-0.5 font-mono"
                          >
                            <span>{bin.latitude.toFixed(4)}, {bin.longitude.toFixed(4)}</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </Link>
                        )}
                      </td>

                      {/* Waste & Capacity */}
                      <td className="py-4">
                        <div className="space-y-1">
                          {getWasteBadge(bin.wasteType)}
                          <p className="text-xs text-gray-500 font-medium">
                            {bin.capacityLiters || 100} L Capacity
                          </p>
                        </div>
                      </td>

                      {/* Fill Level */}
                      <td className="py-4 min-w-[130px]">
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-xs font-bold">
                            <span className="text-gray-700">{fill.toFixed(0)}%</span>
                            <span className="text-[10px] text-gray-400">
                              {Math.round(((bin.capacityLiters || 100) * fill) / 100)}L
                            </span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                            <div 
                              className={`h-full transition-all duration-500 ${getProgressColor(fill, bin.status)}`}
                              style={{ width: `${Math.min(100, Math.max(0, fill))}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-4">
                        {getStatusBadge(bin.status)}
                      </td>

                      {/* Telemetry (Temp, Hum, Air) */}
                      <td className="py-4 text-xs">
                        <div className="space-y-0.5 text-gray-600">
                          {bin.temperature != null && (
                            <div className="flex items-center gap-1 text-[11px]">
                              <Thermometer className="w-3 h-3 text-amber-500" />
                              <span>{bin.temperature.toFixed(1)}°C</span>
                            </div>
                          )}
                          {bin.humidity != null && (
                            <div className="flex items-center gap-1 text-[11px]">
                              <Droplets className="w-3 h-3 text-blue-500" />
                              <span>{bin.humidity.toFixed(0)}% hum</span>
                            </div>
                          )}
                          {bin.temperature == null && bin.humidity == null && (
                            <span className="text-[11px] text-gray-400 italic">No sensor telemetry</span>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-4 text-right pr-2">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Live Edit Button */}
                          <button
                            onClick={() => handleOpenEdit(bin)}
                            className="inline-flex items-center gap-1 bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-2xs border border-blue-200"
                            title="Edit Bin & Broadcast Live Changes"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>

                          {/* Delete Button */}
                          <button
                            onClick={() => setDeleteConfirmBin(bin)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                            title="Decommission or Delete Bin"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Doorstep Pickup Requests Section */}
      <div className="bg-white p-6 rounded-2xl shadow-xs border border-gray-100">
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
            <Link
              to="/admin/pickups"
              className="flex items-center gap-2 bg-orange-50 hover:bg-orange-100 text-orange-700 font-bold px-4 py-2 rounded-xl text-xs sm:text-sm border border-orange-200 transition shadow-2xs"
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

      {/* ========================================================================= */}
      {/* EDIT DUSTBIN MODAL (LIVE UPDATES REFLECT INSTANTLY ACROSS ALL SESSIONS)     */}
      {/* ========================================================================= */}
      {editingBin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl my-8 overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex justify-between items-center px-6 py-5 border-b border-gray-100 bg-gray-50/50">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-100 text-blue-700 rounded-xl">
                  <Edit2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">
                    Edit Smart Dustbin: <span className="text-blue-600">{editingBin.name}</span>
                  </h2>
                  <p className="text-xs text-gray-500">
                    Device ID: <span className="font-mono font-bold text-gray-700">{editingBin.deviceId}</span> • Edits broadcast live via WebSockets.
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setEditingBin(null)} 
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100"
              >
                <X className="w-5 h-5"/>
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveEdit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Bin Name */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Bin Name <span className="text-red-500">*</span>
                  </label>
                  <input 
                    type="text" 
                    required 
                    value={editFormData.name} 
                    onChange={e => setEditFormData({ ...editFormData, name: e.target.value })} 
                    className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden" 
                    placeholder="e.g. Central Library - East Gate" 
                  />
                </div>

                {/* Device ID */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Device ID (Hardware Identifier) <span className="text-red-500">*</span>
                  </label>
                  <input 
                    type="text" 
                    required 
                    value={editFormData.deviceId} 
                    onChange={e => setEditFormData({ ...editFormData, deviceId: e.target.value })} 
                    className="w-full px-3.5 py-2.5 text-sm font-mono border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden" 
                    placeholder="e.g. ESP32_101" 
                  />
                </div>

                {/* Device API Key */}
                <div className="col-span-1 md:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center justify-between">
                    <span>Device Security API Key (X-Device-Key)</span>
                    <span className="text-[10px] text-gray-400 font-normal">Authenticates ESP32 sensor telemetry</span>
                  </label>
                  <div className="relative">
                    <input 
                      type="text" 
                      value={editFormData.apiKey} 
                      onChange={e => setEditFormData({ ...editFormData, apiKey: e.target.value })} 
                      className="w-full pl-3.5 pr-20 py-2.5 text-xs font-mono border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden" 
                      placeholder="dvk_..." 
                    />
                    <button
                      type="button"
                      onClick={() => setEditFormData({ ...editFormData, apiKey: 'dvk_' + Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2) })}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-2.5 py-1 rounded-md"
                    >
                      Regenerate
                    </button>
                  </div>
                </div>

                {/* Waste Type */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Waste Type</label>
                  <select 
                    value={editFormData.wasteType} 
                    onChange={e => setEditFormData({ ...editFormData, wasteType: e.target.value })} 
                    className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  >
                    <option value="MIXED">Mixed Waste</option>
                    <option value="ORGANIC">Organic / Biodegradable</option>
                    <option value="RECYCLABLE">Recyclable (Paper/Glass/Metal)</option>
                    <option value="PLASTIC">Plastic</option>
                  </select>
                </div>

                {/* Capacity */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Capacity (Liters)</label>
                  <input 
                    type="number" 
                    required 
                    min={10} 
                    max={5000}
                    value={editFormData.capacityLiters} 
                    onChange={e => setEditFormData({ ...editFormData, capacityLiters: Number(e.target.value) })} 
                    className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden" 
                  />
                </div>

                {/* Status Override */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Operational Status</label>
                  <select 
                    value={editFormData.status} 
                    onChange={e => setEditFormData({ ...editFormData, status: e.target.value })} 
                    className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  >
                    <option value="AVAILABLE">AVAILABLE (Normal Operation)</option>
                    <option value="FULL">FULL (Flag for Collection)</option>
                    <option value="OFFLINE">OFFLINE (Sensor Maintenance)</option>
                  </select>
                </div>

                {/* Fill Level */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Fill Level ({editFormData.fillLevel}%)
                  </label>
                  <div className="flex items-center gap-3">
                    <input 
                      type="range" 
                      min="0" 
                      max="100" 
                      step="1"
                      value={editFormData.fillLevel} 
                      onChange={e => setEditFormData({ ...editFormData, fillLevel: Number(e.target.value) })} 
                      className="w-full accent-blue-600"
                    />
                    <span className="font-bold text-xs w-10 text-right">{editFormData.fillLevel}%</span>
                  </div>
                </div>

                {/* Location Name */}
                <div className="col-span-1 md:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 mb-1">Location Name / Landmark</label>
                  <input 
                    type="text" 
                    required 
                    value={editFormData.locationName} 
                    onChange={e => setEditFormData({ ...editFormData, locationName: e.target.value })} 
                    className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden" 
                    placeholder="e.g. Science Block Cafeteria" 
                  />
                </div>

                {/* Street Address */}
                <div className="col-span-1 md:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 mb-1">Street Address</label>
                  <input 
                    type="text" 
                    value={editFormData.address} 
                    onChange={e => setEditFormData({ ...editFormData, address: e.target.value })} 
                    className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden" 
                    placeholder="e.g. Campus Road 4, Near Admin Complex" 
                  />
                </div>

                {/* Area Type */}
                <div className="col-span-1 md:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 mb-1">Area Type</label>
                  <select 
                    value={editFormData.areaType} 
                    onChange={e => setEditFormData({ ...editFormData, areaType: e.target.value })} 
                    className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  >
                    <option value="Residential">Residential</option>
                    <option value="Commercial">Commercial / Markets</option>
                    <option value="Industrial">Industrial</option>
                    <option value="Public Park">Public Park / Campus Grounds</option>
                    <option value="Educational">Educational Institution</option>
                  </select>
                </div>

                {/* Coordinates & Leaflet Map Picker */}
                <div className="col-span-1 md:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    GPS Coordinates (Click on Map to update pin location)
                  </label>
                  <div className="h-[220px] w-full rounded-xl overflow-hidden border border-gray-300 mb-3 shadow-inner">
                    <MapContainer 
                      center={[parseFloat(editFormData.latitude) || 28.6139, parseFloat(editFormData.longitude) || 77.2090]} 
                      zoom={13} 
                      style={{ height: '100%', width: '100%' }}
                    >
                      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" />
                      <LocationMarker 
                        position={editFormData.latitude && editFormData.longitude ? { lat: Number(editFormData.latitude), lng: Number(editFormData.longitude) } : null} 
                        setPosition={(latlng: any) => setEditFormData({
                          ...editFormData, 
                          latitude: latlng.lat.toFixed(6), 
                          longitude: latlng.lng.toFixed(6)
                        })} 
                      />
                    </MapContainer>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-600 mb-1">Latitude</label>
                      <input 
                        type="number" 
                        step="any" 
                        required 
                        value={editFormData.latitude} 
                        onChange={e => setEditFormData({ ...editFormData, latitude: e.target.value })} 
                        className="w-full px-3 py-2 text-xs font-mono border rounded-lg focus:ring-2 focus:ring-blue-500" 
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-600 mb-1">Longitude</label>
                      <input 
                        type="number" 
                        step="any" 
                        required 
                        value={editFormData.longitude} 
                        onChange={e => setEditFormData({ ...editFormData, longitude: e.target.value })} 
                        className="w-full px-3 py-2 text-xs font-mono border rounded-lg focus:ring-2 focus:ring-blue-500" 
                      />
                    </div>
                  </div>
                </div>

                {/* Active in Network toggle */}
                <div className="col-span-1 md:col-span-2 pt-2">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={editFormData.isActive} 
                      onChange={e => setEditFormData({ ...editFormData, isActive: e.target.checked })} 
                      className="w-4 h-4 text-blue-600 rounded-md focus:ring-blue-500"
                    />
                    <span className="text-xs font-bold text-gray-800">
                      Active Smart Bin (Available on citizen search, suggestions, and live map)
                    </span>
                  </label>
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="pt-5 border-t border-gray-100 flex items-center justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => setEditingBin(null)} 
                  className="px-4 py-2 text-xs font-semibold border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={editSaving}
                  className="px-6 py-2.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm transition flex items-center gap-2 disabled:opacity-50"
                >
                  {editSaving ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Broadcasting Updates...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Save & Broadcast Live</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DELETE CONFIRMATION MODAL                                                 */}
      {/* ========================================================================= */}
      {deleteConfirmBin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <div className="p-3 bg-red-100 rounded-xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">Decommission Dustbin</h3>
                <p className="text-xs text-gray-500">Confirm removing this unit from live network.</p>
              </div>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed">
              Are you sure you want to remove <span className="font-bold text-gray-900">{deleteConfirmBin.name}</span> (<span className="font-mono">{deleteConfirmBin.deviceId}</span>)? 
              This will unregister the device key and update the map live across all citizen and responder portals.
            </p>

            <div className="pt-3 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirmBin(null)}
                className="px-4 py-2 text-xs font-semibold border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteBin}
                disabled={deleteLoading}
                className="px-5 py-2 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-sm transition flex items-center gap-2"
              >
                {deleteLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>Confirm Deletion</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ADD NEW DUSTBIN MODAL                                                     */}
      {/* ========================================================================= */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl my-8 overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center px-6 py-5 border-b border-gray-100 bg-gray-50/50">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-green-100 text-green-700 rounded-xl">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Deploy New Smart Dustbin</h2>
                  <p className="text-xs text-gray-500">Registers a new IoT hardware node to the smart waste network.</p>
                </div>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5"/>
              </button>
            </div>

            <form onSubmit={handleAddBin} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Bin Name</label>
                  <input type="text" required value={binData.name} onChange={e => setBinData({...binData, name: e.target.value})} className="w-full px-3.5 py-2.5 text-sm border rounded-xl focus:ring-2 focus:ring-green-500" placeholder="e.g. Bin #101" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Bin ID (Device ID)</label>
                  <input type="text" required value={binData.deviceId} onChange={e => setBinData({...binData, deviceId: e.target.value})} className="w-full px-3.5 py-2.5 text-sm font-mono border rounded-xl focus:ring-2 focus:ring-green-500" placeholder="e.g. ESP32_101" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Bin Type</label>
                  <select value={binData.wasteType} onChange={e => setBinData({...binData, wasteType: e.target.value})} className="w-full px-3.5 py-2.5 text-sm border rounded-xl focus:ring-2 focus:ring-green-500">
                    <option value="MIXED">Mixed Waste</option>
                    <option value="ORGANIC">Organic</option>
                    <option value="RECYCLABLE">Recyclable</option>
                    <option value="PLASTIC">Plastic</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Capacity (Liters)</label>
                  <input type="number" required value={binData.capacityLiters} onChange={e => setBinData({...binData, capacityLiters: Number(e.target.value)})} className="w-full px-3.5 py-2.5 text-sm border rounded-xl focus:ring-2 focus:ring-green-500" />
                </div>
                <div className="col-span-1 md:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 mb-1">Location Name</label>
                  <input type="text" required value={binData.locationName} onChange={e => setBinData({...binData, locationName: e.target.value})} className="w-full px-3.5 py-2.5 text-sm border rounded-xl focus:ring-2 focus:ring-green-500" placeholder="e.g. Central Park" />
                </div>
                <div className="col-span-1 md:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 mb-1">Address</label>
                  <input type="text" required value={binData.address} onChange={e => setBinData({...binData, address: e.target.value})} className="w-full px-3.5 py-2.5 text-sm border rounded-xl focus:ring-2 focus:ring-green-500" placeholder="e.g. Sector 62, Noida" />
                </div>
                <div className="col-span-1 md:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 mb-1">Select Location on Map (or type below)</label>
                  <div className="h-[220px] w-full rounded-xl overflow-hidden border border-gray-300 mb-2">
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
                      <label className="block text-[11px] font-semibold text-gray-600 mb-1">Latitude</label>
                      <input type="number" step="any" required value={binData.latitude} onChange={e => setBinData({...binData, latitude: e.target.value})} className="w-full px-3 py-2 text-xs font-mono border rounded-lg focus:ring-2 focus:ring-green-500" placeholder="28.6250" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-600 mb-1">Longitude</label>
                      <input type="number" step="any" required value={binData.longitude} onChange={e => setBinData({...binData, longitude: e.target.value})} className="w-full px-3 py-2 text-xs font-mono border rounded-lg focus:ring-2 focus:ring-green-500" placeholder="77.3800" />
                    </div>
                  </div>
                </div>
                <div className="col-span-1 md:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 mb-1">Area Type</label>
                  <select value={binData.areaType} onChange={e => setBinData({...binData, areaType: e.target.value})} className="w-full px-3.5 py-2.5 text-sm border rounded-xl focus:ring-2 focus:ring-green-500">
                    <option value="Residential">Residential</option>
                    <option value="Commercial">Commercial</option>
                    <option value="Industrial">Industrial</option>
                    <option value="Public Park">Public Park</option>
                  </select>
                </div>
              </div>
              <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 text-xs font-semibold border rounded-xl text-gray-700 hover:bg-gray-50">Cancel</button>
                <button type="submit" className="px-6 py-2.5 text-xs font-bold bg-green-600 hover:bg-green-700 text-white rounded-xl shadow-sm">Save & Deploy Bin</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
