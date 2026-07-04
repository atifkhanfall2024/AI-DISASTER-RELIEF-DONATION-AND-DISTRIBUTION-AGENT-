'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { DisasterBadge } from '@/components/Badges';

export default function DonateBrowsePage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [urgency, setUrgency] = useState('all');
  const [sort, setSort] = useState('urgent');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const qs = new URLSearchParams({ status: 'approved' });
    if (urgency !== 'all') qs.set('urgency', urgency);
    if (search) qs.set('search', search);
    setLoading(true);
    fetch(`/api/requests?${qs.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        const order: any = { critical: 4, high: 3, medium: 2, low: 1 };
        let sorted = [...data];
        if (sort === 'urgent') sorted.sort((a, b) => order[b.urgency] - order[a.urgency]);
        else if (sort === 'recent') sorted.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
        else if (sort === 'families') sorted.sort((a, b) => b.familiesAffected - a.familiesAffected);
        setRequests(sorted);
      })
      .finally(() => setLoading(false));
  }, [search, urgency, sort]);

  const urgencyBadgeStyle: Record<string, string> = {
    critical: 'bg-brand-rust/90 border-brand-rust',
    high: 'bg-orange-500/90 border-orange-600',
    medium: 'bg-brand-amber/90 border-brand-amber',
    low: 'bg-emerald-500/90 border-emerald-600'
  };

  return (
    <div className="min-h-screen py-8 px-4 md:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 text-center max-w-2xl mx-auto">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900 mb-3">Fund Verified Needs</h1>
          <p className="text-slate-500 text-base">Browse AI-verified requests and provide direct relief to affected communities. 100% transparent.</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.05)] flex flex-wrap gap-3 items-center justify-between mb-8">
          <div className="flex gap-3 flex-wrap flex-1">
            <div className="relative w-full sm:w-64 max-w-xs">
              <iconify-icon icon="solar:map-point-linear" class="absolute left-3 top-2.5 text-slate-400"></iconify-icon>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search region or city..."
                className="w-full border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm bg-slate-50 focus:outline-none focus:bg-white dark:bg-slate-900 focus:ring-1 focus:ring-brand-teal transition"
              />
            </div>
            <select
              value={urgency}
              onChange={(e) => setUrgency(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 focus:outline-none focus:ring-1 focus:ring-brand-teal"
            >
              <option value="all">All Urgency Levels</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-slate-500">Sort by:</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="border-none font-medium text-brand-blue bg-transparent focus:outline-none cursor-pointer"
            >
              <option value="urgent">Most Urgent</option>
              <option value="recent">Most Recent</option>
              <option value="families">Most Families</option>
            </select>
          </div>
        </div>

        {loading && <p className="text-slate-400 text-center">Loading requests…</p>}
        {!loading && requests.length === 0 && <p className="text-slate-400 text-center">No approved requests match these filters yet.</p>}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {requests.map((r) => {
            const pct = r.donationGoal ? Math.min(100, Math.round((r.donationRaised / r.donationGoal) * 100)) : 0;
            return (
              <Link
                key={r._id}
                href={`/donate/${r._id}`}
                className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.05)] overflow-hidden flex flex-col group cursor-pointer hover:shadow-md transition"
              >
                <div className="h-40 bg-gradient-to-tr from-brand-teal/20 to-brand-blue/10 relative flex items-center justify-center">
                  <iconify-icon icon="solar:map-point-bold" class="text-4xl text-brand-teal/40"></iconify-icon>
                  <div className="absolute top-3 left-3 bg-white/90 rounded-md shadow-sm">
                    <DisasterBadge type={r.disasterType} />
                  </div>
                  <div className={`absolute top-3 right-3 text-white text-[10px] font-semibold px-2 py-1 rounded-md backdrop-blur-sm border uppercase tracking-wider flex items-center gap-1 shadow-sm ${urgencyBadgeStyle[r.urgency]}`}>
                    {r.urgency}
                  </div>
                </div>
                <div className="p-5 flex-1 flex flex-col">
                  <h3 className="font-semibold text-slate-900 text-lg leading-tight group-hover:text-brand-teal transition mb-2">
                    {r.area}{r.district ? `, ${r.district}` : ''}
                  </h3>
                  <div className="text-sm text-slate-500 mb-4 flex items-center gap-2 border-b border-slate-100 pb-4">
                    <iconify-icon icon="solar:users-group-two-rounded-linear"></iconify-icon> {r.familiesAffected} Families Affected
                  </div>
                  <div className="mb-4 flex-1">
                    <div className="text-xs text-slate-500 font-medium mb-1.5">Verified Needs:</div>
                    <div className="flex flex-wrap gap-1.5">
                      {r.items?.slice(0, 3).map((i: string) => (
                        <span key={i} className="px-2 py-1 bg-slate-50 border border-slate-200 text-slate-600 rounded text-[11px] font-medium">{i}</span>
                      ))}
                    </div>
                  </div>
                  <div className="mb-4">
                    <div className="flex justify-between text-xs font-medium mb-1">
                      <span className="text-slate-500">Donation Goal</span>
                      <span className="text-brand-teal">{pct}% Funded</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div className="bg-brand-teal h-full rounded-full" style={{ width: `${pct}%` }}></div>
                    </div>
                  </div>
                  <span className="w-full text-center bg-white dark:bg-slate-900 border border-brand-teal text-brand-teal py-2 rounded-lg font-medium group-hover:bg-brand-teal group-hover:text-white transition shadow-sm text-sm">
                    Contribute
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
