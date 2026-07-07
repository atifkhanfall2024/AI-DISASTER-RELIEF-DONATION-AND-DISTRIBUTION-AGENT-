import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { authOptions } from '@/lib/authOptions';
import { connectDB } from '@/lib/mongodb';
import User from '@/lib/models/User';
import Log from '@/lib/models/Log';

export const dynamic = 'force-dynamic';

// GET /api/users?role=&search= -> admin-only user directory.
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Admin only.' }, { status: 403 });
  }
  await connectDB();
  const { searchParams } = new URL(req.url);
  const role = searchParams.get('role');
  const search = searchParams.get('search');

  const filter: any = {};
  if (role && role !== 'all') filter.role = role;
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } }
    ];
  }

  const users = await User.find(filter).select('name email role provider phone cnic createdAt').sort({ createdAt: -1 }).lean();
  return NextResponse.json(users);
}

const createSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  phone: z.string().optional(),
  cnic: z.string().optional(),
  // Admins provision focal persons and fellow admins here — this is the ONLY
  // path to an admin account (open self-registration rejects role=admin).
  role: z.enum(['focal', 'admin'])
});

// POST /api/users -> admin invites/creates a focal person or another admin.
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Admin only.' }, { status: 403 });
  }

  try {
    const data = createSchema.parse(await req.json());
    await connectDB();

    const email = data.email.toLowerCase();
    const existing = await User.findOne({ email });
    if (existing) {
      return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(data.password, 10);
    const user = await User.create({
      name: data.name,
      email,
      passwordHash,
      phone: data.phone,
      cnic: data.cnic,
      role: data.role,
      provider: 'credentials'
    });

    await Log.create({
      actorName: session.user.name || 'Admin User',
      actorType: 'admin',
      action: `Created ${data.role} account (${email})`,
      type: 'approval',
      relatedId: email
    });

    return NextResponse.json({ id: user._id, email: user.email, role: user.role }, { status: 201 });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      const first = err.errors[0];
      return NextResponse.json(
        { error: `Invalid ${first?.path?.join('.') || 'input'}: ${first?.message || 'check your input.'}` },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: err.message || 'Failed to create user.' }, { status: 400 });
  }
}
