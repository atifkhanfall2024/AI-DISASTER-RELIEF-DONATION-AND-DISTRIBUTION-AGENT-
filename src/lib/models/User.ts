import mongoose, { Schema, models, model } from 'mongoose';

export type UserRole = 'donor' | 'focal' | 'admin';

export interface IUser {
  _id: string;
  name: string;
  email: string;
  passwordHash: string;
  cnic?: string;
  phone?: string;
  role: UserRole;
  createdAt: Date;
}

// REQ-1: signup captures CNIC, phone, and email.
const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    cnic: { type: String },
    phone: { type: String },
    role: { type: String, enum: ['donor', 'focal', 'admin'], default: 'donor' }
  },
  { timestamps: true }
);

export default models.User || model<IUser>('User', UserSchema);
