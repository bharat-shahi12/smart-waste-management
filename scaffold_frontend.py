import os

base_dir = "/Users/BHARATSHAHI/Desktop/College-project/frontend"

files = {
    f"{base_dir}/src/index.css": """@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body {
    @apply bg-gray-50 text-gray-900;
  }
}
""",
    f"{base_dir}/src/main.tsx": """import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
""",
    f"{base_dir}/src/App.tsx": """import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import MainLayout from './layouts/MainLayout';
import LoginPage from './pages/LoginPage';
import AdminDashboard from './pages/AdminDashboard';
import DustbinMapPage from './pages/DustbinMapPage';

const ProtectedRoute = ({ children, roles }: { children: React.ReactNode, roles?: string[] }) => {
  const { user, isAuthenticated, loading } = useAuth();
  
  if (loading) return <div className="flex h-screen items-center justify-center">Loading...</div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  
  if (roles && user && !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="map" element={<DustbinMapPage />} />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
""",
    f"{base_dir}/src/context/AuthContext.tsx": """import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

interface User {
  id: number;
  name: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    
    if (token && storedUser) {
      setUser(JSON.parse(storedUser));
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
    setLoading(false);
  }, []);

  const login = (token: string, userData: User) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
""",
    f"{base_dir}/src/layouts/MainLayout.tsx": """import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, Map, LogOut } from 'lucide-react';

export default function MainLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

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
          <Link to="/dashboard" className="flex items-center px-6 py-3 text-gray-700 hover:bg-green-50 hover:text-green-700">
            <LayoutDashboard className="w-5 h-5 mr-3" />
            Dashboard
          </Link>
          <Link to="/map" className="flex items-center px-6 py-3 text-gray-700 hover:bg-green-50 hover:text-green-700">
            <Map className="w-5 h-5 mr-3" />
            Live Map
          </Link>
        </nav>
        <div className="absolute bottom-0 w-64 p-4 border-t">
          <button onClick={handleLogout} className="flex items-center w-full px-4 py-2 text-gray-700 hover:bg-red-50 hover:text-red-700 rounded-md">
            <LogOut className="w-5 h-5 mr-3" />
            Logout
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto">
        <header className="bg-white shadow-sm h-16 flex items-center justify-between px-8">
          <h2 className="text-xl font-semibold text-gray-800">Welcome, {user?.name}</h2>
        </header>
        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
""",
    f"{base_dir}/src/pages/LoginPage.tsx": """import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await axios.post('http://localhost:8080/api/auth/login', { email, password });
      login(response.data.token, {
        id: response.data.userId,
        name: response.data.name,
        role: response.data.role
      });
      navigate('/dashboard');
    } catch (err) {
      setError('Invalid credentials');
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-gray-100">
      <div className="w-full max-w-md bg-white rounded-lg shadow-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-green-600">SmartWaste</h1>
          <p className="text-gray-500 mt-2">Sign in to your account</p>
        </div>
        {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">Email</label>
            <input 
              type="email" 
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-bold mb-2">Password</label>
            <input 
              type="password" 
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button 
            type="submit" 
            className="w-full bg-green-600 text-white font-bold py-2 px-4 rounded hover:bg-green-700 transition duration-200"
          >
            Sign In
          </button>
        </form>
        <div className="mt-4 text-sm text-gray-600">
          Demo Accounts:<br/>
          admin@example.com / authority@example.com<br/>
          (Password is 'password' for all)
        </div>
      </div>
    </div>
  );
}
""",
    f"{base_dir}/src/pages/AdminDashboard.tsx": """import { useEffect, useState } from 'react';
import axios from 'axios';
import { Trash2, AlertTriangle, CheckCircle, BatteryMedium } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function AdminDashboard() {
  const [stats, setStats] = useState({ totalDustbins: 0, fullDustbins: 0, openAlerts: 0 });
  const [loading, setLoading] = useState(true);

  // Fake chart data for demo purposes, since real historical data API isn't fully implemented yet
  const chartData = [
    { name: 'Mon', fill: 40 },
    { name: 'Tue', fill: 60 },
    { name: 'Wed', fill: 45 },
    { name: 'Thu', fill: 80 },
    { name: 'Fri', fill: 95 },
    { name: 'Sat', fill: 15 },
    { name: 'Sun', fill: 30 },
  ];

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await axios.get('http://localhost:8080/api/analytics/dashboard');
        setStats(response.data);
      } catch (error) {
        console.error('Failed to fetch dashboard stats', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchStats();
  }, []);

  if (loading) return <div>Loading dashboard...</div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4">
          <div className="p-3 bg-blue-100 rounded-lg"><Trash2 className="w-8 h-8 text-blue-600"/></div>
          <div>
            <p className="text-sm font-medium text-gray-500">Total Dustbins</p>
            <h3 className="text-2xl font-bold text-gray-900">{stats.totalDustbins}</h3>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4">
          <div className="p-3 bg-red-100 rounded-lg"><AlertTriangle className="w-8 h-8 text-red-600"/></div>
          <div>
            <p className="text-sm font-medium text-gray-500">Full/Overflow Bins</p>
            <h3 className="text-2xl font-bold text-gray-900">{stats.fullDustbins}</h3>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4">
          <div className="p-3 bg-orange-100 rounded-lg"><AlertTriangle className="w-8 h-8 text-orange-600"/></div>
          <div>
            <p className="text-sm font-medium text-gray-500">Open Alerts</p>
            <h3 className="text-2xl font-bold text-gray-900">{stats.openAlerts}</h3>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Weekly Average Fill Level Trend</h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Area type="monotone" dataKey="fill" stroke="#16a34a" fill="#bbf7d0" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
""",
    f"{base_dir}/src/pages/DustbinMapPage.tsx": """import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import axios from 'axios';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix Leaflet's default icon issue
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

L.Icon.Default.mergeOptions({
  iconRetinaUrl,
  iconUrl,
  shadowUrl,
});

interface Dustbin {
  id: number;
  deviceId: string;
  name: string;
  latitude: number;
  longitude: number;
  fillLevel: number;
  status: string;
  airQuality: number;
  temperature: number;
}

export default function DustbinMapPage() {
  const [dustbins, setDustbins] = useState<Dustbin[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDustbins = async () => {
      try {
        const response = await axios.get('http://localhost:8080/api/dustbins');
        setDustbins(response.data);
      } catch (error) {
        console.error('Failed to fetch dustbins', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchDustbins();
  }, []);

  if (loading) return <div>Loading map...</div>;

  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 h-[calc(100vh-8rem)]">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Live Dustbin Locations</h3>
      <MapContainer 
        center={[28.6139, 77.2090]} // New Delhi
        zoom={12} 
        style={{ height: 'calc(100% - 2rem)', width: '100%', borderRadius: '0.5rem' }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        {dustbins.map(bin => (
          <Marker key={bin.id} position={[bin.latitude || 28.6139, bin.longitude || 77.2090]}>
            <Popup>
              <div className="p-1">
                <h4 className="font-bold text-lg">{bin.name} ({bin.deviceId})</h4>
                <p className="text-sm mt-1">Status: 
                  <span className={`font-semibold ml-1 ${bin.status === 'OVERFLOW' || bin.status === 'FULL' ? 'text-red-600' : 'text-green-600'}`}>
                    {bin.status}
                  </span>
                </p>
                <p className="text-sm">Fill Level: {bin.fillLevel}%</p>
                <p className="text-sm">Air Quality (MQ-135): {bin.airQuality}</p>
                <p className="text-sm">Temperature: {bin.temperature}°C</p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
"""
}

for path, content in files.items():
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w') as f:
        f.write(content)

print("Frontend Scaffolded successfully!")
