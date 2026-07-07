'use client';

import { useEffect, useState } from 'react';

const typeColor: Record<string, string> = {
  approval: 'text-emerald-700',
  donation: 'text-brand-blue',
  ai: 'text-brand-amber',
  submit: 'text-slate-600',
  rejection: 'text-brand-rust',
  distribution: 'text-brand-teal'
};

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const qs = search ? `?search=${encodeURIComponent(search)}` : '';
    const res = await fetch(`/api/logs${qs}`);
    setLogs(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen p-4 md:p-8 bg-white dark:bg-slate-900">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6 flex flex-col sm:flex-row justify-between sm:items-end gap-4 border-b border-slate-200 pb-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">System Audit Logs</h1>
            <p className="text-slate-500 text-sm mt-1">Read-only immutable record of all platform activities.</p>
          </div>
          <div className="relative">
            <iconify-icon icon="solar:magnifer-linear" class="absolute left-3 top-2 text-slate-400"></iconify-icon>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && load()}
              placeholder="Search logs..."
              className="w-56 border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 text-sm bg-slate-50 focus:outline-none focus:bg-white dark:bg-slate-900 focus:ring-1 focus:ring-brand-teal transition"
            />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 overflow-x-auto shadow-sm">
          <table className="w-full text-left whitespace-nowrap text-sm">
            <thead className="bg-slate-50 text-slate-500 font-medium text-xs uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-5 py-3">Timestamp</th>
                <th className="px-5 py-3">User / Actor</th>
                <th className="px-5 py-3">Action</th>
                <th className="px-5 py-3">Related ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-[13px]">
              {loading && <tr><td className="px-5 py-6 text-slate-400 font-sans" colSpan={4}>Loading…</td></tr>}
              {!loading && logs.length === 0 && (
                <tr><td className="px-5 py-6 text-slate-400 font-sans" colSpan={4}>No log entries yet.</td></tr>
              )}
              {logs.map((log) => (
                <tr key={log._id} className="hover:bg-slate-50 transition">
                  <td className="px-5 py-3 text-slate-500">{new Date(log.createdAt).toLocaleString()}</td>
                  <td className="px-5 py-3">
                    <span className="flex items-center gap-2 text-slate-700 font-sans font-medium">
                      <iconify-icon icon="solar:user-circle-linear" class="text-slate-400 text-lg"></iconify-icon> {log.actorName}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex items-center gap-1.5 font-sans font-medium ${typeColor[log.type] || 'text-slate-600'}`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current"></span> {log.action}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-brand-blue">{log.relatedId || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
