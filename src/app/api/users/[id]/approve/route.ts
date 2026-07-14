import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { connectDB } from '@/lib/mongodb';
import User from '@/lib/models/User';

export const dynamic = 'force-dynamic';

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || ((session.user as any).role !== 'admin' && (session.user as any).role !== 'super-admin')) {
    return NextResponse.json({ error: 'Admin only.' }, { status: 403 });
  }

  try {
    const { status } = await req.json(); // 'approved' or 'rejected'
    if (!['approved', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status.' }, { status: 400 });
    }

    await connectDB();
    const user = await User.findByIdAndUpdate(params.id, { focalStatus: status }, { new: true });
    
    if (!user) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, focalStatus: user.focalStatus });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Approval failed' }, { status: 500 });
  }
}
