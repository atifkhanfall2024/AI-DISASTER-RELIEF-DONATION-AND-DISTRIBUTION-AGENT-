import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { connectDB } from '@/lib/mongodb';
import ReliefRequest from '@/lib/models/Request';
import Inventory from '@/lib/models/Inventory';
import Distribution from '@/lib/models/Distribution';
import { generateDistributionPlan } from '@/lib/gemini';
import Log from '@/lib/models/Log';

export const dynamic = 'force-dynamic';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  // Both admin and super-admin can run the agent, since it's an operational task
  if (!session || (session.user.role !== 'admin' && session.user.role !== 'super-admin')) {
    return NextResponse.json({ error: 'Admin only.' }, { status: 403 });
  }

  try {
    await connectDB();
    const request = await ReliefRequest.findById(params.id);
    if (!request) return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    if (request.status !== 'approved') {
      return NextResponse.json({ error: 'Only approved requests can be analyzed by the Distribution Agent.' }, { status: 400 });
    }

    // 1. Get current inventory
    const inventory = await Inventory.find().lean();
    const currentInventory = inventory.map(i => ({
      itemName: i.itemName,
      available: Math.max(0, i.totalQuantity - i.reservedQuantity),
      unit: i.unit
    }));

    // 2. Find recent distributions nearby (Double-Dipping Check)
    // We don't have geospatial index setup fully in seed, so we'll approximate by district/area for the demo.
    // In a real app we'd use MongoDB $geoNear.
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    // Find requests in the same district/area that had verified distributions in the last 7 days
    const recentVerifiedDists = await Distribution.find({
      verifiedAt: { $gte: sevenDaysAgo },
      status: 'verified'
    }).populate('request').lean();
    
    const recentDistributions = recentVerifiedDists
      .filter((d: any) => d.request && (d.request.area === request.area || d.request.district === request.district))
      .map((d: any) => ({
        area: d.request.area,
        createdAt: d.createdAt
      }));

    // 3. Call Gemini Agent
    const plan = await generateDistributionPlan({
      area: request.area,
      district: request.district,
      disasterType: request.disasterType,
      familiesAffected: request.familiesAffected,
      itemsRequested: request.items,
      currentInventory,
      recentDistributions
    });

    // 4. Reserve Stock
    for (const alloc of plan.allocatedStock) {
      if (alloc.quantity > 0) {
        await Inventory.findOneAndUpdate(
          { itemName: alloc.itemName },
          { $inc: { reservedQuantity: alloc.quantity } }
        );
      }
    }

    // 5. Save the Plan to the request
    request.agentLogisticsPlan = JSON.stringify(plan);
    await request.save();

    await Log.create({
      actorName: session.user.name || 'Admin User',
      actorType: 'admin',
      action: `Ran AI Distribution Agent (Allocated ${plan.allocatedStock.length} item types)`,
      type: 'approval',
      relatedId: `#${request._id.toString().slice(-6).toUpperCase()}`
    });

    return NextResponse.json(plan);
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message || 'Failed to generate agent plan.' }, { status: 500 });
  }
}
