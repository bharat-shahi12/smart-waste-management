import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { dustbinService } from '../../services/dustbinService';
import type { Dustbin  } from '../../types';
import { Battery, Thermometer, Droplets, Wind, RefreshCw } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useLiveRefresh } from '../../services/liveEvents';

export default function UserDustbinDetails() {
  const { id } = useParams<{id: string}>();
  const [bin, setBin] = useState<Dustbin | null>(null);
  const [loading, setLoading] = useState(true);

  // Fake chart data until backend history API is fully integrated
  const mockHistoryData = [
    { time: '10:00', fill: 20 },
    { time: '11:00', fill: 35 },
    { time: '12:00', fill: 45 },
    { time: '13:00', fill: 60 },
    { time: '14:00', fill: 75 },
    { time: '15:00', fill: 87 },
  ];

  const fetchBin = () => {
    if (id) {
      dustbinService.getDustbinById(Number(id))
        .then(setBin)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  };

  useEffect(() => {
    fetchBin();
  }, [id]);

  useLiveRefresh((_, payload: any) => {
    if (payload && payload.id === Number(id)) {
      setBin(payload);
    } else {
      fetchBin();
    }
  }, ['DUSTBIN', 'BIN', 'RECONNECTED']);

  if (loading) return <div>Loading details...</div>;
  if (!bin) return <div className="text-center py-10">Dustbin not found.</div>;

  const isFull = bin.status === 'FULL';

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      {/* Header Info */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{bin.name}</h1>
          <p className="text-gray-500 font-mono text-sm mt-1">{bin.deviceId} • {bin.locationName}</p>
        </div>
        <div className="mt-4 md:mt-0 flex items-center space-x-3">
          <span className="flex items-center text-sm font-medium text-gray-500">
            <RefreshCw className="w-4 h-4 mr-1" />
            Live Updates Active
          </span>
          <div className={`px-4 py-1.5 rounded-full text-sm font-bold ${bin.status === 'OFFLINE' ? 'bg-gray-200 text-gray-700' : 'bg-green-100 text-green-700'}`}>
            {bin.status === 'OFFLINE' ? 'OFFLINE' : 'ONLINE'}
          </div>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Fill Level Big Card */}
        <div className="md:col-span-1 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center relative overflow-hidden">
          <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-6">Current Fill Level</h3>
          
          <div className="relative w-48 h-48 rounded-full border-[12px] border-gray-100 flex items-center justify-center">
            <svg className="absolute inset-0 w-full h-full transform -rotate-90">
              <circle cx="84" cy="84" r="84" className="stroke-current text-gray-100" strokeWidth="12" fill="none" />
              <circle 
                cx="84" cy="84" r="84" 
                className={`stroke-current ${isFull ? 'text-red-500' : (bin.fillLevel > 50 ? 'text-orange-500' : 'text-green-500')}`} 
                strokeWidth="12" fill="none" 
                strokeDasharray="527" 
                strokeDashoffset={527 - (527 * bin.fillLevel) / 100}
                strokeLinecap="round"
              />
            </svg>
            <div className="text-center">
              <span className="text-4xl font-black text-gray-900">{bin.fillLevel}%</span>
              <p className={`font-bold mt-1 ${isFull ? 'text-red-600' : 'text-green-600'}`}>{bin.status}</p>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-6 text-center">Shows how full the dustbin currently is based on HC-SR04 sonar.</p>
        </div>

        {/* Environmental Sensors */}
        <div className="md:col-span-2 grid grid-cols-2 gap-4">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center text-blue-500 mb-2">
              <Thermometer className="w-5 h-5 mr-2" />
              <span className="font-semibold text-sm">Temperature</span>
            </div>
            <span className="text-2xl font-bold text-gray-900">{bin.temperature}°C</span>
            <p className="text-xs text-gray-500 mt-2">Current temperature near the bin.</p>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center text-teal-500 mb-2">
              <Droplets className="w-5 h-5 mr-2" />
              <span className="font-semibold text-sm">Humidity</span>
            </div>
            <span className="text-2xl font-bold text-gray-900">{bin.humidity}%</span>
            <p className="text-xs text-gray-500 mt-2">Environmental humidity.</p>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center text-purple-500 mb-2">
              <Wind className="w-5 h-5 mr-2" />
              <span className="font-semibold text-sm">Air Quality (MQ-135)</span>
            </div>
            <span className="text-2xl font-bold text-gray-900">{bin.airQuality} PPM</span>
            <p className="text-xs text-gray-500 mt-2">Sensor value (higher means worse air).</p>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center text-blue-800 mb-2">
              <Battery className="w-5 h-5 mr-2" />
              <span className="font-semibold text-sm">Moisture / Waste Type</span>
            </div>
            <span className="text-2xl font-bold text-gray-900">{bin.wasteType}</span>
            <p className="text-xs text-gray-500 mt-2">Moisture: {bin.moisture}%. Approx classification.</p>
          </div>
        </div>
      </div>

      {/* History Chart */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-gray-900">Fill Level History (Today)</h3>
        </div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={mockHistoryData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="time" axisLine={false} tickLine={false} />
              <YAxis axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}/>
              <Area type="monotone" dataKey="fill" stroke="#16a34a" strokeWidth={3} fillOpacity={1} fill="url(#colorFill)" />
              <defs>
                <linearGradient id="colorFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#16a34a" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#16a34a" stopOpacity={0}/>
                </linearGradient>
              </defs>
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
