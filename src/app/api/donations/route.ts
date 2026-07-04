import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/authOptions';
import { connectDB } from '@/lib/mongodb';
import Donation from '@/lib/models/Donation';
import ReliefRequest from '@/lib/models/Request';
import Log from '@/lib/models/Log';

export const dynamic = 'force-dynamic';

const schema = z.object({
  requestId: z.string(),
  amount: z.number().positive(),
  paymentMethod: z.string().default('Card'),
  message: z.string().optional(),
  donorName: z.string().optional()
});

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

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const data = schema.parse(await req.json());
  await connectDB();

  const relief = await ReliefRequest.findById(data.requestId);
  if (!relief) return NextResponse.json({ error: 'Request not found' }, { status: 404 });

  const donation = await Donation.create({
    request: relief._id,
    donor: session?.user?.id,
    donorName: data.donorName || session?.user?.name || 'Anonymous Donor',
    amount: data.amount,
    paymentMethod: data.paymentMethod,
    message: data.message
  });

  relief.donationRaised = (relief.donationRaised || 0) + data.amount;
  await relief.save();

  await Log.create({
    actorName: donation.donorName,
    actorType: 'donor',
    action: `Donated PKR ${data.amount.toLocaleString()}`,
    type: 'donation',
    relatedId: `#${relief._id.toString().slice(-6).toUpperCase()}`
  });

  return NextResponse.json(donation, { status: 201 });
}
