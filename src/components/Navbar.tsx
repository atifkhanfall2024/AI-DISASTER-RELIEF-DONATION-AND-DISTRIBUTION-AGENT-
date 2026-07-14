'use client';

import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import ThemeToggle from '@/components/ThemeToggle';

export default function Navbar() {
  const { data: session } = useSession();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/70 dark:bg-slate-900/70 backdrop-blur-lg border-b border-white/20 dark:border-slate-800/50 shadow-sm transition-all duration-300">
      <div className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto w-full">
        <Link href="/" className="flex items-center gap-2 text-brand-teal font-bold text-xl tracking-tight hover:opacity-80 transition-opacity">
          <iconify-icon icon="solar:hand-heart-bold" class="text-3xl"></iconify-icon>
          ReliefAid
        </Link>
        <div className="flex gap-4 sm:gap-6 items-center">
          <ThemeToggle />
          {!session ? (
            <>
              <Link href="/login" className="text-slate-600 dark:text-slate-300 hover:text-brand-teal dark:hover:text-brand-teal font-medium transition-colors">
                Login
              </Link>
              <Link
                href="/login?tab=register"
                className="bg-brand-teal text-white px-5 py-2.5 rounded-full font-medium hover:bg-brand-teal/90 hover:scale-105 active:scale-95 transition-all shadow-md flex items-center gap-2"
              >
                Register <iconify-icon icon="solar:arrow-right-linear"></iconify-icon>
              </Link>
            </>
          ) : (
            <>
              <span className="text-slate-500 dark:text-slate-400 font-medium hidden sm:inline px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-sm border border-slate-200 dark:border-slate-700">
                Hi, <span className="text-slate-800 dark:text-slate-200">{session.user.name}</span>
              </span>
              {session.user.role === 'focal' && (
                <Link href="/focal/dashboard" className="text-slate-600 dark:text-slate-300 hover:text-brand-teal font-medium transition-colors">
                  Dashboard
                </Link>
              )}
              {(session.user.role === 'admin' || session.user.role === 'super-admin') && (
                <>
                  <Link href="/admin/dashboard" className="text-slate-600 dark:text-slate-300 hover:text-brand-teal font-medium transition-colors">
                    Admin
                  </Link>
                  <Link href="/admin/map" className="text-slate-600 dark:text-slate-300 hover:text-brand-teal font-medium transition-colors hidden sm:inline">
                    Map
                  </Link>
                  {session.user.role === 'super-admin' && (
                    <>
                      <Link href="/admin/inventory" className="text-slate-600 dark:text-slate-300 hover:text-brand-teal font-medium transition-colors hidden md:inline">
                        Inventory
                      </Link>
                      <Link href="/admin/pledges" className="text-slate-600 dark:text-slate-300 hover:text-brand-teal font-medium transition-colors hidden md:inline">
                        Item Pledges
                      </Link>
                      <Link href="/admin/analytics" className="text-slate-600 dark:text-slate-300 hover:text-brand-teal font-medium transition-colors hidden sm:inline">
                        Analytics
                      </Link>
                    </>
                  )}
                  <Link href="/admin/users" className="text-slate-600 dark:text-slate-300 hover:text-brand-teal font-medium transition-colors hidden md:inline">
                    Users
                  </Link>
                </>
              )}
              <Link href="/donate" className="text-slate-600 dark:text-slate-300 hover:text-brand-teal font-medium transition-colors">
                Donate Money
              </Link>
              <Link href="/donate/items" className="text-slate-600 dark:text-slate-300 hover:text-brand-blue font-medium transition-colors hidden sm:inline">
                Donate Items
              </Link>
              {session.user.role === 'donor' && (
                <Link href="/donate/history" className="text-slate-600 dark:text-slate-300 hover:text-brand-teal font-medium transition-colors">
                  My Donations
                </Link>
              )}
              <button
                onClick={() => signOut({ callbackUrl: '/' })}
                className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-4 py-2 rounded-lg font-medium hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-brand-rust transition-all border border-slate-200 dark:border-slate-700 ml-2"
              >
                Log out
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
