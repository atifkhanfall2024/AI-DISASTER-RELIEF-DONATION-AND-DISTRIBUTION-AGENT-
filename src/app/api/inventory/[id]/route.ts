import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { connectDB } from '@/lib/mongodb';
import Inventory from '@/lib/models/Inventory';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const patchSchema = z.object({
  totalQuantity: z.number().int().min(0).optional(),
  itemName: z.string().min(2).optional(),
  category: z.string().min(2).optional()
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'super-admin') {
    return NextResponse.json({ error: 'Super Admin only.' }, { status: 403 });
  }

  try {
    const data = patchSchema.parse(await req.json());
    await connectDB();

    const item = await Inventory.findByIdAndUpdate(params.id, data, { new: true });
    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    return NextResponse.json(item);
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
    }
    return NextResponse.json({ error: err.message || 'Failed to update item' }, { status: 400 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'super-admin') {
    return NextResponse.json({ error: 'Super Admin only.' }, { status: 403 });
  }

  try {
    await connectDB();
    const item = await Inventory.findById(params.id);
    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    if (item.reservedQuantity > 0) {
      return NextResponse.json(
        { error: 'Cannot delete item while it has reserved quantities allocated to requests.' },
        { status: 400 }
      );
    }

    await item.deleteOne();
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to delete item' }, { status: 400 });
  }
}
