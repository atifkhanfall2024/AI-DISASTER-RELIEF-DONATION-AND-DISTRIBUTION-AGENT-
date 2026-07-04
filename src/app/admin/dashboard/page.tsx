'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { UrgencyBadge, StatusBadge } from '@/components/Badges';
import ThemeToggle from '@/components/ThemeToggle';

export default function AdminDashboard() {
  const { status } = useSession();
  const router = useRouter();
  const [requests, setRequests] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [urgencyFilter, setUrgencyFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
  }, [status, router]);

  async function load() {
    setLoading(true);
    const qs = new URLSearchParams();
    if (statusFilter !== 'all') qs.set('status', statusFilter);
    if (urgencyFilter !== 'all') qs.set('urgency', urgencyFilter);
    if (search) qs.set('search', search);
    const [reqRes, statsRes] = await Promise.all([
      fetch(`/api/requests?${qs.toString()}`).then((r) => r.json()),
      fetch('/api/stats').then((r) => r.json())
    ]);
    setRequests(reqRes);
    setStats(statsRes);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, urgencyFilter]);

  return (
    <div className="min-h-screen flex bg-brand-cream">
      <aside className="w-64 bg-slate-900 text-slate-300 fixed h-full hidden md:flex flex-col z-10">
        <div className="p-6 border-b border-slate-800 flex items-center gap-2 text-white font-semibold text-lg tracking-tight">
          <iconify-icon icon="solar:drop-bold" class="text-2xl text-brand-teal"></iconify-icon> FloodAid Admin
        </div>
        <div className="p-4 flex-1">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 px-3">Management</div>
          <nav className="space-y-1">
            <Link href="/admin/dashboard" className="flex items-center gap-3 px-3 py-2 bg-brand-teal text-white rounded-lg font-medium transition">
              <iconify-icon icon="solar:widget-2-linear" class="text-lg"></iconify-icon> All Requests
            </Link>
            <Link href="/admin/logs" className="flex items-center gap-3 px-3 py-2 hover:bg-slate-800 hover:text-white rounded-lg font-medium transition mt-4">
              <iconify-icon icon="solar:history-linear" class="text-lg"></iconify-icon> System Logs
            </Link>
          </nav>
        </div>
      </aside>

      <main className="flex-1 md:ml-64 p-6 md:p-8">
        <div className="mb-8 flex justify-between items-end">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">Admin Command Center</h1>
            <p className="text-slate-500 dark:text-slate-400">Overview of all system activity and AI queue.</p>
          </div>
          <ThemeToggle />
        </div>

        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="text-slate-500 text-xs mb-1">Total Requests</div>
              <div className="text-2xl font-semibold text-slate-900 tracking-tight">{stats.totalRequests}</div>
            </div>
            <div className="bg-[#BA7517]/5 border border-[#BA7517]/20 p-4 rounded-xl shadow-sm">
              <div className="text-brand-amber font-medium text-xs mb-1 flex items-center gap-1">
                <iconify-icon icon="solar:magic-stick-3-linear"></iconify-icon> AI Pending
              </div>
              <div className="text-2xl font-semibold text-brand-amber tracking-tight">{stats.pendingReview}</div>
            </div>
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="text-slate-500 text-xs mb-1">Approved</div>
              <div className="text-2xl font-semibold text-brand-teal tracking-tight">{stats.approved}</div>
            </div>
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="text-slate-500 text-xs mb-1">Rejected</div>
              <div className="text-2xl font-semibold text-slate-400 tracking-tight">{stats.rejected}</div>
            </div>
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 shadow-sm col-span-2 md:col-span-1 border-l-4 border-l-brand-blue">
              <div className="text-slate-500 text-xs mb-1">Total Donations</div>
              <div className="text-2xl font-semibold text-brand-blue tracking-tight">PKR {stats.totalDonations.toLocaleString()}</div>
            </div>
          </div>
        )}

        <div className="bg-white dark:bg-slate-900 p-4 rounded-t-xl border border-slate-200 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.05)] border-b-0 flex flex-wrap gap-3 items-center justify-between">
          <div className="flex gap-3 flex-wrap">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm bg-slate-50 focus:outline-none focus:ring-1 focus:ring-brand-teal"
            >
              <option value="all">All Statuses</option>
              <option value="needs_approval">Needs Approval</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="fulfilled">Fulfilled</option>
            </select>
            <select
              value={urgencyFilter}
              onChange={(e) => setUrgencyFilter(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm bg-slate-50 focus:outline-none focus:ring-1 focus:ring-brand-teal"
            >
              <option value="all">All Urgencies</option>
              <option value="critical">Critical Only</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          <div className="relative w-full sm:w-64">
            <iconify-icon icon="solar:magnifer-linear" class="absolute left-3 top-2 text-slate-400"></iconify-icon>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && load()}
              placeholder="Search by location or ID..."
              className="w-full border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 text-sm bg-slate-50 focus:outline-none focus:bg-white dark:bg-slate-900 focus:ring-1 focus:ring-brand-teal transition"
            />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-b-xl border border-slate-200 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.05)] overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-500 font-medium text-xs uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-5 py-3">ID</th>
                <th className="px-5 py-3">Location</th>
                <th className="px-5 py-3">Urgency</th>
                <th className="px-5 py-3 text-center">AI Score</th>
                <th className="px-5 py-3">Flags</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading && <tr><td className="px-5 py-6 text-slate-400" colSpan={7}>Loading…</td></tr>}
              {!loading && requests.length === 0 && (
                <tr><td className="px-5 py-6 text-slate-400" colSpan={7}>No requests match these filters.</td></tr>
              )}
              {requests.map((r) => (
                <tr key={r._id} className="hover:bg-slate-50 transition cursor-pointer" onClick={() => router.push(`/admin/requests/${r._id}`)}>
                  <td className="px-5 py-3 font-medium text-slate-900">#{r._id.slice(-6).toUpperCase()}</td>
                  <td className="px-5 py-3 text-slate-600">{r.area}{r.district ? `, ${r.district}` : ''}</td>
                  <td className="px-5 py-3"><UrgencyBadge urgency={r.urgency} /></td>
                  <td className="px-5 py-3 text-center">
                    {typeof r.aiScore === 'number' ? (
                      <span className="inline-block bg-slate-100 text-slate-700 font-semibold px-2 py-0.5 rounded-full text-xs min-w-[32px] text-center border border-slate-200">
                        {r.aiScore}
                      </span>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-slate-500">{r.aiFlags?.join(', ') || '-'}</td>
                  <td className="px-5 py-3"><StatusBadge status={r.status} /></td>
                  <td className="px-5 py-3 text-right">
                    <button className="bg-white dark:bg-slate-900 border border-slate-200 text-slate-700 px-3 py-1 rounded shadow-sm text-xs font-medium hover:bg-slate-50 transition">
                      Review
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
