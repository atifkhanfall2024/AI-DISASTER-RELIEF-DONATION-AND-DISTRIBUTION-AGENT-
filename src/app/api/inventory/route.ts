import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { connectDB } from '@/lib/mongodb';
import Inventory from '@/lib/models/Inventory';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'super-admin') {
    return NextResponse.json({ error: 'Super Admin only.' }, { status: 403 });
  }

  await connectDB();
  try {
    const inventory = await Inventory.find().sort({ createdAt: -1 }).lean();
    return NextResponse.json(inventory);
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to fetch inventory' }, { status: 500 });
  }
}

const createSchema = z.object({
  itemName: z.string().min(2),
  category: z.string().min(2),
  totalQuantity: z.number().int().min(0),
  unit: z.string().min(1)
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'super-admin') {
    return NextResponse.json({ error: 'Super Admin only.' }, { status: 403 });
  }

  try {
    const data = createSchema.parse(await req.json());
    await connectDB();

    const existing = await Inventory.findOne({ itemName: data.itemName });
    if (existing) {
      return NextResponse.json({ error: 'An item with this name already exists in inventory.' }, { status: 400 });
    }

    const item = await Inventory.create({
      ...data,
      reservedQuantity: 0
    });

    return NextResponse.json(item, { status: 201 });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input data.' }, { status: 400 });
    }
    return NextResponse.json({ error: err.message || 'Failed to add inventory item.' }, { status: 400 });
  }
}
