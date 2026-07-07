'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

// Built-in "hosted checkout" used when no real gateway keys are configured.
// It exercises the exact same pending → paid/failed lifecycle as JazzCash,
// so the whole payment architecture is demoable with zero external accounts.
export default function DemoGatewayPage() {
  return (
    <Suspense fallback={<div className="p-8 text-slate-400">Loading…</div>}>
      <DemoGatewayContent />
    </Suspense>
  );
}

function DemoGatewayContent() {
  const params = useSearchParams();
  const router = useRouter();
  const ref = params.get('ref') || '';
  const [payment, setPayment] = useState<any>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<'success' | 'fail' | null>(null);

  useEffect(() => {
    if (!ref) return;
    fetch(`/api/payments/${ref}`)
      .then((r) => r.json())
      .then((d) => (d.error ? setError(d.error) : setPayment(d)));
  }, [ref]);

  async function settle(outcome: 'success' | 'fail') {
    setBusy(outcome);
    try {
      const res = await fetch(`/api/payments/${ref}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outcome })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      router.replace(data.redirect);
    } catch (e: any) {
      setError(e.message || 'Payment failed.');
      setBusy(null);
    }
  }

  if (error)
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-100">
        <div className="text-center">
          <p className="text-red-600 mb-3">{error}</p>
          <button onClick={() => router.push('/donate')} className="text-brand-teal font-medium">
            Back to requests
          </button>
        </div>
      </div>
    );
  if (!payment) return <div className="min-h-screen flex items-center justify-center text-slate-400">Loading secure checkout…</div>;

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-4 text-xs uppercase tracking-widest text-slate-400 font-semibold">
          ReliefAid Demo Gateway — Sandbox
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          <div className="bg-slate-900 text-white p-5">
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold flex items-center gap-2">
                <iconify-icon icon="solar:lock-keyhole-bold"></iconify-icon> Secure Checkout
              </span>
              <span className="text-[10px] bg-white/10 border border-white/20 rounded px-2 py-0.5 uppercase">Test Mode</span>
            </div>
            <div className="text-slate-300 text-xs">Transaction {payment.txnRef}</div>
          </div>

          <div className="p-6 space-y-4">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Paying to</span>
              <span className="font-medium text-slate-900">ReliefAid — {payment.requestArea}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Donor</span>
              <span className="font-medium text-slate-900">{payment.donorName}</span>
            </div>
            <div className="flex justify-between items-center border-t border-slate-100 pt-4">
              <span className="text-slate-500 text-sm">Amount</span>
              <span className="text-2xl font-bold text-slate-900">PKR {Number(payment.amount).toLocaleString()}</span>
            </div>

            {payment.status !== 'pending' ? (
              <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-3 text-sm">
                This transaction is already settled ({payment.status}).
              </div>
            ) : (
              <div className="space-y-3 pt-2">
                <button
                  onClick={() => settle('success')}
                  disabled={!!busy}
                  className="w-full bg-brand-teal text-white py-3 rounded-xl font-medium hover:bg-brand-teal/90 transition shadow-sm flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  <iconify-icon icon="solar:card-transfer-bold"></iconify-icon>
                  {busy === 'success' ? 'Processing…' : 'Pay Now (Simulate Success)'}
                </button>
                <button
                  onClick={() => settle('fail')}
                  disabled={!!busy}
                  className="w-full bg-white dark:bg-slate-900 border border-red-200 text-red-600 py-2.5 rounded-xl font-medium hover:bg-red-50 transition text-sm disabled:opacity-60"
                >
                  {busy === 'fail' ? 'Processing…' : 'Simulate Declined Card'}
                </button>
              </div>
            )}
          </div>

          <div className="px-6 pb-5 text-center text-[11px] text-slate-400 leading-relaxed">
            No real money moves here. With JazzCash sandbox keys configured, this step is replaced by the
            real JazzCash hosted checkout.
          </div>
        </div>
      </div>
    </div>
  );
}
