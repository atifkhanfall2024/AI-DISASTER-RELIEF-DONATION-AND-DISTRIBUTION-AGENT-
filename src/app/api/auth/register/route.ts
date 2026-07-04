import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { connectDB } from '@/lib/mongodb';
import User from '@/lib/models/User';
import { isVerified, normalizeTarget } from '@/lib/otp';

export const dynamic = 'force-dynamic';

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  cnic: z.string().optional(),
  phone: z.string().min(7),
  // Admin accounts are provisioned separately (invite-only), never via open signup.
  role: z.enum(['donor', 'focal']).default('donor')
});

export async function POST(req: Request) {
  try {
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
      cnic: data.cnic,
      phone: data.phone,
      role: data.role
    });

    return NextResponse.json({ id: user._id, email: user.email, role: user.role }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Registration failed' }, { status: 400 });
  }
}
