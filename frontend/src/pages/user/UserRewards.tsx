import { useState, useEffect } from 'react';
import { Gift, Star, Trophy, Target, Award, Clock } from 'lucide-react';
import api from '../../services/api';
import { useLiveRefresh } from '../../services/liveEvents';

export default function UserRewards() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await api.get('/rewards/profile');
      setProfile(response.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useLiveRefresh(fetchProfile, ['REWARD', 'RECONNECTED']);

  if (loading) return <div className="p-8 text-center text-[#A9A5BA]">Loading rewards...</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12 p-4 md:p-8 font-['Plus_Jakarta_Sans',sans-serif]">
      <div>
        <h1 className="text-[28px] font-extrabold text-[#FF7A00] tracking-wide flex items-center gap-3">
          <Gift className="w-8 h-8" />
          Rewards & Achievements
        </h1>
        <p className="text-[#A9A5BA] mt-1 text-sm font-medium">Earn points for sustainable actions and unlock achievements</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Points & Level Card */}
        <div className="md:col-span-2 bg-[#120822] rounded-[24px] border border-white/5 p-8 relative overflow-hidden shadow-[0_10px_40px_rgba(0,0,0,0.3)]">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#FF7A00]/10 rounded-full blur-[80px] -mr-32 -mt-32"></div>
          
          <div className="flex flex-col md:flex-row justify-between items-center gap-8 relative z-10">
            <div className="text-center md:text-left">
              <p className="text-[#A9A5BA] font-bold text-sm uppercase tracking-wider mb-2">Total Eco Points</p>
              <h2 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[#FF7A00] to-[#FFB020] flex items-center gap-3 justify-center md:justify-start">
                {profile?.points || 0} <Star className="w-8 h-8 text-[#FFB020]" fill="currentColor" />
              </h2>
            </div>

            <div className="flex-1 w-full max-w-sm">
              <div className="flex justify-between items-end mb-2">
                <div>
                  <span className="text-[#FF7A00] font-bold">Level {profile?.level || 1}</span>
                </div>
                <div className="text-[#A9A5BA] text-sm font-semibold">
                  {profile?.progress || 0} / 500 to Level {(profile?.level || 1) + 1}
                </div>
              </div>
              <div className="h-3 w-full bg-white/10 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-[#FF7A00] to-[#FFB020] rounded-full transition-all duration-1000 ease-out relative"
                  style={{ width: `${Math.min(((profile?.progress || 0) / 500) * 100, 100)}%` }}
                >
                  <div className="absolute inset-0 bg-white/20 w-full animate-[shimmer_2s_infinite]"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Next Goal */}
        <div className="bg-gradient-to-br from-[#1A0B2E] to-[#120822] rounded-[24px] border border-white/5 p-6 flex flex-col justify-center relative overflow-hidden">
           <div className="absolute -bottom-10 -right-10 opacity-10">
             <Target className="w-40 h-40" />
           </div>
           <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-[#FF7A00]/20 flex items-center justify-center text-[#FF7A00]">
                  <Trophy className="w-5 h-5" />
                </div>
                <h3 className="text-white font-bold text-lg">Next Goal</h3>
              </div>
              <p className="text-[#A9A5BA] font-medium text-sm leading-relaxed mb-4">
                Earn <strong>{500 - (profile?.progress || 0)}</strong> more points to unlock your next milestone achievement!
              </p>
              <button className="w-full py-3 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl border border-white/10 transition-colors text-sm">
                View Ways to Earn
              </button>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Recent History */}
        <div className="bg-[#120822] rounded-[24px] border border-white/5 p-6 shadow-[0_10px_40px_rgba(0,0,0,0.3)]">
          <h3 className="text-white font-bold text-lg mb-6 flex items-center gap-2">
            <Clock className="w-5 h-5 text-[#FF7A00]" />
            Recent Activity
          </h3>
          <div className="space-y-4">
            {profile?.history && profile.history.length > 0 ? (
              profile.history.map((tx: any) => (
                <div key={tx.id} className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
                  <div>
                    <h4 className="text-white font-bold text-sm">{tx.description}</h4>
                    <p className="text-[#A9A5BA] text-xs mt-1">{new Date(tx.createdAt).toLocaleString()}</p>
                  </div>
                  <div className="text-[#FFB020] font-extrabold flex items-center gap-1">
                    +{tx.amount} <Star className="w-4 h-4" fill="currentColor" />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-[#A9A5BA] text-sm text-center py-4">No recent activity.</p>
            )}
          </div>
        </div>

        {/* Achievements */}
        <div className="bg-[#120822] rounded-[24px] border border-white/5 p-6 shadow-[0_10px_40px_rgba(0,0,0,0.3)]">
          <h3 className="text-white font-bold text-lg mb-6 flex items-center gap-2">
            <Award className="w-5 h-5 text-[#FF7A00]" />
            Achievements
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {profile?.achievements && profile.achievements.length > 0 ? (
              profile.achievements.map((ach: any) => (
                <div key={ach.id} className="p-4 bg-gradient-to-br from-[#1A0B2E] to-[#120822] rounded-xl border border-[#FF7A00]/30 shadow-[0_0_15px_rgba(255,122,0,0.1)] text-center relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-16 h-16 bg-[#FF7A00]/20 rounded-full blur-[20px] -mr-8 -mt-8"></div>
                  <div className="w-12 h-12 mx-auto bg-[#FF7A00]/20 rounded-full flex items-center justify-center text-[#FF7A00] mb-3 relative z-10">
                    <Trophy className="w-6 h-6" />
                  </div>
                  <h4 className="text-white font-bold text-sm">{ach.achievementName}</h4>
                  <p className="text-[#A9A5BA] text-[11px] mt-1 line-clamp-2">{ach.description}</p>
                </div>
              ))
            ) : (
              <div className="col-span-2 p-8 text-center border border-dashed border-white/10 rounded-xl">
                <p className="text-[#A9A5BA] text-sm font-medium">Keep earning points to unlock achievements!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
