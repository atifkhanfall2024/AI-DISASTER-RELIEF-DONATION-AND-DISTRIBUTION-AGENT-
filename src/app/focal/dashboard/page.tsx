'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { UrgencyBadge, StatusBadge } from '@/components/Badges';

export default function FocalDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
  }, [status, router]);

  useEffect(() => {
    // Server scopes /api/requests to the focal person's own submissions (business rule).
    fetch('/api/requests')
      .then((r) => r.json())
      .then((mine) => setRequests(Array.isArray(mine) ? mine : []))
      .finally(() => setLoading(false));
  }, [session]);

  const stats = {
    total: requests.length,
    pending: requests.filter((r) => r.status === 'needs_approval' || r.status === 'pending').length,
    approved: requests.filter((r) => r.status === 'approved' || r.status === 'fulfilled').length
  };

  return (
    <div className="min-h-screen bg-brand-cream p-6 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 flex flex-col sm:flex-row justify-between sm:items-end gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Focal Person Dashboard</h1>
            <p className="text-slate-500">Track your submitted relief requests and their review status.</p>
          </div>
          <Link
            href="/focal/submit"
            className="bg-brand-teal text-white px-4 py-2.5 rounded-lg font-medium hover:bg-brand-teal/90 transition shadow-sm flex items-center justify-center gap-2"
          >
            <iconify-icon icon="solar:document-add-linear"></iconify-icon> Submit New Request
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="text-slate-500 text-xs mb-1">Total Submitted</div>
            <div className="text-2xl font-semibold text-slate-900 tracking-tight">{stats.total}</div>
          </div>
          <div className="bg-[#BA7517]/5 border border-[#BA7517]/20 p-4 rounded-xl shadow-sm">
            <div className="text-brand-amber font-medium text-xs mb-1">Pending Review</div>
            <div className="text-2xl font-semibold text-brand-amber tracking-tight">{stats.pending}</div>
          </div>
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="text-slate-500 text-xs mb-1">Approved</div>
            <div className="text-2xl font-semibold text-brand-teal tracking-tight">{stats.approved}</div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.05)] overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-white dark:bg-slate-900">
            <h2 className="font-semibold text-slate-900 text-base">Recent Requests</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left whitespace-nowrap">
              <thead className="bg-slate-50 text-slate-500 font-medium text-xs uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="px-5 py-3">ID</th>
                  <th className="px-5 py-3">Location</th>
                  <th className="px-5 py-3">Urgency</th>
                  <th className="px-5 py-3">Families</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {loading && (
                  <tr><td className="px-5 py-6 text-slate-400" colSpan={6}>Loading…</td></tr>
                )}
                {!loading && requests.length === 0 && (
                  <tr><td className="px-5 py-6 text-slate-400" colSpan={6}>No requests submitted yet.</td></tr>
                )}
                {requests.map((r) => (
                  <tr key={r._id} className="hover:bg-slate-50 transition">
                    <td className="px-5 py-4 font-medium text-slate-900">#{r._id.slice(-6).toUpperCase()}</td>
                    <td className="px-5 py-4 text-slate-600">{r.area}{r.district ? `, ${r.district}` : ''}</td>
                    <td className="px-5 py-4"><UrgencyBadge urgency={r.urgency} /></td>
                    <td className="px-5 py-4 text-slate-600">{r.familiesAffected}</td>
                    <td className="px-5 py-4"><StatusBadge status={r.status} /></td>
                    <td className="px-5 py-4 text-slate-500">{new Date(r.createdAt).toLocaleDateString()}</td>
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
