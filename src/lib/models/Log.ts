import { Schema, models, model } from 'mongoose';

export type LogType = 'submit' | 'ai' | 'approval' | 'rejection' | 'donation' | 'distribution';

export interface ILog {
  _id: string;
  actorName: string;
  actorType: 'focal' | 'admin' | 'system' | 'donor';
  action: string;
  type: LogType;
  relatedId?: string;
  createdAt: Date;
}

const LogSchema = new Schema<ILog>(
  {
    actorName: { type: String, required: true },
    actorType: { type: String, enum: ['focal', 'admin', 'system', 'donor'], required: true },
    action: { type: String, required: true },
    type: { type: String, enum: ['submit', 'ai', 'approval', 'rejection', 'donation', 'distribution'], required: true },
    relatedId: String
  },
  { timestamps: true }
);

export default models.Log || model<ILog>('Log', LogSchema);
