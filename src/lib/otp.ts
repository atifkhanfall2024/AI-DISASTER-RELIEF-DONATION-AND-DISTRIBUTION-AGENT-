import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/mongodb';
import Verification, { OtpChannel, OtpPurpose } from '@/lib/models/Verification';

const CODE_TTL_MIN = 10; // how long a freshly-sent code stays valid
const VERIFIED_TTL_MIN = 20; // how long a "verified" record survives so registration can complete
const MAX_ATTEMPTS = 5;

/** Six-digit numeric OTP as a string (leading zeros preserved). */
export function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

/** Normalize a target so send/verify/isVerified all key off the same value. */
export function normalizeTarget(channel: OtpChannel, raw: string): string {
  if (channel === 'email') return raw.trim().toLowerCase();
  return raw.replace(/[\s()-]/g, ''); // strip spaces, dashes, parentheses from phone numbers
}

/** Create (or replace) a pending OTP for a target and return the plain code to send. */
export async function createOtp(channel: OtpChannel, target: string, purpose: OtpPurpose = 'register') {
  await connectDB();
  const code = generateCode();
  const codeHash = await bcrypt.hash(code, 10);
  const expiresAt = new Date(Date.now() + CODE_TTL_MIN * 60 * 1000);
  // Drop any previous unconsumed code for this target so only the latest one works.
  await Verification.deleteMany({ channel, target, consumed: false });
  await Verification.create({ channel, target, codeHash, purpose, expiresAt });
  return { code, expiresAt };
}

/** Check a submitted code. On success the record is marked consumed + kept briefly for registration. */
export async function verifyOtp(channel: OtpChannel, target: string, code: string) {
  await connectDB();
  const record = await Verification.findOne({ channel, target, consumed: false }).sort({ createdAt: -1 });
  if (!record) return { ok: false as const, error: 'No verification code found. Please request a new one.' };
  if (record.expiresAt.getTime() < Date.now()) {
    return { ok: false as const, error: 'This code has expired. Please request a new one.' };
  }
  if (record.attempts >= MAX_ATTEMPTS) {
    return { ok: false as const, error: 'Too many incorrect attempts. Please request a new code.' };
  }

  const valid = await bcrypt.compare(code, record.codeHash);
  if (!valid) {
    record.attempts += 1;
    await record.save();
    return { ok: false as const, error: 'Incorrect code. Please try again.' };
  }

  record.consumed = true;
  record.verifiedAt = new Date();
  record.expiresAt = new Date(Date.now() + VERIFIED_TTL_MIN * 60 * 1000);
  await record.save();
  return { ok: true as const };
}

/** True if `target` was recently verified on `channel` (used to gate account creation). */
export async function isVerified(channel: OtpChannel, target: string) {
  await connectDB();
  const record = await Verification.findOne({
    channel,
    target,
    consumed: true,
    verifiedAt: { $ne: null },
    expiresAt: { $gt: new Date() }
  });
  return !!record;
}
