'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function DonationHistoryPage() {
  const { status } = useSession();
  const router = useRouter();
  const [donations, setDonations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login?tab=login');
  }, [status, router]);

  useEffect(() => {
    fetch('/api/donations?mine=1')
      .then((r) => r.json())
      .then((d) => setDonations(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  }, []);

  const total = donations.reduce((sum, d) => sum + d.amount, 0);

  function printReceipt(d: any) {
    const w = window.open('', '_blank', 'width=600,height=700');
    if (!w) return;
    w.document.write(`
      <html><head><title>Receipt ${d.receiptNo}</title>
      <style>
        body { font-family: Inter, system-ui, sans-serif; padding: 40px; color: #1e293b; }
        h1 { color: #0F6E56; font-size: 20px; margin-bottom: 4px; }
        .muted { color: #64748b; font-size: 13px; }
        .box { border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; margin-top: 24px; }
        .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
        .row:last-child { border-bottom: none; }
        .label { color: #64748b; }
        .amount { font-size: 22px; font-weight: 600; color: #0F6E56; }
      </style></head><body>
        <h1>ReliefAid Donation Receipt</h1>
        <div class="muted">Transparency and speed when it matters most.</div>
        <div class="box">
          <div class="row"><span class="label">Receipt No</span><span>${d.receiptNo}</span></div>
          <div class="row"><span class="label">Date</span><span>${new Date(d.createdAt).toLocaleString()}</span></div>
          <div class="row"><span class="label">Donor</span><span>${d.donorName}</span></div>
          <div class="row"><span class="label">Relief Request</span><span>${d.request?.area || '—'}${d.request?.district ? ', ' + d.request.district : ''}</span></div>
          <div class="row"><span class="label">Payment Method</span><span>${d.paymentMethod}</span></div>
          <div class="row"><span class="label">Amount</span><span class="amount">PKR ${d.amount.toLocaleString()}</span></div>
        </div>
        <p class="muted" style="margin-top:24px">This is a system-generated receipt. Thank you for your contribution.</p>
        <script>window.print()</script>
      </body></html>
    `);
    w.document.close();
  }

  return (
    <div className="min-h-screen py-10 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8 flex items-center gap-3">
          <Link
            href="/donate"
            className="w-8 h-8 bg-white dark:bg-slate-900 border border-slate-200 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition shadow-sm"
          >
            <iconify-icon icon="solar:arrow-left-linear"></iconify-icon>
          </Link>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">My Donation History</h1>
            <p className="text-slate-500 text-sm">A record of every contribution you&apos;ve made.</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 rounded-xl p-5 mb-6 flex items-center justify-between shadow-sm">
          <div>
            <div className="text-slate-500 text-xs mb-1">Total Donated</div>
            <div className="text-2xl font-semibold text-brand-teal tracking-tight">PKR {total.toLocaleString()}</div>
          </div>
          <div className="text-right">
            <div className="text-slate-500 text-xs mb-1">Contributions</div>
            <div className="text-2xl font-semibold text-slate-900 tracking-tight">{donations.length}</div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {loading && <div className="p-6 text-slate-400">Loading…</div>}
          {!loading && donations.length === 0 && (
            <div className="p-8 text-center text-slate-400">
              You haven&apos;t made any donations yet.{' '}
              <Link href="/donate" className="text-brand-blue font-medium hover:underline">Browse requests</Link>.
            </div>
          )}
          <div className="divide-y divide-slate-100">
            {donations.map((d) => (
              <div key={d._id} className="p-5 flex items-center justify-between gap-4">
                <div>
                  <div className="font-medium text-slate-900">
                    {d.request?.area || 'Relief Request'}{d.request?.district ? `, ${d.request.district}` : ''}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5 font-mono">{d.receiptNo}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{new Date(d.createdAt).toLocaleString()}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-semibold text-brand-teal">PKR {d.amount.toLocaleString()}</div>
                  <button
                    onClick={() => printReceipt(d)}
                    className="mt-1 text-xs text-brand-blue hover:underline flex items-center gap-1 ml-auto"
                  >
                    <iconify-icon icon="solar:printer-linear"></iconify-icon> Receipt
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
