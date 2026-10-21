import { useState, useEffect } from 'react';
import { PlusCircle, Target, Clock, Recycle, ChevronDown, MapPin, Truck, CheckCircle, X, Calendar, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { dustbinService } from '../../services/dustbinService';
import type { Dustbin, PickupRequest } from '../../types';
import { useLiveRefresh } from '../../services/liveEvents';
import { useAuth } from '../../context/AuthContext';

export default function UserDashboard() {
  const { user } = useAuth();
  const [wasteType, setWasteType] = useState('Plastic');
  const [quantity, setQuantity] = useState('');
  const [logs, setLogs] = useState<any[]>([]);
  const [myPickups, setMyPickups] = useState<PickupRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [dustbins, setDustbins] = useState<Dustbin[]>([]);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const goal = 20; // 20kg goal

  // Pickup Request Modal State
  const [showPickupModal, setShowPickupModal] = useState(false);
  const [pickupForm, setPickupForm] = useState({
    wasteType: 'Household Waste',
    quantity: '',
    address: user?.address || '',
    preferredDate: '',
    preferredTime: '',
    notes: ''
  });
  const [pickupSubmitting, setPickupSubmitting] = useState(false);
  const [pickupSuccess, setPickupSuccess] = useState('');
  const [pickupError, setPickupError] = useState('');

  useEffect(() => {
    if (user?.address && !pickupForm.address) {
      setPickupForm(prev => ({ ...prev, address: user.address || '' }));
    }
  }, [user]);

  const totalKg = logs.reduce((sum, log) => sum + (log.quantityKg || log.kg || 0), 0);
  const progressPercent = Math.min(100, Math.round((totalKg / goal) * 100));

  // Haversine formula
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; 
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; 
  };

  const fetchPickups = async () => {
    try {
      const res = await api.get('/pickups/my');
      setMyPickups((res.data || []).sort((a: PickupRequest, b: PickupRequest) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeB - timeA;
      }));
    } catch (err) {
      console.error('Error fetching user pickups:', err);
    }
  };

  const fetchLogs = async () => {
    try {
      const response = await api.get('/user/logs');
      setLogs(response.data);
    } catch (error) {
      console.error('Error fetching waste logs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    fetchPickups();
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => setUserLocation([position.coords.latitude, position.coords.longitude]),
        (error) => console.log('Location error:', error)
      );
    }

    dustbinService.getAllDustbins().then(data => {
      setDustbins(data);
    });
  }, []);

  // Live: waste logs and pickups
  useLiveRefresh(() => {
    fetchLogs();
    fetchPickups();
  }, ['WASTE_LOG', 'PICKUP', 'RECONNECTED']);

  useLiveRefresh((_type, payload: any) => {
    if (payload && payload.id) {
      setDustbins(prev => {
        const exists = prev.some(b => b.id === payload.id);
        return exists ? prev.map(b => (b.id === payload.id ? { ...b, ...payload } : b)) : [...prev, payload];
      });
    }
  }, ['DUSTBIN'], 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quantity || isNaN(parseFloat(quantity))) return;
    
    try {
      const kg = parseFloat(quantity);
      const response = await api.post('/user/logs', {
        wasteType,
        quantityKg: kg
      });
      
      setLogs([response.data, ...logs]);
      setQuantity('');
    } catch (error) {
      console.error('Error creating waste log:', error);
      alert('Failed to log waste. Please try again.');
    }
  };

  const handlePickupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPickupSubmitting(true);
    setPickupError('');
    setPickupSuccess('');

    const data = new FormData();
    data.append('wasteType', pickupForm.wasteType);
    data.append('quantity', pickupForm.quantity);
    data.append('address', pickupForm.address);
    if (pickupForm.preferredDate) data.append('preferredDate', pickupForm.preferredDate);
    if (pickupForm.preferredTime) data.append('preferredTime', pickupForm.preferredTime);
    data.append('notes', pickupForm.notes);

    try {
      const res = await api.post('/pickups', data);
      setShowPickupModal(false);
      setPickupForm({
        wasteType: 'Household Waste',
        quantity: '',
        address: user?.address || '',
        preferredDate: '',
        preferredTime: '',
        notes: ''
      });
      setPickupSuccess(`Pickup request ${res.data.pickupId} submitted successfully! It is now visible to Admin & Collection Teams.`);
      fetchPickups();
      setTimeout(() => setPickupSuccess(''), 7000);
    } catch (err: any) {
      const msg = err.response?.data?.error || err.response?.data?.message || err.message;
      setPickupError(`Failed to schedule pickup: ${msg}`);
    } finally {
      setPickupSubmitting(false);
    }
  };

  return (
    <div className="p-4 md:p-8 pb-20 w-full max-w-7xl mx-auto font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Toast Banners */}
      {pickupSuccess && (
        <div className="mb-6 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-4 rounded-2xl flex items-center gap-3 shadow-lg">
          <CheckCircle className="w-5 h-5 shrink-0 text-emerald-400" />
          <span className="text-sm font-bold">{pickupSuccess}</span>
        </div>
      )}

      {pickupError && (
        <div className="mb-6 bg-rose-500/10 border border-rose-500/30 text-rose-400 p-4 rounded-2xl flex items-center gap-3 shadow-lg">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
          <span className="text-sm font-bold">{pickupError}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-[0_0_8px_rgba(255,122,0,0.5)]">
            <path d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6L12 2Z" fill="#FF7A00"/>
          </svg>
          <div>
            <h1 className="text-[28px] font-extrabold text-[#FF7A00] tracking-wide">My Waste Dashboard</h1>
            <p className="text-xs text-[#A9A5BA] mt-0.5">Track your recycling logs, smart bins, and doorstep pickups.</p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          <button
            onClick={() => setShowPickupModal(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-[#FF7A00] to-[#FF4D24] text-white font-extrabold px-5 py-2.5 rounded-2xl shadow-[0_4px_20px_rgba(255,122,0,0.3)] hover:shadow-[0_6px_25px_rgba(255,122,0,0.5)] hover:scale-[1.02] active:scale-[0.98] transition-all text-xs tracking-wide"
          >
            <Truck className="w-4 h-4" />
            <span>Schedule Doorstep Pickup</span>
          </button>
          <Link
            to="/user/pickup"
            className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 text-white font-bold px-4 py-2.5 rounded-2xl border border-white/10 text-xs transition-all"
          >
            <span>View All ({myPickups.length})</span>
          </Link>
        </div>
      </div>

      {/* Modal: Schedule Doorstep Pickup */}
      {showPickupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-[#120822] text-white border border-white/10 rounded-[28px] w-full max-w-xl p-6 md:p-8 shadow-2xl relative my-8">
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-[#FF7A00]/20 rounded-xl text-[#FF7A00]">
                  <Truck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Schedule Doorstep Pickup</h3>
                  <p className="text-xs text-[#A9A5BA]">A waste collection vehicle will visit your location</p>
                </div>
              </div>
              <button
                onClick={() => setShowPickupModal(false)}
                className="text-white/40 hover:text-white p-1 rounded-lg hover:bg-white/5 transition"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handlePickupSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-white/80 mb-1.5">Waste Type *</label>
                <select
                  required
                  value={pickupForm.wasteType}
                  onChange={e => setPickupForm({ ...pickupForm, wasteType: e.target.value })}
                  className="w-full bg-[#0a0512] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#FF7A00]"
                >
                  <option value="Household Waste">Household Waste</option>
                  <option value="Bulk Waste">Bulk Waste (Furniture, Mattresses, etc.)</option>
                  <option value="E-Waste">E-Waste (Electronics, Batteries)</option>
                  <option value="Garden Waste">Garden Waste / Branches</option>
                  <option value="Other">Other Segregated Waste</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-white/80 mb-1.5">Quantity / Approx Weight</label>
                <input
                  type="text"
                  value={pickupForm.quantity}
                  onChange={e => setPickupForm({ ...pickupForm, quantity: e.target.value })}
                  placeholder="e.g. 5 bags, 25 kg, 2 cartons"
                  className="w-full bg-[#0a0512] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#FF7A00]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-white/80 mb-1.5">Pickup Address & Landmark *</label>
                <textarea
                  required
                  rows={2}
                  value={pickupForm.address}
                  onChange={e => setPickupForm({ ...pickupForm, address: e.target.value })}
                  placeholder="Complete flat/house no., building, street, landmark"
                  className="w-full bg-[#0a0512] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#FF7A00]"
                ></textarea>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-white/80 mb-1.5">Preferred Date</label>
                  <input
                    type="date"
                    value={pickupForm.preferredDate}
                    onChange={e => setPickupForm({ ...pickupForm, preferredDate: e.target.value })}
                    className="w-full bg-[#0a0512] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#FF7A00]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-white/80 mb-1.5">Preferred Time</label>
                  <select
                    value={pickupForm.preferredTime}
                    onChange={e => setPickupForm({ ...pickupForm, preferredTime: e.target.value })}
                    className="w-full bg-[#0a0512] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#FF7A00]"
                  >
                    <option value="">-- Flexible / Any --</option>
                    <option value="Morning (8AM - 12PM)">Morning (8AM - 12PM)</option>
                    <option value="Afternoon (12PM - 4PM)">Afternoon (12PM - 4PM)</option>
                    <option value="Evening (4PM - 8PM)">Evening (4PM - 8PM)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-white/80 mb-1.5">Notes for Collector (Optional)</label>
                <input
                  type="text"
                  value={pickupForm.notes}
                  onChange={e => setPickupForm({ ...pickupForm, notes: e.target.value })}
                  placeholder="Gate code, call upon arrival, etc."
                  className="w-full bg-[#0a0512] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#FF7A00]"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowPickupModal(false)}
                  className="w-1/3 bg-white/5 hover:bg-white/10 text-white font-bold py-3 rounded-xl transition text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pickupSubmitting}
                  className="w-2/3 bg-gradient-to-r from-[#FF7A00] to-[#FF4D24] text-white font-extrabold py-3 rounded-xl shadow-lg hover:brightness-110 transition disabled:opacity-50 text-sm"
                >
                  {pickupSubmitting ? 'Scheduling...' : 'Submit Pickup Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* 1. Quick Log Card */}
        <div className="bg-[#120822] rounded-[24px] p-8 border border-white/5 shadow-[0_10px_40px_rgba(0,0,0,0.3)] flex flex-col relative overflow-hidden">
           <div className="absolute top-0 right-0 w-32 h-32 bg-[#FF7A00]/5 rounded-full blur-[50px]"></div>
           <div className="flex justify-between items-start mb-6">
             <h2 className="text-[17px] font-extrabold text-[#FF7A00] flex items-center gap-2 tracking-wide">
               <PlusCircle className="w-5 h-5" /> Quick Log (Bin Recycling)
             </h2>
           </div>
           
           <form onSubmit={handleSubmit} className="flex-1 flex flex-col relative z-10">
             <div className="mb-4">
               <label className="block text-xs font-bold text-white mb-2 tracking-wide">Waste Type</label>
               <div className="relative">
                 <select 
                   value={wasteType}
                   onChange={(e) => setWasteType(e.target.value)}
                   className="w-full bg-[#0a0512] border border-white/10 rounded-2xl px-4 py-3 text-white font-bold appearance-none focus:outline-none focus:border-[#FF7A00]/50 transition-colors cursor-pointer text-sm"
                 >
                   <option value="Plastic">Plastic</option>
                   <option value="Organic">Organic</option>
                   <option value="Paper">Paper</option>
                   <option value="Glass">Glass</option>
                 </select>
                 <Recycle className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#22c55e]" />
                 <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50 pointer-events-none" />
                 <style>{`select { padding-left: 2.75rem !important; }`}</style>
               </div>
             </div>
             
             <div className="mb-6">
               <label className="block text-xs font-bold text-white mb-2 tracking-wide">Total Quantity (kg)</label>
               <input 
                 type="number" 
                 step="0.1"
                 placeholder="e.g. 2.5"
                 value={quantity}
                 onChange={(e) => setQuantity(e.target.value)}
                 className="w-full bg-[#0a0512] border border-white/10 rounded-2xl px-4 py-3 text-white/70 font-bold focus:outline-none focus:border-[#FF7A00]/50 transition-colors text-sm placeholder:text-white/20"
               />
             </div>
             
             <button 
               type="submit"
               className="w-full bg-gradient-to-r from-[#FF7A00] to-[#FF4D24] text-white font-extrabold py-3 rounded-2xl shadow-[0_5px_20px_rgba(255,122,0,0.3)] hover:shadow-[0_5px_25px_rgba(255,122,0,0.5)] transition-all hover:scale-[1.02] active:scale-[0.98] text-sm tracking-wide"
             >
               Log Bin Disposal
             </button>

             <div className="mt-4 pt-4 border-t border-white/5 text-center">
               <p className="text-[11px] text-[#A9A5BA] mb-2">Need waste picked up from your home?</p>
               <button
                 type="button"
                 onClick={() => setShowPickupModal(true)}
                 className="inline-flex items-center gap-1.5 text-xs text-[#FF7A00] hover:text-orange-400 font-extrabold transition"
               >
                 <Truck className="w-3.5 h-3.5" />
                 <span>Schedule Doorstep Pickup Instead →</span>
               </button>
             </div>
           </form>
        </div>

        {/* 2. Weekly Eco Goal Card */}
        <div className="bg-[#120822] rounded-[24px] p-8 border border-white/5 shadow-[0_10px_40px_rgba(0,0,0,0.3)] flex flex-col relative overflow-hidden">
           <h2 className="text-[17px] font-extrabold text-[#FF7A00] flex items-center gap-2 mb-4 tracking-wide relative z-10">
             <Target className="w-5 h-5" /> Weekly Eco Goal
           </h2>
           <p className="text-xs font-medium text-[#A9A5BA] mb-12 leading-relaxed relative z-10">
             Recycle {goal}kg of waste this week to earn the Eco Warrior badge.
           </p>
           
           <div className="mb-12 relative z-10">
             <div className="flex justify-between items-end mb-3">
               <span className="font-extrabold text-white text-xs tracking-wide">{totalKg.toFixed(1)}kg Achieved</span>
               <span className="font-extrabold text-[#FF7A00] text-xs">{progressPercent}%</span>
             </div>
             <div className="w-full bg-[#0a0512] rounded-full h-2.5 relative border border-white/5">
               <div 
                 className="h-2.5 rounded-full bg-gradient-to-r from-[#FF7A00] to-[#FF4D24] relative shadow-[0_0_10px_rgba(255,122,0,0.5)] transition-all duration-1000 ease-out" 
                 style={{ width: `${progressPercent}%` }}
               >
                 {/* Glowing dot handle at the end of progress */}
                 {progressPercent > 0 && (
                   <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-gradient-to-r from-[#FF7A00] to-[#FF4D24] rounded-full shadow-[0_0_12px_rgba(255,122,0,1)] border-[3px] border-[#120822] translate-x-1/2"></div>
                 )}
               </div>
             </div>
           </div>
           
           <div className="mt-auto border-t border-white/5 pt-6 relative z-10">
             <h3 className="text-[9px] font-extrabold text-[#A9A5BA] tracking-[0.2em] uppercase mb-5">14-Day Activity Trend</h3>
             <div className="h-16 w-full flex items-end gap-1.5 relative">
               {/* Mock trend chart bars */}
               {[0.5, 0.8, 1.2, 0.3, 0.7, 1.5, 2.0, 0, 0.4, 1.1, 1.6, 2.4, 0.5, 1.8].map((val, i) => (
                 <div key={i} className="flex-1 bg-white/5 hover:bg-[#FF7A00]/30 transition-colors rounded-t-[2px]" style={{ height: `${Math.max(8, (val/2.5)*100)}%` }}></div>
               ))}
               {/* Last active dot indicator overlaying a bar */}
               <div className="absolute right-[25%] bottom-[15px] w-2 h-2 bg-[#FF7A00] rounded-full shadow-[0_0_8px_rgba(255,122,0,1)]"></div>
             </div>
           </div>
        </div>

        {/* 3. Recent Logs Card */}
        <div className="bg-[#120822] rounded-[24px] p-8 border border-white/5 shadow-[0_10px_40px_rgba(0,0,0,0.3)] flex flex-col relative z-10">
           <h2 className="text-[17px] font-extrabold text-[#FF7A00] flex items-center gap-2 mb-6 tracking-wide">
             <Clock className="w-5 h-5" /> Recent Logs
           </h2>
           
           <div className="space-y-4 overflow-y-auto flex-1 scrollbar-hide pr-1">
             {loading && (
               <div className="text-center text-[#FF7A00] text-sm mt-10">Loading logs...</div>
             )}
             
             {!loading && logs.length === 0 && (
               <div className="text-center text-[#A9A5BA] text-sm mt-10">No recent logs.</div>
             )}
             
             {!loading && logs.map(log => {
               // Format date from backend (e.g. 2026-10-05T20:54:32Z)
               const dateObj = log.createdAt ? new Date(log.createdAt) : new Date();
               const day = dateObj.toLocaleDateString('en-GB', { day: 'numeric' });
               const month = dateObj.toLocaleDateString('en-GB', { month: 'short' }).toUpperCase();
               
               return (
                 <div key={log.id} className="bg-[#0a0512] border border-white/5 rounded-2xl p-4 flex items-center justify-between hover:border-white/10 transition-all duration-300 group">
                   <div className="flex items-center gap-4">
                     <div className="w-11 h-11 rounded-xl border border-white/5 flex flex-col items-center justify-center bg-white/5 group-hover:bg-[#FF7A00]/5 group-hover:border-[#FF7A00]/20 transition-colors">
                       <span className="text-[13px] font-extrabold text-white leading-none mb-0.5">{day}</span>
                       <span className="text-[9px] font-extrabold text-[#A9A5BA] uppercase leading-none">{month}</span>
                     </div>
                     <div>
                       <p className="text-[13px] font-extrabold text-white tracking-wide">{log.wasteType} Recycling</p>
                       <p className="text-[10px] font-bold text-[#FF7A00] mt-1.5 flex items-center gap-1.5">
                         <span className="w-1.5 h-1.5 rounded-full bg-[#FF7A00] shadow-[0_0_6px_rgba(255,122,0,1)]"></span>
                         Earned {log.pointsEarned} Eco Points
                       </p>
                     </div>
                   </div>
                   <div className="text-right">
                     <span className="text-lg font-extrabold text-white">{parseFloat(log.quantityKg).toFixed(1)}</span>
                     <span className="text-xs text-[#A9A5BA] ml-1 font-semibold">kg</span>
                   </div>
                 </div>
               );
             })}
           </div>
        </div>
      </div>

      {/* My Scheduled Doorstep Pickups Section */}
      <div className="mt-6 bg-[#120822] rounded-[24px] p-6 md:p-8 border border-white/5 shadow-[0_10px_40px_rgba(0,0,0,0.3)] relative z-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#FF7A00]/10 rounded-xl text-[#FF7A00]">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-[17px] font-extrabold text-[#FF7A00] tracking-wide">
                My Doorstep Pickups
              </h2>
              <p className="text-xs text-[#A9A5BA] mt-0.5">
                Track pickup requests scheduled for your home or business
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPickupModal(true)}
              className="flex items-center gap-1.5 bg-[#FF7A00] hover:bg-orange-600 text-white font-extrabold px-4 py-2 rounded-xl text-xs transition shadow-sm"
            >
              <Truck className="w-3.5 h-3.5" />
              <span>Schedule Pickup</span>
            </button>
            <Link
              to="/user/pickup"
              className="text-xs text-white/70 hover:text-white px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 transition font-bold"
            >
              View Full History →
            </Link>
          </div>
        </div>

        {myPickups.length === 0 ? (
          <div className="bg-[#0a0512] border border-white/5 rounded-2xl p-8 text-center flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-white/40 mb-3">
              <Truck className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-white mb-1">No doorstep pickups scheduled yet</p>
            <p className="text-xs text-[#A9A5BA] max-w-md mb-4">
              Have bulk furniture, electronic waste, or segregated recyclables? Schedule a doorstep collection.
            </p>
            <button
              onClick={() => setShowPickupModal(true)}
              className="text-xs bg-white/10 hover:bg-white/20 text-[#FF7A00] font-extrabold px-4 py-2 rounded-xl border border-[#FF7A00]/30 transition"
            >
              + Schedule Your First Pickup
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {myPickups.slice(0, 3).map((pickup) => {
              const getBadge = (status: string) => {
                switch (status) {
                  case 'REQUESTED': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
                  case 'ASSIGNED': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
                  case 'ON_THE_WAY': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
                  case 'COLLECTED': return 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30';
                  case 'COMPLETED': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
                  case 'CANCELLED': return 'bg-rose-500/20 text-rose-400 border-rose-500/30';
                  default: return 'bg-white/10 text-white/70 border-white/10';
                }
              };

              return (
                <div
                  key={pickup.id}
                  className="bg-[#0a0512] border border-white/5 rounded-2xl p-5 hover:border-[#FF7A00]/30 transition group flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="font-mono text-xs font-bold text-[#FF7A00] bg-[#FF7A00]/10 px-2.5 py-1 rounded-lg border border-[#FF7A00]/20">
                        {pickup.pickupId}
                      </span>
                      <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${getBadge(pickup.status)}`}>
                        {pickup.status}
                      </span>
                    </div>

                    <h3 className="text-sm font-extrabold text-white mb-1 group-hover:text-[#FF7A00] transition-colors">
                      {pickup.wasteType}
                    </h3>
                    {pickup.quantity && (
                      <p className="text-xs text-[#A9A5BA] font-medium mb-3">
                        Quantity: <span className="text-white/80 font-bold">{pickup.quantity}</span>
                      </p>
                    )}

                    <div className="space-y-1.5 text-xs text-[#A9A5BA] border-t border-white/5 pt-3">
                      <div className="flex items-start gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-white/40 shrink-0 mt-0.5" />
                        <span className="line-clamp-2 text-white/70">{pickup.address}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-white/40 shrink-0" />
                        <span className="text-white/70">
                          {pickup.preferredDate ? new Date(pickup.preferredDate).toLocaleDateString() : 'Flexible Date'}
                        </span>
                      </div>
                      {pickup.preferredTime && (
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-white/40 shrink-0" />
                          <span className="text-white/70">{pickup.preferredTime}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {pickup.notes && (
                    <p className="mt-3 text-[11px] text-white/50 italic bg-white/5 p-2 rounded-lg border border-white/5 line-clamp-1">
                      "{pickup.notes}"
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Nearby Bins Section */}
      <div className="mt-6 bg-[#120822] rounded-[24px] p-8 border border-white/5 shadow-[0_10px_40px_rgba(0,0,0,0.3)] relative z-10">
         <h2 className="text-[17px] font-extrabold text-[#FF7A00] flex items-center gap-2 mb-6 tracking-wide">
           <MapPin className="w-5 h-5" /> Nearby Bins
         </h2>
         
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
           {dustbins
             .map(bin => {
               const dist = userLocation 
                 ? calculateDistance(userLocation[0], userLocation[1], bin.latitude, bin.longitude) 
                 : null;
               return { ...bin, distance: dist };
             })
             .sort((a, b) => (a.distance || 9999) - (b.distance || 9999))
             .slice(0, 3)
             .map(bin => (
               <Link key={bin.id} to={`/user/dustbins/${bin.id}`} className="bg-[#0a0512] border border-white/5 rounded-2xl p-5 hover:border-[#FF7A00]/30 transition-all group block">
                 <div className="flex justify-between items-start mb-3">
                   <h3 className="text-sm font-extrabold text-white group-hover:text-[#FF7A00] transition-colors">{bin.name}</h3>
                   <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${bin.status === 'FULL' ? 'bg-red-500/20 text-red-500' : bin.status === 'OFFLINE' ? 'bg-gray-500/20 text-gray-500' : 'bg-green-500/20 text-green-500'}`}>
                     {bin.status}
                   </span>
                 </div>
                 <div className="flex items-center text-xs text-[#A9A5BA] mb-2 font-medium">
                   <MapPin className="w-3.5 h-3.5 mr-1" />
                   {bin.distance !== null ? `${bin.distance.toFixed(2)} km away` : 'Calculating distance...'}
                 </div>
                 <div className="w-full bg-[#120822] rounded-full h-1.5 mt-4">
                   <div 
                     className={`h-1.5 rounded-full ${bin.status === 'FULL' ? 'bg-red-500' : 'bg-[#FF7A00]'}`} 
                     style={{ width: `${Math.min(100, bin.fillLevel)}%` }}
                   ></div>
                 </div>
                 <div className="text-[10px] text-[#A9A5BA] font-semibold mt-1 text-right">{bin.fillLevel}% Full</div>
               </Link>
             ))}
         </div>
         {dustbins.length === 0 && (
           <div className="text-center text-[#A9A5BA] text-sm py-4">No bins found.</div>
         )}
      </div>
    </div>
  );
}
