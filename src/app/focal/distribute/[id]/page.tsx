'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { UrgencyBadge, StatusBadge, DisasterBadge } from '@/components/Badges';
import DistributionTimeline from '@/components/DistributionTimeline';

interface ItemRow {
  name: string;
  quantity: number;
}

export default function RecordDistributionPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { status: sessionStatus } = useSession();

  const [request, setRequest] = useState<any>(null);
  const [distributions, setDistributions] = useState<any[]>([]);
  const [families, setFamilies] = useState(10);
  const [itemRows, setItemRows] = useState<ItemRow[]>([{ name: '', quantity: 1 }]);
  const [amountSpent, setAmountSpent] = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [isFinal, setIsFinal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (sessionStatus === 'unauthenticated') router.push('/login');
  }, [sessionStatus, router]);

  async function load() {
    const [reqRes, distRes] = await Promise.all([
      fetch(`/api/requests/${id}`),
      fetch(`/api/requests/${id}/distributions`)
    ]);
    setRequest(await reqRes.json());
    const dists = await distRes.json();
    setDistributions(Array.isArray(dists) ? dists : []);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function setRow(i: number, patch: Partial<ItemRow>) {
    setItemRows(itemRows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      // 1. Upload proof photos to Supabase Storage (same flow as request evidence)
      const proofImages: string[] = [];
      for (const file of files) {
        const fd = new FormData();
        fd.append('file', file);
        const res = await fetch('/api/upload', { method: 'POST', body: fd });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        proofImages.push(data.url);
      }

      // 2. Record the distribution
      const res = await fetch(`/api/requests/${id}/distributions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          familiesReached: Number(families),
          items: itemRows
            .filter((r) => r.name.trim())
            .map((r) => ({ name: r.name.trim(), quantity: Number(r.quantity) || 1 })),
          amountSpent: amountSpent ? Number(amountSpent) : 0,
          location: location || undefined,
          notes: notes || undefined,
          proofImages,
          isFinal
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setDone(true);
    } catch (err: any) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!request) return <div className="p-8 text-slate-400">Loading…</div>;

  const spent = distributions.reduce((s, d) => s + (d.amountSpent || 0), 0);
  const remaining = Math.max(0, (request.donationRaised || 0) - spent);
  const canRecord = request.status === 'approved';

  if (done) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4 text-center">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-brand-teal/10 flex items-center justify-center">
          <iconify-icon icon="solar:box-minimalistic-bold" class="text-3xl text-brand-teal"></iconify-icon>
        </div>
        <h1 className="text-2xl font-semibold text-slate-900 mb-2">Distribution recorded</h1>
        <p className="text-slate-500 mb-6">
          Your delivery record for request #{request._id.slice(-6).toUpperCase()} has been submitted and is
          awaiting admin verification.{isFinal && ' Once verified, this request will be marked fulfilled.'}
        </p>
        <div className="flex justify-center gap-3">
          <button
            onClick={() => {
              setDone(false);
              setFiles([]);
              setNotes('');
              setAmountSpent('');
              setItemRows([{ name: '', quantity: 1 }]);
              load();
            }}
            className="bg-white dark:bg-slate-900 border border-slate-200 text-slate-700 px-5 py-2.5 rounded-lg font-medium hover:bg-slate-50 transition"
          >
            Record Another
          </button>
          <button
            onClick={() => router.push('/focal/dashboard')}
            className="bg-brand-teal text-white px-5 py-2.5 rounded-lg font-medium hover:bg-brand-teal/90 transition"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-cream p-6 md:p-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6 flex items-center gap-3">
          <button
            onClick={() => router.push('/focal/dashboard')}
            className="w-8 h-8 bg-white dark:bg-slate-900 border border-slate-200 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition shadow-sm"
          >
            <iconify-icon icon="solar:arrow-left-linear"></iconify-icon>
          </button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Record Aid Distribution</h1>
            <p className="text-slate-500 text-sm">
              Request #{request._id.slice(-6).toUpperCase()} — {request.area}
              {request.district ? `, ${request.district}` : ''}
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 shadow-sm p-5 mb-6">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <StatusBadge status={request.status} />
            <UrgencyBadge urgency={request.urgency} />
            <DisasterBadge type={request.disasterType} />
          </div>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-xs text-slate-500">Funds Raised</div>
              <div className="font-semibold text-slate-900">PKR {(request.donationRaised || 0).toLocaleString()}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Already Distributed</div>
              <div className="font-semibold text-slate-900">PKR {spent.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Available</div>
              <div className="font-semibold text-brand-teal">PKR {remaining.toLocaleString()}</div>
            </div>
          </div>
        </div>

        {!canRecord && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-4 text-sm mb-6">
            {request.status === 'fulfilled'
              ? 'This request has been fulfilled — no further distributions can be recorded.'
              : 'Distributions can only be recorded once the request is approved.'}
          </div>
        )}

        {canRecord && (
          <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 shadow-sm p-6 space-y-5 mb-8">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Families Reached *</label>
              <input
                type="number"
                min={1}
                required
                value={families}
                onChange={(e) => setFamilies(Number(e.target.value))}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-teal focus:ring-1 focus:ring-brand-teal transition bg-white dark:bg-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Items Distributed</label>
              <div className="space-y-2">
                {itemRows.map((row, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      value={row.name}
                      onChange={(e) => setRow(i, { name: e.target.value })}
                      placeholder="e.g. Food Rations"
                      className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-teal focus:ring-1 focus:ring-brand-teal transition bg-white dark:bg-slate-900"
                    />
                    <input
                      type="number"
                      min={1}
                      value={row.quantity}
                      onChange={(e) => setRow(i, { quantity: Number(e.target.value) })}
                      className="w-24 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-teal focus:ring-1 focus:ring-brand-teal transition bg-white dark:bg-slate-900"
                    />
                    <button
                      type="button"
                      onClick={() => setItemRows(itemRows.filter((_, idx) => idx !== i))}
                      disabled={itemRows.length === 1}
                      className="w-9 border border-slate-200 rounded-lg text-slate-400 hover:text-red-500 hover:border-red-200 transition disabled:opacity-30"
                    >
                      <iconify-icon icon="solar:trash-bin-minimalistic-linear"></iconify-icon>
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setItemRows([...itemRows, { name: '', quantity: 1 }])}
                className="mt-2 text-xs text-brand-teal font-medium hover:underline flex items-center gap-1"
              >
                <iconify-icon icon="solar:add-circle-linear"></iconify-icon> Add another item
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Funds Used (PKR, optional)</label>
                <input
                  type="number"
                  min={0}
                  value={amountSpent}
                  onChange={(e) => setAmountSpent(e.target.value)}
                  placeholder={`Available: ${remaining.toLocaleString()}`}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-teal focus:ring-1 focus:ring-brand-teal transition bg-white dark:bg-slate-900"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Delivery Location (optional)</label>
                <input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Relief Camp 2, Main Bazaar"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-teal focus:ring-1 focus:ring-brand-teal transition bg-white dark:bg-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Notes (optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Anything the admin or donors should know about this delivery..."
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-teal focus:ring-1 focus:ring-brand-teal transition bg-white dark:bg-slate-900 resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">
                Delivery Proof Photos <span className="text-slate-400 font-normal">(recommended — max 3)</span>
              </label>
              <label className="border-2 border-dashed border-slate-300 rounded-xl p-6 flex flex-col items-center justify-center text-center hover:bg-slate-50 transition cursor-pointer bg-white dark:bg-slate-900 block">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => setFiles(Array.from(e.target.files || []).slice(0, 3))}
                />
                <iconify-icon icon="solar:camera-add-linear" class="text-2xl text-slate-400 mb-2"></iconify-icon>
                <div className="text-sm font-medium text-slate-700">
                  {files.length ? `${files.length} photo(s) selected` : 'Click to upload delivery photos'}
                </div>
                <div className="text-xs text-slate-500">JPG, PNG (max 5MB each)</div>
              </label>
            </div>

            <label className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl p-4 cursor-pointer">
              <input
                type="checkbox"
                checked={isFinal}
                onChange={(e) => setIsFinal(e.target.checked)}
                className="mt-0.5 accent-brand-blue"
              />
              <span className="text-sm text-slate-700">
                <span className="font-medium text-brand-blue block mb-0.5">This is the final delivery</span>
                All aid for this request has now been distributed. Once an admin verifies this record, the
                request will be marked <strong>fulfilled</strong>.
              </span>
            </label>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">{error}</div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-brand-teal text-white py-3 rounded-xl font-medium hover:bg-brand-teal/90 transition shadow-sm flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {submitting ? 'Recording…' : 'Record Distribution'}
              <iconify-icon icon="solar:box-minimalistic-linear"></iconify-icon>
            </button>
          </form>
        )}

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-base font-semibold text-slate-900 mb-4">Distribution History</h2>
          <DistributionTimeline distributions={distributions} />
        </div>
      </div>
    </div>
  );
}
