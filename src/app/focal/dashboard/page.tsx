'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { UrgencyBadge, StatusBadge, DisasterBadge } from '@/components/Badges';

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
    approved: requests.filter((r) => r.status === 'approved').length,
    fulfilled: requests.filter((r) => r.status === 'fulfilled').length
  };

  if (session?.user && (session.user as any).focalStatus !== 'approved') {
    return <PendingVerification session={session} />;
  }

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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
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
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="text-slate-500 text-xs mb-1">Fulfilled</div>
            <div className="text-2xl font-semibold text-brand-blue tracking-tight">{stats.fulfilled}</div>
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
                  <th className="px-5 py-3">Type</th>
                  <th className="px-5 py-3">Urgency</th>
                  <th className="px-5 py-3">Families</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {loading && (
                  <tr><td className="px-5 py-6 text-slate-400" colSpan={8}>Loading…</td></tr>
                )}
                {!loading && requests.length === 0 && (
                  <tr><td className="px-5 py-6 text-slate-400" colSpan={8}>No requests submitted yet.</td></tr>
                )}
                {requests.map((r) => (
                  <tr key={r._id} className="hover:bg-slate-50 transition">
                    <td className="px-5 py-4 font-medium text-slate-900">#{r._id.slice(-6).toUpperCase()}</td>
                    <td className="px-5 py-4 text-slate-600">{r.area}{r.district ? `, ${r.district}` : ''}</td>
                    <td className="px-5 py-4"><DisasterBadge type={r.disasterType} /></td>
                    <td className="px-5 py-4"><UrgencyBadge urgency={r.urgency} /></td>
                    <td className="px-5 py-4 text-slate-600">{r.familiesAffected}</td>
                    <td className="px-5 py-4"><StatusBadge status={r.status} /></td>
                    <td className="px-5 py-4 text-slate-500">{new Date(r.createdAt).toLocaleDateString()}</td>
                    <td className="px-5 py-4">
                      {(r.status === 'approved' || r.status === 'fulfilled') && (
                        <Link
                          href={`/focal/distribute/${r._id}`}
                          className="inline-flex items-center gap-1 text-xs font-medium text-brand-teal border border-brand-teal/30 bg-brand-teal/5 px-2.5 py-1 rounded-lg hover:bg-brand-teal/10 transition"
                        >
                          <iconify-icon icon="solar:box-minimalistic-linear"></iconify-icon>
                          {r.status === 'approved' ? 'Record Distribution' : 'View Distributions'}
                        </Link>
                      )}
                    </td>
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

function PendingVerification({ session }: { session: any }) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState('');
  const [error, setError] = useState('');
  const status = session?.user?.focalStatus;

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      // Save document to user profile via a new endpoint or piggyback
      const updateRes = await fetch(`/api/users/${session.user.id}/docs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: data.url })
      });
      if (!updateRes.ok) throw new Error('Failed to attach document to profile.');
      
      setUploadedUrl(data.url);
      setFile(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="min-h-screen bg-brand-cream flex items-center justify-center p-6">
      <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 shadow-lg max-w-md w-full text-center">
        <div className="w-16 h-16 bg-brand-amber/10 text-brand-amber rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
          <iconify-icon icon="solar:shield-warning-bold"></iconify-icon>
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Account Pending Verification</h2>
        <p className="text-slate-600 mb-6 text-sm">
          {status === 'rejected' 
            ? 'Your application has been rejected by an administrator. Please contact support.'
            : 'To prevent fraud, all Focal Persons must be verified. Please upload a clear picture of your CNIC or NGO Affiliation Card.'}
        </p>

        {status === 'pending' && (
          <form onSubmit={handleUpload} className="space-y-4 text-left">
            {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-200">{error}</div>}
            {uploadedUrl && <div className="p-3 bg-emerald-50 text-emerald-700 text-sm rounded-lg border border-emerald-200 flex items-center gap-2"><iconify-icon icon="solar:check-circle-bold"></iconify-icon> Document uploaded successfully. An admin will review it soon.</div>}
            
            <div className="border-2 border-dashed border-slate-300 rounded-xl p-4 text-center hover:bg-slate-50 transition cursor-pointer relative">
              <input 
                type="file" 
                accept="image/*,.pdf" 
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <iconify-icon icon="solar:document-add-linear" class="text-3xl text-slate-400 mb-2"></iconify-icon>
              <div className="text-sm font-medium text-brand-teal">{file ? file.name : 'Tap to select a document'}</div>
              <div className="text-xs text-slate-500 mt-1">JPEG, PNG or PDF (Max 5MB)</div>
            </div>

            <button
              disabled={!file || uploading}
              className="w-full bg-slate-900 text-white py-2.5 rounded-lg font-medium hover:bg-slate-800 transition disabled:opacity-50"
            >
              {uploading ? 'Uploading...' : 'Submit Document'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
