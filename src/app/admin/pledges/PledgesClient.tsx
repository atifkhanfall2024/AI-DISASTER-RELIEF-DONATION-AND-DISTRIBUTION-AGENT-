'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function PledgesClient({ pledges, inventoryItems }: { pledges: any[], inventoryItems: any[] }) {
  const router = useRouter();
  const [selectedPledge, setSelectedPledge] = useState<any>(null);
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState<'all'|'pending'|'received'>('pending');

  const filtered = pledges.filter(p => filter === 'all' || p.status === filter);

  function openMappingModal(pledge: any) {
    setSelectedPledge(pledge);
    // Initialize mappings: try to guess by name, or default to empty
    const initMap: Record<string, string> = {};
    pledge.items.forEach((item: any) => {
      const match = inventoryItems.find(inv => inv.itemName.toLowerCase() === item.name.toLowerCase());
      initMap[item._id] = match ? match._id : '';
    });
    setMappings(initMap);
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);

    const mappingArray = Object.entries(mappings).map(([pledgeItemId, inventoryId]) => ({
      pledgeItemId,
      inventoryId
    })).filter(m => m.inventoryId !== ''); // Ensure they mapped it

    if (mappingArray.length !== selectedPledge.items.length) {
      alert("Please map all items to Central Inventory before receiving.");
      setBusy(false);
      return;
    }

    try {
      const res = await fetch(`/api/pledges/${selectedPledge._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'receive',
          mappings: mappingArray
        })
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error);
      }

      setSelectedPledge(null);
      router.refresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleReject(id: string) {
    if (!confirm('Are you sure you want to reject this pledge?')) return;
    setBusy(true);
    try {
      await fetch(`/api/pledges/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject' })
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="flex gap-2 mb-6">
        {['pending', 'received', 'all'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f as any)}
            className={`px-4 py-2 rounded-full text-sm font-medium capitalize transition-all ${filter === f ? 'bg-slate-800 text-white dark:bg-white dark:text-slate-900 shadow-md' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
          >
            {f} Pledges
          </button>
        ))}
      </div>

      <div className="grid gap-6">
        {filtered.length === 0 && (
          <div className="text-center py-12 text-slate-500 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
            No pledges found.
          </div>
        )}

        {filtered.map(pledge => (
          <div key={pledge._id} className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col lg:flex-row gap-6">
            <div className="flex-1 space-y-4">
              <div className="flex items-center gap-3">
                <span className="text-xl font-bold font-mono tracking-wider text-brand-blue bg-blue-50 dark:bg-brand-blue/10 px-3 py-1 rounded-lg border border-brand-blue/20">
                  {pledge.trackingId}
                </span>
                <span className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full ${
                  pledge.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                  pledge.status === 'received' ? 'bg-emerald-100 text-emerald-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {pledge.status}
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-500 block mb-1">Donor</span>
                  <div className="font-semibold text-slate-900 dark:text-white">{pledge.donorName}</div>
                  <div className="text-slate-500">{pledge.donorPhone}</div>
                </div>
                <div>
                  <span className="text-slate-500 block mb-1">Drop-off At</span>
                  <div className="font-medium text-slate-700 dark:text-slate-300">{pledge.dropoffLocation}</div>
                </div>
              </div>

              <div>
                <span className="text-slate-500 text-sm block mb-2">Items Pledged</span>
                <div className="flex flex-wrap gap-2">
                  {pledge.items.map((item: any) => (
                    <span key={item._id} className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-lg text-sm flex items-center gap-2">
                      <span className="font-bold text-slate-700 dark:text-slate-200">{item.quantity} {item.unit}</span>
                      <span className="text-slate-600 dark:text-slate-400">{item.name}</span>
                      <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${item.condition === 'new' ? 'bg-brand-teal/10 text-brand-teal' : 'bg-brand-amber/10 text-brand-amber'}`}>
                        {item.condition}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {pledge.status === 'pending' && (
              <div className="flex flex-row lg:flex-col gap-3 justify-center items-end border-t lg:border-t-0 lg:border-l border-slate-100 dark:border-slate-800 pt-4 lg:pt-0 lg:pl-6">
                <button
                  onClick={() => openMappingModal(pledge)}
                  className="w-full bg-brand-teal text-white px-5 py-2.5 rounded-xl font-medium hover:bg-teal-700 transition shadow-sm flex items-center justify-center gap-2"
                >
                  <iconify-icon icon="solar:check-circle-bold"></iconify-icon> Receive Items
                </button>
                <button
                  onClick={() => handleReject(pledge._id)}
                  disabled={busy}
                  className="w-full bg-white dark:bg-slate-800 text-red-600 border border-red-200 dark:border-red-900/50 px-5 py-2.5 rounded-xl font-medium hover:bg-red-50 dark:hover:bg-red-900/20 transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <iconify-icon icon="solar:close-circle-linear"></iconify-icon> Reject
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {selectedPledge && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 w-full max-w-2xl shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <iconify-icon icon="solar:box-minimalistic-bold" class="text-brand-blue"></iconify-icon> Map to Central Inventory
              </h2>
              <button onClick={() => setSelectedPledge(null)} className="text-slate-400 hover:text-slate-600">
                <iconify-icon icon="solar:close-circle-bold" class="text-3xl"></iconify-icon>
              </button>
            </div>

            <div className="bg-blue-50 dark:bg-brand-blue/10 border border-blue-200 dark:border-brand-blue/20 rounded-xl p-4 mb-6 text-sm text-brand-blue dark:text-blue-300">
              <p><strong>Tracking ID: {selectedPledge.trackingId}</strong></p>
              <p>To keep the inventory clean, map the items entered by the donor to the official items in your Central Inventory.</p>
            </div>

            <form onSubmit={handleVerify} className="space-y-6">
              <div className="space-y-4">
                {selectedPledge.items.map((item: any) => (
                  <div key={item._id} className="p-4 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="font-bold">{item.quantity} {item.unit}</span> of <span className="text-brand-rust font-medium">{item.name}</span>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                        Map To Central Inventory:
                      </label>
                      <select
                        required
                        value={mappings[item._id] || ''}
                        onChange={(e) => setMappings({ ...mappings, [item._id]: e.target.value })}
                        className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue bg-white dark:bg-slate-900"
                      >
                        <option value="" disabled>-- Select Inventory Item --</option>
                        {inventoryItems.map(inv => (
                          <option key={inv._id} value={inv._id}>
                            {inv.itemName} (Current Total: {inv.totalQuantity})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setSelectedPledge(null)}
                  className="px-5 py-2.5 rounded-xl font-medium text-slate-600 border border-slate-200 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="bg-brand-teal text-white px-5 py-2.5 rounded-xl font-medium hover:bg-teal-700 transition flex items-center gap-2 disabled:opacity-50"
                >
                  {busy ? 'Processing...' : 'Verify & Add to Inventory'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
