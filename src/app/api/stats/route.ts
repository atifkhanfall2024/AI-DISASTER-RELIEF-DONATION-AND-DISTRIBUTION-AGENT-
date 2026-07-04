import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import ReliefRequest from '@/lib/models/Request';
import Donation from '@/lib/models/Donation';

export const dynamic = 'force-dynamic';

export async function GET() {
  await connectDB();
  const [total, pending, approved, rejected, fulfilled, donations] = await Promise.all([
    ReliefRequest.countDocuments(),
    ReliefRequest.countDocuments({ status: 'needs_approval' }),
    ReliefRequest.countDocuments({ status: { $in: ['approved', 'fulfilled'] } }),
    ReliefRequest.countDocuments({ status: 'rejected' }),
    ReliefRequest.countDocuments({ status: 'fulfilled' }),
    Donation.aggregate([{ $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }])
  ]);

  const familiesAgg = await ReliefRequest.aggregate([
    { $match: { status: { $in: ['approved', 'fulfilled'] } } },
    { $group: { _id: null, total: { $sum: '$familiesAffected' } } }
  ]);

  return NextResponse.json({
    totalRequests: total,
    pendingReview: pending,
    approved,
    rejected,
    fulfilled,
    totalDonations: donations[0]?.total || 0,
    donationCount: donations[0]?.count || 0,
    familiesHelped: familiesAgg[0]?.total || 0
  });
}
