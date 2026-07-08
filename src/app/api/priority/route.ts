import { NextResponse } from 'next/server';
import { z } from 'zod';
import { connectDB } from '@/lib/mongodb';
import ReliefRequest from '@/lib/models/Request';
import { rankByPriority, allocate, computeRPI } from '@/lib/priority';

export const dynamic = 'force-dynamic';

async function openPool() {
  return ReliefRequest.find({ status: 'approved' })
    .select('area district urgency familiesAffected aiScore donationRaised createdAt disasterType items')
    .lean();
}

// GET /api/priority -> top open needs ranked by Relief Priority Index (public).
export async function GET() {
  await connectDB();
  const pool = await openPool();
  const ranked = rankByPriority(pool as any[])
    .slice(0, 8)
    .map((r: any) => {
      const { funding } = computeRPI(r);
      return {
        _id: r._id,
        area: r.area,
        district: r.district,
        disasterType: r.disasterType,
        urgency: r.urgency,
        familiesAffected: r.familiesAffected,
        rpi: r.rpi,
        need: funding.need,
        raised: funding.raised,
        remaining: funding.remaining,
        fundedPct: funding.fundedPct
      };
    });
  return NextResponse.json(ranked);
}

const previewSchema = z.object({ amount: z.number().int().positive().max(10_000_000) });

// POST /api/priority { amount } -> preview how the engine would split a donation
// across the highest-priority underfunded needs (shown before checkout).
export async function POST(req: Request) {
  try {
    const { amount } = previewSchema.parse(await req.json());
    await connectDB();
    const pool = await openPool();
    const legs = allocate(amount, pool as any[]);
    return NextResponse.json({
      amount,
      count: legs.length,
      allocations: legs.map((l: any) => ({
        requestId: l.request._id,
        area: `${l.request.area}${l.request.district ? ', ' + l.request.district : ''}`,
        disasterType: l.request.disasterType,
        urgency: l.request.urgency,
        rpi: l.rpi,
        amount: l.amount,
        fundedPctAfter: l.fundedPctAfter
      }))
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Enter a valid amount.' }, { status: 400 });
    }
    return NextResponse.json({ error: err.message || 'Could not compute allocation.' }, { status: 400 });
  }
}
