import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, Map, LogOut, Bell, X, Activity, ClipboardList, Truck } from 'lucide-react';
import { useState, useEffect } from 'react';
import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';
import { emitLive } from '../services/liveEvents';
import { WS_URL } from '../services/api';

export default function MainLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [latestAdminNotification, setLatestAdminNotification] = useState<any>(null);

  useEffect(() => {
    if (!user || user.role === 'USER') return;

    let toastTimer: ReturnType<typeof setTimeout> | null = null;
    const client = new Client({
      webSocketFactory: () => new SockJS(WS_URL),
      reconnectDelay: 3000,
      onConnect: () => {
        emitLive('RECONNECTED');

        client.subscribe('/topic/notifications/admin', (message) => {
          const notif = JSON.parse(message.body);
          setLatestAdminNotification(notif);
          if (toastTimer) clearTimeout(toastTimer);
          toastTimer = setTimeout(() => setLatestAdminNotification(null), 5000);
          emitLive('NOTIFICATION', notif);
        });

        client.subscribe('/topic/dustbins', (message) => {
          emitLive('DUSTBIN', JSON.parse(message.body));
        });

        client.subscribe('/topic/complaints', (message) => {
          emitLive('COMPLAINT', JSON.parse(message.body));
        });

        client.subscribe('/topic/pickups', (message) => {
          emitLive('PICKUP', JSON.parse(message.body));
        });

        client.subscribe('/topic/activity/global', (message) => {
          const evt = JSON.parse(message.body);
          emitLive(evt.type, evt);
        });
      }
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

  return (
    <div className="flex h-screen bg-gray-50">
      <aside className="w-64 bg-white border-r shadow-sm">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-green-600">SmartWaste</h1>
          <p className="text-sm text-gray-500 mt-1">{user?.role} Portal</p>
        </div>
        <nav className="mt-6">
          <Link to="dashboard" className="flex items-center px-6 py-3 text-gray-700 hover:bg-green-50 hover:text-green-700">
            <LayoutDashboard className="w-5 h-5 mr-3" />
            Dashboard
          </Link>
          <Link to="map" className="flex items-center px-6 py-3 text-gray-700 hover:bg-green-50 hover:text-green-700">
            <Map className="w-5 h-5 mr-3" />
            Live Map
          </Link>
          {user?.role === 'ADMIN' && (
            <>
              <Link to="complaints" className="flex items-center px-6 py-3 text-gray-700 hover:bg-green-50 hover:text-green-700">
                <ClipboardList className="w-5 h-5 mr-3" />
                Complaints
              </Link>
              <Link to="pickups" className="flex items-center px-6 py-3 text-gray-700 hover:bg-green-50 hover:text-green-700">
                <Truck className="w-5 h-5 mr-3" />
                Pickups
              </Link>
            </>
          )}
        </nav>
        <div className="absolute bottom-0 w-64 p-4 border-t">
          <button onClick={handleLogout} className="flex items-center w-full px-4 py-2 text-gray-700 hover:bg-red-50 hover:text-red-700 rounded-md">
            <LogOut className="w-5 h-5 mr-3" />
            Logout
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto">
        <header className="bg-white shadow-sm h-16 flex items-center justify-between px-8 relative z-20">
          <h2 className="text-xl font-semibold text-gray-800">Welcome, {user?.name}</h2>
          <div className="flex items-center">
            <button className="p-2 text-gray-400 hover:text-gray-600 relative">
              <Bell className="w-6 h-6" />
              {latestAdminNotification && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
              )}
            </button>
          </div>
        </header>
        <div className="p-8 relative z-10">
          <Outlet />
          
          {/* Admin Real-time Toast Notification */}
          {latestAdminNotification && (
            <div className="fixed bottom-8 right-8 bg-white border border-gray-100 p-4 rounded-xl shadow-lg z-50 animate-bounce max-w-sm flex items-start gap-3">
              <div className="p-2 bg-red-50 rounded-lg">
                <Activity className="w-5 h-5 text-red-600" />
              </div>
              <div className="flex-1">
                <h4 className="text-gray-900 font-bold text-sm">{latestAdminNotification.title}</h4>
                <p className="text-gray-500 text-xs mt-1">{latestAdminNotification.message}</p>
              </div>
              <button onClick={() => setLatestAdminNotification(null)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4"/></button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
