import { useEffect, useState } from 'react';
import type { PickupRequest, User } from '../types';
import api, { getImageUrl } from '../services/api';
import { 
  AlertCircle, MapPin, Calendar, User as UserIcon, 
  Truck, CheckCircle, Search, Filter, RefreshCw
} from 'lucide-react';
import { useLiveRefresh } from '../services/liveEvents';

export default function AdminPickupRequests() {
  const [requests, setRequests] = useState<PickupRequest[]>([]);
  const [collectors, setCollectors] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<PickupRequest | null>(null);
  const [updateMessage, setUpdateMessage] = useState('');
  const [updateStatus, setUpdateStatus] = useState('');
  const [teamId, setTeamId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchCollectors = async () => {
    try {
      const res = await api.get('/pickups/collectors');
      setCollectors(res.data);
    } catch (err) {
      console.log('Error fetching collectors:', err);
    }
  };

  const fetchRequests = () => {
    api.get('/pickups')
      .then(res => {
        const sorted = (res.data || []).sort((a: PickupRequest, b: PickupRequest) => {
          const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return timeB - timeA;
        });
        setRequests(sorted);

        // Auto-select or preserve currently selected
        setSelectedRequest(prev => {
          if (!prev && sorted.length > 0) return sorted[0];
          if (prev) {
            const found = sorted.find((r: PickupRequest) => r.id === prev.id);
            return found || (sorted.length > 0 ? sorted[0] : null);
          }
          return null;
        });
      })
      .catch(err => console.log('Pickups API error:', err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchRequests();
    fetchCollectors();
  }, []);

  useLiveRefresh(fetchRequests, ['PICKUP', 'RECONNECTED']);

  useEffect(() => {
    if (selectedRequest) {
      setUpdateStatus(selectedRequest.status);
    }
  }, [selectedRequest]);

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest) return;
    setActionLoading(true);
    try {
      await api.post(`/pickups/${selectedRequest.id}/updates`, {
        status: updateStatus,
        message: updateMessage || `Status updated to ${updateStatus}`,
        isPublic: true
      });
      showFeedback('success', `Status updated to ${updateStatus}!`);
      setUpdateMessage('');
      fetchRequests();
    } catch (err: any) {
      showFeedback('error', err.response?.data?.error || 'Failed to update status');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest || !teamId) return;
    setActionLoading(true);
    try {
      await api.post(`/pickups/${selectedRequest.id}/assign`, {
        teamId: parseInt(teamId)
      });
      showFeedback('success', 'Collection team assigned successfully!');
      setTeamId('');
      fetchRequests();
    } catch (err: any) {
      showFeedback('error', err.response?.data?.error || 'Failed to assign team');
    } finally {
      setActionLoading(false);
    }
  };

  const filteredRequests = requests.filter(r => {
    const matchesFilter = statusFilter === 'ALL' || r.status === statusFilter;
    const query = searchQuery.toLowerCase().trim();
    if (!query) return matchesFilter;

    const matchesQuery = 
      r.pickupId?.toLowerCase().includes(query) ||
      r.wasteType?.toLowerCase().includes(query) ||
      r.address?.toLowerCase().includes(query) ||
      r.user?.name?.toLowerCase().includes(query) ||
      r.user?.email?.toLowerCase().includes(query);

    return matchesFilter && matchesQuery;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'REQUESTED': return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'ASSIGNED': return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'ON_THE_WAY': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'COLLECTED': return 'bg-indigo-100 text-indigo-800 border-indigo-300';
      case 'COMPLETED': return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'CANCELLED': return 'bg-rose-100 text-rose-800 border-rose-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const filterTabs = [
    { label: 'All', value: 'ALL', count: requests.length },
    { label: 'Requested', value: 'REQUESTED', count: requests.filter(r => r.status === 'REQUESTED').length },
    { label: 'Assigned', value: 'ASSIGNED', count: requests.filter(r => r.status === 'ASSIGNED').length },
    { label: 'On The Way', value: 'ON_THE_WAY', count: requests.filter(r => r.status === 'ON_THE_WAY').length },
    { label: 'Completed', value: 'COMPLETED', count: requests.filter(r => r.status === 'COMPLETED').length },
  ];

  if (loading) {
    return (
      <div className="p-12 flex flex-col items-center justify-center text-gray-500">
        <Truck className="w-10 h-10 animate-bounce text-orange-500 mb-3" />
        <p className="font-medium">Loading pickup requests...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Truck className="w-7 h-7 text-orange-500" />
            Doorstep Pickup Requests
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Manage citizen pickup requests, dispatch collectors, and track fulfillment in real-time.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchRequests()}
            className="flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold px-3.5 py-1.5 rounded-xl text-xs transition shadow-2xs"
            title="Refresh requests"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
          <div className="flex items-center gap-2 bg-orange-50 text-orange-800 px-3.5 py-1.5 rounded-full text-xs font-bold border border-orange-200">
            <span className="w-2 h-2 rounded-full bg-orange-500 animate-ping"></span>
            <span>{requests.filter(r => r.status === 'REQUESTED').length} Pending Requests</span>
          </div>
        </div>
      </div>

      {feedback && (
        <div className={`p-4 rounded-xl border flex items-center gap-3 transition-all ${
          feedback.type === 'success' 
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
            : 'bg-rose-50 text-rose-800 border-rose-200'
        }`}>
          {feedback.type === 'success' ? <CheckCircle className="w-5 h-5 text-emerald-600" /> : <AlertCircle className="w-5 h-5 text-rose-600" />}
          <span className="text-sm font-semibold">{feedback.message}</span>
        </div>
      )}

      {/* Main Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[calc(100vh-16rem)]">
        {/* Left Side: Filterable List */}
        <div className="lg:col-span-5 bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col h-[calc(100vh-16rem)]">
          {/* Search Bar */}
          <div className="relative mb-3">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by ID, waste type, address, user..."
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none transition"
            />
          </div>

          {/* Filter Chips */}
          <div className="flex gap-1.5 overflow-x-auto pb-2 mb-2 scrollbar-hide">
            {filterTabs.map(tab => (
              <button
                key={tab.value}
                onClick={() => setStatusFilter(tab.value)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 ${
                  statusFilter === tab.value
                    ? 'bg-orange-500 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  statusFilter === tab.value ? 'bg-orange-700 text-white' : 'bg-gray-200 text-gray-700'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Requests List */}
          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
            {filteredRequests.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Filter className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm font-medium">No pickup requests found</p>
                <p className="text-xs text-gray-400 mt-1">Try adjusting your filter or search query</p>
              </div>
            ) : (
              filteredRequests.map(r => {
                const isSelected = selectedRequest?.id === r.id;
                const formattedDate = r.createdAt 
                  ? new Date(r.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) 
                  : 'Recent';

                return (
                  <div
                    key={r.id}
                    onClick={() => setSelectedRequest(r)}
                    className={`p-3.5 rounded-xl cursor-pointer border transition-all ${
                      isSelected
                        ? 'bg-orange-50/70 border-orange-300 shadow-sm ring-1 ring-orange-200'
                        : 'bg-gray-50/50 border-gray-100 hover:bg-gray-50 hover:border-gray-200'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-xs font-mono font-bold text-gray-700 bg-white px-2 py-0.5 rounded border border-gray-200">
                        {r.pickupId}
                      </span>
                      <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold border ${getStatusColor(r.status)}`}>
                        {r.status}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-gray-900 text-sm">{r.wasteType}</h4>
                      {r.quantity && (
                        <span className="text-xs text-gray-500 font-semibold bg-white px-2 py-0.5 rounded border">
                          {r.quantity}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-gray-500 truncate mt-1 flex items-center gap-1">
                      <MapPin className="w-3 h-3 shrink-0 text-gray-400" />
                      <span>{r.address}</span>
                    </p>

                    <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500 font-medium">
                      <span className="flex items-center gap-1">
                        <UserIcon className="w-3 h-3 text-gray-400" />
                        {r.user?.name || r.user?.email || 'Citizen'}
                      </span>
                      <span>{formattedDate}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Selected Request Details & Action Panel */}
        <div className="lg:col-span-7 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 overflow-y-auto h-[calc(100vh-16rem)]">
          {selectedRequest ? (
            <div className="space-y-6">
              {/* Top Banner */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-gray-100">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-mono font-extrabold text-orange-600 bg-orange-50 px-2.5 py-1 rounded-lg border border-orange-200">
                      {selectedRequest.pickupId}
                    </span>
                    <span className={`text-xs px-3 py-1 rounded-full font-bold border ${getStatusColor(selectedRequest.status)}`}>
                      {selectedRequest.status}
                    </span>
                  </div>
                  <h3 className="text-2xl font-extrabold text-gray-900">
                    {selectedRequest.wasteType}
                  </h3>
                </div>

                <div className="text-right text-xs text-gray-500">
                  <p>Submitted</p>
                  <p className="font-semibold text-gray-700">
                    {selectedRequest.createdAt ? new Date(selectedRequest.createdAt).toLocaleString() : 'N/A'}
                  </p>
                </div>
              </div>

              {/* Citizen Requester Card */}
              <div className="bg-gradient-to-r from-gray-50 to-orange-50/30 p-4 rounded-xl border border-gray-200">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <UserIcon className="w-4 h-4 text-orange-500" />
                  Citizen / Requester Info
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                  <div>
                    <span className="text-xs text-gray-400 block">Name</span>
                    <span className="font-bold text-gray-800">{selectedRequest.user?.name || 'Citizen'}</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-400 block">Email</span>
                    <span className="font-medium text-gray-700 truncate block">{selectedRequest.user?.email || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-400 block">Phone</span>
                    <span className="font-medium text-gray-700">{selectedRequest.user?.phone || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* Address and Schedule Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 flex flex-col gap-2">
                  <div className="flex items-start gap-2.5">
                    <MapPin className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Pickup Address</p>
                      <p className="text-sm text-gray-800 font-semibold mt-1">{selectedRequest.address}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 flex flex-col gap-2">
                  <div className="flex items-start gap-2.5">
                    <Calendar className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Preferred Schedule</p>
                      <p className="text-sm text-gray-800 font-semibold mt-1">
                        Date: {selectedRequest.preferredDate ? new Date(selectedRequest.preferredDate).toLocaleDateString() : 'Flexible'}
                      </p>
                      <p className="text-xs text-gray-600 font-medium">
                        Time: {selectedRequest.preferredTime || 'Any Time'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quantity and Notes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {selectedRequest.quantity && (
                  <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-200">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Quantity / Weight</span>
                    <span className="text-sm font-bold text-gray-800 mt-0.5 block">{selectedRequest.quantity}</span>
                  </div>
                )}
                {selectedRequest.notes && (
                  <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-200 col-span-2">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-1">Citizen Notes</span>
                    <p className="text-sm text-gray-700 italic bg-white p-2.5 rounded-lg border border-gray-200">
                      "{selectedRequest.notes}"
                    </p>
                  </div>
                )}
              </div>

              {/* Image Preview */}
              {selectedRequest.imageUrl && (
                <div className="bg-gray-50 p-3 rounded-xl border border-gray-200">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Uploaded Photo</p>
                  <img
                    src={getImageUrl(selectedRequest.imageUrl)}
                    alt="Waste pickup photo"
                    className="w-full max-h-60 object-contain rounded-lg border bg-white"
                  />
                </div>
              )}

              {/* Action Panels: Assignment & Status Update */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                {/* 1. Assign Collector Team */}
                <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4">
                  <div>
                    <h4 className="font-bold text-gray-900 flex items-center gap-2">
                      <Truck className="w-4 h-4 text-purple-600" />
                      Assign Collection Team
                    </h4>
                    {selectedRequest.assignedTeam ? (
                      <p className="text-xs text-emerald-700 font-semibold mt-1 bg-emerald-50 p-2 rounded-lg border border-emerald-200">
                        Currently Assigned to: <strong>{selectedRequest.assignedTeam.name}</strong> ({selectedRequest.assignedTeam.email})
                      </p>
                    ) : (
                      <p className="text-xs text-gray-500 mt-1">Select an active collector/responder to dispatch.</p>
                    )}
                  </div>

                  <form onSubmit={handleAssign} className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Select Collector</label>
                      <select
                        required
                        value={teamId}
                        onChange={(e) => setTeamId(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                      >
                        <option value="">-- Choose Collector / Driver --</option>
                        {collectors.map(c => (
                          <option key={c.id} value={c.id}>
                            {c.name} ({c.email}) {c.phone ? `- ${c.phone}` : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      type="submit"
                      disabled={actionLoading || !teamId}
                      className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2.5 px-4 rounded-xl text-sm transition shadow-sm disabled:opacity-50"
                    >
                      {actionLoading ? 'Assigning...' : 'Dispatch Collector'}
                    </button>
                  </form>
                </div>

                {/* 2. Update Status */}
                <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4">
                  <div>
                    <h4 className="font-bold text-gray-900 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-blue-600" />
                      Update Request Status
                    </h4>
                    <p className="text-xs text-gray-500 mt-1">Change fulfillment state & notify citizen.</p>
                  </div>

                  <form onSubmit={handleUpdate} className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Status</label>
                      <select
                        value={updateStatus}
                        onChange={(e) => setUpdateStatus(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      >
                        <option value="REQUESTED">REQUESTED</option>
                        <option value="ASSIGNED">ASSIGNED</option>
                        <option value="ON_THE_WAY">ON_THE_WAY</option>
                        <option value="COLLECTED">COLLECTED</option>
                        <option value="COMPLETED">COMPLETED</option>
                        <option value="CANCELLED">CANCELLED</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Status Note (Optional)</label>
                      <input
                        type="text"
                        value={updateMessage}
                        onChange={(e) => setUpdateMessage(e.target.value)}
                        placeholder="e.g. Collector is heading to your location"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={actionLoading}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-xl text-sm transition shadow-sm disabled:opacity-50"
                    >
                      {actionLoading ? 'Updating...' : 'Update Status'}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 py-16">
              <Truck className="w-16 h-16 mb-3 opacity-20 text-orange-500" />
              <p className="text-base font-bold text-gray-600">Select a pickup request</p>
              <p className="text-xs text-gray-400 mt-1">Click any request from the list to view full details and manage fulfillment</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
