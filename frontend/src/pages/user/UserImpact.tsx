import { useState, useEffect } from 'react';
import { TrendingUp, Leaf, Recycle, MapPin, CheckCircle, Flame } from 'lucide-react';
import api from '../../services/api';
import { useLiveRefresh } from '../../services/liveEvents';

export default function UserImpact() {
  const [impactData, setImpactData] = useState<any>(null);
  const [period, setPeriod] = useState<'monthly' | 'yearly' | 'lifetime'>('monthly');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchImpact();
  }, [period]);

  const fetchImpact = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const response = await api.get(`/impact/user?period=${period}`);
      setImpactData(response.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Live: recompute impact whenever new activity is persisted
  useLiveRefresh(() => fetchImpact(true), [
    'NOTIFICATION', 'COMPLAINT', 'PICKUP', 'REWARD', 'DETECTION', 'WASTE_LOG', 'RECONNECTED',
  ], 500);

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12 p-4 md:p-8 font-['Plus_Jakarta_Sans',sans-serif]">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="text-[32px] font-extrabold text-[#FF7A00] tracking-wide flex items-center gap-3">
            <TrendingUp className="w-10 h-10" />
            Environmental Impact
          </h1>
          <p className="text-[#A9A5BA] mt-2 text-sm font-medium">Your real-world contribution to a cleaner planet</p>
        </div>
        
        <div className="flex bg-[#120822] p-1.5 rounded-2xl border border-white/5 shadow-[0_5px_20px_rgba(0,0,0,0.3)]">
          {['monthly', 'yearly', 'lifetime'].map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p as any)}
              className={`px-5 py-2 rounded-xl text-sm font-bold capitalize transition-all duration-300 ${
                period === p 
                  ? 'bg-gradient-to-r from-[#FF7A00] to-[#FF4D24] text-white shadow-[0_0_15px_rgba(255,122,0,0.3)]' 
                  : 'text-[#A9A5BA] hover:text-white'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20">
          <div className="w-12 h-12 rounded-full border-4 border-[#FF7A00] border-t-transparent animate-spin mx-auto mb-4"></div>
          <p className="text-[#A9A5BA] font-bold">Calculating impact...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Main CO2 Metric */}
          <div className="bg-gradient-to-br from-[#120822] via-[#1A0B2E] to-[#120822] rounded-[32px] border border-[#FF7A00]/20 p-8 md:p-12 text-center relative overflow-hidden shadow-[0_15px_50px_rgba(255,122,0,0.15)]">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#FF7A00]/10 rounded-full blur-[100px] pointer-events-none"></div>
            
            <Leaf className="w-16 h-16 text-[#FF7A00] mx-auto mb-6 relative z-10" />
            <p className="text-[#A9A5BA] font-bold tracking-widest uppercase text-sm mb-2 relative z-10">Estimated CO₂ Reduced</p>
            <h2 className="text-6xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-[#FF7A00] to-white mb-4 relative z-10 animate-pulse">
              {impactData?.co2SavedEstimateKg.toFixed(1)} <span className="text-4xl text-[#A9A5BA]">kg</span>
            </h2>
            <p className="text-[#A9A5BA] text-sm max-w-lg mx-auto relative z-10 font-medium leading-relaxed">
              Based on EPA standards, every kg of waste you recycle or properly dispose of prevents approximately <span className="text-white font-bold">{impactData?.co2ConversionFactorUsed} kg</span> of CO₂ emissions.
            </p>
          </div>

          {/* Activity Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-[#120822] p-6 rounded-[24px] border border-white/5 shadow-lg relative overflow-hidden group hover:border-[#FF7A00]/50 transition-colors">
              <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center mb-4 text-blue-400 group-hover:scale-110 transition-transform">
                <Recycle className="w-6 h-6" />
              </div>
              <h3 className="text-3xl font-black text-white mb-1">{impactData?.wasteRecycledKg.toFixed(1)} <span className="text-sm text-[#A9A5BA]">kg</span></h3>
              <p className="text-[#A9A5BA] font-bold text-sm">Directly Recycled</p>
              <p className="text-xs text-[#A9A5BA]/60 mt-2">{impactData?.recyclingActivitiesCount} logs submitted</p>
            </div>

            <div className="bg-[#120822] p-6 rounded-[24px] border border-white/5 shadow-lg relative overflow-hidden group hover:border-[#FF7A00]/50 transition-colors">
              <div className="w-12 h-12 bg-purple-500/10 rounded-2xl flex items-center justify-center mb-4 text-purple-400 group-hover:scale-110 transition-transform">
                <MapPin className="w-6 h-6" />
              </div>
              <h3 className="text-3xl font-black text-white mb-1">{impactData?.wasteCollectedPickupKg.toFixed(1)} <span className="text-sm text-[#A9A5BA]">kg</span></h3>
              <p className="text-[#A9A5BA] font-bold text-sm">Picked Up</p>
              <p className="text-xs text-[#A9A5BA]/60 mt-2">{impactData?.pickupActivitiesCount} successful pickups</p>
            </div>

            <div className="bg-[#120822] p-6 rounded-[24px] border border-white/5 shadow-lg relative overflow-hidden group hover:border-[#FF7A00]/50 transition-colors">
              <div className="w-12 h-12 bg-red-500/10 rounded-2xl flex items-center justify-center mb-4 text-red-400 group-hover:scale-110 transition-transform">
                <Flame className="w-6 h-6" />
              </div>
              <h3 className="text-3xl font-black text-white mb-1">{impactData?.reportsSubmitted}</h3>
              <p className="text-[#A9A5BA] font-bold text-sm">Issues Reported</p>
              <p className="text-xs text-[#A9A5BA]/60 mt-2">Active community member</p>
            </div>

            <div className="bg-[#120822] p-6 rounded-[24px] border border-white/5 shadow-lg relative overflow-hidden group hover:border-[#FF7A00]/50 transition-colors">
              <div className="w-12 h-12 bg-green-500/10 rounded-2xl flex items-center justify-center mb-4 text-green-400 group-hover:scale-110 transition-transform">
                <CheckCircle className="w-6 h-6" />
              </div>
              <h3 className="text-3xl font-black text-white mb-1">{impactData?.reportsResolved}</h3>
              <p className="text-[#A9A5BA] font-bold text-sm">Issues Resolved</p>
              <p className="text-xs text-[#A9A5BA]/60 mt-2">Verified city cleanups</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
