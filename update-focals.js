import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to DB');
  
  const result = await mongoose.connection.collection('users').updateMany(
    { role: 'focal', focalStatus: { $exists: false } },
    { $set: { focalStatus: 'approved' } }
  );
  
  console.log('Update result:', result);
  await mongoose.disconnect();
}

run().catch(console.error);
