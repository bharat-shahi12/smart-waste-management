import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { CheckCircle, MapPin, Trash2, Route } from 'lucide-react';

interface Task {
  id: number;
  dustbinId: number;
  dustbinLocation: string;
  assignedTime: string;
  status: string;
}

export default function CollectorDashboard() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // In a real app we'd fetch tasks from backend.
    setTimeout(() => {
      setTasks([
        {
          id: 1,
          dustbinId: 5,
          dustbinLocation: "Sector 18 Market, Noida",
          assignedTime: new Date().toISOString(),
          status: "ASSIGNED"
        }
      ]);
      setLoading(false);
    }, 1000);
  }, []);

  const markCompleted = (taskId: number) => {
    alert(`Task #${taskId} marked as completed! The dustbin is now clean.`);
  };

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-gray-800 mb-2">Collector Dashboard</h1>
      <p className="text-gray-600 mb-8">View your assigned collection routes and update status.</p>

      <div className="bg-gradient-to-r from-teal-500 to-green-600 rounded-xl shadow-lg p-6 mb-8 text-white">
        <div className="flex items-center gap-4">
          <div className="bg-white/20 p-4 rounded-full">
            <Route className="w-10 h-10" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Hello, {user?.name || 'Collector'}!</h2>
            <p className="text-teal-100 mt-1">You have {tasks.filter(t => t.status === 'ASSIGNED').length} active tasks for today.</p>
          </div>
        </div>
      </div>

      <h2 className="text-xl font-bold text-gray-800 mb-4">Assigned Tasks</h2>
      
      {loading ? (
        <div className="text-center text-gray-500 p-8">Loading tasks...</div>
      ) : tasks.length === 0 ? (
        <div className="text-center text-gray-500 p-8 bg-white rounded-xl shadow">No active tasks assigned to you.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tasks.map((task) => (
            <div key={task.id} className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden hover:shadow-lg transition-shadow">
              <div className="bg-blue-50 px-6 py-4 border-b border-blue-100 flex justify-between items-center">
                <span className="font-bold text-blue-800">Task #{task.id}</span>
                <span className="px-2 py-1 bg-blue-200 text-blue-800 text-xs font-bold rounded uppercase">
                  {task.status}
                </span>
              </div>
              <div className="p-6">
                <div className="flex items-start gap-3 mb-4">
                  <Trash2 className="w-5 h-5 text-gray-400 mt-1" />
                  <div>
                    <p className="text-sm text-gray-500">Dustbin ID</p>
                    <p className="font-semibold text-gray-800">#{task.dustbinId}</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 mb-6">
                  <MapPin className="w-5 h-5 text-gray-400 mt-1" />
                  <div>
                    <p className="text-sm text-gray-500">Location</p>
                    <p className="font-semibold text-gray-800">{task.dustbinLocation}</p>
                  </div>
                </div>

                <button 
                  onClick={() => markCompleted(task.id)}
                  className="w-full flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white py-3 rounded-lg font-bold transition-colors"
                >
                  <CheckCircle className="w-5 h-5" />
                  Mark as Collected
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
