import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { connectDB } from '@/lib/mongodb';
import Donation from '@/lib/models/Donation';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  await connectDB();
  const { searchParams } = new URL(req.url);
  const requestId = searchParams.get('requestId');
  const mine = searchParams.get('mine');

  const filter: any = {};
  if (requestId) filter.request = requestId;
  // REQ-15: a donor can view their own donation history.
  if (mine && session?.user?.id) filter.donor = session.user.id;

  const donations = await Donation.find(filter)
    .populate('request', 'area district urgency')
    .sort({ createdAt: -1 })
    .lean();
  return NextResponse.json(donations);
}

// Donations are no longer created here. Money must flow through the payment
// gateway: POST /api/payments/initiate → gateway checkout → verified callback →
// Donation record. This closes the hole where a crafted request could inflate
// donationRaised without any payment.
export async function POST() {
  return NextResponse.json(
    { error: 'Direct donations are disabled. Start a checkout via /api/payments/initiate.' },
    { status: 410 }
  );
}
