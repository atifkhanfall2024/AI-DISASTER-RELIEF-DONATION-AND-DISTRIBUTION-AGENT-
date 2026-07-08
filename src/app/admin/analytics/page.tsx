'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  AreaChart,
  Area
} from 'recharts';

// Chart palettes validated with the dataviz six-checks validator (light + dark).
const PALETTE = {
  light: { teal: '#047857', amber: '#BA7517', blue: '#185FA5', rust: '#993C1D' },
  dark: { teal: '#059669', amber: '#D97706', blue: '#3B82F6', rust: '#C2410C' }
};

const DISASTER_LABELS: Record<string, string> = {
  flood: '🌊 Flood',
  earthquake: '🏚️ Earthquake',
  landslide: '⛰️ Landslide',
  storm: '🌪️ Storm',
  drought: '☀️ Drought',
  fire: '🔥 Fire',
  epidemic: '🦠 Epidemic',
  other: '🆘 Other'
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  needs_approval: 'Needs Approval',
  approved: 'Approved',
  rejected: 'Rejected',
  fulfilled: 'Fulfilled'
};

/** Track the app's dark-mode class so chart colors follow the active theme. */
function useIsDark() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const html = document.documentElement;
    const update = () => setDark(html.classList.contains('dark'));
    update();
    const obs = new MutationObserver(update);
    obs.observe(html, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);
  return dark;
}

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<any>(null);
  const [priority, setPriority] = useState<any[]>([]);
  const [error, setError] = useState('');
  const dark = useIsDark();
  const C = dark ? PALETTE.dark : PALETTE.light;
  const gridStroke = dark ? '#334155' : '#e2e8f0';
  const tickFill = dark ? '#94a3b8' : '#64748b';
  const tooltipStyle = {
    background: dark ? '#0f172a' : '#ffffff',
    border: `1px solid ${dark ? '#334155' : '#e2e8f0'}`,
    borderRadius: 8,
    fontSize: 12
  };

  useEffect(() => {
    fetch('/api/analytics')
      .then((r) => r.json())
      .then((d) => (d.error ? setError(d.error) : setData(d)));
    fetch('/api/priority')
      .then((r) => r.json())
      .then((d) => setPriority(Array.isArray(d) ? d : []));
  }, []);

  if (error) return <div className="p-8 text-red-600">{error}</div>;
  if (!data) return <div className="p-8 text-slate-400">Loading analytics…</div>;

  const statusColor: Record<string, string> = {
    pending: dark ? '#64748b' : '#94a3b8',
    needs_approval: C.amber,
    approved: C.teal,
    rejected: C.rust,
    fulfilled: C.blue
  };

  const disasterData = data.byDisaster.map((d: any) => ({
    ...d,
    label: DISASTER_LABELS[d.type] || d.type
  }));
  const statusData = data.byStatus.map((s: any) => ({
    ...s,
    label: STATUS_LABELS[s.status] || s.status
  }));

  const tiles = [
    { label: 'Total Donated', value: `PKR ${data.totals.donationAmount.toLocaleString()}`, icon: 'solar:heart-bold' },
    { label: 'Donations', value: data.totals.donationCount.toLocaleString(), icon: 'solar:card-transfer-bold' },
    { label: 'Families Reached', value: data.totals.familiesReached.toLocaleString(), icon: 'solar:users-group-two-rounded-bold' },
    { label: 'Funds Distributed', value: `PKR ${data.totals.fundsDistributed.toLocaleString()}`, icon: 'solar:box-minimalistic-bold' }
  ];

  return (
    <div className="min-h-screen bg-brand-cream p-6 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 flex flex-col sm:flex-row justify-between sm:items-end gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Analytics</h1>
            <p className="text-slate-500">Platform-wide relief and donation insights.</p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/admin/map"
              className="bg-white dark:bg-slate-900 border border-slate-200 text-slate-700 px-4 py-2 rounded-lg font-medium hover:bg-slate-50 transition text-sm flex items-center gap-2"
            >
              <iconify-icon icon="solar:map-point-linear"></iconify-icon> Map View
            </Link>
            <Link
              href="/admin/dashboard"
              className="bg-white dark:bg-slate-900 border border-slate-200 text-slate-700 px-4 py-2 rounded-lg font-medium hover:bg-slate-50 transition text-sm flex items-center gap-2"
            >
              <iconify-icon icon="solar:list-check-linear"></iconify-icon> Requests
            </Link>
          </div>
        </div>

        {/* Hero stat tiles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {tiles.map((t) => (
            <div key={t.label} className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-2 text-slate-500 text-xs mb-2">
                <iconify-icon icon={t.icon} class="text-brand-teal"></iconify-icon> {t.label}
              </div>
              <div className="text-2xl font-semibold text-slate-900 tracking-tight">{t.value}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Requests by disaster type — single series, one hue */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 shadow-sm p-5">
            <h2 className="font-semibold text-slate-900 text-base mb-1">Requests by Disaster Type</h2>
            <p className="text-xs text-slate-500 mb-4">All relief requests, grouped by hazard.</p>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={disasterData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }} barCategoryGap="35%">
                <CartesianGrid stroke={gridStroke} strokeDasharray="0" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: tickFill }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: tickFill }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: dark ? '#33415533' : '#e2e8f055' }} contentStyle={tooltipStyle} />
                <Bar dataKey="count" name="Requests" fill={C.teal} radius={[4, 4, 0, 0]} maxBarSize={38} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Requests by status — status colors carry state; labels carry identity */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 shadow-sm p-5">
            <h2 className="font-semibold text-slate-900 text-base mb-1">Requests by Status</h2>
            <p className="text-xs text-slate-500 mb-4">Review pipeline at a glance.</p>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={statusData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }} barCategoryGap="35%">
                <CartesianGrid stroke={gridStroke} strokeDasharray="0" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: tickFill }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: tickFill }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: dark ? '#33415533' : '#e2e8f055' }} contentStyle={tooltipStyle} />
                <Bar dataKey="count" name="Requests" radius={[4, 4, 0, 0]} maxBarSize={38}>
                  {statusData.map((s: any) => (
                    <Cell key={s.status} fill={statusColor[s.status] || C.teal} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Donations over time — single series area */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 shadow-sm p-5">
            <h2 className="font-semibold text-slate-900 text-base mb-1">Donations — Last 30 Days</h2>
            <p className="text-xs text-slate-500 mb-4">PKR received per day.</p>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={data.donationsByDay} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                <CartesianGrid stroke={gridStroke} vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: tickFill }}
                  tickFormatter={(d: string) => d.slice(5)}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: tickFill }}
                  tickFormatter={(v: number) => (v >= 1000 ? `${v / 1000}k` : String(v))}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v: any) => [`PKR ${Number(v).toLocaleString()}`, 'Donated']}
                />
                <Area
                  type="monotone"
                  dataKey="amount"
                  name="Donated"
                  stroke={C.teal}
                  strokeWidth={2}
                  fill={C.teal}
                  fillOpacity={0.12}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Requests over time — single series area */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 shadow-sm p-5">
            <h2 className="font-semibold text-slate-900 text-base mb-1">New Requests — Last 30 Days</h2>
            <p className="text-xs text-slate-500 mb-4">Relief requests submitted per day.</p>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={data.requestsByDay} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid stroke={gridStroke} vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: tickFill }}
                  tickFormatter={(d: string) => d.slice(5)}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: tickFill }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area
                  type="monotone"
                  dataKey="count"
                  name="Requests"
                  stroke={C.blue}
                  strokeWidth={2}
                  fill={C.blue}
                  fillOpacity={0.12}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Relief Priority Index — where the next donation should go */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-6">
          <div className="p-5 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900 text-base flex items-center gap-2">
              <iconify-icon icon="solar:ranking-linear" class="text-brand-teal"></iconify-icon>
              Top Priority Needs
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Open requests ranked by the Relief Priority Index (urgency, scale, AI credibility, funding gap, age).
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left whitespace-nowrap text-sm">
              <thead className="bg-slate-50 text-slate-500 font-medium text-xs uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="px-5 py-3">#</th>
                  <th className="px-5 py-3">Area</th>
                  <th className="px-5 py-3">Urgency</th>
                  <th className="px-5 py-3">Families</th>
                  <th className="px-5 py-3">Funded</th>
                  <th className="px-5 py-3">Still Needed</th>
                  <th className="px-5 py-3">RPI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {priority.length === 0 && (
                  <tr><td className="px-5 py-6 text-slate-400" colSpan={7}>No open requests to prioritize.</td></tr>
                )}
                {priority.map((p, i) => (
                  <tr key={p._id} className="hover:bg-slate-50 transition">
                    <td className="px-5 py-3 text-slate-400 font-medium">{i + 1}</td>
                    <td className="px-5 py-3 font-medium text-slate-900">
                      <Link href={`/admin/requests/${p._id}`} className="hover:text-brand-teal transition">
                        {p.area}{p.district ? `, ${p.district}` : ''}
                      </Link>
                    </td>
                    <td className="px-5 py-3 capitalize text-slate-600">{p.urgency}</td>
                    <td className="px-5 py-3 text-slate-600">{p.familiesAffected}</td>
                    <td className="px-5 py-3 text-slate-600">{p.fundedPct}%</td>
                    <td className="px-5 py-3 text-slate-600">PKR {p.remaining.toLocaleString()}</td>
                    <td className="px-5 py-3">
                      <span className="inline-flex items-center justify-center min-w-[2.5rem] px-2 py-0.5 rounded-md text-xs font-semibold bg-brand-teal/10 text-brand-teal border border-brand-teal/20">
                        {p.rpi}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Table view — most affected areas */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900 text-base">Most Affected Areas</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left whitespace-nowrap text-sm">
              <thead className="bg-slate-50 text-slate-500 font-medium text-xs uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="px-5 py-3">Area</th>
                  <th className="px-5 py-3">Requests</th>
                  <th className="px-5 py-3">Families Affected</th>
                  <th className="px-5 py-3">Funds Raised</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.topAreas.map((a: any) => (
                  <tr key={a.area} className="hover:bg-slate-50 transition">
                    <td className="px-5 py-3 font-medium text-slate-900">{a.area}</td>
                    <td className="px-5 py-3 text-slate-600">{a.requests}</td>
                    <td className="px-5 py-3 text-slate-600">{a.families.toLocaleString()}</td>
                    <td className="px-5 py-3 text-slate-600">PKR {a.raised.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
