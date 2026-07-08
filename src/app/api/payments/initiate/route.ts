import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/authOptions';
import { connectDB } from '@/lib/mongodb';
import ReliefRequest from '@/lib/models/Request';
import Payment from '@/lib/models/Payment';
import { isJazzCashConfigured, buildJazzCashCheckout, makeTxnRef } from '@/lib/payments';
import { allocate } from '@/lib/priority';

export const dynamic = 'force-dynamic';

const schema = z.object({
  // 'direct' needs requestId; 'smart'/'general' let the engine allocate.
  mode: z.enum(['direct', 'smart', 'general']).default('direct'),
  requestId: z.string().optional(),
  amount: z.number().int().positive().max(10_000_000),
  donorName: z.string().max(80).optional(),
  message: z.string().max(500).optional()
});

// Fetch open (approved) requests as the allocation candidate pool.
async function openRequests() {
  return ReliefRequest.find({ status: 'approved' })
    .select('area district urgency familiesAffected aiScore donationRaised createdAt')
    .lean();
}

// POST /api/payments/initiate -> start a checkout.
// Creates a PENDING payment (direct or engine-allocated) and tells the browser
// where to go: the JazzCash hosted page when keys are set, else the demo gateway.
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  try {
    const data = schema.parse(await req.json());
    await connectDB();

    const donorName = data.donorName || session?.user?.name || 'Anonymous Donor';
    const useJazzCash = isJazzCashConfigured();
    const method = useJazzCash ? 'JazzCash' : 'Demo Gateway';
    let paymentDoc: any;

    if (data.mode === 'direct') {
      if (!data.requestId) {
        return NextResponse.json({ error: 'No request selected.' }, { status: 400 });
      }
      const relief = await ReliefRequest.findById(data.requestId);
      if (!relief) return NextResponse.json({ error: 'Request not found' }, { status: 404 });
      if (relief.status !== 'approved') {
        return NextResponse.json(
          {
            error:
              relief.status === 'fulfilled'
                ? 'This request has already been fulfilled — no further donations are needed.'
                : 'Donations can only be made to approved requests.'
          },
          { status: 400 }
        );
      }
      paymentDoc = {
        kind: 'direct',
        request: relief._id,
        allocations: [],
        donor: session?.user?.id,
        donorName,
        amount: data.amount,
        method,
        message: data.message,
        txnRef: makeTxnRef()
      };
    } else {
      // smart / general: run the priority engine to split the amount.
      const pool = await openRequests();
      const legs = allocate(data.amount, pool as any[]);
      if (legs.length === 0) {
        return NextResponse.json(
          { error: 'All current relief needs are fully funded — nothing to allocate right now. Thank you!' },
          { status: 400 }
        );
      }
      paymentDoc = {
        kind: data.mode,
        allocations: legs.map((l) => ({
          request: (l.request as any)._id,
          requestArea: `${(l.request as any).area}${(l.request as any).district ? ', ' + (l.request as any).district : ''}`,
          amount: l.amount
        })),
        donor: session?.user?.id,
        donorName,
        amount: legs.reduce((s, l) => s + l.amount, 0),
        method,
        message: data.message,
        txnRef: makeTxnRef()
      };
    }

    const payment = await Payment.create(paymentDoc);

    if (useJazzCash) {
      const origin = process.env.NEXTAUTH_URL || new URL(req.url).origin;
      const form = buildJazzCashCheckout({
        txnRef: payment.txnRef,
        amount: payment.amount,
        description: `ReliefAid ${payment.kind} donation`,
        returnUrl: `${origin}/api/payments/callback`
      });
      return NextResponse.json({ gateway: 'jazzcash', txnRef: payment.txnRef, form });
    }

    return NextResponse.json({
      gateway: 'demo',
      txnRef: payment.txnRef,
      url: `/pay/demo?ref=${payment.txnRef}`
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Enter a valid donation amount.' }, { status: 400 });
    }
    return NextResponse.json({ error: err.message || 'Could not start the payment.' }, { status: 400 });
  }
}
