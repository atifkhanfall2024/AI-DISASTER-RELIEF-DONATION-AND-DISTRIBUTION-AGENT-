import { NextResponse } from 'next/server';
import { z } from 'zod';
import { connectDB } from '@/lib/mongodb';
import ItemPledge from '@/lib/models/ItemPledge';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

const pledgeSchema = z.object({
  donorName: z.string().min(2),
  donorEmail: z.string().email(),
  donorPhone: z.string().min(10),
  dropoffLocation: z.string().min(2),
  items: z.array(z.object({
    name: z.string().min(2),
    category: z.string().min(2),
    quantity: z.number().int().min(1),
    unit: z.string().min(1),
    condition: z.enum(['new', 'used'])
  })).min(1)
});

function generateTrackingId() {
  return crypto.randomBytes(3).toString('hex').toUpperCase();
}

export async function POST(req: Request) {
  try {
    const data = pledgeSchema.parse(await req.json());
    await connectDB();

    let trackingId = generateTrackingId();
    // Ensure uniqueness
    while (await ItemPledge.findOne({ trackingId })) {
      trackingId = generateTrackingId();
    }

    const pledge = await ItemPledge.create({
      ...data,
      trackingId,
      status: 'pending'
    });

    return NextResponse.json({ trackingId: pledge.trackingId }, { status: 201 });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Please check your form inputs.' }, { status: 400 });
    }
    return NextResponse.json({ error: err.message || 'Failed to submit pledge.' }, { status: 500 });
  }
}
