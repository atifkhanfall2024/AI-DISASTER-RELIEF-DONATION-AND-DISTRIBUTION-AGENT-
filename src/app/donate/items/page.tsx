'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function DonateItemsPage() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const [donor, setDonor] = useState({ name: '', email: '', phone: '' });
  const [location, setLocation] = useState('Main Warehouse - Peshawar');
  const [items, setItems] = useState([{ name: '', category: 'Shelter', quantity: 1, unit: 'pieces', condition: 'new' as 'new' | 'used' }]);

  const dropoffLocations = [
    'Main Warehouse - Peshawar',
    'Alkhidmat Center - Swat',
    'Relief Camp - Nowshera',
    'Collection Point - Charsadda'
  ];

  const categories = ['Shelter', 'Food', 'Medical', 'Clothes', 'Water', 'Other'];

  function setRow(i: number, patch: Partial<typeof items[0]>) {
    setItems(items.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);

    const validItems = items.filter(r => r.name.trim() !== '');
    if (validItems.length === 0) {
      setError('Please add at least one item to pledge.');
      setBusy(false);
      return;
    }

    try {
      const res = await fetch('/api/pledges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          donorName: donor.name,
          donorEmail: donor.email,
          donorPhone: donor.phone,
          dropoffLocation: location,
          items: validItems
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      router.push(`/donate/items/success?trackingId=${data.trackingId}`);
    } catch (err: any) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-brand-cream py-12 px-4 md:px-8">
      <div className="max-w-3xl mx-auto">
        <button
          onClick={() => router.push('/')}
          className="w-10 h-10 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition shadow-sm mb-8"
        >
          <iconify-icon icon="solar:arrow-left-linear" class="text-xl"></iconify-icon>
        </button>

        <div className="mb-10">
          <h1 className="text-4xl font-bold text-slate-900 mb-3 tracking-tight">Donate Relief Items</h1>
          <p className="text-slate-600 text-lg">
            Pledge physical goods like tents, rations, and medical supplies. We will allocate them to the most critical disaster areas.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="bg-white rounded-2xl p-6 md:p-8 border border-slate-200 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900 mb-6 flex items-center gap-2">
              <iconify-icon icon="solar:user-bold" class="text-brand-teal"></iconify-icon> Your Details
            </h2>
            <div className="grid md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Full Name *</label>
                <input
                  required
                  type="text"
                  value={donor.name}
                  onChange={e => setDonor({ ...donor, name: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:outline-none focus:border-brand-teal focus:ring-1 focus:ring-brand-teal"
                  placeholder="e.g. Ali Khan"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Phone Number *</label>
                <input
                  required
                  type="tel"
                  value={donor.phone}
                  onChange={e => setDonor({ ...donor, phone: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:outline-none focus:border-brand-teal focus:ring-1 focus:ring-brand-teal"
                  placeholder="e.g. 0300 1234567"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Email Address *</label>
                <input
                  required
                  type="email"
                  value={donor.email}
                  onChange={e => setDonor({ ...donor, email: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl px-4 py-3 focus:outline-none focus:border-brand-teal focus:ring-1 focus:ring-brand-teal"
                  placeholder="e.g. ali@example.com"
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 md:p-8 border border-slate-200 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
                <iconify-icon icon="solar:box-minimalistic-bold" class="text-brand-rust"></iconify-icon> Items to Donate
              </h2>
              <button
                type="button"
                onClick={() => setItems([...items, { name: '', category: 'Shelter', quantity: 1, unit: 'pieces', condition: 'new' }])}
                className="text-sm font-medium text-brand-teal hover:underline flex items-center gap-1 bg-teal-50 px-3 py-1.5 rounded-lg"
              >
                <iconify-icon icon="solar:add-circle-bold"></iconify-icon> Add another item
              </button>
            </div>

            <div className="space-y-4">
              {items.map((item, i) => (
                <div key={i} className="flex flex-col md:flex-row gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl relative group">
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setItems(items.filter((_, idx) => idx !== i))}
                      className="absolute -top-3 -right-3 w-8 h-8 bg-white border border-slate-200 rounded-full text-slate-400 hover:text-red-500 shadow-sm flex items-center justify-center transition"
                    >
                      <iconify-icon icon="solar:trash-bin-trash-bold"></iconify-icon>
                    </button>
                  )}
                  
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-slate-500 mb-1">Item Name</label>
                    <input
                      required
                      value={item.name}
                      onChange={e => setRow(i, { name: e.target.value })}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-teal focus:ring-1 focus:ring-brand-teal"
                      placeholder="e.g. Winter Blankets"
                    />
                  </div>
                  
                  <div className="w-full md:w-32">
                    <label className="block text-xs font-medium text-slate-500 mb-1">Category</label>
                    <select
                      value={item.category}
                      onChange={e => setRow(i, { category: e.target.value })}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-teal focus:ring-1 focus:ring-brand-teal bg-white"
                    >
                      {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>

                  <div className="w-full md:w-24">
                    <label className="block text-xs font-medium text-slate-500 mb-1">Quantity</label>
                    <input
                      required
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={e => setRow(i, { quantity: Number(e.target.value) })}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-teal focus:ring-1 focus:ring-brand-teal"
                    />
                  </div>

                  <div className="w-full md:w-24">
                    <label className="block text-xs font-medium text-slate-500 mb-1">Unit</label>
                    <input
                      required
                      value={item.unit}
                      onChange={e => setRow(i, { unit: e.target.value })}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-teal focus:ring-1 focus:ring-brand-teal"
                      placeholder="e.g. bags"
                    />
                  </div>

                  <div className="w-full md:w-32">
                    <label className="block text-xs font-medium text-slate-500 mb-1">Condition</label>
                    <select
                      value={item.condition}
                      onChange={e => setRow(i, { condition: e.target.value as 'new'|'used' })}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-teal focus:ring-1 focus:ring-brand-teal bg-white"
                    >
                      <option value="new">New</option>
                      <option value="used">Used (Good)</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-4 italic">
              Note: We only accept new or gently used items. Expired food or damaged clothing will be rejected at the drop-off center.
            </p>
          </div>

          <div className="bg-white rounded-2xl p-6 md:p-8 border border-slate-200 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900 mb-6 flex items-center gap-2">
              <iconify-icon icon="solar:routing-2-bold" class="text-brand-blue"></iconify-icon> Drop-off Preference
            </h2>
            <label className="block text-sm font-medium text-slate-700 mb-2">Select your nearest drop-off center *</label>
            <div className="grid md:grid-cols-2 gap-4">
              {dropoffLocations.map(loc => (
                <label key={loc} className={`border rounded-xl p-4 cursor-pointer transition flex items-start gap-3 ${location === loc ? 'border-brand-blue bg-blue-50/50' : 'border-slate-200 hover:border-slate-300'}`}>
                  <input
                    type="radio"
                    name="location"
                    value={loc}
                    checked={location === loc}
                    onChange={e => setLocation(e.target.value)}
                    className="mt-1 accent-brand-blue"
                  />
                  <div>
                    <div className="font-medium text-slate-900">{loc.split('-')[0]}</div>
                    <div className="text-xs text-slate-500">{loc.split('-')[1]}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-sm flex items-center gap-2">
              <iconify-icon icon="solar:danger-circle-bold" class="text-lg"></iconify-icon> {error}
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full bg-brand-teal text-white py-4 rounded-xl font-semibold text-lg hover:bg-teal-700 transition shadow-lg shadow-brand-teal/20 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {busy ? 'Submitting Pledge...' : 'Submit Item Pledge'}
            {!busy && <iconify-icon icon="solar:arrow-right-linear"></iconify-icon>}
          </button>
        </form>
      </div>
    </div>
  );
}
