'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DisasterBadge } from '@/components/Badges';
import DistributionTimeline from '@/components/DistributionTimeline';

const PRESETS = [500, 1000, 2500, 5000];

export default function DonateFormPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [request, setRequest] = useState<any>(null);
  const [distributions, setDistributions] = useState<any[]>([]);
  const [amount, setAmount] = useState(2500);
  const [customAmount, setCustomAmount] = useState('');
  const [message, setMessage] = useState('');
  const [donorName, setDonorName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch(`/api/requests/${id}`)
      .then((r) => r.json())
      .then(setRequest);
    // Transparency: the API only returns admin-verified distributions to the public.
    fetch(`/api/requests/${id}/distributions`)
      .then((r) => r.json())
      .then((d) => setDistributions(Array.isArray(d) ? d : []));
  }, [id]);

  // Kicks off a real checkout: the server creates a PENDING payment and tells us
  // where to send the donor — the JazzCash hosted page (keys configured) or the
  // built-in demo gateway. The donation record is only created after the gateway
  // confirms payment (see /api/payments/*).
  async function confirmDonation() {
    setSubmitting(true);
    try {
      const finalAmount = customAmount ? Number(customAmount) : amount;
      const res = await fetch('/api/payments/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: id,
          amount: finalAmount,
          message: message || undefined,
          donorName: donorName || undefined
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (data.gateway === 'demo') {
        router.push(data.url);
        return;
      }
      // JazzCash hosted checkout wants a browser form POST — build and submit one.
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = data.form.action;
      for (const [k, v] of Object.entries(data.form.fields as Record<string, string>)) {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = k;
        input.value = v;
        form.appendChild(input);
      }
      document.body.appendChild(form);
      form.submit();
    } catch (e: any) {
      alert(e.message);
      setSubmitting(false);
    }
  }

  if (!request) return <div className="p-8 text-slate-400">Loading…</div>;

  return (
    <div className="min-h-screen bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
        <div className="bg-slate-50 p-5 border-b border-slate-200 flex justify-between items-start relative">
          <button
            onClick={() => router.push('/donate')}
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 bg-white dark:bg-slate-900 rounded-full p-1 border border-slate-200 shadow-sm transition"
          >
            <iconify-icon icon="solar:close-circle-linear" class="text-xl"></iconify-icon>
          </button>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1 text-brand-rust bg-brand-rust/10 border border-brand-rust/20 px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide">
                {request.urgency} Need
              </span>
              <DisasterBadge type={request.disasterType} />
            </div>
            <h2 className="text-xl font-semibold text-slate-900 tracking-tight leading-tight">
              {request.area}{request.district ? `, ${request.district}` : ''} Relief
            </h2>
            <p className="text-slate-500 text-sm mt-1">{request.familiesAffected} Families Affected • Verified by AI</p>
          </div>
        </div>

        <div className="p-6 overflow-y-auto hide-scroll flex-1 space-y-6">
          <div className="flex p-1 bg-slate-100 rounded-xl border border-slate-200/50">
            <button
              type="button"
              className="flex-1 py-2 text-sm font-medium bg-white text-slate-900 shadow-sm rounded-lg border border-slate-200 transition"
            >
              Donate Funds
            </button>
            <button
              type="button"
              disabled
              title="In-kind item donations are coming soon"
              className="flex-1 py-2 text-sm font-medium text-slate-400 cursor-not-allowed rounded-lg transition"
            >
              Donate Items (Coming Soon)
            </button>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-3">Select Amount (PKR)</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
              {PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => {
                    setAmount(p);
                    setCustomAmount('');
                  }}
                  className={`py-2 px-3 rounded-lg text-sm font-medium transition ${
                    !customAmount && amount === p
                      ? 'border-2 border-brand-teal bg-brand-teal/5 text-brand-teal font-semibold shadow-sm'
                      : 'border border-slate-200 text-slate-600 hover:border-brand-teal hover:bg-brand-teal/5 bg-white dark:bg-slate-900'
                  }`}
                >
                  {p.toLocaleString()}
                </button>
              ))}
            </div>
            <div className="relative">
              <span className="absolute left-3 top-2 text-slate-400 text-sm font-medium">Rs.</span>
              <input
                type="number"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                placeholder="Custom amount"
                className="w-full border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-brand-teal focus:ring-1 focus:ring-brand-teal transition bg-white dark:bg-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Your Name (optional)</label>
            <input
              value={donorName}
              onChange={(e) => setDonorName(e.target.value)}
              placeholder="Anonymous Donor"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-teal focus:ring-1 focus:ring-brand-teal transition bg-white dark:bg-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Message of Support (Optional)</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={2}
              placeholder="Leave a message..."
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-teal focus:ring-1 focus:ring-brand-teal transition bg-white dark:bg-slate-900 resize-none"
            />
          </div>

          {distributions.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <iconify-icon icon="solar:box-minimalistic-linear" class="text-brand-teal"></iconify-icon>
                <h3 className="text-sm font-semibold text-slate-900">Where the aid went</h3>
                <span className="text-[10px] uppercase font-semibold text-[#0F6E56] bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                  Admin Verified
                </span>
              </div>
              <DistributionTimeline distributions={distributions} />
            </div>
          )}
        </div>

        <div className="p-5 border-t border-slate-200 bg-slate-50">
          {request.status === 'fulfilled' ? (
            <div className="text-center">
              <div className="bg-blue-50 border border-blue-200 text-brand-blue rounded-xl px-4 py-3 text-sm font-medium flex items-center justify-center gap-2">
                <iconify-icon icon="solar:check-circle-bold"></iconify-icon>
                This request has been fully fulfilled — thank you to everyone who donated!
              </div>
            </div>
          ) : (
            <>
              <button
                onClick={confirmDonation}
                disabled={submitting}
                className="w-full bg-brand-teal text-white py-3 rounded-xl font-medium hover:bg-brand-teal/90 transition shadow-sm text-base flex items-center justify-center gap-2 mb-3 disabled:opacity-60"
              >
                {submitting ? 'Redirecting to gateway…' : 'Proceed to Secure Payment'}
                <iconify-icon icon="solar:lock-keyhole-linear"></iconify-icon>
              </button>
              <p className="text-center text-xs text-slate-500 flex justify-center items-center gap-1">
                <iconify-icon icon="solar:shield-check-linear"></iconify-icon> You&apos;ll complete payment on a secure
                gateway page — your donation is only recorded after the gateway confirms it.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
