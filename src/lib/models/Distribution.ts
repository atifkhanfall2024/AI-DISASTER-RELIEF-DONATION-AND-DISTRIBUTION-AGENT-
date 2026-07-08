import { Schema, models, model, Types } from 'mongoose';

export type DistributionStatus = 'recorded' | 'verified';

export interface IDistributionItem {
  name: string;
  quantity: number;
}

// "Distribution" = the second half of the project's name: after donations come in,
// the focal person records each on-the-ground aid delivery (with proof photos and
// beneficiary counts), an admin verifies it, and donors see where their money went.
export interface IDistribution {
  _id: string;
  request: Types.ObjectId;
  distributedBy: Types.ObjectId;
  distributorName: string; // snapshot for display (same pattern as Log.actorName)
  familiesReached: number;
  items: IDistributionItem[];
  amountSpent: number; // PKR drawn from this request's raised funds (0 = in-kind only)
  location?: string;
  notes?: string;
  proofImages: string[];
  beneficiaryCnics: string[]; // normalized CNICs of families who received aid
  flaggedBeneficiaries: string[]; // CNICs that already received aid elsewhere (double-dip)
  status: DistributionStatus;
  verifiedBy?: Types.ObjectId;
  verifiedAt?: Date;
  isFinal: boolean; // focal marks "this completes the request" → verify auto-fulfills it
  createdAt: Date;
  updatedAt: Date;
}

const DistributionSchema = new Schema<IDistribution>(
  {
    request: { type: Schema.Types.ObjectId, ref: 'ReliefRequest', required: true, index: true },
    distributedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    distributorName: { type: String, required: true },
    familiesReached: { type: Number, required: true, min: 1 },
    items: [
      {
        _id: false, // plain value objects — no per-item ObjectIds in payloads
        name: { type: String, required: true },
        quantity: { type: Number, required: true, min: 1 }
      }
    ],
    amountSpent: { type: Number, default: 0, min: 0 },
    location: String,
    notes: String,
    proofImages: [{ type: String }],
    beneficiaryCnics: [{ type: String }],
    flaggedBeneficiaries: [{ type: String }],
    status: { type: String, enum: ['recorded', 'verified'], default: 'recorded' },
    verifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    verifiedAt: Date,
    isFinal: { type: Boolean, default: false }
  },
  { timestamps: true }
);

export default models.Distribution || model<IDistribution>('Distribution', DistributionSchema);
