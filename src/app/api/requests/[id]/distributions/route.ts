import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/authOptions';
import { connectDB } from '@/lib/mongodb';
import ReliefRequest from '@/lib/models/Request';
import Distribution from '@/lib/models/Distribution';
import Log from '@/lib/models/Log';
import { normalizeCnic } from '@/lib/geo';

export const dynamic = 'force-dynamic';

const createSchema = z.object({
  familiesReached: z.number().int().positive(),
  items: z
    .array(z.object({ name: z.string().min(1), quantity: z.number().int().positive() }))
    .default([]),
  amountSpent: z.number().min(0).default(0),
  location: z.string().optional(),
  notes: z.string().optional(),
  proofImages: z.array(z.string()).default([]),
  beneficiaryCnics: z.array(z.string()).default([]),
  isFinal: z.boolean().default(false)
});

// GET /api/requests/:id/distributions -> distribution timeline for a request.
// Business rules (same spirit as /api/requests GET):
//  - Admin and the request's own focal person see every record.
//  - Donors / public only see admin-VERIFIED distributions (transparency without noise).
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  await connectDB();

  const request = await ReliefRequest.findById(params.id).select('focal').lean<{ focal: any }>();
  if (!request) return NextResponse.json({ error: 'Request not found' }, { status: 404 });

  const role = session?.user?.role;
  const isOwner = role === 'focal' && request.focal?.toString() === session?.user?.id;
  const privileged = role === 'admin' || isOwner;
  const filter: any = { request: params.id };
  if (!privileged) filter.status = 'verified';

  const distributions = await Distribution.find(filter).sort({ createdAt: -1 }).lean();

  // Beneficiary CNICs are PII — never expose the raw values (or the flag detail)
  // to the public/donors; keep them for admins and the request's own focal person.
  const safe = distributions.map((d: any) => {
    if (privileged) return d;
    const { beneficiaryCnics, flaggedBeneficiaries, ...rest } = d;
    return rest;
  });
  return NextResponse.json(safe);
}

// POST /api/requests/:id/distributions -> focal person (owner) or admin records an
// on-the-ground aid delivery for an APPROVED request.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== 'focal' && session.user.role !== 'admin')) {
    return NextResponse.json({ error: 'Only focal persons or admins can record distributions.' }, { status: 403 });
  }

  try {
    const data = createSchema.parse(await req.json());
    await connectDB();

    const request = await ReliefRequest.findById(params.id);
    if (!request) return NextResponse.json({ error: 'Request not found' }, { status: 404 });

    // A focal person can only log deliveries for their own request.
    if (session.user.role === 'focal' && request.focal.toString() !== session.user.id) {
      return NextResponse.json({ error: 'You can only record distributions for your own requests.' }, { status: 403 });
    }
    if (request.status !== 'approved') {
      return NextResponse.json(
        { error: 'Distributions can only be recorded for approved requests.' },
        { status: 400 }
      );
    }

    // Integrity rule: funds distributed can never exceed funds actually raised.
    if (data.amountSpent > 0) {
      const spentAgg = await Distribution.aggregate([
        { $match: { request: request._id } },
        { $group: { _id: null, total: { $sum: '$amountSpent' } } }
      ]);
      const alreadySpent = spentAgg[0]?.total || 0;
      const remaining = (request.donationRaised || 0) - alreadySpent;
      if (data.amountSpent > remaining) {
        return NextResponse.json(
          {
            error: `Amount exceeds available funds. Raised: PKR ${(request.donationRaised || 0).toLocaleString()}, already distributed: PKR ${alreadySpent.toLocaleString()}, remaining: PKR ${Math.max(0, remaining).toLocaleString()}.`
          },
          { status: 400 }
        );
      }
    }

    // Beneficiary deduplication: normalize the CNICs and flag any that already
    // received aid in a prior distribution anywhere on the platform (double-dip).
    const cnics = Array.from(new Set(data.beneficiaryCnics.map(normalizeCnic).filter((c) => c.length >= 5)));
    let flaggedBeneficiaries: string[] = [];
    if (cnics.length) {
      const prior = await Distribution.find({ beneficiaryCnics: { $in: cnics } })
        .select('beneficiaryCnics')
        .lean();
      const seen = new Set<string>();
      prior.forEach((d: any) => (d.beneficiaryCnics || []).forEach((c: string) => seen.add(c)));
      flaggedBeneficiaries = cnics.filter((c) => seen.has(c));
    }

    const distribution = await Distribution.create({
      request: request._id,
      distributedBy: session.user.id,
      distributorName: session.user.name || 'Focal User',
      ...data,
      beneficiaryCnics: cnics,
      flaggedBeneficiaries
    });

    if (flaggedBeneficiaries.length) {
      await Log.create({
        actorName: 'System Integrity Check',
        actorType: 'system',
        action: `Flagged ${flaggedBeneficiaries.length} beneficiary CNIC(s) as possible duplicate aid`,
        type: 'distribution',
        relatedId: `#${request._id.toString().slice(-6).toUpperCase()}`
      });
    }

    await Log.create({
      actorName: session.user.name || 'Focal User',
      actorType: session.user.role === 'admin' ? 'admin' : 'focal',
      action: `Recorded Distribution (${data.familiesReached} families${
        data.amountSpent > 0 ? `, PKR ${data.amountSpent.toLocaleString()}` : ''
      })`,
      type: 'distribution',
      relatedId: `#${request._id.toString().slice(-6).toUpperCase()}`
    });

    return NextResponse.json(distribution, { status: 201 });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0]?.message || 'Invalid distribution data.' }, { status: 400 });
    }
    return NextResponse.json({ error: err.message || 'Failed to record distribution.' }, { status: 400 });
  }
}
