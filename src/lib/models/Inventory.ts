import { Schema, models, model } from 'mongoose';

export interface IInventory {
  _id: string;
  itemName: string;
  category: string;
  totalQuantity: number;
  reservedQuantity: number;
  unit: string;
  createdAt: Date;
  updatedAt: Date;
}

const InventorySchema = new Schema<IInventory>(
  {
    itemName: { type: String, required: true, unique: true },
    category: { type: String, required: true },
    totalQuantity: { type: Number, default: 0, min: 0 },
    reservedQuantity: { type: Number, default: 0, min: 0 },
    unit: { type: String, required: true } // e.g. 'tents', 'bags', 'kits'
  },
  { timestamps: true }
);

const Inventory = models.Inventory || model<IInventory>('Inventory', InventorySchema);
export default Inventory;
