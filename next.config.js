/** @type {import('next').NextConfig} */

// Content-Security-Policy whitelisting exactly the external origins this app uses:
// iconify (script + icon API), Google Fonts, Supabase (auth/storage/images),
// OpenStreetMap tiles, and the JazzCash sandbox form target. 'unsafe-inline'/
// 'unsafe-eval' on script-src are required by Next.js's runtime + the pre-paint
// theme script; the meaningful restrictions are on connect/img/frame/form.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://code.iconify.design",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: blob: https://*.supabase.co https://*.tile.openstreetmap.org",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.iconify.design https://api.simplesvg.com https://api.unisvg.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self' https://sandbox.jazzcash.com.pk https://payments.jazzcash.com.pk"
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  // Geolocation is allowed for the focal person's "use my location"; the rest off.
  { key: 'Permissions-Policy', value: 'geolocation=(self), camera=(), microphone=(), payment=()' }
];

const nextConfig = {
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '**.supabase.co' }]
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  }
};
module.exports = nextConfig;
