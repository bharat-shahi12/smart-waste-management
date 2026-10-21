import { useState, useEffect } from 'react';
import { ClipboardList, AlertTriangle, CheckCircle, Flame } from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useLiveRefresh } from '../../services/liveEvents';

export default function ResponderDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    assignedTasks: 0,
    pendingTasks: 0,
    inProgressTasks: 0,
    completedToday: 0,
    criticalAlerts: 0,
  });

  const fetchStats = async () => {
    try {
      const res = await api.get('/responder/assignments/dashboard');
      setStats(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  useLiveRefresh(fetchStats, ['ASSIGNMENT', 'ASSIGNMENT_CREATED', 'ASSIGNMENT_UPDATED'], 1000);

  return (
    <div className="p-6 md:p-10 space-y-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-black text-white">Good Morning, {user?.name || 'Responder'}</h1>
        <p className="text-[#A9A5BA] mt-2 font-medium">Here are your assigned tasks for today.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <StatCard title="Assigned Tasks" value={stats.assignedTasks} icon={ClipboardList} color="blue" />
        <StatCard title="Pending" value={stats.pendingTasks} icon={AlertTriangle} color="orange" />
        <StatCard title="In Progress" value={stats.inProgressTasks} icon={CheckCircle} color="yellow" />
        <StatCard title="Completed Today" value={stats.completedToday} icon={CheckCircle} color="green" />
        <StatCard title="Critical Alerts" value={stats.criticalAlerts} icon={Flame} color="red" />
      </div>

      {/* TODO: Add assigned tasks list here */}
      <div className="bg-[#120822] rounded-3xl p-6 border border-white/5">
        <h2 className="text-xl font-bold text-white mb-4">Today's Assignments</h2>
        <p className="text-[#A9A5BA]">Loading assignments...</p>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color }: any) {
  const colorMap: any = {
    blue: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    orange: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
    yellow: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    green: 'bg-green-500/10 text-green-500 border-green-500/20',
    red: 'bg-red-500/10 text-red-500 border-red-500/20',
  };

  return (
    <div className={`p-6 rounded-2xl border ${colorMap[color]} bg-opacity-50`}>
      <Icon className="w-8 h-8 mb-4" />
      <h3 className="text-[#A9A5BA] text-sm font-bold mb-1">{title}</h3>
      <p className="text-3xl font-black text-white">{value}</p>
    </div>
  );
}
