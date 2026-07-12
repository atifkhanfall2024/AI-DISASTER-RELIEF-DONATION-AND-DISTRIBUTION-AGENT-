import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { connectDB } from '@/lib/mongodb';
import User from '@/lib/models/User';
import { isVerified, normalizeTarget } from '@/lib/otp';
import { checkRateLimit, clientIp, tooManyRequests } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  cnic: z
    .string()
    .optional()
    .transform((val) => (val ? val.replace(/\D/g, '') : val)) // strip dashes/spaces
    .refine((val) => !val || val.length === 13, {
      message: 'CNIC must be exactly 13 digits.'
    }),
  phone: z.string().min(7),
  // Admin accounts are provisioned separately (invite-only), never via open signup.
  role: z.enum(['donor', 'focal']).default('donor')
}).refine((data) => {
  // Focal persons must provide CNIC
  if (data.role === 'focal' && !data.cnic) {
    return false;
  }
  return true;
}, {
  message: 'CNIC is required for Focal Person accounts.',
  path: ['cnic']
});

export async function POST(req: Request) {
  try {
    // Cap account creation per IP (5/hour) against mass/automated signups.
    const gate = checkRateLimit(`register:ip:${clientIp(req)}`, 5, 60 * 60 * 1000);
    if (!gate.allowed) {
      return tooManyRequests(gate.retryAfterSec, 'Too many sign-up attempts. Please try again later.');
    }

    const body = await req.json();
    const data = schema.parse(body);

    await connectDB();
    const existing = await User.findOne({ email: data.email.toLowerCase() });
    if (existing) {
      return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 });
    }

    // OTP gate: both email and phone must be verified before the account is created.
    const emailVerified = await isVerified('email', normalizeTarget('email', data.email));
    if (!emailVerified) {
      return NextResponse.json({ error: 'Please verify your email with the code we sent.' }, { status: 400 });
    }
    const phoneVerified = await isVerified('sms', normalizeTarget('sms', data.phone));
    if (!phoneVerified) {
      return NextResponse.json({ error: 'Please verify your phone number with the code we sent.' }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(data.password, 10);
    const user = await User.create({
      name: data.name,
      email: data.email.toLowerCase(),
      passwordHash,
      cnic: data.cnic || undefined, // store normalized digits only (no dashes)
      phone: data.phone,
      role: data.role
    });

    return NextResponse.json({ id: user._id, email: user.email, role: user.role }, { status: 201 });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      const first = err.errors[0];
      const field = first?.path?.join('.') || 'input';
      return NextResponse.json({ error: `Invalid ${field}: ${first?.message || 'check your input.'}` }, { status: 400 });
    }
    return NextResponse.json({ error: err.message || 'Registration failed' }, { status: 400 });
  }
}
