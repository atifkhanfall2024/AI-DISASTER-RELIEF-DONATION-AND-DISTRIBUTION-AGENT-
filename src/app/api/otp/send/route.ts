import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createOtp, normalizeTarget } from '@/lib/otp';
import { sendEmail, isEmailConfigured } from '@/lib/mailer';
import { sendSms, isSmsConfigured } from '@/lib/sms';

export const dynamic = 'force-dynamic';

const schema = z.object({
  channel: z.enum(['email', 'sms']),
  target: z.string().min(3)
});

// POST /api/otp/send  { channel, target } -> generate a code and deliver it
export async function POST(req: Request) {
  try {
    const { channel, target: rawTarget } = schema.parse(await req.json());
    const target = normalizeTarget(channel, rawTarget);

    if (channel === 'email' && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(target)) {
      return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 });
    }
    if (channel === 'sms' && !/^\+?\d{7,15}$/.test(target)) {
      return NextResponse.json({ error: 'Enter a valid phone number (7–15 digits).' }, { status: 400 });
    }

    const { code } = await createOtp(channel, target);
    const message = `Your ReliefAid verification code is ${code}. It expires in 10 minutes.`;

    let configured = false;
    if (channel === 'email') {
      await sendEmail(target, 'ReliefAid verification code', message);
      configured = isEmailConfigured();
    } else {
      await sendSms(target, message);
      configured = isSmsConfigured();
    }

    // In dev, when no real provider is configured, return the code so the flow is
    // testable without live email/SMS. This is NEVER returned in production.
    const devCode = !configured && process.env.NODE_ENV !== 'production' ? code : undefined;
    return NextResponse.json({ ok: true, configured, devCode });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to send verification code.' }, { status: 400 });
  }
}
