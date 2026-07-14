'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function PledgesClient({ pledges, inventoryItems }: { pledges: any[], inventoryItems: any[] }) {
  const router = useRouter();
  const [selectedPledge, setSelectedPledge] = useState<any>(null);
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState<'all'|'pending'|'received'>('pending');
  const [uiError, setUiError] = useState('');
  const [uiSuccess, setUiSuccess] = useState('');
  const [showConfirmReject, setShowConfirmReject] = useState<string | null>(null);

  const [inventoryList, setInventoryList] = useState<any[]>(inventoryItems);
  const [customItemForms, setCustomItemForms] = useState<Record<string, { itemName: string, category: string, unit: string }>>({});
  const [creatingCustomFor, setCreatingCustomFor] = useState<string | null>(null);

  const filtered = pledges.filter(p => filter === 'all' || p.status === filter);

  function openMappingModal(pledge: any) {
    setUiError('');
    setUiSuccess('');
    setSelectedPledge(pledge);
    // Initialize mappings: try to guess by name, or default to empty
    const initMap: Record<string, string> = {};
    const initForms: Record<string, any> = {};
    pledge.items.forEach((item: any) => {
      const match = inventoryList.find(inv => inv.itemName.toLowerCase() === item.name.toLowerCase());
      initMap[item._id] = match ? match._id : '';
      initForms[item._id] = { itemName: item.name, category: item.category || 'Miscellaneous', unit: item.unit };
    });
    setMappings(initMap);
    setCustomItemForms(initForms);
  }

  async function handleCreateCustomItem(pledgeItemId: string) {
    const form = customItemForms[pledgeItemId];
    if (!form || !form.itemName || !form.category || !form.unit) {
      setUiError('Please fill all fields for the custom item.');
      return;
    }
    setCreatingCustomFor(pledgeItemId);
    setUiError('');
    try {
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemName: form.itemName,
          category: form.category,
          unit: form.unit,
          totalQuantity: 0
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      setInventoryList([data, ...inventoryList]);
      setMappings({ ...mappings, [pledgeItemId]: data._id });
    } catch (err: any) {
      setUiError(err.message);
    } finally {
      setCreatingCustomFor(null);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setUiError('');
    setUiSuccess('');
    setBusy(true);

    const mappingArray = Object.entries(mappings).map(([pledgeItemId, inventoryId]) => ({
      pledgeItemId,
      inventoryId
    })).filter(m => m.inventoryId !== '' && m.inventoryId !== '__NEW__'); // Ensure they mapped it

    if (mappingArray.length !== selectedPledge.items.length) {
      setUiError("Please map all items to Central Inventory (or create custom ones) before receiving.");
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
      setUiSuccess('Pledge successfully received and added to inventory! Email sent to donor.');
      router.refresh();
      setTimeout(() => setUiSuccess(''), 5000);
    } catch (err: any) {
      setUiError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleReject(id: string) {
    setBusy(true);
    setUiError('');
    try {
      await fetch(`/api/pledges/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject' })
      });
      setShowConfirmReject(null);
      router.refresh();
    } catch (err: any) {
      setUiError('Failed to reject pledge.');
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

      {uiSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-6 py-4 rounded-xl flex items-center gap-3 shadow-sm mb-6 animate-fade-in-up">
          <iconify-icon icon="solar:check-circle-bold" class="text-2xl"></iconify-icon>
          <div className="font-medium">{uiSuccess}</div>
        </div>
      )}

      {uiError && !selectedPledge && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-xl flex items-center gap-3 shadow-sm mb-6 animate-fade-in-up">
          <iconify-icon icon="solar:danger-triangle-bold" class="text-2xl"></iconify-icon>
          <div className="font-medium">{uiError}</div>
        </div>
      )}

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
                  onClick={() => setShowConfirmReject(pledge._id)}
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

      {showConfirmReject && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in-up">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full shadow-2xl">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <iconify-icon icon="solar:danger-triangle-bold" class="text-3xl"></iconify-icon>
            </div>
            <h3 className="text-xl font-bold text-center text-slate-900 dark:text-white mb-2">Reject Pledge?</h3>
            <p className="text-center text-slate-500 mb-6">Are you sure you want to reject this pledge? This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowConfirmReject(null)} className="flex-1 px-4 py-3 rounded-xl border border-slate-200 font-medium hover:bg-slate-50 transition">Cancel</button>
              <button onClick={() => handleReject(showConfirmReject)} disabled={busy} className="flex-1 px-4 py-3 rounded-xl bg-red-600 text-white font-medium hover:bg-red-700 transition disabled:opacity-50">
                {busy ? 'Processing...' : 'Yes, Reject'}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedPledge && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in-up">
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

            {uiError && (
              <div className="bg-red-50 text-red-600 border border-red-200 rounded-xl p-4 mb-6 flex items-center gap-2 text-sm">
                <iconify-icon icon="solar:danger-triangle-bold" class="text-lg"></iconify-icon> {uiError}
              </div>
            )}

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
                        <option value="__NEW__" className="font-bold text-brand-teal">➕ Create New Custom Category...</option>
                        <option value="" disabled>-- Select Inventory Item --</option>
                        {inventoryList.map(inv => (
                          <option key={inv._id} value={inv._id}>
                            {inv.itemName} (Current Total: {inv.totalQuantity})
                          </option>
                        ))}
                      </select>
                      
                      {mappings[item._id] === '__NEW__' && (
                        <div className="mt-3 p-4 bg-brand-teal/5 border border-brand-teal/20 rounded-xl animate-fade-in-up">
                          <h4 className="text-xs font-bold text-brand-teal uppercase tracking-wide mb-3">Create Custom Inventory Category</h4>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <input
                              type="text"
                              placeholder="Item Name"
                              value={customItemForms[item._id]?.itemName || ''}
                              onChange={e => setCustomItemForms({...customItemForms, [item._id]: {...customItemForms[item._id], itemName: e.target.value}})}
                              className="border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:border-brand-teal focus:ring-1 focus:ring-brand-teal bg-white dark:bg-slate-900"
                            />
                            <input
                              type="text"
                              placeholder="Category (e.g. Shelter)"
                              value={customItemForms[item._id]?.category || ''}
                              onChange={e => setCustomItemForms({...customItemForms, [item._id]: {...customItemForms[item._id], category: e.target.value}})}
                              className="border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:border-brand-teal focus:ring-1 focus:ring-brand-teal bg-white dark:bg-slate-900"
                            />
                            <div className="flex gap-2">
                              <input
                                type="text"
                                placeholder="Unit (e.g. pieces)"
                                value={customItemForms[item._id]?.unit || ''}
                                onChange={e => setCustomItemForms({...customItemForms, [item._id]: {...customItemForms[item._id], unit: e.target.value}})}
                                className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:border-brand-teal focus:ring-1 focus:ring-brand-teal bg-white dark:bg-slate-900"
                              />
                              <button
                                type="button"
                                onClick={() => handleCreateCustomItem(item._id)}
                                disabled={creatingCustomFor === item._id}
                                className="bg-brand-teal text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-teal-700 transition disabled:opacity-50 whitespace-nowrap"
                              >
                                {creatingCustomFor === item._id ? '...' : 'Save'}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
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
