/**
 * Seed script - creates a demo admin, focal person, and donor account,
 * plus a couple of sample relief requests, so you can explore the app
 * immediately after connecting your MongoDB database.
 *
 * Run with: npm run seed
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../src/lib/models/User';
import ReliefRequest from '../src/lib/models/Request';

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('Set MONGODB_URI in .env.local before seeding.');
  await mongoose.connect(uri);

  const passwordHash = await bcrypt.hash('password123', 10);

  const admin = await User.findOneAndUpdate(
    { email: 'admin@floodaid.dev' },
    { name: 'Admin User', email: 'admin@floodaid.dev', passwordHash, role: 'admin' },
    { upsert: true, new: true }
  );

  const focal = await User.findOneAndUpdate(
    { email: 'focal@floodaid.dev' },
    { name: 'Zafar Ali', email: 'focal@floodaid.dev', passwordHash, role: 'focal', cnic: '41303-1234567-1', phone: '+92 300 1234567' },
    { upsert: true, new: true }
  );

  await User.findOneAndUpdate(
    { email: 'donor@floodaid.dev' },
    { name: 'Sana Malik', email: 'donor@floodaid.dev', passwordHash, role: 'donor' },
    { upsert: true, new: true }
  );

  await ReliefRequest.findOneAndUpdate(
    { area: 'Jamshoro District', focal: focal._id },
    {
      focal: focal._id,
      area: 'Jamshoro District',
      district: 'Sindh',
      urgency: 'critical',
      familiesAffected: 210,
      description:
        'Recent flash floods have completely destroyed 40+ mud houses in the village perimeter. Families are currently sitting on the main highway with no shelter.',
      items: ['Tents', 'Food', 'Water'],
      images: [],
      status: 'approved',
      aiScore: 9.4,
      aiFlags: [],
      aiReasoning: 'High families-affected count combined with detailed description and critical urgency.',
      aiRecommendation: 'approve',
      donationGoal: 500000,
      donationRaised: 125000
    },
    { upsert: true, new: true }
  );

  console.log('Seed complete. Demo accounts (password: password123):');
  console.log(' - admin@floodaid.dev (admin)');
  console.log(' - focal@floodaid.dev (focal)');
  console.log(' - donor@floodaid.dev (donor)');

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
