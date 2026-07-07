import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/authOptions';
import { connectDB } from '@/lib/mongodb';
import ReliefRequest from '@/lib/models/Request';
import Payment from '@/lib/models/Payment';
import { isJazzCashConfigured, buildJazzCashCheckout, makeTxnRef } from '@/lib/payments';

export const dynamic = 'force-dynamic';

const schema = z.object({
  requestId: z.string(),
  amount: z.number().int().positive().max(10_000_000),
  donorName: z.string().max(80).optional(),
  message: z.string().max(500).optional()
});

// POST /api/payments/initiate -> start a checkout for a donation.
// Creates a PENDING payment and tells the browser where to go next:
// the JazzCash hosted page when keys are configured, else the built-in demo gateway.
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  try {
    const data = schema.parse(await req.json());
    await connectDB();

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

    const useJazzCash = isJazzCashConfigured();
    const payment = await Payment.create({
      request: relief._id,
      donor: session?.user?.id,
      donorName: data.donorName || session?.user?.name || 'Anonymous Donor',
      amount: data.amount,
      method: useJazzCash ? 'JazzCash' : 'Demo Gateway',
      message: data.message,
      txnRef: makeTxnRef()
    });

    if (useJazzCash) {
      const origin = process.env.NEXTAUTH_URL || new URL(req.url).origin;
      const form = buildJazzCashCheckout({
        txnRef: payment.txnRef,
        amount: payment.amount,
        description: `ReliefAid donation for ${relief.area}`,
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
