import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local' });
import mongoose from 'mongoose';
import ItemPledge from '../src/lib/models/ItemPledge';

async function checkPledge() {
  await mongoose.connect(process.env.MONGODB_URI as string);
  const p = await ItemPledge.findOne({ trackingId: '500B88' }).lean();
  console.log(p);
  await mongoose.disconnect();
}

checkPledge().catch(console.error);
