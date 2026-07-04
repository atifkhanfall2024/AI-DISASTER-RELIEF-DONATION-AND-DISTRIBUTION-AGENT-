'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { supabasePublic } from '@/lib/supabase';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const googleReady = !!supabaseUrl && !supabaseUrl.includes('YOUR_PROJECT');

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
    role: 'donor' as 'donor' | 'focal'
  });

  // ── Registration OTP flow ────────────────────────────────────────────
  const [regStep, setRegStep] = useState<'details' | 'verify'>('details');
  const [sending, setSending] = useState(false);
  const [emailCode, setEmailCode] = useState('');
  const [phoneCode, setPhoneCode] = useState('');
  const [emailVerified, setEmailVerified] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [emailDevCode, setEmailDevCode] = useState('');
  const [phoneDevCode, setPhoneDevCode] = useState('');
  const [verifyingEmail, setVerifyingEmail] = useState(false);
  const [verifyingPhone, setVerifyingPhone] = useState(false);

  async function sendCode(channel: 'email' | 'sms', target: string) {
    const res = await fetch('/api/otp/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channel, target })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data.devCode as string | undefined;
  }

  async function startVerification(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setSending(true);
    try {
      const [eCode, pCode] = await Promise.all([
        sendCode('email', form.email),
        sendCode('sms', form.phone)
      ]);
      setEmailDevCode(eCode || '');
      setPhoneDevCode(pCode || '');
      setEmailVerified(false);
      setPhoneVerified(false);
      setEmailCode('');
      setPhoneCode('');
      setRegStep('verify');
    } catch (err: any) {
      setError(err.message || 'Could not send verification codes.');
    } finally {
      setSending(false);
    }
  }

  async function verifyChannel(channel: 'email' | 'sms') {
    setError('');
    const target = channel === 'email' ? form.email : form.phone;
    const code = channel === 'email' ? emailCode : phoneCode;
    const setBusy = channel === 'email' ? setVerifyingEmail : setVerifyingPhone;
    setBusy(true);
    try {
      const res = await fetch('/api/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel, target, code })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (channel === 'email') setEmailVerified(true);
      else setPhoneVerified(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function resend(channel: 'email' | 'sms') {
    setError('');
    try {
      const target = channel === 'email' ? form.email : form.phone;
      const code = await sendCode(channel, target);
      if (channel === 'email') setEmailDevCode(code || '');
      else setPhoneDevCode(code || '');
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function completeRegistration() {
    setError('');
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
      router.push('/');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setError('');
    try {
      const { error: oauthError } = await supabasePublic.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/auth/callback` }
      });
      if (oauthError) throw oauthError;
    } catch (err: any) {
      setError(err.message || 'Google sign-in failed.');
    }
  }

  function redirectByRole(role: string) {
    if (role === 'admin') router.push('/admin/dashboard');
    else if (role === 'focal') router.push('/focal/dashboard');
    else router.push('/donate');
    router.refresh();
  }

  const inputClass =
    'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-teal focus:ring-1 focus:ring-brand-teal transition bg-white dark:bg-slate-900';

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-brand-cream">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-[0_8px_30px_-12px_rgba(0,0,0,0.1)] border border-slate-200 overflow-hidden flex w-full max-w-4xl min-h-[600px]">
        <div className="hidden md:flex flex-col bg-brand-teal text-white p-12 w-5/12 justify-between relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-black/10 to-transparent"></div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 font-semibold text-xl tracking-tight mb-12">
              <iconify-icon icon="solar:hand-heart-bold" class="text-3xl"></iconify-icon>
              ReliefAid
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
              onClick={() => {
                setTab('register');
                setError('');
              }}
              className={`pb-3 px-4 font-medium transition ${
                tab === 'register' ? 'text-brand-teal border-b-2 border-brand-teal' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Register
            </button>
            <button
              onClick={() => {
                setTab('login');
                setError('');
              }}
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
            regStep === 'details' ? (
              <>
                <h3 className="text-2xl font-semibold tracking-tight text-slate-900 mb-6">Create an account</h3>
                <form className="space-y-5" onSubmit={startVerification}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1.5">Full Name</label>
                      <input
                        required
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        placeholder="Ali Khan"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1.5">CNIC</label>
                      <input
                        value={form.cnic}
                        onChange={(e) => setForm({ ...form, cnic: e.target.value })}
                        placeholder="XXXXX-XXXXXXX-X"
                        className={inputClass}
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
                      className={inputClass}
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
                      className={inputClass}
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
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1.5">Confirm Password</label>
                      <input
                        required
                        type="password"
                        value={form.confirmPassword}
                        onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                        className={inputClass}
                      />
                    </div>
                  </div>

                  <div className="pt-2">
                    <label className="block text-xs font-medium text-slate-600 mb-3">I want to join as a:</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[
                        { role: 'donor', label: 'Donor', desc: 'I want to fund requests', icon: 'solar:heart-linear' },
                        { role: 'focal', label: 'Focal Person', desc: 'I report ground needs', icon: 'solar:map-point-linear' }
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
                    disabled={sending}
                    className="w-full bg-brand-teal text-white py-3 rounded-xl font-medium hover:bg-brand-teal/90 transition shadow-sm disabled:opacity-60"
                  >
                    {sending ? 'Sending codes…' : 'Continue — verify email & phone'}
                  </button>
                </form>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-semibold tracking-tight text-slate-900">Verify it&apos;s you</h3>
                  <button
                    type="button"
                    onClick={() => setRegStep('details')}
                    className="text-sm text-brand-teal font-medium hover:underline flex items-center gap-1"
                  >
                    <iconify-icon icon="solar:arrow-left-linear"></iconify-icon> Edit details
                  </button>
                </div>
                <p className="text-sm text-slate-500 mb-6">
                  We sent a 6-digit code to your email and phone. Enter both to finish creating your account.
                </p>

                <div className="space-y-5">
                  {/* Email OTP */}
                  <div className="border border-slate-200 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs font-medium text-slate-600">
                        Email code · <span className="text-slate-800">{form.email}</span>
                      </label>
                      {emailVerified && (
                        <span className="text-xs font-medium text-brand-teal flex items-center gap-1">
                          <iconify-icon icon="solar:check-circle-bold"></iconify-icon> Verified
                        </span>
                      )}
                    </div>
                    {!emailVerified && (
                      <div className="flex gap-2">
                        <input
                          value={emailCode}
                          onChange={(e) => setEmailCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          inputMode="numeric"
                          placeholder="Enter 6-digit code"
                          className={`${inputClass} tracking-widest`}
                        />
                        <button
                          type="button"
                          onClick={() => verifyChannel('email')}
                          disabled={verifyingEmail || emailCode.length < 4}
                          className="shrink-0 bg-slate-900 text-white px-4 rounded-lg text-sm font-medium hover:bg-slate-800 transition disabled:opacity-50"
                        >
                          {verifyingEmail ? '…' : 'Verify'}
                        </button>
                      </div>
                    )}
                    {!emailVerified && (
                      <div className="flex items-center justify-between mt-2">
                        {emailDevCode ? (
                          <span className="text-xs text-slate-400">Dev code: <span className="font-mono">{emailDevCode}</span></span>
                        ) : (
                          <span />
                        )}
                        <button type="button" onClick={() => resend('email')} className="text-xs text-brand-blue hover:underline">
                          Resend code
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Phone OTP */}
                  <div className="border border-slate-200 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs font-medium text-slate-600">
                        Phone code · <span className="text-slate-800">{form.phone}</span>
                      </label>
                      {phoneVerified && (
                        <span className="text-xs font-medium text-brand-teal flex items-center gap-1">
                          <iconify-icon icon="solar:check-circle-bold"></iconify-icon> Verified
                        </span>
                      )}
                    </div>
                    {!phoneVerified && (
                      <div className="flex gap-2">
                        <input
                          value={phoneCode}
                          onChange={(e) => setPhoneCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          inputMode="numeric"
                          placeholder="Enter 6-digit code"
                          className={`${inputClass} tracking-widest`}
                        />
                        <button
                          type="button"
                          onClick={() => verifyChannel('sms')}
                          disabled={verifyingPhone || phoneCode.length < 4}
                          className="shrink-0 bg-slate-900 text-white px-4 rounded-lg text-sm font-medium hover:bg-slate-800 transition disabled:opacity-50"
                        >
                          {verifyingPhone ? '…' : 'Verify'}
                        </button>
                      </div>
                    )}
                    {!phoneVerified && (
                      <div className="flex items-center justify-between mt-2">
                        {phoneDevCode ? (
                          <span className="text-xs text-slate-400">Dev code: <span className="font-mono">{phoneDevCode}</span></span>
                        ) : (
                          <span />
                        )}
                        <button type="button" onClick={() => resend('sms')} className="text-xs text-brand-blue hover:underline">
                          Resend code
                        </button>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={completeRegistration}
                    disabled={!emailVerified || !phoneVerified || loading}
                    className="w-full bg-brand-teal text-white py-3 rounded-xl font-medium hover:bg-brand-teal/90 transition shadow-sm disabled:opacity-50"
                  >
                    {loading ? 'Creating account…' : 'Create account'}
                  </button>
                </div>
              </>
            )
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
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Password</label>
                  <input
                    required
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className={inputClass}
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

          {googleReady && !(tab === 'register' && regStep === 'verify') && (
            <>
              <div className="flex items-center gap-3 my-6">
                <div className="h-px bg-slate-200 flex-1"></div>
                <span className="text-xs text-slate-400 uppercase tracking-wider">or</span>
                <div className="h-px bg-slate-200 flex-1"></div>
              </div>
              <button
                type="button"
                onClick={handleGoogle}
                className="w-full border border-slate-300 text-slate-700 py-3 rounded-xl font-medium hover:bg-slate-50 transition flex items-center justify-center gap-2"
              >
                <iconify-icon icon="logos:google-icon" class="text-lg"></iconify-icon>
                Continue with Google
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
