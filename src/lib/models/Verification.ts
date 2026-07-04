import { Schema, models, model } from 'mongoose';

export type OtpChannel = 'email' | 'sms';
export type OtpPurpose = 'register' | 'login';

export interface IVerification {
  _id: string;
  channel: OtpChannel;
  target: string; // normalized email or phone number
  codeHash: string; // bcrypt hash of the 6-digit code (never store the plain code)
  purpose: OtpPurpose;
  attempts: number;
  consumed: boolean; // true once the correct code has been entered
  verifiedAt?: Date;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const VerificationSchema = new Schema<IVerification>(
  {
    channel: { type: String, enum: ['email', 'sms'], required: true },
    target: { type: String, required: true, index: true },
    codeHash: { type: String, required: true },
    purpose: { type: String, enum: ['register', 'login'], default: 'register' },
    attempts: { type: Number, default: 0 },
    consumed: { type: Boolean, default: false },
    verifiedAt: { type: Date },
    expiresAt: { type: Date, required: true }
  },
  { timestamps: true }
);

// TTL index: Mongo auto-purges documents once expiresAt passes, so stale codes
// (and used verification records) clean themselves up without a cron job.
VerificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default models.Verification || model<IVerification>('Verification', VerificationSchema);
