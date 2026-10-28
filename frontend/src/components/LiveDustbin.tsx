import { useState } from 'react';
import useLiveDustbin from '../hooks/useLiveDustbin';
import { 
  Activity, Thermometer, Droplets, Wind, Radio, 
  CheckCircle2, AlertTriangle, Clock, RefreshCw, Cpu
} from 'lucide-react';

interface LiveDustbinProps {
  deviceId?: string;
  allowDeviceSelect?: boolean;
}

export default function LiveDustbin({ 
  deviceId: initialDeviceId = 'ESP32_1001',
  allowDeviceSelect = true 
}: LiveDustbinProps) {
  const [selectedDeviceId, setSelectedDeviceId] = useState(initialDeviceId);
  const { data, loading, error } = useLiveDustbin(selectedDeviceId);

  return (
    <div className="w-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm mb-6 transition-all">
      {/* Header with Live Status Pulse & Device Switcher */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
            <Radio className="w-5 h-5 animate-pulse" />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Live IoT Telemetry
              </h2>
              <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300">
                Firebase Realtime
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Direct WebSocket stream from Firebase RTDB node: <code className="font-mono text-emerald-600 dark:text-emerald-400">liveDustbins/{selectedDeviceId}</code>
            </p>
          </div>
        </div>

        {/* Device Switcher */}
        {allowDeviceSelect && (
          <div className="flex items-center gap-2 self-stretch sm:self-auto">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">
              Monitored Device:
            </span>
            <select
              value={selectedDeviceId}
              onChange={(e) => setSelectedDeviceId(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs font-semibold rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="ESP32_1001">ESP32_1001 (BIN1001)</option>
              <option value="ESP32_101">ESP32_101 (Bin #101)</option>
              <option value="ESP32_102">ESP32_102 (Bin #102)</option>
            </select>
          </div>
        )}
      </div>

      {/* Main Body States */}
      {loading ? (
        <div className="py-12 flex flex-col items-center justify-center text-slate-500 gap-3">
          <RefreshCw className="w-8 h-8 animate-spin text-emerald-500" />
          <p className="text-sm font-medium">Connecting to live sensors via Firebase...</p>
        </div>
      ) : error ? (
        <div className="py-8 px-4 my-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-400 flex items-center gap-3">
          <AlertTriangle className="w-6 h-6 flex-shrink-0" />
          <div>
            <p className="font-semibold text-sm">Firebase Realtime Error</p>
            <p className="text-xs">{error}</p>
          </div>
        </div>
      ) : !data ? (
        <div className="py-10 text-center text-slate-500">
          <Cpu className="w-8 h-8 mx-auto mb-2 text-slate-400 opacity-60" />
          <p className="text-sm">No readings available yet for <code className="font-mono font-semibold">{selectedDeviceId}</code>.</p>
          <p className="text-xs text-slate-400 mt-1">Send a telemetry packet to see real-time updates.</p>
        </div>
      ) : (() => {
        const fill = Number(data.fillPercent ?? data.fillLevel ?? 0);
        const isFull = fill >= 80;
        const lastUpdatedText = data.lastUpdated 
          ? new Date(data.lastUpdated).toLocaleTimeString() 
          : 'Just now';

        return (
          <div className="mt-5 space-y-4">
            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {/* Fill Level Card */}
              <article className="rounded-xl border border-slate-100 dark:border-slate-800 p-5 shadow-sm bg-gradient-to-br from-slate-50/50 to-white dark:from-slate-800/40 dark:to-slate-900 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
                    <span className="text-xs font-semibold uppercase tracking-wider">Bin Fill Level</span>
                    <Activity className={`w-4 h-4 ${isFull ? 'text-red-500' : 'text-emerald-500'}`} />
                  </div>
                  <p className="text-3xl font-extrabold text-slate-900 dark:text-white">
                    {fill.toFixed(1)}%
                  </p>
                  <div className="mt-3 h-3 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                    <div
                      className={`h-3 rounded-full transition-all duration-500 ${
                        isFull ? 'bg-red-500' : fill > 60 ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.max(0, Math.min(fill, 100))}%` }}
                    />
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold">
                  {isFull ? (
                    <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Full — collection required
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Available & Operational
                    </span>
                  )}
                </div>
              </article>

              {/* Distance Card */}
              <article className="rounded-xl border border-slate-100 dark:border-slate-800 p-5 shadow-sm bg-gradient-to-br from-slate-50/50 to-white dark:from-slate-800/40 dark:to-slate-900 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
                    <span className="text-xs font-semibold uppercase tracking-wider">Distance</span>
                    <span className="text-xs font-mono font-bold text-slate-400">HC-SR04</span>
                  </div>
                  <p className="text-3xl font-extrabold text-slate-900 dark:text-white">
                    {data.distance != null ? `${data.distance} cm` : '—'}
                  </p>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-4">
                  Ultrasonic clearance distance
                </p>
              </article>

              {/* Temperature Card */}
              <article className="rounded-xl border border-slate-100 dark:border-slate-800 p-5 shadow-sm bg-gradient-to-br from-slate-50/50 to-white dark:from-slate-800/40 dark:to-slate-900 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
                    <span className="text-xs font-semibold uppercase tracking-wider">Temperature</span>
                    <Thermometer className="w-4 h-4 text-amber-500" />
                  </div>
                  <p className="text-3xl font-extrabold text-slate-900 dark:text-white">
                    {data.temperature != null ? `${data.temperature} °C` : '—'}
                  </p>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-4">
                  DHT11 / Internal Thermal Sensor
                </p>
              </article>

              {/* Humidity Card */}
              <article className="rounded-xl border border-slate-100 dark:border-slate-800 p-5 shadow-sm bg-gradient-to-br from-slate-50/50 to-white dark:from-slate-800/40 dark:to-slate-900 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
                    <span className="text-xs font-semibold uppercase tracking-wider">Humidity</span>
                    <Droplets className="w-4 h-4 text-blue-500" />
                  </div>
                  <p className="text-3xl font-extrabold text-slate-900 dark:text-white">
                    {data.humidity != null ? `${data.humidity}%` : '—'}
                  </p>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-4">
                  Ambient relative humidity
                </p>
              </article>

              {/* MQ Gas Sensor Card */}
              <article className="rounded-xl border border-slate-100 dark:border-slate-800 p-5 shadow-sm bg-gradient-to-br from-slate-50/50 to-white dark:from-slate-800/40 dark:to-slate-900 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
                    <span className="text-xs font-semibold uppercase tracking-wider">MQ5 Gas Sensor</span>
                    <Wind className="w-4 h-4 text-purple-500" />
                  </div>
                  <p className="text-3xl font-extrabold text-slate-900 dark:text-white">
                    {data.airQuality != null ? data.airQuality : (data.gasLevel != null ? data.gasLevel : '—')}
                  </p>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-4">
                  Raw sensor ADC air quality reading
                </p>
              </article>

              {/* Bin Status Card */}
              <article className="rounded-xl border border-slate-100 dark:border-slate-800 p-5 shadow-sm bg-gradient-to-br from-slate-50/50 to-white dark:from-slate-800/40 dark:to-slate-900 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
                    <span className="text-xs font-semibold uppercase tracking-wider">Bin Status</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      isFull ? 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                    }`}>
                      {data.status ?? (isFull ? 'FULL' : 'AVAILABLE')}
                    </span>
                  </div>
                  <p className="text-xl font-bold text-slate-900 dark:text-white">
                    {data.name ?? data.deviceId ?? selectedDeviceId}
                  </p>
                </div>
                <div className="mt-4 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span>Device: <code className="font-mono font-semibold">{data.deviceId ?? selectedDeviceId}</code></span>
                  <span className="flex items-center gap-1 font-mono text-[11px]">
                    <Clock className="w-3 h-3" />
                    {lastUpdatedText}
                  </span>
                </div>
              </article>
            </section>
          </div>
        );
      })()}
    </div>
  );
}
