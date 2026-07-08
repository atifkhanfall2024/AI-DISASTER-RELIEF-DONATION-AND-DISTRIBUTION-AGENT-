import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/authOptions';
import { connectDB } from '@/lib/mongodb';
import ReliefRequest from '@/lib/models/Request';
import Log from '@/lib/models/Log';
import { analyzeRequest } from '@/lib/gemini';
import { notifyRequestSubmitted } from '@/lib/notify';
import { withPriority } from '@/lib/priority';
import { findNearbyOverlaps } from '@/lib/geo';

export const dynamic = 'force-dynamic';

const createSchema = z.object({
  area: z.string().min(2),
  district: z.string().optional(),
  province: z.string().optional(),
  disasterType: z
    .enum(['flood', 'earthquake', 'landslide', 'storm', 'drought', 'fire', 'epidemic', 'other'])
    .optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  urgency: z.enum(['low', 'medium', 'high', 'critical']),
  familiesAffected: z.number().int().positive(),
  description: z.string().min(10),
  items: z.array(z.string()).default([]),
  images: z.array(z.string()).default([])
});

// GET /api/requests?status=&urgency=&search=&mine=1  -> list
// Business rules enforced here:
//  - Focal Person can only view their OWN submissions.
//  - Donors (and the public) can only see APPROVED requests.
//  - Admins see everything.
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  await connectDB();
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');
  const urgency = searchParams.get('urgency');
  const search = searchParams.get('search');
  const mine = searchParams.get('mine');

  const filter: any = {};
  if (status && status !== 'all') filter.status = status;
  if (urgency && urgency !== 'all') filter.urgency = urgency;
  if (search) {
    filter.$or = [
      { area: { $regex: search, $options: 'i' } },
      { district: { $regex: search, $options: 'i' } }
    ];
  }

  const role = session?.user?.role;
  if (role === 'focal') {
    // Focal persons are always scoped to their own submissions.
    filter.focal = session!.user.id;
  } else if (role === 'admin') {
    // Admin sees everything; optionally scope to own via ?mine=1 (not typical).
    if (mine) filter.focal = session!.user.id;
  } else {
    // Donor or unauthenticated public: only approved/fulfilled requests are visible.
    if (!filter.status) filter.status = { $in: ['approved', 'fulfilled'] };
  }

  const requests = await ReliefRequest.find(filter)
    .populate('focal', 'name email cnic phone')
    .sort({ createdAt: -1 })
    .lean();

  // Attach the Relief Priority Index + funding gap so lists can rank/So show it.
  return NextResponse.json(requests.map((r: any) => withPriority(r)));
}

// POST /api/requests -> focal person submits a new request, triggers Gemini AI analysis
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== 'focal' && session.user.role !== 'admin')) {
    return NextResponse.json({ error: 'Only focal persons can submit requests.' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const data = createSchema.parse(body);
    await connectDB();

    // Geographic duplicate detection: pull recent same-disaster requests and
    // cluster by real GPS distance (Haversine) instead of a naive name match.
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recent = await ReliefRequest.find({
      createdAt: { $gte: since },
      status: { $ne: 'rejected' }
    })
      .select('area district disasterType lat lng createdAt familiesAffected')
      .limit(200)
      .lean();

    const overlaps = findNearbyOverlaps(
      { area: data.area, district: data.district, disasterType: data.disasterType, lat: data.lat, lng: data.lng },
      recent as any[],
      { radiusKm: 25, withinDays: 7 }
    );
    // Context the AI uses for its own duplicate judgement.
    const nearby = recent.filter((r: any) => overlaps.some((o) => o.request === String(r._id)));

    const request = await ReliefRequest.create({
      focal: session.user.id,
      ...data,
      status: 'pending',
      nearbyDuplicates: overlaps.slice(0, 5).map((o) => ({
        request: o.request,
        area: o.area,
        distanceKm: o.distanceKm
      }))
    });

    await Log.create({
      actorName: session.user.name || 'Focal User',
      actorType: 'focal',
      action: 'Submitted Request',
      type: 'submit',
      relatedId: `#${request._id.toString().slice(-6).toUpperCase()}`
    });

    // Fire off Gemini analysis synchronously so the focal person / admin sees a score immediately.
    const analysis = await analyzeRequest({
      area: data.area,
      district: data.district,
      disasterType: data.disasterType,
      urgency: data.urgency,
      familiesAffected: data.familiesAffected,
      description: data.description,
      items: data.items,
      imageUrls: data.images,
      recentNearbyRequests: nearby.map((n: any) => ({
        area: n.area,
        createdAt: n.createdAt.toISOString(),
        familiesAffected: n.familiesAffected
      }))
    });

    request.aiScore = analysis.score;
    request.aiFlags = analysis.flags;
    request.aiReasoning = analysis.reasoning;
    request.aiRecommendation = analysis.recommendation;

    // Deterministic geo flag: a request within 5km of a recent same-disaster
    // report is flagged regardless of the AI's own judgement.
    const nearest = overlaps.find((o) => o.distanceKm >= 0);
    if (nearest && nearest.distanceKm <= 5) {
      const flag = `Possible Duplicate (${nearest.distanceKm}km from ${nearest.area})`;
      if (!request.aiFlags.some((f: string) => f.toLowerCase().includes('duplicate'))) {
        request.aiFlags = [...request.aiFlags, flag];
      }
    }

    request.status = 'needs_approval';
    await request.save();

    await Log.create({
      actorName: 'System AI Engine',
      actorType: 'system',
      action: `Scored Request (Priority: ${analysis.score})`,
      type: 'ai',
      relatedId: `#${request._id.toString().slice(-6).toUpperCase()}`
    });

    // Let the review team know a scored request awaits them (never blocks the API).
    await notifyRequestSubmitted(request);

    return NextResponse.json(request, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to submit request' }, { status: 400 });
  }
}
