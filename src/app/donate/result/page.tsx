'use client';

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

// Landing page after a gateway settles a payment (demo or JazzCash).
export default function PaymentResultPage() {
  return (
    <Suspense fallback={<div className="p-8 text-slate-400">Loading…</div>}>
      <PaymentResultContent />
    </Suspense>
  );
}

function PaymentResultContent() {
  const params = useSearchParams();
  const router = useRouter();
  const paid = params.get('status') === 'paid';
  const receipt = params.get('receipt') || '';
  const requestId = params.get('request') || '';
  const reason = params.get('reason') || '';
  const split = parseInt(params.get('split') || '1', 10);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 p-10 text-center max-w-md w-full">
        <div
          className={`w-16 h-16 mx-auto mb-6 rounded-full flex items-center justify-center ${
            paid ? 'bg-brand-teal/10' : 'bg-red-50'
          }`}
        >
          <iconify-icon
            icon={paid ? 'solar:check-circle-bold' : 'solar:close-circle-bold'}
            class={`text-3xl ${paid ? 'text-brand-teal' : 'text-red-500'}`}
          ></iconify-icon>
        </div>

        {paid ? (
          <>
            <h1 className="text-xl font-semibold text-slate-900 mb-2">Payment successful — thank you!</h1>
            <p className="text-slate-500 mb-4">
              {split > 1
                ? `Your donation was smart-allocated across ${split} high-priority areas.`
                : 'Your donation has been recorded and will reach verified needs.'}
            </p>
            {receipt && (
              <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 mb-6 text-sm">
                <span className="text-slate-500">{split > 1 ? 'First receipt: ' : 'Receipt No: '}</span>
                <span className="font-mono font-semibold text-slate-800">{receipt}</span>
                {split > 1 && <span className="text-slate-400"> (+{split - 1} more in your history)</span>}
              </div>
            )}
          </>
        ) : (
          <>
            <h1 className="text-xl font-semibold text-slate-900 mb-2">Payment not completed</h1>
            <p className="text-slate-500 mb-6">
              {reason === 'declined'
                ? 'The payment was declined by the gateway. No money was taken.'
                : 'The transaction could not be completed. No money was taken.'}
            </p>
          </>
        )}

        <div className="flex flex-col gap-3">
          {paid ? (
            <button
              onClick={() => router.push('/donate/history')}
              className="bg-brand-teal text-white px-6 py-3 rounded-xl font-medium hover:bg-brand-teal/90 transition"
            >
              View My Donation History
            </button>
          ) : (
            requestId && (
              <button
                onClick={() => router.push(`/donate/${requestId}`)}
                className="bg-brand-teal text-white px-6 py-3 rounded-xl font-medium hover:bg-brand-teal/90 transition"
              >
                Try Again
              </button>
            )
          )}
          <button
            onClick={() => router.push('/donate')}
            className="bg-white dark:bg-slate-900 border border-slate-200 text-slate-700 px-6 py-3 rounded-xl font-medium hover:bg-slate-50 transition"
          >
            Browse More Requests
          </button>
        </div>
      </div>
    </div>
  );
}
