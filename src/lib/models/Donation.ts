import { Schema, models, model, Types } from 'mongoose';

export interface IDonation {
  _id: string;
  request: Types.ObjectId;
  donor?: Types.ObjectId;
  donorName: string;
  amount: number;
  paymentMethod: string;
  message?: string;
  receiptNo: string;
  createdAt: Date;
}

function makeReceiptNo() {
  // e.g. FA-20251125-8F3A2
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const rand = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `FA-${ymd}-${rand}`;
}

const DonationSchema = new Schema<IDonation>(
  {
    request: { type: Schema.Types.ObjectId, ref: 'ReliefRequest', required: true },
    donor: { type: Schema.Types.ObjectId, ref: 'User' },
    donorName: { type: String, default: 'Anonymous Donor' },
    amount: { type: Number, required: true },
    paymentMethod: { type: String, default: 'Card' },
    message: String,
    // "System should generate receipts for donors" (Section 6).
    receiptNo: { type: String, default: makeReceiptNo, index: true }
  },
  { timestamps: true }
);

export default models.Donation || model<IDonation>('Donation', DonationSchema);
