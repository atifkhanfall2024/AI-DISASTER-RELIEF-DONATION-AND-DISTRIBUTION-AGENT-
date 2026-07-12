/**
 * Seed script - creates a demo admin, focal person, and donor account,
 * plus a couple of sample relief requests, so you can explore the app
 * immediately after connecting your MongoDB database.
 *
 * Run with: npm run seed
 */
import { config as loadEnv } from 'dotenv';
// Next.js loads .env.local automatically, but this standalone script does not,
// so load .env.local first (falling back to .env) before reading MONGODB_URI.
loadEnv({ path: '.env.local' });
loadEnv();
import dns from 'node:dns';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../src/lib/models/User';
import ReliefRequest from '../src/lib/models/Request';

// ── DNS Fix ───────────────────────────────────────────────────────────────────
// Pakistan ISPs often fail MongoDB Atlas SRV lookups (querySrv ECONNREFUSED).
// Prepend reliable public DNS resolvers so the connection works on any network.
try {
  const existing = dns.getServers();
  dns.setServers([...new Set(['8.8.8.8', '1.1.1.1', ...existing])]);
  console.log('✓ DNS resolvers set to Google + Cloudflare');
} catch {
  // safe to ignore on unsupported platforms
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('Set MONGODB_URI in .env.local before seeding.');

  console.log('⏳ Connecting to MongoDB Atlas...');
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });

  const passwordHash = await bcrypt.hash('password123', 10);

  const admin = await User.findOneAndUpdate(
    { email: 'admin@reliefaid.dev' },
    { name: 'Admin User', email: 'admin@reliefaid.dev', passwordHash, role: 'admin' },
    { upsert: true, new: true }
  );

  const focal = await User.findOneAndUpdate(
    { email: 'focal@reliefaid.dev' },
    { name: 'Zafar Ali', email: 'focal@reliefaid.dev', passwordHash, role: 'focal', cnic: '41303-1234567-1', phone: '+92 300 1234567' },
    { upsert: true, new: true }
  );

  await User.findOneAndUpdate(
    { email: 'donor@reliefaid.dev' },
    { name: 'Sana Malik', email: 'donor@reliefaid.dev', passwordHash, role: 'donor' },
    { upsert: true, new: true }
  );

  await ReliefRequest.findOneAndUpdate(
    { area: 'Jamshoro District', focal: focal._id },
    {
      focal: focal._id,
      area: 'Jamshoro District',
      district: 'Sindh',
      disasterType: 'flood',
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

  await ReliefRequest.findOneAndUpdate(
    { area: 'Harnai', focal: focal._id },
    {
      focal: focal._id,
      area: 'Harnai',
      district: 'Balochistan',
      disasterType: 'earthquake',
      urgency: 'high',
      familiesAffected: 85,
      description:
        'A 5.9 magnitude earthquake damaged dozens of homes overnight. Families need tents and blankets as aftershocks continue and night temperatures drop sharply.',
      items: ['Tents', 'Blankets', 'Medicine'],
      images: [],
      status: 'approved',
      aiScore: 8.6,
      aiFlags: [],
      aiReasoning:
        'Credible earthquake report with a clear damage description and seasonal exposure risk; high families-affected count.',
      aiRecommendation: 'approve',
      donationGoal: 300000,
      donationRaised: 60000
    },
    { upsert: true, new: true }
  );

  console.log('Seed complete. Demo accounts (password: password123):');
  console.log(' - admin@reliefaid.dev (admin)');
  console.log(' - focal@reliefaid.dev (focal)');
  console.log(' - donor@reliefaid.dev (donor)');

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
