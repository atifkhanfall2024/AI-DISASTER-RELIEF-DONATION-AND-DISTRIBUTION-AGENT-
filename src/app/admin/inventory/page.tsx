'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function AdminInventoryPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({ itemName: '', category: '', totalQuantity: '', unit: '' });
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated' || (session && session.user.role !== 'super-admin')) {
      router.push('/admin/dashboard');
    }
  }, [status, session, router]);

  useEffect(() => {
    fetchInventory();
  }, []);

  async function fetchInventory() {
    try {
      const res = await fetch('/api/inventory');
      if (res.ok) {
        setItems(await res.json());
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const payload = {
      itemName: form.itemName,
      category: form.category,
      totalQuantity: parseInt(form.totalQuantity),
      unit: form.unit
    };

    try {
      if (editingId) {
        const res = await fetch(`/api/inventory/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            itemName: form.itemName,
            category: form.category,
            totalQuantity: payload.totalQuantity
          })
        });
        if (res.ok) {
          setEditingId(null);
          setForm({ itemName: '', category: '', totalQuantity: '', unit: '' });
          await fetchInventory();
        } else {
          const err = await res.json();
          alert(err.error);
        }
      } else {
        const res = await fetch('/api/inventory', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          setForm({ itemName: '', category: '', totalQuantity: '', unit: '' });
          await fetchInventory();
        } else {
          const err = await res.json();
          alert(err.error);
        }
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this inventory item?')) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/inventory/${id}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchInventory();
      } else {
        const err = await res.json();
        alert(err.error);
      }
    } finally {
      setLoading(false);
    }
  }

  if (loading && items.length === 0) {
    return <div className="p-8">Loading inventory...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto p-6 md:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Central Inventory</h1>
        <p className="text-slate-500 mt-1">Manage physical relief stock available for Distribution Agent allocation.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-1">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 shadow-sm">
            <h2 className="font-semibold text-lg mb-4">{editingId ? 'Edit Item' : 'Add New Item'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Item Name</label>
                <input
                  type="text"
                  required
                  value={form.itemName}
                  onChange={e => setForm({ ...form, itemName: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                  placeholder="e.g. Winter Tents"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Category</label>
                <input
                  type="text"
                  required
                  value={form.category}
                  onChange={e => setForm({ ...form, category: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                  placeholder="e.g. Shelter"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Quantity</label>
                <input
                  type="number"
                  required
                  min="0"
                  value={form.totalQuantity}
                  onChange={e => setForm({ ...form, totalQuantity: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                  placeholder="e.g. 500"
                />
              </div>
              {!editingId && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Unit</label>
                  <input
                    type="text"
                    required
                    value={form.unit}
                    onChange={e => setForm({ ...form, unit: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                    placeholder="e.g. tents, bags, kits"
                  />
                </div>
              )}
              <div className="pt-2 flex gap-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-brand-teal text-white py-2 rounded-lg font-medium hover:bg-teal-600 transition disabled:opacity-50"
                >
                  {editingId ? 'Update Item' : 'Add Stock'}
                </button>
                {editingId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(null);
                      setForm({ itemName: '', category: '', totalQuantity: '', unit: '' });
                    }}
                    className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>

        <div className="md:col-span-2">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Item</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">Total Qty</th>
                  <th className="px-4 py-3 font-medium">Reserved</th>
                  <th className="px-4 py-3 font-medium">Available</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                      No inventory items found. Add some stock to get started.
                    </td>
                  </tr>
                ) : (
                  items.map(item => (
                    <tr key={item._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                      <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                        {item.itemName} <span className="text-xs text-slate-500 font-normal ml-1">({item.unit})</span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{item.category}</td>
                      <td className="px-4 py-3 font-medium">{item.totalQuantity}</td>
                      <td className="px-4 py-3 text-brand-amber font-medium">{item.reservedQuantity}</td>
                      <td className="px-4 py-3 text-brand-teal font-medium">{item.totalQuantity - item.reservedQuantity}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => {
                            setEditingId(item._id);
                            setForm({
                              itemName: item.itemName,
                              category: item.category,
                              totalQuantity: item.totalQuantity.toString(),
                              unit: item.unit
                            });
                          }}
                          className="text-brand-blue hover:underline mr-3"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(item._id)}
                          className="text-red-500 hover:underline"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
