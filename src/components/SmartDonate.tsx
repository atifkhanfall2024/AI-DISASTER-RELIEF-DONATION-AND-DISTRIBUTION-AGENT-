'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { UrgencyBadge } from '@/components/Badges';

const PRESETS = [2000, 5000, 10000, 25000];

// The intelligence layer's headline donor feature: give an amount and the
// priority engine splits it across the highest-priority underfunded needs.
export default function SmartDonate() {
  const router = useRouter();
  const [amount, setAmount] = useState(5000);
  const [custom, setCustom] = useState('');
  const [preview, setPreview] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState('');

  const value = custom ? Number(custom) : amount;

  async function loadPreview() {
    setError('');
    setPreview(null);
    if (!value || value < 1) {
      setError('Enter a valid amount.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/priority', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: value })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (!data.allocations?.length) throw new Error('All current needs are fully funded right now. Thank you!');
      setPreview(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function donate() {
    setPaying(true);
    setError('');
    try {
      const res = await fetch('/api/payments/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'general', amount: value })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (data.gateway === 'demo') {
        router.push(data.url);
        return;
      }
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
      setError(e.message);
      setPaying(false);
    }
  }

  return (
    <div className="mb-8 rounded-2xl border border-brand-teal/20 bg-gradient-to-br from-brand-teal/5 to-brand-blue/5 p-6 shadow-sm">
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="lg:w-2/5">
          <div className="inline-flex items-center gap-2 text-brand-teal font-semibold mb-2">
            <iconify-icon icon="solar:bolt-bold" class="text-xl"></iconify-icon>
            Smart Donate
          </div>
          <h2 className="text-xl font-semibold text-slate-900 mb-2 tracking-tight">Give where it&apos;s needed most</h2>
          <p className="text-sm text-slate-500 mb-4">
            Our Relief Priority Index ranks every open need by urgency, scale, credibility and funding gap. Enter an
            amount and we&apos;ll route it to the highest-priority underfunded requests automatically.
          </p>

          <div className="grid grid-cols-4 gap-2 mb-3">
            {PRESETS.map((p) => (
              <button
                key={p}
                onClick={() => {
                  setAmount(p);
                  setCustom('');
                  setPreview(null);
                }}
                className={`py-2 rounded-lg text-sm font-medium transition ${
                  !custom && amount === p
                    ? 'border-2 border-brand-teal bg-brand-teal/10 text-brand-teal'
                    : 'border border-slate-200 text-slate-600 hover:border-brand-teal bg-white dark:bg-slate-900'
                }`}
              >
                {p / 1000}k
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-2 text-slate-400 text-sm">Rs.</span>
              <input
                type="number"
                value={custom}
                onChange={(e) => {
                  setCustom(e.target.value);
                  setPreview(null);
                }}
                placeholder="Custom amount"
                className="w-full border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-sm bg-white dark:bg-slate-900 focus:outline-none focus:border-brand-teal"
              />
            </div>
            <button
              onClick={loadPreview}
              disabled={loading}
              className="bg-white dark:bg-slate-900 border border-brand-teal text-brand-teal px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-teal/5 transition disabled:opacity-50 whitespace-nowrap"
            >
              {loading ? 'Calculating…' : 'Preview split'}
            </button>
          </div>
          {error && <p className="text-red-600 text-xs mt-2">{error}</p>}
        </div>

        <div className="lg:w-3/5 lg:border-l lg:border-slate-200 lg:pl-6">
          {!preview ? (
            <div className="h-full flex items-center justify-center text-center text-slate-400 text-sm py-6">
              <div>
                <iconify-icon icon="solar:pie-chart-2-linear" class="text-3xl mb-2 block"></iconify-icon>
                Enter an amount and hit “Preview split” to see how the engine allocates your donation.
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-slate-900 text-sm">
                  PKR {value.toLocaleString()} → {preview.count} priority area(s)
                </h3>
                <span className="text-xs text-slate-500">Allocated by Relief Priority Index</span>
              </div>
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1 mb-4">
                {preview.allocations.map((a: any) => (
                  <div
                    key={a.requestId}
                    className="flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-200 rounded-lg px-3 py-2"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-900 text-sm truncate">{a.area}</span>
                        <UrgencyBadge urgency={a.urgency} />
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Priority {a.rpi}/100 · will be {a.fundedPctAfter}% funded
                      </div>
                    </div>
                    <div className="font-semibold text-brand-teal text-sm whitespace-nowrap ml-3">
                      PKR {a.amount.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={donate}
                disabled={paying}
                className="w-full bg-brand-teal text-white py-3 rounded-xl font-medium hover:bg-brand-teal/90 transition shadow-sm flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {paying ? 'Redirecting to gateway…' : `Donate PKR ${value.toLocaleString()} to ${preview.count} area(s)`}
                <iconify-icon icon="solar:lock-keyhole-linear"></iconify-icon>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
