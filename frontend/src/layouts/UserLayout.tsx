import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, Map, Trash2, ScanLine, Truck, 
  BarChart2, Lightbulb, Bell, Gift, TrendingUp, User as UserIcon, LogOut, Menu, X, Activity
} from 'lucide-react';
import { useState, useEffect } from 'react';
import api, { WS_URL } from '../services/api';
import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';
import { emitLive } from '../services/liveEvents';

export default function UserLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [latestNotification, setLatestNotification] = useState<any>(null);

  const [liveConnected, setLiveConnected] = useState(false);

  useEffect(() => {
    if (!user) return;

    const fetchUnreadCount = async () => {
      try {
        const response = await api.get('/notifications/unread-count');
        setUnreadCount(response.data.count);
      } catch (err) {
        console.error(err);
      }
    };

    fetchUnreadCount();

    let toastTimer: ReturnType<typeof setTimeout> | null = null;
    const client = new Client({
      webSocketFactory: () => new SockJS(WS_URL),
      reconnectDelay: 3000,
      onConnect: () => {
        setLiveConnected(true);
        // Re-sync after (re)connect in case events were missed while offline
        fetchUnreadCount();
        emitLive('RECONNECTED');

        client.subscribe(`/topic/notifications/user/${user.id}`, (message) => {
          const notif = JSON.parse(message.body);
          setLatestNotification(notif);
          if (toastTimer) clearTimeout(toastTimer);
          toastTimer = setTimeout(() => setLatestNotification(null), 5000);
        });
        // Activity events are published AFTER the DB commit -> safe to refetch
        client.subscribe(`/topic/activity/user/${user.id}`, (message) => {
          const evt = JSON.parse(message.body);
          if (evt.type === 'NOTIFICATION' || evt.type === 'NOTIFICATIONS_READ') fetchUnreadCount();
          emitLive(evt.type, evt);
        });
        client.subscribe(`/topic/activity/global`, (message) => {
          const evt = JSON.parse(message.body);
          emitLive(evt.type, evt);

          if (evt.type === 'BIN') {
            let title = 'New Smart Bin Added';
            let message = evt.name ? `Smart bin "${evt.name}" has been added to the network!` : 'A new smart bin has been added to the network!';
            if (evt.action === 'UPDATE') {
              title = 'Smart Bin Updated';
              message = evt.name ? `Smart bin "${evt.name}" details have been updated.` : 'Smart bin information was updated.';
            } else if (evt.action === 'DELETE') {
              title = 'Smart Bin Removed';
              message = evt.name ? `Smart bin "${evt.name}" was removed from the network.` : 'A smart bin was removed from the network.';
            }
            setLatestNotification({ title, message });
            if (toastTimer) clearTimeout(toastTimer);
            toastTimer = setTimeout(() => setLatestNotification(null), 5000);
          }
        });
        client.subscribe(`/topic/complaints/user/${user.id}`, (message) => {
          emitLive('COMPLAINT', JSON.parse(message.body));
        });
        client.subscribe(`/topic/pickups/user/${user.id}`, (message) => {
          emitLive('PICKUP', JSON.parse(message.body));
        });
        client.subscribe(`/topic/rewards/user/${user.id}`, (message) => {
          emitLive('REWARD', JSON.parse(message.body));
        });
        client.subscribe('/topic/dustbins', (message) => {
          emitLive('DUSTBIN', JSON.parse(message.body));
        });
      },
      onWebSocketClose: () => setLiveConnected(false),
    });
    client.activate();
    
    return () => {
      if (toastTimer) clearTimeout(toastTimer);
      client.deactivate();
    };
  }, [user]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/user/dashboard', icon: LayoutDashboard },
    { name: 'Smart Bins', path: '/user/bins', icon: Trash2 },
    { name: 'Map', path: '/user/map', icon: Map },
    { name: 'AI Detection', path: '/user/ai-detection', icon: ScanLine },
    { name: 'Pickup', path: '/user/pickup', icon: Truck },
    { name: 'Analytics', path: '/user/analytics', icon: BarChart2 },
    { name: 'Suggestions', path: '/user/suggestions', icon: Lightbulb },
    { name: 'Alerts', path: '/user/alerts', icon: Bell },
    { name: 'Rewards', path: '/user/rewards', icon: Gift },
    { name: 'Impact Report', path: '/user/impact', icon: TrendingUp },
    { name: 'Profile', path: '/user/profile', icon: UserIcon },
  ];

  return (
    <div className="flex h-screen bg-gradient-to-br from-[#120822] via-[#1a0b30] to-[#120822] overflow-hidden font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex flex-col w-[260px] bg-[#0E0619] border-r border-white/5 relative z-20">
        <div className="p-6 pt-8 flex items-center gap-3">
          <div className="w-10 h-10 rounded-[10px] bg-gradient-to-br from-[#FF7A00] to-[#FF4D24] flex items-center justify-center shadow-[0_0_15px_rgba(255,122,0,0.5)]">
            <Activity className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-[#FF7A00] tracking-wide">User Panel</h1>
            <div className="flex items-center gap-1.5 mt-0.5" id="live-status-indicator">
              <span className={`w-2 h-2 rounded-full ${liveConnected ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)] animate-pulse' : 'bg-gray-500'}`}></span>
              <span className={`text-[10px] font-bold uppercase tracking-widest ${liveConnected ? 'text-emerald-400' : 'text-gray-500'}`}>
                {liveConnected ? 'Live' : 'Connecting…'}
              </span>
            </div>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto mt-2 px-4 pb-4 space-y-1.5 scrollbar-hide">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.path);
            return (
              <Link 
                key={item.path} 
                to={item.path} 
                className={`flex items-center px-4 py-3 rounded-xl transition-all duration-300 ${
                  isActive 
                  ? 'bg-transparent border border-[#FF7A00] text-[#FF7A00] shadow-[0_0_15px_rgba(255,122,0,0.15)]' 
                  : 'text-[#A9A5BA] hover:bg-white/5 hover:text-white border border-transparent'
                }`}
              >
                <Icon className={`w-5 h-5 mr-3 ${isActive ? 'text-[#FF7A00]' : 'text-[#A9A5BA]'}`} />
                <span className={`font-semibold text-sm flex-1 ${isActive ? 'tracking-wide' : ''}`}>{item.name}</span>
                {item.name === 'Alerts' && unreadCount > 0 && (
                  <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full ml-auto">
                    {unreadCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 px-6 border-t border-white/5 mt-auto">
          <button onClick={handleLogout} className="flex items-center w-full px-2 py-3 text-[#ff4d4d] hover:text-[#ff7a7a] transition-colors font-bold text-sm">
            <LogOut className="w-5 h-5 mr-3" />
            Log Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Mobile Header */}
        <header className="md:hidden bg-[#0E0619] border-b border-white/5 h-16 flex items-center justify-between px-4 z-30">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#FF7A00] to-[#FF4D24] flex items-center justify-center">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-lg font-bold text-[#FF7A00]">User Panel</h1>
          </div>
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-[#A9A5BA] focus:outline-none">
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </header>

        {/* Mobile Menu Overlay */}
        {isMobileMenuOpen && (
          <div className="md:hidden absolute top-16 inset-0 bg-[#0E0619] z-40 flex flex-col border-t border-white/5">
            <nav className="flex-1 overflow-y-auto p-4 space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname.startsWith(item.path);
                return (
                  <Link 
                    key={item.path} 
                    to={item.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center px-4 py-4 rounded-xl ${
                      isActive ? 'border border-[#FF7A00] text-[#FF7A00]' : 'text-[#A9A5BA]'
                    }`}
                  >
                    <Icon className={`w-6 h-6 mr-4 ${isActive ? 'text-[#FF7A00]' : ''}`} />
                    <span className="text-base font-bold">{item.name}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        )}

        <main className="flex-1 overflow-y-auto relative z-10 scrollbar-hide flex flex-col">
          <style>
            {`
              @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
              .scrollbar-hide::-webkit-scrollbar { display: none; }
              .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
            `}
          </style>
          <div className="flex-1">
            <Outlet />
          </div>

          {/* Real-time Toast Notification */}
          {latestNotification && (
            <div className="fixed bottom-20 right-8 bg-[#120822] border border-[#FF7A00] p-4 rounded-xl shadow-[0_10px_40px_rgba(255,122,0,0.2)] z-50 animate-bounce max-w-sm">
              <div className="flex items-start gap-3">
                <Bell className="w-5 h-5 text-[#FF7A00] mt-1" />
                <div>
                  <h4 className="text-white font-bold text-sm">{latestNotification.title}</h4>
                  <p className="text-[#A9A5BA] text-xs mt-1">{latestNotification.message}</p>
                </div>
                <button onClick={() => setLatestNotification(null)} className="text-gray-400 hover:text-white"><X className="w-4 h-4"/></button>
              </div>
            </div>
          )}
          
          {/* Footer inside main content to match screenshot */}
          <footer className="w-full bg-[#090410] border-t border-white/5 p-4 px-8 flex justify-between items-center text-xs font-semibold text-[#A9A5BA]">
            <div>
              <span className="text-white font-bold">WasteSync AI</span> © 2026. A project for a cleaner planet.
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 cursor-pointer hover:text-white transition-colors">
                <div className="w-6 h-6 rounded-full bg-[#FF7A00] flex items-center justify-center text-white font-bold text-[10px]">
                  P
                </div>
                Profile
              </div>
              <span className="cursor-pointer hover:text-white transition-colors">GitHub</span>
              <span className="cursor-pointer hover:text-white transition-colors">LinkedIn</span>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}
