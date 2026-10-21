import { useEffect, useState } from 'react';
import api from '../../services/api';
import { useLiveRefresh } from '../../services/liveEvents';
import { Bell, CheckCircle, Clock, Truck, ShieldAlert, Check } from 'lucide-react';
import { Link } from 'react-router-dom';

interface NotificationItem {
  id: number;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
  entityType?: string;
  entityId?: string;
}

export default function ResponderNotifications() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await api.get('/notifications/my').catch(async () => {
        // Fallback to general notifications endpoint
        return await api.get('/notifications');
      });
      setNotifications(res.data || []);
    } catch (err) {
      console.error('Failed to load notifications', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  useLiveRefresh(() => {
    fetchNotifications();
  }, ['NOTIFICATION', 'RECONNECTED', 'ALERT']);

  const markAsRead = async (id: number) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch (err) {
      console.error('Failed to mark read', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (err) {
      console.error('Failed to mark all read', err);
    }
  };

  const filtered = notifications.filter(n => {
    if (filter === 'UNREAD') return !n.isRead;
    if (filter === 'ALERTS') return n.type === 'BIN_FULL' || n.type === 'AIR_QUALITY' || n.type === 'ALERT';
    return true;
  });

  const getIcon = (type: string) => {
    switch (type) {
      case 'BIN_FULL':
      case 'AIR_QUALITY':
      case 'ALERT':
        return <ShieldAlert className="w-5 h-5 text-red-400" />;
      case 'ASSIGNMENT':
      case 'PICKUP':
        return <Truck className="w-5 h-5 text-amber-400" />;
      default:
        return <Bell className="w-5 h-5 text-blue-400" />;
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <Bell className="w-7 h-7 text-amber-400" />
            Responder Alerts & Notifications
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Real-time critical bin overflow alerts and pickup assignment dispatches.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={markAllAsRead}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/15 text-xs font-semibold text-white rounded-lg border border-white/10 transition"
          >
            <Check className="w-3.5 h-3.5" />
            Mark All Read
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {['ALL', 'UNREAD', 'ALERTS'].map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition ${
              filter === tab
                ? 'bg-amber-400 text-slate-900 shadow-md'
                : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
            }`}
          >
            {tab === 'ALL' ? 'All Alerts' : tab === 'UNREAD' ? 'Unread Only' : 'Critical Alarms'}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="text-center py-16 text-gray-400">Loading alerts...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white/5 rounded-2xl p-12 text-center border border-white/10">
          <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-white">All caught up!</h3>
          <p className="text-gray-400 text-sm mt-1">No active notifications or alerts at this time.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => (
            <div
              key={item.id}
              className={`p-4 rounded-2xl border transition flex items-start justify-between gap-4 ${
                item.isRead
                  ? 'bg-white/5 border-white/5 opacity-75'
                  : 'bg-white/10 border-amber-400/30 shadow-lg'
              }`}
            >
              <div className="flex items-start gap-3.5">
                <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 shrink-0 mt-0.5">
                  {getIcon(item.type)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-white">{item.title}</h3>
                    {!item.isRead && (
                      <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                    )}
                  </div>
                  <p className="text-xs text-gray-300 mt-1">{item.message}</p>
                  <div className="flex items-center gap-2 text-[11px] text-gray-500 mt-2">
                    <Clock className="w-3 h-3" />
                    <span>{new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    <span>•</span>
                    <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {!item.isRead && (
                  <button
                    onClick={() => markAsRead(item.id)}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-gray-400 hover:text-white transition"
                    title="Mark as read"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                )}
                <Link
                  to="/responder/assignments"
                  className="px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-900 font-bold text-xs transition"
                >
                  View
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
