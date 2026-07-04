import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Log from '@/lib/models/Log';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  await connectDB();
  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search');
  const filter: any = {};
  if (search) {
    filter.$or = [
      { actorName: { $regex: search, $options: 'i' } },
      { action: { $regex: search, $options: 'i' } },
      { relatedId: { $regex: search, $options: 'i' } }
    ];
  }
  const logs = await Log.find(filter).sort({ createdAt: -1 }).limit(200).lean();
  return NextResponse.json(logs);
}
