import { useState, useEffect, useCallback } from 'react';
import { Bell, CheckCircle, Clock, Gift, Trophy, Truck, AlertTriangle, MessageSquare, Radio } from 'lucide-react';
import api from '../../services/api';
import { useLiveRefresh } from '../../services/liveEvents';

const typeMeta = (type: string) => {
  if (type?.startsWith('REWARD')) return { icon: Gift, color: 'text-emerald-400', bg: 'bg-emerald-400/15', label: 'Reward' };
  if (type?.startsWith('ACHIEVEMENT')) return { icon: Trophy, color: 'text-yellow-400', bg: 'bg-yellow-400/15', label: 'Achievement' };
  if (type?.startsWith('PICKUP')) return { icon: Truck, color: 'text-sky-400', bg: 'bg-sky-400/15', label: 'Pickup' };
  if (type?.startsWith('COMPLAINT')) return { icon: MessageSquare, color: 'text-fuchsia-400', bg: 'bg-fuchsia-400/15', label: 'Report' };
  if (type?.includes('BIN') || type?.includes('ALERT')) return { icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-400/15', label: 'Bin Alert' };
  return { icon: Bell, color: 'text-[#FF7A00]', bg: 'bg-[#FF7A00]/15', label: 'System' };
};

const timeAgo = (iso: string) => {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(iso).toLocaleString();
};

export default function UserAlerts() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'UNREAD'>('ALL');
  const [flashId, setFlashId] = useState<number | null>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const response = await api.get('/notifications');
      setNotifications(prev => {
        const prevIds = new Set(prev.map(n => n.id));
        const fresh = response.data.find((n: any) => !prevIds.has(n.id));
        if (prev.length && fresh) {
          setFlashId(fresh.id);
          setTimeout(() => setFlashId(null), 2500);
        }
        return response.data;
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  // Live: refetch from DB whenever a notification is created or read anywhere
  useLiveRefresh(fetchNotifications, ['NOTIFICATION', 'NOTIFICATIONS_READ', 'RECONNECTED']);

  const markAsRead = async (id: number) => {
    setNotifications(ns => ns.map(n => n.id === id ? { ...n, isRead: true } : n));
    try {
      await api.put(`/notifications/${id}/read`);
    } catch (err) {
      console.error(err);
      fetchNotifications();
    }
  };

  const markAllAsRead = async () => {
    setNotifications(ns => ns.map(n => ({ ...n, isRead: true })));
    try {
      await api.put('/notifications/read-all');
    } catch (err) {
      console.error(err);
      fetchNotifications();
    }
  };

  const unread = notifications.filter(n => !n.isRead).length;
  const visible = filter === 'UNREAD' ? notifications.filter(n => !n.isRead) : notifications;

  if (loading) return <div className="p-8 text-center text-[#A9A5BA]">Loading alerts...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12 p-4 md:p-8">
      <div className="flex flex-wrap gap-4 justify-between items-center mb-4">
        <div>
          <h1 className="text-[28px] font-extrabold text-[#FF7A00] tracking-wide flex items-center gap-3">
            <Bell className="w-8 h-8" />
            My Alerts
          </h1>
          <p className="text-[#A9A5BA] mt-1 text-sm font-medium flex items-center gap-2">
            <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            Live notifications from the server · {unread} unread
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-white/5 border border-white/10 rounded-lg p-1">
            {(['ALL', 'UNREAD'] as const).map(f => (
              <button
                key={f}
                id={`alerts-filter-${f.toLowerCase()}`}
                onClick={() => setFilter(f)}
                className={`text-xs px-3 py-1.5 rounded-md font-bold transition-colors ${filter === f ? 'bg-[#FF7A00] text-white' : 'text-[#A9A5BA] hover:text-white'}`}
              >
                {f === 'ALL' ? 'All' : `Unread (${unread})`}
              </button>
            ))}
          </div>
          {unread > 0 && (
            <button
              id="alerts-mark-all-read"
              onClick={markAllAsRead}
              className="text-xs bg-white/5 border border-white/10 text-white px-4 py-2 rounded-lg font-bold hover:bg-white/10 transition-colors"
            >
              Mark all as read
            </button>
          )}
        </div>
      </div>

      <div className="bg-[#120822] rounded-[24px] border border-white/5 shadow-[0_10px_40px_rgba(0,0,0,0.3)] overflow-hidden">
        {visible.length === 0 ? (
          <div className="p-10 text-center">
            <Bell className="w-12 h-12 text-white/10 mx-auto mb-3" />
            <p className="text-white font-bold">{filter === 'UNREAD' ? "You're all caught up!" : 'No alerts yet'}</p>
            <p className="text-[#A9A5BA] text-sm mt-1">Report an issue, request a pickup or scan waste — updates appear here instantly.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {visible.map(notif => {
              const meta = typeMeta(notif.type);
              const Icon = meta.icon;
              return (
                <div
                  key={notif.id}
                  className={`p-6 flex items-start gap-4 transition-all duration-700 ${
                    flashId === notif.id ? 'bg-[#FF7A00]/20' : !notif.isRead ? 'bg-[#FF7A00]/5' : 'hover:bg-white/5'
                  }`}
                >
                  <div className={`mt-1 p-2 rounded-full ${!notif.isRead ? `${meta.bg} ${meta.color}` : 'bg-white/5 text-[#A9A5BA]'}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className={`text-sm font-bold ${!notif.isRead ? 'text-white' : 'text-[#A9A5BA]'}`}>{notif.title}</h3>
                      <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${meta.bg} ${meta.color}`}>{meta.label}</span>
                      {!notif.isRead && <span className="w-2 h-2 rounded-full bg-[#FF7A00]"></span>}
                    </div>
                    <p className="text-sm text-[#A9A5BA] mt-1">{notif.message}</p>
                    <p className="text-[10px] font-semibold text-[#A9A5BA]/70 mt-2 uppercase tracking-wide flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {timeAgo(notif.createdAt)}
                    </p>
                  </div>

                  {!notif.isRead && (
                    <button
                      id={`alert-mark-read-${notif.id}`}
                      onClick={() => markAsRead(notif.id)}
                      className="w-8 h-8 rounded-full bg-white/5 hover:bg-[#FF7A00]/20 flex items-center justify-center text-[#A9A5BA] hover:text-[#FF7A00] transition-colors"
                      title="Mark as read"
                    >
                      <CheckCircle className="w-4 h-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
