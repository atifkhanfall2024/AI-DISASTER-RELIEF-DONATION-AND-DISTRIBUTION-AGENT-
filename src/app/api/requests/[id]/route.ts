import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/authOptions';
import { connectDB } from '@/lib/mongodb';
import ReliefRequest from '@/lib/models/Request';
import Log from '@/lib/models/Log';
import { notifyRequestDecision, notifyRequestFulfilled } from '@/lib/notify';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  await connectDB();

  const request = await ReliefRequest.findById(params.id).populate('focal', 'name email cnic').lean() as any;
  if (!request) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const PUBLIC_STATUSES = ['approved', 'fulfilled'];
  const isPublic = PUBLIC_STATUSES.includes(request.status);

  // Approved/fulfilled requests are visible to everyone (donors, public, unauthenticated)
  if (isPublic) return NextResponse.json(request);

  // Non-public requests (pending, needs_approval, rejected) → restrict access
  const role = session?.user?.role;
  const userId = session?.user?.id;

  // Admin can see everything
  if (role === 'admin') return NextResponse.json(request);

  // Focal person can only see their own submissions
  const focalId = request.focal?._id?.toString() || request.focal?.toString();
  if (role === 'focal' && focalId && focalId === userId) {
    return NextResponse.json(request);
  }

  // Everyone else gets 403
  return NextResponse.json({ error: 'Not authorized to view this request.' }, { status: 403 });
}

const patchSchema = z.object({
  action: z.enum(['approve', 'reject', 'fulfill']),
  adminNotes: z.string().optional()
});

// PATCH /api/requests/:id  -> admin approves / rejects a request
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== 'admin' && session.user.role !== 'super-admin')) {
    return NextResponse.json({ error: 'Admin only.' }, { status: 403 });
  }

  const { action, adminNotes } = patchSchema.parse(await req.json());
  await connectDB();

  const request = await ReliefRequest.findById(params.id);
  if (!request) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const statusMap = { approve: 'approved', reject: 'rejected', fulfill: 'fulfilled' } as const;
  request.status = statusMap[action];
  if (adminNotes) request.adminNotes = adminNotes;
  await request.save();

  await Log.create({
    actorName: session.user.name || 'Admin User',
    actorType: 'admin',
    action:
      action === 'approve'
        ? 'Approved Request'
        : action === 'reject'
        ? `Rejected (${adminNotes || 'No reason given'})`
        : 'Marked Fulfilled',
    type: action === 'approve' ? 'approval' : action === 'reject' ? 'rejection' : 'approval',
    relatedId: `#${request._id.toString().slice(-6).toUpperCase()}`
  });

  // Notify the people affected by this decision (self-catching, never blocks).
  if (action === 'approve' || action === 'reject') {
    await notifyRequestDecision(request, action === 'approve' ? 'approved' : 'rejected', adminNotes);
  } else {
    await notifyRequestFulfilled(request);
  }

  return NextResponse.json(request);
}
