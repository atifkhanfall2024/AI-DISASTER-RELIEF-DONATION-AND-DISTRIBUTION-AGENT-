import { Schema, models, model, Types } from 'mongoose';

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'cancelled';
export type PaymentKind = 'direct' | 'smart' | 'general';

export interface IPaymentAllocation {
  request: Types.ObjectId;
  requestArea: string; // snapshot for display on receipts/results
  amount: number; // PKR routed to this request
}

// A Payment is a checkout ATTEMPT. Donation records (with receipts) are only
// created once the gateway confirms the payment — so donationRaised can never
// be inflated by abandoned or failed checkouts.
//
// kind:
//  - 'direct'  : donor chose one request (request set, allocations empty)
//  - 'smart'   : donor gave an amount, the engine split it across top needs
//  - 'general' : donor gave to the General Fund, the engine allocates it
// For smart/general the money is spread across `allocations` (one Donation each).
export interface IPayment {
  _id: string;
  kind: PaymentKind;
  request?: Types.ObjectId; // set for 'direct'
  allocations: IPaymentAllocation[]; // set for 'smart' | 'general'
  donor?: Types.ObjectId;
  donorName: string;
  amount: number; // PKR (total)
  method: string; // 'JazzCash' | 'Demo Gateway' | ...
  message?: string;
  status: PaymentStatus;
  txnRef: string; // our reference sent to the gateway (unique)
  gatewayTxnId?: string; // gateway's own transaction id from the callback
  gatewayResponse?: string; // response code / error detail for the audit trail
  donations: Types.ObjectId[]; // Donation records created on settlement
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema<IPayment>(
  {
    kind: { type: String, enum: ['direct', 'smart', 'general'], default: 'direct' },
    request: { type: Schema.Types.ObjectId, ref: 'ReliefRequest', index: true },
    allocations: [
      {
        _id: false,
        request: { type: Schema.Types.ObjectId, ref: 'ReliefRequest', required: true },
        requestArea: { type: String, default: '' },
        amount: { type: Number, required: true, min: 1 }
      }
    ],
    donor: { type: Schema.Types.ObjectId, ref: 'User' },
    donorName: { type: String, default: 'Anonymous Donor' },
    amount: { type: Number, required: true, min: 1 },
    method: { type: String, default: 'Demo Gateway' },
    message: String,
    status: { type: String, enum: ['pending', 'paid', 'failed', 'cancelled'], default: 'pending' },
    txnRef: { type: String, required: true, unique: true },
    gatewayTxnId: String,
    gatewayResponse: String,
    donations: [{ type: Schema.Types.ObjectId, ref: 'Donation' }]
  },
  { timestamps: true }
);

export default models.Payment || model<IPayment>('Payment', PaymentSchema);
