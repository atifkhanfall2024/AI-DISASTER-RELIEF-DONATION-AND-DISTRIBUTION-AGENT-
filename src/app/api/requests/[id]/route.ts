import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/authOptions';
import { connectDB } from '@/lib/mongodb';
import ReliefRequest from '@/lib/models/Request';
import Log from '@/lib/models/Log';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  await connectDB();
  const request = await ReliefRequest.findById(params.id).populate('focal', 'name email cnic').lean();
  if (!request) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(request);
}

const patchSchema = z.object({
  action: z.enum(['approve', 'reject', 'fulfill']),
  adminNotes: z.string().optional()
});

// PATCH /api/requests/:id  -> admin approves / rejects a request
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
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

  return NextResponse.json(request);
}
