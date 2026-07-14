'use client';

import { useSearchParams, useRouter } from 'next/navigation';

export default function ItemPledgeSuccess() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const trackingId = searchParams.get('trackingId');

  if (!trackingId) {
    return (
      <div className="min-h-screen bg-brand-cream flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-sm text-center max-w-sm w-full">
          <p className="text-slate-500 mb-6">Invalid tracking ID</p>
          <button onClick={() => router.push('/')} className="bg-brand-teal text-white px-6 py-2 rounded-lg font-medium">
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-cream py-16 px-4">
      <div className="max-w-2xl mx-auto text-center">
        <div className="w-20 h-20 mx-auto bg-brand-teal/10 rounded-full flex items-center justify-center mb-6">
          <iconify-icon icon="solar:check-circle-bold" class="text-4xl text-brand-teal"></iconify-icon>
        </div>
        
        <h1 className="text-3xl font-bold text-slate-900 mb-2 tracking-tight">Pledge Received!</h1>
        <p className="text-slate-600 mb-8 max-w-md mx-auto">
          Thank you for your generous pledge. Your physical donation will help us provide immediate relief to those affected.
        </p>

        <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm mb-8 text-left">
          <div className="text-center mb-8">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">Your Tracking ID</div>
            <div className="text-4xl md:text-5xl font-bold text-brand-blue font-mono tracking-widest bg-blue-50 py-4 rounded-xl border border-blue-100 inline-block px-8">
              {trackingId}
            </div>
            <p className="text-sm text-slate-500 mt-3">
              Please write this ID on your boxes/packages or show it to the admin when dropping off your items.
            </p>
          </div>

          <hr className="border-slate-100 my-6" />

          <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <iconify-icon icon="solar:info-circle-bold" class="text-brand-amber text-lg"></iconify-icon> Next Steps
          </h3>
          <ol className="space-y-4 text-sm text-slate-600 list-decimal pl-5">
            <li className="pl-2">
              <strong>Pack your items:</strong> Ensure all items are securely packed. Remember, we only accept new or gently used items.
            </li>
            <li className="pl-2">
              <strong>Label your boxes:</strong> Clearly write your Tracking ID (<span className="font-mono font-bold text-brand-blue">{trackingId}</span>) on the outside of all packages.
            </li>
            <li className="pl-2">
              <strong>Drop off:</strong> Bring your items to the drop-off center you selected within the next 7 days.
            </li>
            <li className="pl-2">
              <strong>Verification:</strong> Once received, our team will verify the items and add them to the central relief inventory. You will receive an email confirmation.
            </li>
          </ol>
        </div>

        <button
          onClick={() => router.push('/')}
          className="bg-white border border-slate-200 text-slate-700 px-8 py-3 rounded-xl font-medium hover:bg-slate-50 transition shadow-sm"
        >
          Return to Homepage
        </button>
      </div>
    </div>
  );
}
