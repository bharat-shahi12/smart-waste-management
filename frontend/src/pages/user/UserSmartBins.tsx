import { useEffect, useState } from 'react';
import type { Dustbin } from '../../types';
import { dustbinService } from '../../services/dustbinService';
import { useLiveRefresh } from '../../services/liveEvents';
import { Trash2, Search, Filter, Battery, Thermometer, Droplets, Wind, MapPin, RefreshCw, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function UserSmartBins() {
  const [bins, setBins] = useState<Dustbin[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [wasteFilter, setWasteFilter] = useState('ALL');

  const fetchBins = async () => {
    try {
      setLoading(true);
      const data = await dustbinService.getAllDustbins();
      setBins(data);
    } catch (err) {
      console.error('Failed to load bins', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBins();
  }, []);

  useLiveRefresh(() => {
    dustbinService.getAllDustbins().then(setBins).catch(console.error);
  }, ['DUSTBIN', 'BIN', 'RECONNECTED']);

  const filtered = bins.filter(b => {
    const matchesSearch = !search || 
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      b.deviceId.toLowerCase().includes(search.toLowerCase()) ||
      (b.locationName && b.locationName.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus = statusFilter === 'ALL' || b.status === statusFilter;
    const matchesWaste = wasteFilter === 'ALL' || b.wasteType === wasteFilter;

    return matchesSearch && matchesStatus && matchesWaste;
  });

  const getProgressColor = (fill: number, status: string) => {
    if (status === 'OFFLINE') return 'bg-gray-400';
    if (fill >= 80) return 'bg-red-500';
    if (fill >= 60) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  const getStatusBadge = (status: string) => {
    if (status === 'FULL') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700">
          <AlertTriangle className="w-3 h-3" /> Full
        </span>
      );
    }
    if (status === 'OFFLINE') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-700">
          Offline
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
        <CheckCircle2 className="w-3 h-3" /> Available
      </span>
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
            <Trash2 className="w-8 h-8 text-emerald-600" />
            Smart Dustbins
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Real-time IoT fill levels, environmental metrics, and collection status.
          </p>
        </div>
        <button
          onClick={fetchBins}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 shadow-sm transition"
        >
          <RefreshCw className="w-4 h-4 text-gray-500" />
          Refresh
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search bins by name, device ID, or location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
          />
        </div>
        <div className="flex gap-3">
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-600">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent font-medium text-gray-700 focus:outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="AVAILABLE">Available</option>
              <option value="FULL">Full</option>
              <option value="OFFLINE">Offline</option>
            </select>
          </div>
          <select
            value={wasteFilter}
            onChange={(e) => setWasteFilter(e.target.value)}
            className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm font-medium text-gray-700 focus:outline-none"
          >
            <option value="ALL">All Waste Types</option>
            <option value="DRY">Dry</option>
            <option value="WET">Wet</option>
            <option value="MIXED">Mixed</option>
          </select>
        </div>
      </div>

      {/* Bins Grid */}
      {loading ? (
        <div className="flex items-center justify-center p-16">
          <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-gray-100 shadow-sm">
          <Trash2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-gray-800">No smart bins found</h3>
          <p className="text-gray-500 text-sm mt-1">Try clearing filters or search terms.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((bin) => {
            const fill = bin.fillLevel ?? 0;
            return (
              <div
                key={bin.id}
                className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">{bin.name}</h3>
                      <p className="text-xs text-gray-400 font-mono mt-0.5">{bin.deviceId}</p>
                    </div>
                    {getStatusBadge(bin.status)}
                  </div>

                  {bin.locationName && (
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-4">
                      <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span className="truncate">{bin.locationName}</span>
                    </div>
                  )}

                  {/* Fill Level Gauge */}
                  <div className="space-y-1.5 mb-5">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-gray-600">Fill Level</span>
                      <span className="text-gray-900 font-bold">{fill}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${getProgressColor(fill, bin.status)}`}
                        style={{ width: `${Math.min(100, Math.max(0, fill))}%` }}
                      />
                    </div>
                  </div>

                  {/* Telemetry Metrics */}
                  <div className="grid grid-cols-2 gap-2 text-xs bg-gray-50 p-3 rounded-xl border border-gray-100 mb-4">
                    <div className="flex items-center gap-1.5 text-gray-600">
                      <Thermometer className="w-3.5 h-3.5 text-amber-500" />
                      <span>{bin.temperature != null ? `${bin.temperature}°C` : '--'}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-gray-600">
                      <Droplets className="w-3.5 h-3.5 text-blue-500" />
                      <span>{bin.humidity != null ? `${bin.humidity}%` : '--'}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-gray-600">
                      <Wind className="w-3.5 h-3.5 text-indigo-500" />
                      <span>{bin.airQuality != null ? `${Math.round(bin.airQuality)}` : '--'} Gas</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-gray-600">
                      <Battery className="w-3.5 h-3.5 text-emerald-500" />
                      <span>{bin.batteryLevel != null ? `${bin.batteryLevel}%` : '--'}</span>
                    </div>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs">
                  <span className="text-gray-400">
                    Type: <strong className="text-gray-700">{bin.wasteType || 'MIXED'}</strong>
                  </span>
                  <div className="flex gap-2">
                    <Link
                      to={`/user/map`}
                      className="px-3 py-1.5 bg-emerald-50 text-emerald-700 font-semibold rounded-lg hover:bg-emerald-100 transition"
                    >
                      Map
                    </Link>
                    <Link
                      to={`/user/report`}
                      className="px-3 py-1.5 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition"
                    >
                      Report
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
