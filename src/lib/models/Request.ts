import { Schema, models, model, Types } from 'mongoose';

export type Urgency = 'low' | 'medium' | 'high' | 'critical';
export type RequestStatus = 'pending' | 'needs_approval' | 'approved' | 'rejected' | 'fulfilled';

export interface IReliefRequest {
  _id: string;
  focal: Types.ObjectId;
  area: string;
  district?: string;
  province?: string;
  lat?: number;
  lng?: number;
  urgency: Urgency;
  familiesAffected: number;
  description: string;
  items: string[];
  images: string[];
  status: RequestStatus;
  aiScore?: number;
  aiFlags: string[];
  aiReasoning?: string;
  aiRecommendation?: 'approve' | 'reject' | 'review';
  adminNotes?: string;
  donationGoal: number;
  donationRaised: number;
  createdAt: Date;
  updatedAt: Date;
}

const RequestSchema = new Schema<IReliefRequest>(
  {
    focal: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    area: { type: String, required: true },
    district: String,
    province: String,
    lat: Number,
    lng: Number,
    urgency: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
    familiesAffected: { type: Number, required: true, default: 1 },
    description: { type: String, required: true },
    items: [{ type: String }],
    images: [{ type: String }],
    status: {
      type: String,
      enum: ['pending', 'needs_approval', 'approved', 'rejected', 'fulfilled'],
      default: 'pending'
    },
    aiScore: Number,
    aiFlags: [{ type: String }],
    aiReasoning: String,
    aiRecommendation: { type: String, enum: ['approve', 'reject', 'review'] },
    adminNotes: String,
    donationGoal: { type: Number, default: 100000 },
    donationRaised: { type: Number, default: 0 }
  },
  { timestamps: true }
);

export default models.ReliefRequest || model<IReliefRequest>('ReliefRequest', RequestSchema);
