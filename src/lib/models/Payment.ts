import { Schema, models, model, Types } from 'mongoose';

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'cancelled';

// A Payment is a checkout ATTEMPT. A Donation record (with receipt) is only
// created once the gateway confirms the payment — so donationRaised can never
// be inflated by abandoned or failed checkouts.
export interface IPayment {
  _id: string;
  request: Types.ObjectId;
  donor?: Types.ObjectId;
  donorName: string;
  amount: number; // PKR
  method: string; // 'JazzCash' | 'Demo Gateway' | ...
  message?: string;
  status: PaymentStatus;
  txnRef: string; // our reference sent to the gateway (unique)
  gatewayTxnId?: string; // gateway's own transaction id from the callback
  gatewayResponse?: string; // response code / error detail for the audit trail
  donation?: Types.ObjectId; // set once the Donation record is created
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema<IPayment>(
  {
    request: { type: Schema.Types.ObjectId, ref: 'ReliefRequest', required: true, index: true },
    donor: { type: Schema.Types.ObjectId, ref: 'User' },
    donorName: { type: String, default: 'Anonymous Donor' },
    amount: { type: Number, required: true, min: 1 },
    method: { type: String, default: 'Demo Gateway' },
    message: String,
    status: { type: String, enum: ['pending', 'paid', 'failed', 'cancelled'], default: 'pending' },
    txnRef: { type: String, required: true, unique: true },
    gatewayTxnId: String,
    gatewayResponse: String,
    donation: { type: Schema.Types.ObjectId, ref: 'Donation' }
  },
  { timestamps: true }
);

export default models.Payment || model<IPayment>('Payment', PaymentSchema);
