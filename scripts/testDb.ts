import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local' });
loadEnv();
import mongoose from 'mongoose';
import Inventory from '../src/lib/models/Inventory';

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI not found');

  console.log('Connecting to database...');
  await mongoose.connect(uri);
  console.log('Connected!');

  // 1. Fetch existing
  const existing = await Inventory.find().lean();
  console.log(`Current items in DB: ${existing.length}`);
  existing.forEach((e: any) => console.log(` - ${e.itemName} (${e.totalQuantity} ${e.unit})`));

  // 2. Add new dummy item
  const testName = `Test Item ${Date.now()}`;
  console.log(`\nAdding new item: ${testName}`);
  await Inventory.create({
    itemName: testName,
    category: 'Test',
    totalQuantity: 100,
    reservedQuantity: 0,
    unit: 'boxes'
  });

  // 3. Verify it was saved
  const saved = await Inventory.findOne({ itemName: testName }).lean();
  if (saved) {
    console.log('✅ Success! Data was permanently saved to MongoDB.');
  }

  // 4. Cleanup test item so we don't mess up their UI
  await Inventory.deleteOne({ itemName: testName });
  console.log('🧹 Cleaned up test item.');

  await mongoose.disconnect();
}

main().catch(console.error);
