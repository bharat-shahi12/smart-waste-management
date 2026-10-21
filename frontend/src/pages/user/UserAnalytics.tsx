import { useState, useEffect, useCallback } from 'react';
import {
  BarChart3, PieChart as PieIcon, TrendingUp, AlertTriangle, Recycle, Package, CheckCircle,
  ScanLine, Truck, Gift, Radio, Sparkles,
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, BarChart, Bar, Legend,
} from 'recharts';
import api from '../../services/api';
import { useLiveRefresh } from '../../services/liveEvents';

const COLORS = ['#FF7A00', '#22C55E', '#38BDF8', '#A855F7', '#F43F5E', '#FACC15', '#14B8A6'];

const tooltipStyle = {
  contentStyle: { background: '#1A0B2E', border: '1px solid rgba(255,122,0,0.3)', borderRadius: 12, color: '#fff' },
  labelStyle: { color: '#FF7A00', fontWeight: 700 },
  itemStyle: { color: '#fff' },
};

function StatCard({ icon: Icon, label, value, unit, sub, accent }: any) {
  return (
    <div className="group relative overflow-hidden rounded-[20px] border border-white/5 bg-gradient-to-br from-[#1A0B2E] to-[#120822] p-5 shadow-[0_10px_40px_rgba(0,0,0,0.3)] transition-all duration-300 hover:-translate-y-1 hover:border-[#FF7A00]/30">
      <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full blur-[40px] opacity-30 transition-opacity group-hover:opacity-60" style={{ background: accent }} />
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-bold uppercase tracking-widest text-[#A9A5BA]">{label}</p>
        <div className="rounded-xl p-2" style={{ background: `${accent}22`, color: accent }}><Icon className="h-4 w-4" /></div>
      </div>
      <h2 className="mt-3 text-3xl font-extrabold text-white">
        {value}<span className="ml-1 text-base text-[#A9A5BA]">{unit}</span>
      </h2>
      {sub && <p className="mt-2 text-xs font-semibold text-[#A9A5BA]">{sub}</p>}
    </div>
  );
}

function Panel({ title, icon: Icon, children, className = '' }: any) {
  return (
    <div className={`rounded-[24px] border border-white/5 bg-[#120822] p-6 shadow-[0_10px_40px_rgba(0,0,0,0.3)] ${className}`}>
      <h3 className="mb-4 flex items-center gap-2 text-base font-bold text-white">
        <Icon className="h-5 w-5 text-[#FF7A00]" /> {title}
      </h3>
      {children}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="flex h-full min-h-[200px] items-center justify-center text-center text-sm font-medium text-[#A9A5BA]">{text}</div>;
}

export default function UserAnalytics() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pulse, setPulse] = useState(false);

  const fetchAnalytics = useCallback(async (fromLive = false) => {
    try {
      const res = await api.get('/analytics/user');
      setAnalytics(res.data);
      setError(null);
      if (fromLive) {
        setPulse(true);
        setTimeout(() => setPulse(false), 1200);
      }
    } catch (err: any) {
      console.error('Failed to fetch analytics', err);
      setError(err?.response?.data?.message || 'Could not load analytics from the server.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);

  // Every persisted action (scan, report, pickup, reward, waste log) updates analytics live
  useLiveRefresh(() => fetchAnalytics(true), [
    'NOTIFICATION', 'COMPLAINT', 'PICKUP', 'REWARD', 'DETECTION', 'WASTE_LOG', 'RECONNECTED',
  ], 500);

  if (loading) return <div className="p-8 text-center text-[#A9A5BA]">Loading analytics…</div>;
  if (error || !analytics) {
    return (
      <div className="mx-auto max-w-xl p-8 text-center">
        <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-red-400" />
        <p className="font-bold text-white">{error || 'No data available'}</p>
        <button id="analytics-retry" onClick={() => fetchAnalytics()} className="mt-4 rounded-xl bg-[#FF7A00] px-5 py-2 text-sm font-bold text-white">Retry</button>
      </div>
    );
  }

  const timeline = analytics.timeline || [];
  const wasteByType = Object.entries(analytics.wasteByType || {}).map(([name, value]) => ({ name, value: Number(Number(value).toFixed(2)) }));
  const detections = Object.entries(analytics.detectionsByCategory || {}).map(([name, value]) => ({ name, value: Number(value) }));
  const hasTimelineData = timeline.some((d: any) => d.scans || d.reports || d.pickups || d.wasteKg);
  const score = Number(analytics.areaCleanlinessScore || 0);

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 pb-12 md:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-3 text-[28px] font-extrabold tracking-wide text-[#FF7A00]">
            <BarChart3 className="h-8 w-8" /> Your Analytics
          </h1>
          <p className="mt-1 text-sm font-medium text-[#A9A5BA]">Every number below is computed live from your saved activity.</p>
        </div>
        <div className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold transition-all duration-500 ${pulse ? 'border-emerald-400 bg-emerald-400/20 text-emerald-300 scale-105' : 'border-white/10 bg-white/5 text-[#A9A5BA]'}`}>
          <Radio className="h-3.5 w-3.5 text-emerald-400 animate-pulse" />
          {pulse ? 'Updated just now' : `Live · ${new Date(analytics.generatedAt || Date.now()).toLocaleTimeString()}`}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={Recycle} label="Recycled" value={Number(analytics.totalWasteRecycled || 0).toFixed(1)} unit="kg" accent="#22C55E"
          sub={`${Number(analytics.recyclingRate || 0).toFixed(1)}% recycling rate`} />
        <StatCard icon={Package} label="Waste Collected" value={Number(analytics.totalWasteCollected || 0).toFixed(1)} unit="kg" accent="#38BDF8"
          sub={`${analytics.pickupsCompleted || 0} completed pickups`} />
        <StatCard icon={ScanLine} label="AI Scans" value={analytics.aiScans || 0} accent="#A855F7"
          sub={`${detections.length} categories identified`} />
        <StatCard icon={Gift} label="Eco Points" value={analytics.totalPoints || 0} unit="pts" accent="#FF7A00" sub="From verified actions" />
        <StatCard icon={AlertTriangle} label="Reports" value={analytics.reportsSubmitted || 0} accent="#F43F5E"
          sub={<span className="flex items-center gap-1 text-emerald-400"><CheckCircle className="h-3 w-3" />{analytics.reportsResolved || 0} resolved</span>} />
        <StatCard icon={Truck} label="Pickup Requests" value={analytics.pickupRequests || 0} accent="#FACC15"
          sub={`${(analytics.pickupRequests || 0) - (analytics.pickupsCompleted || 0)} in progress`} />
        <div className="col-span-2 relative overflow-hidden rounded-[20px] border border-[#FF7A00]/20 bg-gradient-to-br from-[#2A1048] to-[#120822] p-5">
          <p className="text-[11px] font-bold uppercase tracking-widest text-[#A9A5BA]">Cleanliness Score</p>
          <div className="mt-3 flex items-center gap-4">
            <h2 className="text-4xl font-extrabold text-white">{score}<span className="text-base text-[#A9A5BA]">/100</span></h2>
            <div className="h-3 flex-1 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-gradient-to-r from-[#FF4D24] via-[#FF7A00] to-[#22C55E] transition-all duration-1000" style={{ width: `${score}%` }} />
            </div>
          </div>
          <p className="mt-2 flex items-center gap-1 text-xs font-semibold text-[#A9A5BA]"><Sparkles className="h-3 w-3 text-[#FF7A00]" />Based on open vs resolved reports, pickups and scans</p>
        </div>
      </div>

      <Panel title="Last 7 Days Activity" icon={TrendingUp}>
        {hasTimelineData ? (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timeline}>
                <defs>
                  {['scans', 'reports', 'pickups'].map((k, i) => (
                    <linearGradient key={k} id={`g-${k}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={COLORS[i]} stopOpacity={0.5} />
                      <stop offset="100%" stopColor={COLORS[i]} stopOpacity={0} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="name" stroke="#A9A5BA" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} stroke="#A9A5BA" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip {...tooltipStyle} />
                <Legend wrapperStyle={{ color: '#A9A5BA', fontSize: 12 }} />
                <Area type="monotone" dataKey="scans" name="AI Scans" stroke={COLORS[0]} fill="url(#g-scans)" strokeWidth={2} />
                <Area type="monotone" dataKey="reports" name="Reports" stroke={COLORS[1]} fill="url(#g-reports)" strokeWidth={2} />
                <Area type="monotone" dataKey="pickups" name="Pickups" stroke={COLORS[2]} fill="url(#g-pickups)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : <Empty text="No activity in the last 7 days. Scan waste, report an issue or request a pickup to see your trend." />}
      </Panel>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Panel title="AI Detections by Category" icon={PieIcon}>
          {detections.length ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={detections} dataKey="value" nameKey="name" innerRadius={60} outerRadius={100} paddingAngle={3} stroke="none">
                    {detections.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip {...tooltipStyle} />
                  <Legend wrapperStyle={{ color: '#A9A5BA', fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : <Empty text="No AI scans yet. Use AI Detection to classify your first item." />}
        </Panel>

        <Panel title="Collected Waste by Type (kg)" icon={BarChart3}>
          {wasteByType.length ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={wasteByType}>
                  <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="name" stroke="#A9A5BA" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#A9A5BA" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip {...tooltipStyle} cursor={{ fill: 'rgba(255,122,0,0.08)' }} />
                  <Bar dataKey="value" name="kg" radius={[8, 8, 0, 0]}>
                    {wasteByType.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : <Empty text="No collected waste yet. Completed pickups are logged here automatically." />}
        </Panel>
      </div>
    </div>
  );
}
