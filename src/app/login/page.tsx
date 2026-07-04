'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <LoginPageContent />
    </Suspense>
  );
}

function LoginPageContent() {
  const router = useRouter();
  const params = useSearchParams();
  const [tab, setTab] = useState<'register' | 'login'>(
    params.get('tab') === 'login' ? 'login' : 'register'
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    name: '',
    email: '',
    cnic: '',
    phone: '',
    password: '',
    confirmPassword: '',
    role: 'donor' as 'donor' | 'focal' | 'admin'
  });

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const login = await signIn('credentials', {
        email: form.email,
        password: form.password,
        redirect: false
      });
      if (login?.error) throw new Error(login.error);
      redirectByRole(form.role);
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await signIn('credentials', {
        email: form.email,
        password: form.password,
        redirect: false
      });
      if (res?.error) throw new Error('Invalid email or password.');
      // We don't know the role client-side without a session fetch, so just go home;
      // the navbar / dashboards will route appropriately once session loads.
      router.push('/');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function redirectByRole(role: string) {
    if (role === 'admin') router.push('/admin/dashboard');
    else if (role === 'focal') router.push('/focal/dashboard');
    else router.push('/donate');
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-brand-cream">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-[0_8px_30px_-12px_rgba(0,0,0,0.1)] border border-slate-200 overflow-hidden flex w-full max-w-4xl min-h-[600px]">
        <div className="hidden md:flex flex-col bg-brand-teal text-white p-12 w-5/12 justify-between relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-black/10 to-transparent"></div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 font-semibold text-xl tracking-tight mb-12">
              <iconify-icon icon="solar:drop-bold" class="text-3xl"></iconify-icon>
              FloodAid
            </div>
            <h2 className="text-3xl font-semibold tracking-tight leading-tight mb-6">
              Join the transparent relief network.
            </h2>
            <p className="text-white/80 leading-relaxed text-base">
              &ldquo;The power of collective action, guided by accurate data, can rebuild communities faster
              than ever before.&rdquo;
            </p>
          </div>
          <div className="relative z-10 flex items-center gap-2 text-sm font-medium text-white/70">
            <iconify-icon icon="solar:shield-check-linear"></iconify-icon> Trusted by 200+ NGOs and volunteers
          </div>
        </div>

        <div className="w-full md:w-7/12 p-8 md:p-12 overflow-y-auto">
          <div className="flex border-b border-slate-200 mb-8">
            <button
              onClick={() => setTab('register')}
              className={`pb-3 px-4 font-medium transition ${
                tab === 'register' ? 'text-brand-teal border-b-2 border-brand-teal' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Register
            </button>
            <button
              onClick={() => setTab('login')}
              className={`pb-3 px-4 font-medium transition ${
                tab === 'login' ? 'text-brand-teal border-b-2 border-brand-teal' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Login
            </button>
          </div>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          {tab === 'register' ? (
            <>
              <h3 className="text-2xl font-semibold tracking-tight text-slate-900 mb-6">Create an account</h3>
              <form className="space-y-5" onSubmit={handleRegister}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">Full Name</label>
                    <input
                      required
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="Ali Khan"
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-teal focus:ring-1 focus:ring-brand-teal transition bg-white dark:bg-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">CNIC</label>
                    <input
                      value={form.cnic}
                      onChange={(e) => setForm({ ...form, cnic: e.target.value })}
                      placeholder="XXXXX-XXXXXXX-X"
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-teal focus:ring-1 focus:ring-brand-teal transition bg-white dark:bg-slate-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Email Address</label>
                  <input
                    required
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="ali@example.com"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-teal focus:ring-1 focus:ring-brand-teal transition bg-white dark:bg-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Phone Number</label>
                  <input
                    required
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="+92 3XX XXXXXXX"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-teal focus:ring-1 focus:ring-brand-teal transition bg-white dark:bg-slate-900"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">Password</label>
                    <input
                      required
                      type="password"
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-teal focus:ring-1 focus:ring-brand-teal transition bg-white dark:bg-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">Confirm Password</label>
                    <input
                      required
                      type="password"
                      value={form.confirmPassword}
                      onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-teal focus:ring-1 focus:ring-brand-teal transition bg-white dark:bg-slate-900"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <label className="block text-xs font-medium text-slate-600 mb-3">I want to join as a:</label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                      { role: 'donor', label: 'Donor', desc: 'I want to fund requests', icon: 'solar:heart-linear' },
                      { role: 'focal', label: 'Focal Person', desc: 'I report ground needs', icon: 'solar:map-point-linear' },
                      { role: 'admin', label: 'Admin', desc: 'I manage the platform', icon: 'solar:shield-user-linear' }
                    ].map((opt) => (
                      <label key={opt.role} className="relative cursor-pointer">
                        <input
                          type="radio"
                          name="role"
                          className="peer sr-only"
                          checked={form.role === opt.role}
                          onChange={() => setForm({ ...form, role: opt.role as any })}
                        />
                        <div className="border border-slate-200 rounded-xl p-4 flex flex-col items-center text-center hover:bg-slate-50 transition peer-checked:border-brand-teal peer-checked:bg-brand-teal/5 peer-checked:ring-1 peer-checked:ring-brand-teal">
                          <div className="w-10 h-10 bg-white dark:bg-slate-900 rounded-full border border-slate-200 flex items-center justify-center mb-3 text-brand-blue">
                            <iconify-icon icon={opt.icon} class="text-xl"></iconify-icon>
                          </div>
                          <div className="font-medium text-slate-900 mb-1 text-sm">{opt.label}</div>
                          <div className="text-xs text-slate-500">{opt.desc}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <button
                  disabled={loading}
                  className="w-full bg-brand-teal text-white py-3 rounded-xl font-medium hover:bg-brand-teal/90 transition shadow-sm disabled:opacity-60"
                >
                  {loading ? 'Creating account…' : 'Create account'}
                </button>
              </form>
            </>
          ) : (
            <>
              <h3 className="text-2xl font-semibold tracking-tight text-slate-900 mb-6">Welcome back</h3>
              <form className="space-y-5" onSubmit={handleLogin}>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Email Address</label>
                  <input
                    required
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="ali@example.com"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-teal focus:ring-1 focus:ring-brand-teal transition bg-white dark:bg-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Password</label>
                  <input
                    required
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-teal focus:ring-1 focus:ring-brand-teal transition bg-white dark:bg-slate-900"
                  />
                </div>
                <button
                  disabled={loading}
                  className="w-full bg-brand-teal text-white py-3 rounded-xl font-medium hover:bg-brand-teal/90 transition shadow-sm disabled:opacity-60"
                >
                  {loading ? 'Logging in…' : 'Log in'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
