import { useEffect, useState } from 'react';
import type { Complaint } from '../../types';
import { ClipboardList, Plus, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import api, { getImageUrl } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useLiveRefresh } from '../../services/liveEvents';

export default function UserComplaints() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  
  const fetchComplaints = () => {
    api.get('/complaints/my')
      .then(res => setComplaints(res.data.sort((a: Complaint, b: Complaint) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())))
      .catch(err => console.log('Complaints API error:', err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (user?.id) fetchComplaints();
  }, [user]);

  useLiveRefresh(fetchComplaints, ['COMPLAINT', 'RECONNECTED']);

  const handleRate = async (complaintId: number, rating: number) => {
    try {
      await api.post(`/complaints/${complaintId}/rate`, { rating });
      setComplaints(prev => prev.map(c => c.id === complaintId ? { ...c, rating } : c));
    } catch (error) {
      console.error('Failed to rate complaint', error);
      alert('Failed to submit rating.');
    }
  };

  if (loading) return <div className="flex justify-center items-center h-48">Loading complaints...</div>;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'RESOLVED': return <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold">Resolved</span>;
      case 'IN_PROGRESS': return <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold">In Progress</span>;
      case 'ASSIGNED': return <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs font-bold">Assigned</span>;
      case 'RECEIVED': return <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-xs font-bold">Received</span>;
      case 'REJECTED': return <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold">Rejected</span>;
      default: return <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-xs font-bold">Pending</span>;
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Complaints</h1>
          <p className="text-gray-500">Track issues you have reported.</p>
        </div>
        <Link to="/user/report" className="flex items-center bg-green-600 text-white px-4 py-2 rounded-xl hover:bg-green-700 transition font-medium">
          <Plus className="w-5 h-5 mr-1" /> New Report
        </Link>
      </div>

      {complaints.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center text-center">
          <div className="bg-green-50 p-4 rounded-full mb-4">
            <ClipboardList className="w-12 h-12 text-green-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">No complaints yet</h2>
          <p className="text-gray-500 max-w-sm mb-6">You haven't reported any issues. If you see an overflowing or damaged smart bin, report it here.</p>
          <Link to="/user/report" className="bg-green-600 text-white px-6 py-2 rounded-xl hover:bg-green-700 font-bold transition">Report an Issue</Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {complaints.map(c => (
            <div key={c.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col sm:flex-row justify-between gap-4">
              <div className="flex gap-4">
                {c.imageUrl && (
                  <img src={getImageUrl(c.imageUrl)} alt="Complaint" className="w-24 h-24 object-cover rounded-xl shadow-sm border border-gray-200" />
                )}
                <div>
                  <div className="flex items-center space-x-3 mb-2">
                    <span className="font-mono text-sm text-gray-500 font-bold">{c.complaintId || `CMP-${c.id}`}</span>
                    {getStatusBadge(c.status)}
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">{c.title}</h3>
                  <p className="text-gray-600 text-sm mt-1">{c.dustbin?.name || `Dustbin ID: ${c.dustbinId}`}</p>
                  <p className="text-gray-600 text-sm mt-2">{c.description}</p>
                  <p className="text-xs text-gray-400 mt-2">Reported on: {new Date(c.createdAt).toLocaleDateString()} {new Date(c.createdAt).toLocaleTimeString()}</p>
                </div>
              </div>
              
              <div className="flex flex-col justify-end items-end">
                {c.status === 'RESOLVED' && (
                  <div className="flex flex-col items-end">
                    <p className="text-xs text-gray-500 mb-1 font-semibold">{c.rating ? 'Your Rating' : 'Rate Resolution'}</p>
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map(star => (
                        <button 
                          key={star} 
                          onClick={() => !c.rating && handleRate(c.id, star)}
                          disabled={!!c.rating}
                          className={`${c.rating && star <= c.rating ? 'text-yellow-400' : 'text-gray-300'} ${!c.rating && 'hover:text-yellow-400'} transition p-1`}
                        >
                          <Star className="w-5 h-5 fill-current" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
