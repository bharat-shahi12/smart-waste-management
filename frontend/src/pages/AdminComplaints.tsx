import { useEffect, useState } from 'react';
import type { Complaint } from '../types';
import api, { getImageUrl } from '../services/api';
import { AlertCircle } from 'lucide-react';
import { useLiveRefresh } from '../services/liveEvents';

export default function AdminComplaints() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [updateMessage, setUpdateMessage] = useState('');
  const [updateStatus, setUpdateStatus] = useState('');

  const fetchComplaints = () => {
    api.get('/complaints')
      .then(res => {
        const newComplaints = res.data.sort((a: Complaint, b: Complaint) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setComplaints(newComplaints);
        
        // Update selected complaint if it exists in the new data
        if (selectedComplaint) {
            const updated = newComplaints.find((c: Complaint) => c.id === selectedComplaint.id);
            if (updated) setSelectedComplaint(updated);
        }
      })
      .catch(err => console.log('Complaints API error:', err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchComplaints();
  }, []);

  useLiveRefresh(fetchComplaints, ['COMPLAINT', 'RECONNECTED']);

  const handleUpdate = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedComplaint) return;
      try {
          await api.post(`/complaints/${selectedComplaint.id}/updates`, {
              status: updateStatus,
              message: updateMessage,
              isPublic: true
          });
          // The websocket will update the state
          setUpdateMessage('');
      } catch (err) {
          alert('Failed to update complaint');
      }
  };

  if (loading) return <div className="p-10 flex justify-center">Loading complaints...</div>;

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 min-h-[calc(100vh-8rem)]">
      <h2 className="text-xl font-bold text-gray-900 mb-6">Manage Complaints</h2>
      
      <div className="flex gap-6 h-[calc(100vh-14rem)]">
        {/* List */}
        <div className="w-1/3 border-r pr-4 overflow-y-auto space-y-3">
          {complaints.length === 0 && <p className="text-gray-500 text-sm">No complaints found.</p>}
          {complaints.map(c => (
            <div 
                key={c.id} 
                onClick={() => {
                    setSelectedComplaint(c); 
                    setUpdateStatus(c.status);
                }}
                className={`p-4 rounded-xl cursor-pointer border transition ${selectedComplaint?.id === c.id ? 'bg-blue-50 border-blue-200 shadow-sm' : 'hover:bg-gray-50 border-gray-100'}`}
            >
              <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-mono font-bold text-gray-500">{c.complaintId || `CMP-${c.id}`}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${c.status === 'RESOLVED' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>{c.status}</span>
              </div>
              <h4 className="font-semibold text-gray-800 text-sm">{c.title}</h4>
              <p className="text-xs text-gray-500 truncate mt-1">{c.description}</p>
            </div>
          ))}
        </div>

        {/* Details Panel */}
        <div className="w-2/3 pl-4 overflow-y-auto">
          {selectedComplaint ? (
            <div className="space-y-6">
                <div className="flex justify-between items-start">
                    <div>
                        <h3 className="text-2xl font-bold text-gray-900">{selectedComplaint.title}</h3>
                        <p className="text-sm text-gray-500 mt-1">Reported on {new Date(selectedComplaint.createdAt).toLocaleString()} by User #{selectedComplaint.userId}</p>
                    </div>
                    {selectedComplaint.rating && (
                        <div className="bg-yellow-50 text-yellow-700 px-3 py-1 rounded-lg text-sm font-bold flex items-center gap-1 border border-yellow-200">
                            ★ {selectedComplaint.rating}/5 Rating
                        </div>
                    )}
                </div>

                {selectedComplaint.imageUrl && (
                    <img src={getImageUrl(selectedComplaint.imageUrl)} alt="Evidence" className="w-full max-h-64 object-cover rounded-xl border" />
                )}

                <div className="bg-gray-50 p-4 rounded-xl border">
                    <h4 className="font-semibold text-gray-800 text-sm mb-2">Description</h4>
                    <p className="text-gray-700 text-sm">{selectedComplaint.description}</p>
                </div>

                <div className="bg-white border rounded-xl p-5 shadow-sm">
                    <h4 className="font-semibold text-gray-900 mb-4">Add Update / Change Status</h4>
                    <form onSubmit={handleUpdate} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-600 mb-1">Status</label>
                                <select 
                                    value={updateStatus}
                                    onChange={(e) => setUpdateStatus(e.target.value)}
                                    className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50"
                                >
                                    <option value="PENDING">PENDING</option>
                                    <option value="RECEIVED">RECEIVED</option>
                                    <option value="ASSIGNED">ASSIGNED</option>
                                    <option value="IN_PROGRESS">IN_PROGRESS</option>
                                    <option value="RESOLVED">RESOLVED</option>
                                    <option value="REJECTED">REJECTED</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-1">Message for User</label>
                            <textarea 
                                required
                                value={updateMessage}
                                onChange={(e) => setUpdateMessage(e.target.value)}
                                className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50"
                                rows={3}
                                placeholder="E.g. We have assigned a team to clean this bin."
                            ></textarea>
                        </div>
                        <button type="submit" className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 text-sm transition">
                            Save Update
                        </button>
                    </form>
                </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-400">
                <AlertCircle className="w-12 h-12 mb-3 opacity-20" />
                <p>Select a complaint to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
