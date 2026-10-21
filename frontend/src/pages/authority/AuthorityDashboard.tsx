import { useState, useEffect } from 'react';

import { 
  AlertTriangle, CheckCircle, Clock, MapPin, 
  User, AlertOctagon, Send
} from 'lucide-react';

interface Complaint {
  id: number;
  userId: number;
  description: string;
  latitude: number;
  longitude: number;
  status: string;
  imageUrl: string;
  createdAt: string;
}

export default function AuthorityDashboard() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // In a real app we'd fetch complaints here.
    // For now we'll simulate it.
    setTimeout(() => {
      setComplaints([
        {
          id: 1,
          userId: 101,
          description: "Garbage overflow near Main Market",
          latitude: 28.6139,
          longitude: 77.2090,
          status: "PENDING",
          imageUrl: "",
          createdAt: new Date().toISOString(),
        }
      ]);
      setLoading(false);
    }, 1000);
  }, []);

  const assignTask = (complaintId: number) => {
    alert(`Task for complaint #${complaintId} assigned to Collector!`);
  };

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-gray-800 mb-2">Authority Dashboard</h1>
      <p className="text-gray-600 mb-8">Manage complaints and assign tasks to collectors.</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow p-6 border-l-4 border-orange-500">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Pending Complaints</p>
              <h2 className="text-3xl font-bold text-gray-800 mt-2">{complaints.length}</h2>
            </div>
            <div className="bg-orange-100 p-3 rounded-full">
              <AlertOctagon className="w-8 h-8 text-orange-500" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow p-6 border-l-4 border-green-500">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Tasks Completed</p>
              <h2 className="text-3xl font-bold text-gray-800 mt-2">0</h2>
            </div>
            <div className="bg-green-100 p-3 rounded-full">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow p-6 border-l-4 border-blue-500">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Active Collectors</p>
              <h2 className="text-3xl font-bold text-gray-800 mt-2">4</h2>
            </div>
            <div className="bg-blue-100 p-3 rounded-full">
              <User className="w-8 h-8 text-blue-500" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h2 className="text-lg font-bold text-gray-800">Recent Complaints</h2>
        </div>
        
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading complaints...</div>
        ) : complaints.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No active complaints found.</div>
        ) : (
          <div className="divide-y divide-gray-200">
            {complaints.map((complaint) => (
              <div key={complaint.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex justify-between items-start">
                  <div className="flex items-start gap-4">
                    <div className="bg-red-100 p-3 rounded-full mt-1">
                      <AlertTriangle className="w-6 h-6 text-red-500" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-gray-800">{complaint.description}</h3>
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                        <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> Lat: {complaint.latitude}, Lng: {complaint.longitude}</span>
                        <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {new Date(complaint.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-bold uppercase">
                      {complaint.status}
                    </span>
                    <button 
                      onClick={() => assignTask(complaint.id)}
                      className="mt-2 flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                      <Send className="w-4 h-4" />
                      Assign to Collector
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
