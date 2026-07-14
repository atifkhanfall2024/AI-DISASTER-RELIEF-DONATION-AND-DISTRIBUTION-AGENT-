import { Schema, models, model } from 'mongoose';

export interface IPledgeItem {
  name: string;
  category: string;
  quantity: number;
  unit: string;
  condition: 'new' | 'used';
  mappedInventoryId?: string; // Set when admin verifies and maps it to central inventory
}

export interface IItemPledge {
  _id: string;
  donorName: string;
  donorEmail: string;
  donorPhone: string;
  items: IPledgeItem[];
  dropoffLocation: string;
  trackingId: string;
  status: 'pending' | 'received' | 'rejected';
  adminNotes?: string;
  receivedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PledgeItemSchema = new Schema<IPledgeItem>({
  name: { type: String, required: true },
  category: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  unit: { type: String, required: true },
  condition: { type: String, enum: ['new', 'used'], required: true },
  mappedInventoryId: { type: Schema.Types.ObjectId, ref: 'Inventory' }
});

const ItemPledgeSchema = new Schema<IItemPledge>(
  {
    donorName: { type: String, required: true },
    donorEmail: { type: String, required: true },
    donorPhone: { type: String, required: true },
    items: [PledgeItemSchema],
    dropoffLocation: { type: String, required: true },
    trackingId: { type: String, required: true, unique: true },
    status: { type: String, enum: ['pending', 'received', 'rejected'], default: 'pending' },
    adminNotes: String,
    receivedAt: Date
  },
  { timestamps: true }
);

const ItemPledge = models.ItemPledge || model<IItemPledge>('ItemPledge', ItemPledgeSchema);
export default ItemPledge;
