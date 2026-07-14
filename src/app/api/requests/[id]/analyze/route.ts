import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { connectDB } from '@/lib/mongodb';
import ReliefRequest from '@/lib/models/Request';

export const dynamic = 'force-dynamic';
import Log from '@/lib/models/Log';
import { analyzeRequest } from '@/lib/gemini';

// POST /api/requests/:id/analyze -> re-run Gemini AI analysis on demand (admin only)
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== 'admin' && session.user.role !== 'super-admin')) {
    return NextResponse.json({ error: 'Admin only.' }, { status: 403 });
  }

  await connectDB();
  const request = await ReliefRequest.findById(params.id);
  if (!request) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const since = new Date(Date.now() - 48 * 60 * 60 * 1000);
  const nearby = await ReliefRequest.find({
    _id: { $ne: request._id },
    area: { $regex: request.area, $options: 'i' },
    createdAt: { $gte: since }
  })
    .select('area createdAt familiesAffected')
    .limit(5)
    .lean();

  const analysis = await analyzeRequest({
    area: request.area,
    district: request.district,
    urgency: request.urgency,
    familiesAffected: request.familiesAffected,
    description: request.description,
    items: request.items,
    imageUrls: request.images,
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
  await request.save();

  await Log.create({
    actorName: 'System AI Engine',
    actorType: 'system',
    action: `Re-scored Request (Priority: ${analysis.score})`,
    type: 'ai',
    relatedId: `#${request._id.toString().slice(-6).toUpperCase()}`
  });

  return NextResponse.json(request);
}
