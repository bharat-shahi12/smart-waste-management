import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ClipboardList, 
  Map, 
  
  Truck,
  Bell,
  Trash2,
  History,
  User as UserIcon,
  LogOut,
  Menu,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLiveRefresh } from '../services/liveEvents';

export default function ResponderLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { user, logout, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Ensure user is collector/responder
  useEffect(() => {
    if (!loading && user && user.role !== 'COLLECTOR') {
      navigate('/login');
    }
  }, [user, loading, navigate]);

  // Live Refresh for notifications or events to show global toast
  useLiveRefresh(() => {}, [
    'ASSIGNMENT', 'ASSIGNMENT_CREATED', 'ASSIGNMENT_UPDATED'
  ], 500);

  const navigation = [
    { name: 'Dashboard', href: '/responder/dashboard', icon: LayoutDashboard },
    { name: 'My Assignments', href: '/responder/assignments', icon: ClipboardList },
    { name: 'Live Map', href: '/responder/map', icon: Map },
    { name: 'Pickups', href: '/responder/pickups', icon: Truck },
    { name: 'Bin Alerts', href: '/responder/bin-alerts', icon: Trash2 },
    { name: 'Notifications', href: '/responder/notifications', icon: Bell },
    { name: 'History', href: '/responder/history', icon: History },
    { name: 'Profile', href: '/responder/profile', icon: UserIcon },
  ];

  return (
    <div className="min-h-screen bg-[#0B0514] text-white font-['Plus_Jakarta_Sans',sans-serif] flex">
      {/* Mobile sidebar overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:sticky top-0 h-screen w-[280px] bg-[#120822] border-r border-white/10 z-50
        transition-transform duration-300 ease-in-out flex flex-col
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Logo Area */}
        <div className="h-20 flex items-center px-6 border-b border-white/5 relative">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF7A00] to-[#FF4D24] flex items-center justify-center shadow-[0_0_20px_rgba(255,122,0,0.3)]">
              <span className="text-xl font-black text-white">S</span>
            </div>
            <div>
              <span className="text-xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-white to-[#A9A5BA]">
                SMART<span className="text-[#FF7A00]">WASTE</span>
              </span>
              <p className="text-[10px] text-[#A9A5BA] font-bold tracking-widest uppercase">Responder Panel</p>
            </div>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden absolute right-4 p-2 text-[#A9A5BA] hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-1 custom-scrollbar">
          {navigation.map((item) => {
            const isActive = location.pathname.startsWith(item.href);
            return (
              <NavLink
                key={item.name}
                to={item.href}
                onClick={() => setIsSidebarOpen(false)}
                className={`
                  flex items-center gap-3 px-4 py-3.5 rounded-xl font-bold text-sm transition-all duration-300
                  ${isActive 
                    ? 'bg-gradient-to-r from-[#FF7A00]/10 to-transparent text-[#FF7A00] border border-[#FF7A00]/20' 
                    : 'text-[#A9A5BA] hover:bg-white/5 hover:text-white'
                  }
                `}
              >
                <item.icon className={`w-5 h-5 ${isActive ? 'text-[#FF7A00]' : ''}`} />
                {item.name}
                {item.name === 'Notifications' && (
                  <span className="ml-auto bg-[#FF7A00] text-white text-[10px] px-2 py-0.5 rounded-full">
                    New
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* User Footer */}
        <div className="p-4 border-t border-white/5">
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 border border-white/10 mb-4">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-bold text-white">
                {user?.name?.charAt(0) || 'R'}
              </span>
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-bold text-white truncate">{user?.name}</p>
              <p className="text-xs text-[#A9A5BA] truncate">Responder ID: #{user?.id}</p>
            </div>
          </div>
          
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm text-red-400 hover:bg-red-400/10 hover:text-red-300 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-screen overflow-x-hidden relative">
        {/* Mobile Header */}
        <header className="lg:hidden h-20 bg-[#120822] border-b border-white/5 flex items-center px-4 justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#FF7A00] to-[#FF4D24] flex items-center justify-center">
              <span className="text-sm font-black text-white">S</span>
            </div>
            <span className="text-lg font-black tracking-wider text-white">
              SMART<span className="text-[#FF7A00]">WASTE</span>
            </span>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 text-white bg-white/5 rounded-lg border border-white/10"
          >
            <Menu className="w-5 h-5" />
          </button>
        </header>

        {/* Page Content */}
        <div className="flex-1 relative">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
