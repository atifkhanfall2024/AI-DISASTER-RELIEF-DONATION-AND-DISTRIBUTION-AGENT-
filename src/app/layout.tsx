import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';
import Providers from '@/components/Providers';

export const metadata: Metadata = {
  title: 'ReliefAid - Disaster Relief Distribution',
  description: 'AI-powered disaster relief donation and distribution platform.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
        <Script src="https://code.iconify.design/iconify-icon/1.0.7/iconify-icon.min.js" strategy="beforeInteractive" />
        {/* Set theme before paint to avoid a flash of the wrong color scheme */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');var d=t?t==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;if(d)document.documentElement.classList.add('dark');}catch(e){}})();`
          }}
        />
      </head>
      <body className="bg-[#F1EFE8] dark:bg-slate-950 text-slate-800 dark:text-slate-200 font-sans antialiased text-sm transition-colors">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
