import os

base_dir = "/Users/BHARATSHAHI/Desktop/College-project/frontend/src"

files = {
    f"{base_dir}/pages/user/UserComplaints.tsx": """import { useEffect, useState } from 'react';
import { complaintService } from '../../services/complaintService';
import { Complaint } from '../../types';
import { ClipboardList, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../services/api';

export default function UserComplaints() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // If backend isn't ready for this yet, we just handle the error
    api.get('/complaints/my')
      .then(res => setComplaints(res.data))
      .catch(err => console.log('Complaints API not fully ready:', err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div>Loading complaints...</div>;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'RESOLVED': return <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold">Resolved</span>;
      case 'IN_PROGRESS': return <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold">In Progress</span>;
      case 'UNDER_REVIEW': return <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-xs font-bold">Under Review</span>;
      case 'REJECTED': return <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold">Rejected</span>;
      default: return <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-xs font-bold">Submitted</span>;
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
            <div key={c.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between">
              <div>
                <div className="flex items-center space-x-3 mb-2">
                  <span className="font-mono text-sm text-gray-500">CMP-{c.id}</span>
                  {getStatusBadge(c.status)}
                </div>
                <h3 className="text-lg font-bold text-gray-900">{c.title}</h3>
                <p className="text-gray-600 text-sm mt-1">{c.dustbinName || `Dustbin ID: ${c.dustbinId}`}</p>
                <p className="text-xs text-gray-400 mt-2">Reported on: {new Date(c.createdAt).toLocaleDateString()}</p>
              </div>
              <button className="mt-4 sm:mt-0 text-green-600 font-medium hover:underline text-sm">View Details &rarr;</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
"""
}

for path, content in files.items():
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w') as f:
        f.write(content)

print("User panel scaffolding script part 3 completed")
