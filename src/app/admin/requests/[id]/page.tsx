'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { UrgencyBadge, DisasterBadge } from '@/components/Badges';

export default function AdminRequestDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [request, setRequest] = useState<any>(null);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [reanalyzing, setReanalyzing] = useState(false);

  async function load() {
    const res = await fetch(`/api/requests/${id}`);
    const data = await res.json();
    setRequest(data);
    setNotes(data.adminNotes || '');
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function act(action: 'approve' | 'reject' | 'fulfill') {
    setBusy(true);
    try {
      const res = await fetch(`/api/requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, adminNotes: notes })
      });
      if (!res.ok) throw new Error((await res.json()).error);
      await load();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function reanalyze() {
    setReanalyzing(true);
    try {
      const res = await fetch(`/api/requests/${id}/analyze`, { method: 'POST' });
      if (!res.ok) throw new Error((await res.json()).error);
      await load();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setReanalyzing(false);
    }
  }

  if (!request) return <div className="p-8 text-slate-400">Loading…</div>;

  const scoreColor =
    request.urgency === 'critical' ? '#993C1D' : request.urgency === 'high' ? '#BA7517' : '#0F6E56';

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/admin/dashboard')}
              className="w-8 h-8 bg-white dark:bg-slate-900 border border-slate-200 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition shadow-sm"
            >
              <iconify-icon icon="solar:arrow-left-linear"></iconify-icon>
            </button>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900 flex items-center gap-2">
                Request #{request._id.slice(-6).toUpperCase()}
                <span className="bg-[#BA7517]/10 text-brand-amber border border-[#BA7517]/20 text-[10px] uppercase font-semibold px-2 py-0.5 rounded-md flex items-center gap-1">
                  <iconify-icon icon="solar:magic-stick-3-linear"></iconify-icon> {request.status.replace('_', ' ')}
                </span>
              </h1>
              <p className="text-slate-500 text-sm">Submitted {new Date(request.createdAt).toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-[0_2px_8px_-4px_rgba(0,0,0,0.05)] border border-slate-200 overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex justify-between items-start">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 mb-1">{request.area}{request.district ? `, ${request.district}` : ''}</h2>
                  <div className="text-sm text-slate-500 flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <iconify-icon icon="solar:user-rounded-linear"></iconify-icon> Focal: {request.focal?.name || 'Unknown'}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <UrgencyBadge urgency={request.urgency} />
                  <DisasterBadge type={request.disasterType} />
                </div>
              </div>
              <div className="p-5 grid grid-cols-2 gap-6 bg-slate-50/50">
                <div>
                  <div className="text-xs text-slate-500 font-medium mb-1 uppercase tracking-wider">Affected Families</div>
                  <div className="text-xl font-semibold text-slate-900 flex items-center gap-2">
                    <iconify-icon icon="solar:users-group-two-rounded-linear" class="text-slate-400"></iconify-icon> {request.familiesAffected}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 font-medium mb-1 uppercase tracking-wider">Items Requested</div>
                  <div className="flex flex-wrap gap-1.5">
                    {request.items?.map((i: string) => (
                      <span key={i} className="bg-white dark:bg-slate-900 border border-slate-200 text-slate-700 px-2 py-0.5 rounded text-xs font-medium">{i}</span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="p-5 border-t border-slate-100">
                <div className="text-xs text-slate-500 font-medium mb-2 uppercase tracking-wider">Focal Person Description</div>
                <p className="text-slate-700 text-sm leading-relaxed">{request.description}</p>
              </div>
            </div>

            {request.images?.length > 0 && (
              <div className="bg-white dark:bg-slate-900 rounded-xl shadow-[0_2px_8px_-4px_rgba(0,0,0,0.05)] border border-slate-200 p-5">
                <h3 className="text-base font-semibold text-slate-900 mb-4">Photographic Evidence</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {request.images.map((img: string) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={img} src={img} alt="Evidence" className="aspect-square object-cover rounded-lg border border-slate-200" />
                  ))}
                </div>
              </div>
            )}

            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-[0_2px_8px_-4px_rgba(0,0,0,0.05)] border border-slate-200 p-2 h-48 relative overflow-hidden flex items-center justify-center">
              <div className="absolute inset-0 bg-slate-100"></div>
              {typeof request.lat === 'number' && typeof request.lng === 'number' ? (
                <>
                  <iconify-icon icon="solar:map-point-bold" class="text-4xl text-brand-rust relative z-10 -mt-4 drop-shadow-md"></iconify-icon>
                  <div className="absolute bottom-2 left-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded text-xs font-medium text-slate-700 shadow-sm border border-slate-200">
                    Lat: {request.lat.toFixed(3)}, Lng: {request.lng.toFixed(3)}
                  </div>
                </>
              ) : (
                <div className="relative z-10 text-sm font-medium text-slate-400">No location data submitted</div>
              )}
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="sticky top-8 bg-[#BA7517]/5 border border-[#BA7517]/20 rounded-xl p-5 shadow-[0_4px_20px_-4px_rgba(186,117,23,0.1)]">
              <div className="flex items-center justify-between text-brand-amber font-semibold text-base mb-6 border-b border-[#BA7517]/20 pb-3">
                <span className="flex items-center gap-2">
                  <iconify-icon icon="solar:magic-stick-3-linear" class="text-xl"></iconify-icon> AI Analysis Report
                </span>
                <button
                  onClick={reanalyze}
                  disabled={reanalyzing}
                  title="Re-run Gemini analysis"
                  className="text-xs bg-white dark:bg-slate-900 border border-brand-amber/30 px-2 py-1 rounded hover:bg-amber-50 transition disabled:opacity-50"
                >
                  {reanalyzing ? '…' : 'Re-scan'}
                </button>
              </div>

              {typeof request.aiScore === 'number' ? (
                <>
                  <div className="flex items-center justify-between mb-6">
                    <div className="text-sm font-medium text-slate-700">Calculated Priority</div>
                    <div
                      className="w-14 h-14 rounded-full border-4 flex items-center justify-center text-xl font-bold shadow-sm bg-white dark:bg-slate-900"
                      style={{ borderColor: scoreColor, color: scoreColor }}
                    >
                      {request.aiScore}
                    </div>
                  </div>

                  {request.aiFlags?.length > 0 && (
                    <div className="space-y-3 mb-6">
                      {request.aiFlags.map((flag: string) => (
                        <div key={flag} className="flex items-start gap-3 bg-white dark:bg-slate-900 p-3 rounded-lg border border-[#BA7517]/20 shadow-sm">
                          <iconify-icon icon="solar:danger-circle-bold" class="text-brand-amber text-lg shrink-0 mt-0.5"></iconify-icon>
                          <div className="text-xs font-semibold text-slate-800">{flag}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="bg-white/50 rounded-lg p-3 text-xs text-slate-700 border border-[#BA7517]/10 mb-8 leading-relaxed">
                    <span className="font-medium block mb-1">AI Reasoning:</span> {request.aiReasoning}
                    {request.aiRecommendation && (
                      <>
                        {' '}Recommended action: <strong>{request.aiRecommendation}</strong>.
                      </>
                    )}
                  </div>
                </>
              ) : (
                <p className="text-sm text-slate-500 mb-6">AI analysis not yet available for this request.</p>
              )}

              <div className="space-y-3">
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add internal admin notes (optional)..."
                  rows={2}
                  className="w-full border border-[#BA7517]/20 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-brand-amber focus:ring-1 focus:ring-brand-amber transition bg-white dark:bg-slate-900 resize-none"
                />
                <button
                  onClick={() => act('approve')}
                  disabled={busy || request.status === 'approved'}
                  className="w-full bg-brand-teal text-white py-2.5 rounded-lg font-medium hover:bg-brand-teal/90 transition shadow-sm text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <iconify-icon icon="solar:check-read-linear"></iconify-icon> Approve Request
                </button>
                <button
                  onClick={() => act('reject')}
                  disabled={busy || request.status === 'rejected'}
                  className="w-full bg-white dark:bg-slate-900 border border-red-200 text-red-600 py-2.5 rounded-lg font-medium hover:bg-red-50 transition shadow-sm text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <iconify-icon icon="solar:close-circle-linear"></iconify-icon> Reject
                </button>
                {request.status === 'approved' && (
                  <button
                    onClick={() => act('fulfill')}
                    disabled={busy}
                    className="w-full bg-brand-blue text-white py-2.5 rounded-lg font-medium hover:bg-brand-blue/90 transition shadow-sm text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <iconify-icon icon="solar:box-minimalistic-linear"></iconify-icon> Mark Fulfilled
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
