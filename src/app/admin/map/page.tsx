'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useSession } from 'next-auth/react';

// Leaflet touches `window` at import time — load the map client-side only.
const RequestsMap = dynamic(() => import('@/components/RequestsMap'), {
  ssr: false,
  loading: () => <div className="h-[520px] flex items-center justify-center text-slate-400">Loading map…</div>
});

const URGENCIES = [
  { value: 'all', label: 'All urgencies' },
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' }
];

const STATUSES = [
  { value: 'all', label: 'All statuses' },
  { value: 'needs_approval', label: 'Needs Approval' },
  { value: 'approved', label: 'Approved' },
  { value: 'fulfilled', label: 'Fulfilled' },
  { value: 'rejected', label: 'Rejected' }
];

const LEGEND = [
  { label: 'Critical', color: '#993C1D' },
  { label: 'High', color: '#ea580c' },
  { label: 'Medium', color: '#BA7517' },
  { label: 'Low', color: '#047857' }
];

export default function AdminMapPage() {
  const { data: session } = useSession();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [urgency, setUrgency] = useState('all');
  const [status, setStatus] = useState('all');

  useEffect(() => {
    fetch('/api/requests')
      .then((r) => r.json())
      .then((d) => setRequests(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(
    () =>
      requests.filter(
        (r) => (urgency === 'all' || r.urgency === urgency) && (status === 'all' || r.status === status)
      ),
    [requests, urgency, status]
  );
  const mapped = filtered.filter((r) => typeof r.lat === 'number' && typeof r.lng === 'number');

  return (
    <div className="min-h-screen bg-brand-cream p-6 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6 flex flex-col sm:flex-row justify-between sm:items-end gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Relief Map</h1>
            <p className="text-slate-500">Every GPS-tagged request across the country, colored by urgency.</p>
          </div>
          {session?.user?.role === 'super-admin' && (
            <Link
              href="/admin/analytics"
              className="bg-white dark:bg-slate-900 border border-slate-200 text-slate-700 px-4 py-2 rounded-lg font-medium hover:bg-slate-50 transition text-sm flex items-center gap-2 self-start sm:self-auto"
            >
              <iconify-icon icon="solar:chart-2-linear"></iconify-icon> Analytics
            </Link>
          )}
        </div>

        {/* Filters in one row above the map */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <select
            value={urgency}
            onChange={(e) => setUrgency(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-900 focus:outline-none focus:border-brand-teal"
          >
            {URGENCIES.map((u) => (
              <option key={u.value} value={u.value}>{u.label}</option>
            ))}
          </select>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-900 focus:outline-none focus:border-brand-teal"
          >
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <div className="flex items-center gap-4 ml-auto text-xs text-slate-600">
            {LEGEND.map((l) => (
              <span key={l.label} className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full border-2 border-white shadow" style={{ background: l.color }}></span>
                {l.label}
              </span>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 shadow-sm p-2">
          {loading ? (
            <div className="h-[520px] flex items-center justify-center text-slate-400">Loading requests…</div>
          ) : (
            <RequestsMap requests={filtered} height={520} />
          )}
        </div>

        <p className="text-xs text-slate-500 mt-3">
          Showing {mapped.length} of {filtered.length} matching requests on the map
          {filtered.length - mapped.length > 0 && ` — ${filtered.length - mapped.length} have no GPS coordinates`}
          .
        </p>
      </div>
    </div>
  );
}
