import { Schema, models, model } from 'mongoose';

export type UserRole = 'donor' | 'focal' | 'admin';

export interface IUser {
  _id: string;
  name: string;
  email: string;
  passwordHash?: string; // optional: OAuth (Google) accounts have no local password
  cnic?: string;
  phone?: string;
  role: UserRole;
  provider?: 'credentials' | 'google';
  createdAt: Date;
  focalStatus?: 'pending' | 'approved' | 'rejected';
  focalDocs?: string[];
}

// REQ-1: signup captures CNIC, phone, and email.
const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String },
    cnic: {
      type: String,
      validate: {
        validator: (v: string) => !v || /^\d{13}$/.test(v),
        message: 'CNIC must be exactly 13 digits (no dashes).'
      }
    },
    phone: { type: String },
    role: { type: String, enum: ['donor', 'focal', 'admin'], default: 'donor' },
    provider: { type: String, enum: ['credentials', 'google'], default: 'credentials' },
    focalStatus: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    focalDocs: { type: [String], default: [] }
  },
  { timestamps: true }
);

export default models.User || model<IUser>('User', UserSchema);
