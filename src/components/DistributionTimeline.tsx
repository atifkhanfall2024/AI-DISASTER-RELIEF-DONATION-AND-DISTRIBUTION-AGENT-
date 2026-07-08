'use client';

import { DistributionBadge } from '@/components/Badges';

// Shared renderer for a request's distribution history. Used on the focal
// distribute page, the admin request detail (with onVerify), and the public
// donate page (verified records only — the API scopes that server-side).
export default function DistributionTimeline({
  distributions,
  onVerify,
  verifyingId,
  emptyText = 'No distributions recorded yet.'
}: {
  distributions: any[];
  onVerify?: (id: string) => void;
  verifyingId?: string | null;
  emptyText?: string;
}) {
  if (!distributions.length) {
    return <p className="text-sm text-slate-400">{emptyText}</p>;
  }

  return (
    <div className="space-y-4">
      {distributions.map((d) => (
        <div key={d._id} className="border border-slate-200 rounded-xl p-4 bg-white dark:bg-slate-900">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <DistributionBadge status={d.status} />
              {d.isFinal && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border text-[#185FA5] bg-blue-50 border-blue-200">
                  <iconify-icon icon="solar:flag-bold"></iconify-icon> Final Delivery
                </span>
              )}
            </div>
            <span className="text-xs text-slate-500">{new Date(d.createdAt).toLocaleString()}</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm mb-2">
            <div>
              <div className="text-xs text-slate-500">Families Reached</div>
              <div className="font-semibold text-slate-900">{d.familiesReached}</div>
            </div>
            {d.amountSpent > 0 && (
              <div>
                <div className="text-xs text-slate-500">Funds Used</div>
                <div className="font-semibold text-slate-900">PKR {Number(d.amountSpent).toLocaleString()}</div>
              </div>
            )}
            <div>
              <div className="text-xs text-slate-500">Recorded By</div>
              <div className="font-medium text-slate-700">{d.distributorName}</div>
            </div>
          </div>

          {d.items?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {d.items.map((it: any, i: number) => (
                <span
                  key={`${it.name}-${i}`}
                  className="bg-slate-50 border border-slate-200 text-slate-700 px-2 py-0.5 rounded text-xs font-medium"
                >
                  {it.name} × {it.quantity}
                </span>
              ))}
            </div>
          )}

          {d.location && (
            <div className="text-xs text-slate-500 mb-2 flex items-center gap-1">
              <iconify-icon icon="solar:map-point-linear"></iconify-icon> {d.location}
            </div>
          )}
          {d.notes && <p className="text-xs text-slate-600 mb-2 leading-relaxed">{d.notes}</p>}

          {(d.beneficiaryCnics?.length > 0 || d.flaggedBeneficiaries?.length > 0) && (
            <div className="text-xs mb-2 flex flex-wrap items-center gap-2">
              {d.beneficiaryCnics?.length > 0 && (
                <span className="text-slate-500 flex items-center gap-1">
                  <iconify-icon icon="solar:users-group-rounded-linear"></iconify-icon>
                  {d.beneficiaryCnics.length} beneficiary CNIC(s) recorded
                </span>
              )}
              {d.flaggedBeneficiaries?.length > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-medium border text-[#993C1D] bg-[#993C1D]/10 border-[#993C1D]/20">
                  <iconify-icon icon="solar:shield-warning-bold"></iconify-icon>
                  {d.flaggedBeneficiaries.length} possible duplicate aid
                </span>
              )}
            </div>
          )}

          {d.proofImages?.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-2">
              {d.proofImages.map((img: string) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={img}
                  src={img}
                  alt="Delivery proof"
                  className="aspect-square object-cover rounded-lg border border-slate-200"
                />
              ))}
            </div>
          )}

          {onVerify && d.status === 'recorded' && (
            <button
              onClick={() => onVerify(d._id)}
              disabled={verifyingId === d._id}
              className="mt-3 bg-brand-teal text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-brand-teal/90 transition shadow-sm flex items-center gap-1.5 disabled:opacity-50"
            >
              <iconify-icon icon="solar:verified-check-linear"></iconify-icon>
              {verifyingId === d._id ? 'Verifying…' : 'Verify Distribution'}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
