import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/authOptions';
import { connectDB } from '@/lib/mongodb';
import Distribution from '@/lib/models/Distribution';
import ReliefRequest from '@/lib/models/Request';
import Log from '@/lib/models/Log';
import { notifyRequestFulfilled } from '@/lib/notify';

export const dynamic = 'force-dynamic';

const patchSchema = z.object({
  action: z.enum(['verify'])
});

// PATCH /api/distributions/:id -> admin verifies an on-the-ground distribution record.
// Verifying a distribution the focal person marked as FINAL also fulfills the request,
// closing the loop: donate → distribute → verify → fulfilled.
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Admin only.' }, { status: 403 });
  }

  try {
    patchSchema.parse(await req.json());
    await connectDB();

    const distribution = await Distribution.findById(params.id);
    if (!distribution) return NextResponse.json({ error: 'Distribution not found' }, { status: 404 });
    if (distribution.status === 'verified') {
      return NextResponse.json({ error: 'This distribution is already verified.' }, { status: 400 });
    }

    distribution.status = 'verified';
    distribution.verifiedBy = session.user.id as any;
    distribution.verifiedAt = new Date();
    await distribution.save();

    const relatedId = `#${distribution.request.toString().slice(-6).toUpperCase()}`;
    await Log.create({
      actorName: session.user.name || 'Admin User',
      actorType: 'admin',
      action: `Verified Distribution (${distribution.familiesReached} families reached)`,
      type: 'distribution',
      relatedId
    });

    if (distribution.isFinal) {
      const request = await ReliefRequest.findById(distribution.request);
      if (request && request.status === 'approved') {
        request.status = 'fulfilled';
        await request.save();
        await Log.create({
          actorName: session.user.name || 'Admin User',
          actorType: 'admin',
          action: 'Marked Fulfilled (final distribution verified)',
          type: 'approval',
          relatedId
        });
        // Close the loop: tell the focal person and every donor the aid arrived.
        await notifyRequestFulfilled(request);
      }
    }

    return NextResponse.json(distribution);
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid action.' }, { status: 400 });
    }
    return NextResponse.json({ error: err.message || 'Failed to verify distribution.' }, { status: 400 });
  }
}
