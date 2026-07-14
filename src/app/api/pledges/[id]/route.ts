import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/authOptions';
import { connectDB } from '@/lib/mongodb';
import ItemPledge from '@/lib/models/ItemPledge';
import Inventory from '@/lib/models/Inventory';
import Log from '@/lib/models/Log';
import { notifyPledgeReceived } from '@/lib/notify';

export const dynamic = 'force-dynamic';

const patchSchema = z.object({
  action: z.enum(['receive', 'reject']),
  adminNotes: z.string().optional(),
  // For 'receive' action, admin provides mappings: [{ pledgeItemId: 'xyz', inventoryId: 'abc' }, ...]
  mappings: z.array(z.object({
    pledgeItemId: z.string(),
    inventoryId: z.string() // ID of an existing central inventory item
  })).optional()
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== 'admin' && session.user.role !== 'super-admin')) {
    return NextResponse.json({ error: 'Admin only.' }, { status: 403 });
  }

  try {
    const data = patchSchema.parse(await req.json());
    await connectDB();

    const pledge = await ItemPledge.findById(params.id);
    if (!pledge) return NextResponse.json({ error: 'Pledge not found' }, { status: 404 });
    if (pledge.status !== 'pending') {
      return NextResponse.json({ error: 'Pledge is already processed' }, { status: 400 });
    }

    if (data.action === 'reject') {
      pledge.status = 'rejected';
      pledge.adminNotes = data.adminNotes || 'Rejected by admin';
      await pledge.save();

      await Log.create({
        actorName: session.user.name || 'Admin User',
        actorType: 'admin',
        action: `Rejected Item Pledge ${pledge.trackingId}`,
        type: 'approval',
        relatedId: pledge.trackingId
      });

      return NextResponse.json(pledge);
    }

    // --- RECEIVE LOGIC ---
    if (!data.mappings || data.mappings.length === 0) {
      return NextResponse.json({ error: 'You must map at least one item to receive this pledge.' }, { status: 400 });
    }

    // Process mappings and update inventory
    for (const mapping of data.mappings) {
      const pledgeItem = pledge.items.id(mapping.pledgeItemId);
      if (!pledgeItem) continue;

      const inventoryItem = await Inventory.findById(mapping.inventoryId);
      if (!inventoryItem) continue;

      // Increment inventory
      inventoryItem.totalQuantity += pledgeItem.quantity;
      await inventoryItem.save();

      // Mark the pledge item as mapped
      pledgeItem.mappedInventoryId = inventoryItem._id;
    }

    pledge.status = 'received';
    pledge.adminNotes = data.adminNotes;
    pledge.receivedAt = new Date();
    await pledge.save();

    await Log.create({
      actorName: session.user.name || 'Admin User',
      actorType: 'admin',
      action: `Received Item Pledge ${pledge.trackingId}`,
      type: 'inventory',
      relatedId: pledge.trackingId
    });

    // Notify donor via email in English
    await notifyPledgeReceived(pledge);

    return NextResponse.json(pledge);
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data format.' }, { status: 400 });
    }
    return NextResponse.json({ error: err.message || 'Failed to process pledge.' }, { status: 400 });
  }
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== 'admin' && session.user.role !== 'super-admin')) {
    return NextResponse.json({ error: 'Admin only.' }, { status: 403 });
  }

  await connectDB();
  const pledge = await ItemPledge.findById(params.id).lean();
  if (!pledge) return NextResponse.json({ error: 'Pledge not found' }, { status: 404 });
  return NextResponse.json(pledge);
}
