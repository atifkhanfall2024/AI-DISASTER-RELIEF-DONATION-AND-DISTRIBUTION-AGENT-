import { NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyOtp, normalizeTarget } from '@/lib/otp';
import { checkRateLimit, clientIp, tooManyRequests } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

const schema = z.object({
  channel: z.enum(['email', 'sms']),
  target: z.string().min(3),
  code: z.string().min(4).max(8)
});

// POST /api/otp/verify  { channel, target, code } -> validate a submitted code
export async function POST(req: Request) {
  try {
    const { channel, target: rawTarget, code } = schema.parse(await req.json());
    const target = normalizeTarget(channel, rawTarget);

    // Brute-force guard on top of the per-record MAX_ATTEMPTS in otp.ts:
    // cap total guesses per IP so codes can't be sprayed across targets.
    const ip = clientIp(req);
    const guard = checkRateLimit(`otp:verify:ip:${ip}`, 20, 15 * 60 * 1000);
    if (!guard.allowed) {
      return tooManyRequests(guard.retryAfterSec, 'Too many verification attempts. Please try again later.');
    }
    const result = await verifyOtp(channel, target, code);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Verification failed.' }, { status: 400 });
  }
}
