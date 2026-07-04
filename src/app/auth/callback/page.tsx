'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn, getSession } from 'next-auth/react';
import { supabasePublic } from '@/lib/supabase';

// Landing page for the Supabase Google OAuth redirect. It reads the Supabase
// session created in the browser, hands the access token to our NextAuth
// "supabase" provider, then routes the user onward by role.
export default function AuthCallback() {
  const router = useRouter();
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabasePublic.auth.getSession();
        const token = data.session?.access_token;
        if (!token) throw new Error('Google sign-in did not return a session. Please try again.');

        const res = await signIn('supabase', { access_token: token, redirect: false });
        if (res?.error) throw new Error(res.error);

        // We now rely on the NextAuth session; clear the Supabase one.
        await supabasePublic.auth.signOut();

        const session = await getSession();
        const role = (session?.user as any)?.role;
        if (role === 'admin') router.replace('/admin/dashboard');
        else if (role === 'focal') router.replace('/focal/dashboard');
        else router.replace('/donate');
      } catch (e: any) {
        setError(e.message || 'Sign-in failed.');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-brand-cream">
      {error ? (
        <div className="text-center">
          <p className="text-red-600 mb-3">{error}</p>
          <button onClick={() => router.push('/login')} className="text-brand-teal font-medium">
            Back to login
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-3 text-slate-500">
          <iconify-icon icon="solar:refresh-linear" class="text-xl animate-spin"></iconify-icon>
          Completing Google sign-in…
        </div>
      )}
    </div>
  );
}
