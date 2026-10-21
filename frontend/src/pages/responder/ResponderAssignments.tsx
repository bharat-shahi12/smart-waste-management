import { useState, useEffect } from 'react';
import api from '../../services/api';
import { useLiveRefresh } from '../../services/liveEvents';
import { MapPin } from 'lucide-react';
import { useLocation } from 'react-router-dom';

export default function ResponderAssignments() {
  const location = useLocation();
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const isHistory = location.pathname.includes('/history');
  const [filter, setFilter] = useState(isHistory ? 'Completed' : 'All');

  const fetchAssignments = async () => {
    try {
      const res = await api.get('/responder/assignments');
      setAssignments(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, []);

  useLiveRefresh(fetchAssignments, ['ASSIGNMENT', 'ASSIGNMENT_UPDATED'], 1000);

  const updateStatus = async (id: number, status: string, note?: string) => {
    try {
      await api.post(`/responder/assignments/${id}/status`, null, {
        params: { status, note }
      });
      fetchAssignments();
    } catch (err) {
      console.error(err);
      alert('Error updating status');
    }
  };

  const filtered = assignments.filter(a => {
    if (isHistory && a.status !== 'COMPLETED') return false;
    
    if (location.pathname.includes('/complaints') && a.type !== 'COMPLAINT') return false;
    if (location.pathname.includes('/pickups') && a.type !== 'PICKUP') return false;
    if (location.pathname.includes('/bin-alerts') && a.type !== 'BIN_COLLECTION') return false;

    if (filter === 'All') return true;
    if (filter === 'Pending') return a.status === 'ASSIGNED';
    if (filter === 'Accepted') return a.status === 'ACCEPTED';
    if (filter === 'In Progress') return ['ON_THE_WAY', 'ARRIVED'].includes(a.status);
    if (filter === 'Completed') return a.status === 'COMPLETED';
    return true;
  });

  const isComplaints = location.pathname.includes('/complaints');
  const isPickups = location.pathname.includes('/pickups');
  const isBinAlerts = location.pathname.includes('/bin-alerts');

  let pageTitle = "My Assignments";
  if (isHistory) pageTitle = "History (Completed Tasks)";
  if (isComplaints) pageTitle = "Complaint Tasks";
  if (isPickups) pageTitle = "Pickup Tasks";
  if (isBinAlerts) pageTitle = "Smart Bin Collections";

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-6">
      <h1 className="text-3xl font-black text-white mb-6">{pageTitle}</h1>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {['All', 'Pending', 'Accepted', 'In Progress', 'Completed'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${
              filter === f 
                ? 'bg-[#FF7A00] text-white' 
                : 'bg-white/5 text-[#A9A5BA] hover:bg-white/10 hover:text-white'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-10 text-[#A9A5BA]">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-10 text-[#A9A5BA]">No assignments found.</div>
      ) : (
        <div className="grid gap-4">
          {filtered.map(a => (
            <div key={a.id} className="bg-[#120822] p-6 rounded-2xl border border-white/5 flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-[#FF7A00]/20 text-[#FF7A00]">
                    {a.type}
                  </span>
                  <span className="text-xs text-[#A9A5BA] font-mono">
                    #{a.id}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                    a.priority === 'HIGH' ? 'bg-red-500/20 text-red-500' : 'bg-blue-500/20 text-blue-500'
                  }`}>
                    {a.priority} Priority
                  </span>
                </div>
                
                <h3 className="text-lg font-bold text-white mb-1">
                  {a.type === 'COMPLAINT' ? a.complaint?.title : 
                   a.type === 'PICKUP' ? 'Waste Pickup' : 
                   'Bin Collection'}
                </h3>
                
                <div className="flex items-center gap-2 text-sm text-[#A9A5BA]">
                  <MapPin className="w-4 h-4" />
                  {a.type === 'COMPLAINT' ? (a.complaint?.dustbin?.locationName || 'Unknown Complaint Location') : 
                   a.type === 'PICKUP' ? (a.pickup?.address || 'Pickup Address Not Provided') : 
                   (a.dustbin?.locationName || 'Unknown Bin Location')}
                </div>
              </div>

              <div className="flex flex-col items-end gap-3 w-full md:w-auto">
                <span className="text-sm font-bold text-white bg-white/10 px-3 py-1 rounded-full">
                  Status: {a.status}
                </span>

                <div className="flex gap-2 w-full md:w-auto">
                  {a.status === 'ASSIGNED' && (
                    <button onClick={() => updateStatus(a.id, 'ACCEPTED')} className="btn-primary w-full md:w-auto px-4 py-2 bg-[#FF7A00] hover:bg-[#FF4D24] text-white rounded-xl font-bold">
                      Accept
                    </button>
                  )}
                  {a.status === 'ACCEPTED' && (
                    <button onClick={() => updateStatus(a.id, 'ON_THE_WAY')} className="btn-primary w-full md:w-auto px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-bold">
                      Start Task
                    </button>
                  )}
                  {a.status === 'ON_THE_WAY' && (
                    <button onClick={() => updateStatus(a.id, 'ARRIVED')} className="btn-primary w-full md:w-auto px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-xl font-bold">
                      Mark Arrived
                    </button>
                  )}
                  {a.status === 'ARRIVED' && (
                    <button onClick={() => {
                      const note = prompt('Completion note (optional):');
                      updateStatus(a.id, 'COMPLETED', note || undefined);
                    }} className="btn-primary w-full md:w-auto px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold">
                      Complete Task
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
