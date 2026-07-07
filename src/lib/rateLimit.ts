/**
 * Lightweight in-memory sliding-window rate limiter.
 *
 * Good enough for a single-instance FYP deployment and for stopping the real
 * abuse this app can suffer now that email/SMS actually send (OTP bombing) and
 * passwords are checked (brute force). For a horizontally-scaled production
 * deployment you'd swap the Map for Redis — the checkRateLimit() contract stays
 * the same.
 */

type Hit = { count: number; resetAt: number };
const buckets = new Map<string, Hit>();

// Opportunistic cleanup so the Map can't grow without bound.
let lastSweep = Date.now();
function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, hit] of buckets) {
    if (hit.resetAt <= now) buckets.delete(key);
  }
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSec: number;
}

/**
 * @param key    unique bucket id, e.g. `otp:email:foo@bar.com`
 * @param limit  max allowed hits within the window
 * @param windowMs  window length in milliseconds
 */
export function checkRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const hit = buckets.get(key);
  if (!hit || hit.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, retryAfterSec: 0 };
  }

  if (hit.count >= limit) {
    return { allowed: false, remaining: 0, retryAfterSec: Math.ceil((hit.resetAt - now) / 1000) };
  }

  hit.count += 1;
  return { allowed: true, remaining: limit - hit.count, retryAfterSec: 0 };
}

/** Clear a bucket early, e.g. after a successful login so failures don't linger. */
export function resetRateLimit(key: string) {
  buckets.delete(key);
}

/** Best-effort client IP from proxy headers (Vercel/Nginx) with a safe fallback. */
export function clientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return req.headers.get('x-real-ip') || 'unknown';
}

/** Standard 429 body + Retry-After header for a tripped limit. */
export function tooManyRequests(retryAfterSec: number, message?: string) {
  return new Response(
    JSON.stringify({ error: message || `Too many requests. Please try again in ${retryAfterSec}s.` }),
    {
      status: 429,
      headers: { 'Content-Type': 'application/json', 'Retry-After': String(retryAfterSec) }
    }
  );
}
