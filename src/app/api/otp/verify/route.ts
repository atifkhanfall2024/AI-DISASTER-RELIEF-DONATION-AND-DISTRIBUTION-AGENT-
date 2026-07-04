import { NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyOtp, normalizeTarget } from '@/lib/otp';

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
    const result = await verifyOtp(channel, target, code);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Verification failed.' }, { status: 400 });
  }
}
