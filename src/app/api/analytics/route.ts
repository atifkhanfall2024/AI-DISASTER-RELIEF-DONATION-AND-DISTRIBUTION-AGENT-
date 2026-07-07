import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { connectDB } from '@/lib/mongodb';
import ReliefRequest from '@/lib/models/Request';
import Donation from '@/lib/models/Donation';
import Distribution from '@/lib/models/Distribution';

export const dynamic = 'force-dynamic';

// GET /api/analytics -> admin-only aggregate breakdowns for the analytics dashboard.
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Admin only.' }, { status: 403 });
  }

  await connectDB();
  const since = new Date();
  since.setDate(since.getDate() - 29);
  since.setHours(0, 0, 0, 0);

  const [byDisaster, byStatus, donationsByDay, requestsByDay, topAreas, totals, reached] =
    await Promise.all([
      ReliefRequest.aggregate([
        { $group: { _id: { $ifNull: ['$disasterType', 'other'] }, count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      ReliefRequest.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Donation.aggregate([
        { $match: { createdAt: { $gte: since } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            amount: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]),
      ReliefRequest.aggregate([
        { $match: { createdAt: { $gte: since } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]),
      ReliefRequest.aggregate([
        {
          $group: {
            _id: '$area',
            requests: { $sum: 1 },
            families: { $sum: '$familiesAffected' },
            raised: { $sum: '$donationRaised' }
          }
        },
        { $sort: { requests: -1, families: -1 } },
        { $limit: 6 }
      ]),
      Donation.aggregate([{ $group: { _id: null, amount: { $sum: '$amount' }, count: { $sum: 1 } } }]),
      Distribution.aggregate([
        { $match: { status: 'verified' } },
        { $group: { _id: null, families: { $sum: '$familiesReached' }, spent: { $sum: '$amountSpent' } } }
      ])
    ]);

  return NextResponse.json({
    byDisaster: byDisaster.map((d) => ({ type: d._id, count: d.count })),
    byStatus: byStatus.map((s) => ({ status: s._id, count: s.count })),
    donationsByDay: donationsByDay.map((d) => ({ date: d._id, amount: d.amount, count: d.count })),
    requestsByDay: requestsByDay.map((d) => ({ date: d._id, count: d.count })),
    topAreas: topAreas.map((a) => ({
      area: a._id,
      requests: a.requests,
      families: a.families,
      raised: a.raised || 0
    })),
    totals: {
      donationAmount: totals[0]?.amount || 0,
      donationCount: totals[0]?.count || 0,
      familiesReached: reached[0]?.families || 0,
      fundsDistributed: reached[0]?.spent || 0
    }
  });
}
