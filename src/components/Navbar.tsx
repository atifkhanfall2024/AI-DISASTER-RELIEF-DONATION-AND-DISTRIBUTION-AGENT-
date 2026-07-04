'use client';

import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import ThemeToggle from '@/components/ThemeToggle';

export default function Navbar() {
  const { data: session } = useSession();

  return (
    <nav className="flex items-center justify-between px-6 py-4 border-b border-slate-100 max-w-7xl mx-auto w-full">
      <Link href="/" className="flex items-center gap-2 text-brand-teal font-semibold text-lg tracking-tight">
        <iconify-icon icon="solar:hand-heart-bold" class="text-2xl"></iconify-icon>
        ReliefAid
      </Link>
      <div className="flex gap-4 items-center">
        <ThemeToggle />
        {!session ? (
          <>
            <Link href="/login" className="text-slate-600 hover:text-slate-900 font-medium transition">
              Login
            </Link>
            <Link
              href="/login?tab=register"
              className="bg-brand-teal text-white px-4 py-2 rounded-lg font-medium hover:bg-brand-teal/90 transition shadow-sm"
            >
              Register
            </Link>
          </>
        ) : (
          <>
            <span className="text-slate-500 hidden sm:inline">Hi, {session.user.name}</span>
            {session.user.role === 'focal' && (
              <Link href="/focal/dashboard" className="text-slate-600 hover:text-slate-900 font-medium transition">
                Dashboard
              </Link>
            )}
            {session.user.role === 'admin' && (
              <Link href="/admin/dashboard" className="text-slate-600 hover:text-slate-900 font-medium transition">
                Admin
              </Link>
            )}
            <Link href="/donate" className="text-slate-600 hover:text-slate-900 font-medium transition">
              Donate
            </Link>
            {session.user.role === 'donor' && (
              <Link href="/donate/history" className="text-slate-600 hover:text-slate-900 font-medium transition">
                My Donations
              </Link>
            )}
            <button
              onClick={() => signOut({ callbackUrl: '/' })}
              className="bg-slate-100 text-slate-700 px-4 py-2 rounded-lg font-medium hover:bg-slate-200 transition"
            >
              Log out
            </button>
          </>
        )}
      </div>
    </nav>
  );
}
