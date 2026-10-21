import { useState, useEffect, useCallback } from 'react';
import { Lightbulb, CheckCircle, XCircle, Radio } from 'lucide-react';
import api from '../../services/api';
import { useLiveRefresh } from '../../services/liveEvents';

export default function UserSuggestions() {
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSuggestions = useCallback(async () => {
    try {
      const response = await api.get('/suggestions');
      setSuggestions(response.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSuggestions();
  }, [fetchSuggestions]);

  // Any persisted user activity can change which suggestions apply -> re-evaluate live.
  useLiveRefresh(fetchSuggestions, [
    'NOTIFICATION', 'COMPLAINT', 'PICKUP', 'REWARD', 'DETECTION', 'WASTE_LOG', 'SUGGESTION', 'RECONNECTED',
  ], 500);

  const markAsRead = async (id: number) => {
    setSuggestions(ss => ss.map(s => s.id === id ? { ...s, isRead: true } : s));
    try {
      await api.put(`/suggestions/${id}/read`);
    } catch (err) {
      console.error(err);
      fetchSuggestions();
    }
  };

  const dismiss = async (id: number) => {
    setSuggestions(ss => ss.filter(s => s.id !== id));
    try {
      await api.put(`/suggestions/${id}/dismiss`);
    } catch (err) {
      console.error(err);
      fetchSuggestions();
    }
  };

  if (loading) return <div className="p-8 text-center text-[#A9A5BA]">Loading suggestions...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12 p-4 md:p-8 font-['Plus_Jakarta_Sans',sans-serif]">
      <div>
        <h1 className="text-[28px] font-extrabold text-[#FF7A00] tracking-wide flex items-center gap-3">
          <Lightbulb className="w-8 h-8" />
          Personalized Suggestions
        </h1>
        <p className="text-[#A9A5BA] mt-1 text-sm font-medium flex items-center gap-2">
          <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
          Smart recommendations generated live from your activity
        </p>
      </div>

      <div className="space-y-4">
        {suggestions.length === 0 ? (
          <div className="bg-[#120822] rounded-[24px] border border-white/5 p-8 text-center shadow-[0_10px_40px_rgba(0,0,0,0.3)]">
            <Lightbulb className="w-12 h-12 text-white/10 mx-auto mb-4" />
            <h3 className="text-white font-bold mb-2">No Suggestions Yet</h3>
            <p className="text-[#A9A5BA] text-sm">Keep using the app and logging your activities. We'll generate personalized tips for you here.</p>
          </div>
        ) : (
          suggestions.map((s) => (
            <div 
              key={s.id} 
              className={`relative overflow-hidden rounded-[24px] border ${
                !s.isRead ? 'bg-gradient-to-br from-[#1A0B2E] to-[#120822] border-[#FF7A00]/30 shadow-[0_0_20px_rgba(255,122,0,0.15)]' 
                          : 'bg-[#120822] border-white/5 shadow-[0_10px_40px_rgba(0,0,0,0.3)]'
              } p-6 flex flex-col md:flex-row gap-6 items-start md:items-center transition-all duration-300`}
            >
              {!s.isRead && (
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#FF7A00]/10 rounded-full blur-[40px] -mr-16 -mt-16 pointer-events-none"></div>
              )}

              <div className="flex-1 relative z-10">
                <span className="inline-block px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] font-bold text-[#A9A5BA] uppercase tracking-wider mb-3">
                  {s.category}
                </span>
                <h3 className={`text-lg font-bold mb-2 ${!s.isRead ? 'text-white' : 'text-gray-300'}`}>{s.title}</h3>
                <p className="text-[#A9A5BA] text-sm leading-relaxed">{s.message}</p>
              </div>

              <div className="flex items-center gap-3 w-full md:w-auto border-t md:border-t-0 border-white/5 pt-4 md:pt-0 relative z-10">
                {!s.isRead && (
                  <button 
                    onClick={() => markAsRead(s.id)}
                    className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-[#FF7A00]/10 hover:bg-[#FF7A00]/20 text-[#FF7A00] font-bold text-sm rounded-xl transition-colors"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Mark Read
                  </button>
                )}
                <button 
                  onClick={() => dismiss(s.id)}
                  className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-[#A9A5BA] hover:text-white font-bold text-sm rounded-xl transition-colors"
                >
                  <XCircle className="w-4 h-4" />
                  Dismiss
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
