import { useEffect, useState } from 'react';
import type { PickupRequest } from '../../types';
import { Truck, Plus, Clock, MapPin, Calendar, Image as ImageIcon, CheckCircle, AlertCircle, RefreshCw, Navigation } from 'lucide-react';
import api, { getImageUrl } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useLiveRefresh } from '../../services/liveEvents';
import LivePickupTrackerModal from '../../components/LivePickupTrackerModal';

export default function UserPickupRequests() {
  const [requests, setRequests] = useState<PickupRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [trackingPickupId, setTrackingPickupId] = useState<number | string | null>(null);
  const { user } = useAuth();
  
  const [formData, setFormData] = useState({
    wasteType: '',
    quantity: '',
    address: user?.address || '',
    preferredDate: '',
    preferredTime: '',
    notes: ''
  });
  const [image, setImage] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Sync address if user loads later
  useEffect(() => {
    if (user?.address && !formData.address) {
      setFormData(prev => ({ ...prev, address: user.address || '' }));
    }
  }, [user]);

  const fetchRequests = () => {
    setLoading(true);
    api.get('/pickups/my')
      .then(res => setRequests((res.data || []).sort((a: PickupRequest, b: PickupRequest) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeB - timeA;
      })))
      .catch(err => console.log('Pickups API error:', err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (user?.id) fetchRequests();
  }, [user]);

  useLiveRefresh(fetchRequests, ['PICKUP', 'RECONNECTED']);

  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setSubmitting(true);
      setErrorMsg('');
      setSuccessMsg('');

      const data = new FormData();
      data.append('wasteType', formData.wasteType);
      data.append('quantity', formData.quantity);
      data.append('address', formData.address);
      if (formData.preferredDate) data.append('preferredDate', formData.preferredDate);
      if (formData.preferredTime) data.append('preferredTime', formData.preferredTime);
      data.append('notes', formData.notes);
      if (image) data.append('image', image);

      try {
          const res = await api.post('/pickups', data);
          setShowForm(false);
          setFormData({
            wasteType: '',
            quantity: '',
            address: user?.address || '',
            preferredDate: '',
            preferredTime: '',
            notes: ''
          });
          setImage(null);
          setSuccessMsg(`Pickup request ${res.data.pickupId} submitted successfully! It is now visible to Admin & Collection Teams.`);
          fetchRequests();
          setTimeout(() => setSuccessMsg(''), 7000);
      } catch (err: any) {
          const backendErr = err.response?.data?.error || err.response?.data?.message || err.message;
          setErrorMsg(`Failed to submit request: ${backendErr}`);
      } finally {
          setSubmitting(false);
      }
  };

  if (loading) return <div className="flex justify-center items-center h-48">Loading pickup requests...</div>;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'REQUESTED': return <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-xs font-bold border border-gray-200">Requested</span>;
      case 'ASSIGNED': return <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs font-bold border border-purple-200">Assigned</span>;
      case 'ON_THE_WAY': return <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold border border-blue-200">On The Way</span>;
      case 'COLLECTED': return <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold border border-indigo-200">Collected</span>;
      case 'COMPLETED': return <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold border border-green-200">Completed</span>;
      case 'CANCELLED': return <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold border border-red-200">Cancelled</span>;
      default: return <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-xs font-bold">{status}</span>;
    }
  };

  if (showForm) {
      return (
        <div className="max-w-2xl mx-auto bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Schedule Pickup</h2>
            <p className="text-gray-500 mb-8">Request a specialized vehicle to pick up large or segregated waste from your location.</p>
            
            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Waste Type *</label>
                    <select required value={formData.wasteType} onChange={e => setFormData({...formData, wasteType: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 transition-all">
                        <option value="">-- Select --</option>
                        <option value="Household Waste">Household Waste</option>
                        <option value="Bulk Waste">Bulk Waste (Furniture, etc.)</option>
                        <option value="E-Waste">E-Waste</option>
                        <option value="Garden Waste">Garden Waste</option>
                        <option value="Other">Other</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Approximate Quantity (kg or bags)</label>
                    <input type="text" value={formData.quantity} onChange={e => setFormData({...formData, quantity: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500" placeholder="e.g. 5 bags, or 50kg" />
                </div>
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Pickup Address *</label>
                    <textarea required rows={2} value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500" placeholder="Complete address with landmark"></textarea>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Preferred Date</label>
                        <input type="date" value={formData.preferredDate} onChange={e => setFormData({...formData, preferredDate: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500" />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Preferred Time</label>
                        <select value={formData.preferredTime} onChange={e => setFormData({...formData, preferredTime: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500">
                            <option value="">-- Any --</option>
                            <option value="Morning (8AM - 12PM)">Morning (8AM - 12PM)</option>
                            <option value="Afternoon (12PM - 4PM)">Afternoon (12PM - 4PM)</option>
                            <option value="Evening (4PM - 8PM)">Evening (4PM - 8PM)</option>
                        </select>
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Additional Notes</label>
                    <textarea rows={2} value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500" placeholder="Gate code, call before arriving, etc."></textarea>
                </div>
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Photo (Optional)</label>
                    <input type="file" accept="image/*" onChange={e => setImage(e.target.files ? e.target.files[0] : null)} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100" />
                </div>
                <div className="flex gap-4">
                    <button type="button" onClick={() => setShowForm(false)} className="w-1/3 bg-gray-100 text-gray-800 font-bold py-3 px-4 rounded-xl hover:bg-gray-200 transition">Cancel</button>
                    <button type="submit" disabled={submitting} className="w-2/3 bg-[#FF7A00] text-white font-bold py-3 px-4 rounded-xl shadow-md hover:bg-orange-600 transition disabled:opacity-70">
                        {submitting ? 'Submitting...' : 'Submit Request'}
                    </button>
                </div>
            </form>
        </div>
      )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {successMsg && (
        <div className="bg-emerald-50 text-emerald-800 p-4 rounded-2xl border border-emerald-200 flex items-center gap-3 shadow-sm">
          <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="text-sm font-bold">{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="bg-rose-50 text-rose-800 p-4 rounded-2xl border border-rose-200 flex items-center gap-3 shadow-sm">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span className="text-sm font-bold">{errorMsg}</span>
        </div>
      )}

      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pickup Requests</h1>
          <p className="text-gray-500">Track and schedule large waste pickups.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchRequests()}
            className="flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3.5 py-2 rounded-xl text-sm font-semibold transition"
            title="Refresh requests"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
          <button onClick={() => setShowForm(true)} className="flex items-center bg-[#FF7A00] text-white px-4 py-2 rounded-xl hover:bg-orange-600 transition font-medium shadow-sm">
            <Plus className="w-5 h-5 mr-1" /> Request Pickup
          </button>
        </div>
      </div>

      {requests.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center text-center">
          <div className="bg-orange-50 p-4 rounded-full mb-4">
            <Truck className="w-12 h-12 text-[#FF7A00]" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">No active pickup requests</h2>
          <p className="text-gray-500 max-w-sm mb-6">Schedule a pickup for bulk waste, e-waste, or large quantities of household garbage.</p>
          <button onClick={() => setShowForm(true)} className="bg-[#FF7A00] text-white px-6 py-2 rounded-xl hover:bg-orange-600 font-bold transition shadow-sm">Schedule Now</button>
        </div>
      ) : (
        <div className="grid gap-4">
          {requests.map(r => (
            <div key={r.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col sm:flex-row justify-between gap-6 hover:shadow-md transition">
              <div className="flex gap-4 w-full">
                {r.imageUrl ? (
                  <img src={getImageUrl(r.imageUrl)} alt="Pickup" className="w-24 h-24 object-cover rounded-xl shadow-sm border border-gray-200 hidden sm:block" />
                ) : (
                    <div className="w-24 h-24 bg-gray-50 rounded-xl border border-gray-100 hidden sm:flex items-center justify-center text-gray-400">
                        <ImageIcon className="w-8 h-8 opacity-50" />
                    </div>
                )}
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
                    <div className="flex items-center space-x-3">
                      <span className="font-mono text-sm text-gray-800 font-bold bg-gray-100 px-2 py-0.5 rounded">{r.pickupId}</span>
                      {getStatusBadge(r.status)}
                    </div>

                    {['ASSIGNED', 'ACCEPTED', 'ON_THE_WAY', 'ARRIVED'].includes(r.status) && (
                      <button
                        id={`btn-track-pickup-${r.id}`}
                        data-testid="track-collector-btn"
                        onClick={() => setTrackingPickupId(r.id)}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl text-xs font-bold shadow-md shadow-orange-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                      >
                        <Navigation className="w-3.5 h-3.5 animate-pulse" />
                        <span>Track Live Collector</span>
                      </button>
                    )}
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    {r.wasteType} 
                    {r.quantity && <span className="text-sm font-medium text-gray-500 bg-gray-100 px-2 rounded-full">Qty: {r.quantity}</span>}
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-y-2 mt-3 text-sm text-gray-600">
                    <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                        <span>{r.address}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
                        <span>{r.preferredDate ? new Date(r.preferredDate).toLocaleDateString() : 'Any Date'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-400 shrink-0" />
                        <span>{r.preferredTime || 'Any Time'}</span>
                    </div>
                  </div>
                  
                  {r.notes && (
                      <p className="text-sm text-gray-500 mt-3 italic bg-gray-50 p-2 rounded-lg border border-gray-100">"{r.notes}"</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {trackingPickupId && (
        <LivePickupTrackerModal
          pickupId={trackingPickupId}
          onClose={() => setTrackingPickupId(null)}
        />
      )}
    </div>
  );
}
