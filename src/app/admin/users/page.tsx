'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const ROLE_STYLES: Record<string, string> = {
  admin: 'text-[#993C1D] bg-[#993C1D]/10 border-[#993C1D]/20',
  focal: 'text-[#185FA5] bg-blue-50 border-blue-200',
  donor: 'text-[#0F6E56] bg-emerald-50 border-emerald-200'
};

const emptyForm = { name: '', email: '', password: '', phone: '', cnic: '', role: 'focal' as 'focal' | 'admin' };

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [roleFilter, setRoleFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [confirmDialog, setConfirmDialog] = useState<{ id: string; name: string; status: 'approved' | 'rejected' } | null>(null);

  async function load() {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (roleFilter !== 'all') qs.set('role', roleFilter);
      if (search) qs.set('search', search);
      const res = await fetch(`/api/users?${qs.toString()}`);
      
      let data = [];
      try {
        data = await res.json();
      } catch (err) {
        throw new Error('Invalid JSON response from server');
      }

      if (!res.ok) throw new Error((data as any).error || 'Failed to load users');
      
      setUsers(Array.isArray(data) ? data : []);
      setError('');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error loading users');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleFilter]);

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setNotice('');
    setBusy(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setNotice(`${form.role === 'admin' ? 'Admin' : 'Focal person'} account created for ${form.email}.`);
      setForm(emptyForm);
      setShowForm(false);
      load();
    } catch (err: any) {
      setError(err.message || 'Failed to create user.');
    } finally {
      setBusy(false);
    }
  }

  async function executeFocalStatus() {
    if (!confirmDialog) return;
    const { id, status } = confirmDialog;
    try {
      const res = await fetch(`/api/users/${id}/approve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (!res.ok) throw new Error(await res.text());
      load();
      setConfirmDialog(null);
    } catch (err: any) {
      alert(err.message || 'Failed to update status');
    }
  }

  const counts = {
    admin: users.filter((u) => u.role === 'admin').length,
    focal: users.filter((u) => u.role === 'focal').length,
    donor: users.filter((u) => u.role === 'donor').length
  };

  return (
    <div className="min-h-screen bg-brand-cream p-6 md:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6 flex flex-col sm:flex-row justify-between sm:items-end gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">User Management</h1>
            <p className="text-slate-500">Invite focal persons and admins. Admin accounts can only be created here.</p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/admin/dashboard"
              className="bg-white dark:bg-slate-900 border border-slate-200 text-slate-700 px-4 py-2 rounded-lg font-medium hover:bg-slate-50 transition text-sm flex items-center gap-2"
            >
              <iconify-icon icon="solar:list-check-linear"></iconify-icon> Requests
            </Link>
            <button
              onClick={() => {
                setShowForm((s) => !s);
                setError('');
                setNotice('');
              }}
              className="bg-brand-teal text-white px-4 py-2 rounded-lg font-medium hover:bg-brand-teal/90 transition shadow-sm text-sm flex items-center gap-2"
            >
              <iconify-icon icon="solar:user-plus-linear"></iconify-icon> Invite User
            </button>
          </div>
        </div>

        {notice && (
          <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-lg px-4 py-2">
            {notice}
          </div>
        )}

        {showForm && (
          <form onSubmit={createUser} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 shadow-sm p-6 mb-6 space-y-4">
            <h2 className="font-semibold text-slate-900">Invite a new user</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Full Name *</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-teal bg-white dark:bg-slate-900"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Email *</label>
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-teal bg-white dark:bg-slate-900"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Temporary Password *</label>
                <input
                  required
                  minLength={6}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="Share this with the user"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-teal bg-white dark:bg-slate-900"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Role *</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value as 'focal' | 'admin' })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-teal bg-white dark:bg-slate-900"
                >
                  <option value="focal">Focal Person</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Phone (optional)</label>
                <input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-teal bg-white dark:bg-slate-900"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">CNIC (optional)</label>
                <input
                  value={form.cnic}
                  onChange={(e) => setForm({ ...form, cnic: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-teal bg-white dark:bg-slate-900"
                />
              </div>
            </div>
            {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm">{error}</div>}
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={busy}
                className="bg-brand-teal text-white px-5 py-2.5 rounded-lg font-medium hover:bg-brand-teal/90 transition shadow-sm text-sm disabled:opacity-60"
              >
                {busy ? 'Creating…' : 'Create Account'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="bg-white dark:bg-slate-900 border border-slate-200 text-slate-700 px-5 py-2.5 rounded-lg font-medium hover:bg-slate-50 transition text-sm"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="text-slate-500 text-xs mb-1">Admins</div>
            <div className="text-2xl font-semibold text-brand-rust tracking-tight">{counts.admin}</div>
          </div>
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="text-slate-500 text-xs mb-1">Focal Persons</div>
            <div className="text-2xl font-semibold text-brand-blue tracking-tight">{counts.focal}</div>
          </div>
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="text-slate-500 text-xs mb-1">Donors</div>
            <div className="text-2xl font-semibold text-brand-teal tracking-tight">{counts.donor}</div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 mb-4">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-900 focus:outline-none focus:border-brand-teal"
          >
            <option value="all">All roles</option>
            <option value="admin">Admins</option>
            <option value="focal">Focal Persons</option>
            <option value="donor">Donors</option>
          </select>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              load();
            }}
            className="flex gap-2"
          >
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name or email…"
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-900 focus:outline-none focus:border-brand-teal"
            />
            <button className="bg-white dark:bg-slate-900 border border-slate-200 text-slate-700 px-3 py-2 rounded-lg text-sm hover:bg-slate-50 transition">
              Search
            </button>
          </form>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left whitespace-nowrap text-sm">
              <thead className="bg-slate-50 text-slate-500 font-medium text-xs uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="px-5 py-3">Name</th>
                  <th className="px-5 py-3">Email</th>
                  <th className="px-5 py-3">Role</th>
                  <th className="px-5 py-3">Verification (Focal)</th>
                  <th className="px-5 py-3">Docs</th>
                  <th className="px-5 py-3">Sign-in</th>
                  <th className="px-5 py-3">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading && (
                  <tr><td className="px-5 py-6 text-slate-400" colSpan={7}>Loading…</td></tr>
                )}
                {!loading && users.length === 0 && (
                  <tr><td className="px-5 py-6 text-slate-400" colSpan={7}>No users found.</td></tr>
                )}
                {users.map((u) => (
                  <tr key={u._id} className="hover:bg-slate-50 transition">
                    <td className="px-5 py-3 font-medium text-slate-900">{u.name}</td>
                    <td className="px-5 py-3 text-slate-600">{u.email}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${ROLE_STYLES[u.role] || ''}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      {u.role === 'focal' ? (
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-semibold px-2 py-1 rounded ${u.focalStatus === 'approved' ? 'bg-emerald-50 text-emerald-700' : u.focalStatus === 'rejected' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>
                            {u.focalStatus?.toUpperCase() || 'PENDING'}
                          </span>
                          {(u.focalStatus === 'pending' || u.focalStatus === 'rejected') && (
                            <button onClick={() => setConfirmDialog({ id: u._id, name: u.name, status: 'approved' })} className="text-xs text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded hover:bg-emerald-100">Approve</button>
                          )}
                          {(u.focalStatus === 'pending' || u.focalStatus === 'approved') && (
                            <button onClick={() => setConfirmDialog({ id: u._id, name: u.name, status: 'rejected' })} className="text-xs text-red-600 bg-red-50 border border-red-200 px-2 py-1 rounded hover:bg-red-100">Reject</button>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      {u.role === 'focal' && u.focalDocs && u.focalDocs.length > 0 ? (
                        <a href={u.focalDocs[0]} target="_blank" rel="noreferrer" className="text-xs text-brand-blue hover:underline flex items-center gap-1">
                          <iconify-icon icon="solar:document-linear"></iconify-icon> View Doc
                        </a>
                      ) : (
                        <span className="text-slate-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-slate-500">{u.provider === 'google' ? 'Google' : 'Password'}</td>
                    <td className="px-5 py-3 text-slate-500">{new Date(u.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmDialog && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-[0_8px_30px_-12px_rgba(0,0,0,0.2)] max-w-sm w-full p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-4 text-slate-900">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${confirmDialog.status === 'approved' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                <iconify-icon icon={confirmDialog.status === 'approved' ? 'solar:check-circle-bold' : 'solar:close-circle-bold'} class="text-xl"></iconify-icon>
              </div>
              <h3 className="text-lg font-semibold tracking-tight">Confirm Action</h3>
            </div>
            <p className="text-slate-600 text-sm mb-6 leading-relaxed">
              Are you sure you want to <strong>{confirmDialog.status}</strong> focal person <strong>{confirmDialog.name}</strong>?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmDialog(null)}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition"
              >
                Cancel
              </button>
              <button
                onClick={executeFocalStatus}
                className={`px-4 py-2 rounded-lg text-sm font-medium text-white transition shadow-sm ${confirmDialog.status === 'approved' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}`}
              >
                Yes, {confirmDialog.status}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
