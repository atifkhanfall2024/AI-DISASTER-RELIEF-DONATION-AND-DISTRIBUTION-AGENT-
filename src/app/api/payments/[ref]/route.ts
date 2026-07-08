import { NextResponse } from 'next/server';
import { z } from 'zod';
import { connectDB } from '@/lib/mongodb';
import Payment from '@/lib/models/Payment';
import { completeDonationFromPayment } from '@/lib/donations';

export const dynamic = 'force-dynamic';

// GET /api/payments/:ref -> safe, public summary for the demo gateway page.
export async function GET(_req: Request, { params }: { params: { ref: string } }) {
  await connectDB();
  const payment = await Payment.findOne({ txnRef: params.ref })
    .populate('request', 'area district')
    .lean<any>();
  if (!payment) return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
  return NextResponse.json({
    txnRef: payment.txnRef,
    amount: payment.amount,
    donorName: payment.donorName,
    method: payment.method,
    status: payment.status,
    kind: payment.kind,
    requestArea:
      payment.kind === 'direct' && payment.request
        ? `${payment.request.area}${payment.request.district ? ', ' + payment.request.district : ''}`
        : payment.kind === 'general'
        ? 'General Relief Fund'
        : 'Highest-priority needs',
    allocations: (payment.allocations || []).map((a: any) => ({ area: a.requestArea, amount: a.amount }))
  });
}

const completeSchema = z.object({ outcome: z.enum(['success', 'fail']) });

// POST /api/payments/:ref -> the DEMO gateway "settles" a payment. This path is
// only valid for Demo Gateway payments — real JazzCash payments settle through
// the hash-verified /api/payments/callback and are rejected here.
export async function POST(req: Request, { params }: { params: { ref: string } }) {
  try {
    const { outcome } = completeSchema.parse(await req.json());
    await connectDB();

    const payment = await Payment.findOne({ txnRef: params.ref });
    if (!payment) return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    if (payment.method !== 'Demo Gateway') {
      return NextResponse.json({ error: 'This payment settles through its real gateway.' }, { status: 403 });
    }
    if (payment.status !== 'pending') {
      return NextResponse.json({ error: 'This payment is already settled.' }, { status: 400 });
    }

    if (outcome === 'fail') {
      payment.status = 'failed';
      payment.gatewayResponse = 'DEMO-DECLINED Simulated card decline';
      await payment.save();
      return NextResponse.json({
        redirect: `/donate/result?status=failed&reason=declined&ref=${payment.txnRef}&request=${payment.request}`
      });
    }

    payment.status = 'paid';
    payment.gatewayTxnId = `DEMO-${Date.now()}`;
    payment.gatewayResponse = '000 Demo payment approved';
    await payment.save();
    const settled = await completeDonationFromPayment(payment);
    const first = settled[0];
    const qs = new URLSearchParams({ status: 'paid', ref: payment.txnRef, split: String(settled.length) });
    if (first) qs.set('receipt', first.receiptNo);
    if (payment.kind === 'direct' && payment.request) qs.set('request', String(payment.request));
    return NextResponse.json({ redirect: `/donate/result?${qs.toString()}` });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid outcome.' }, { status: 400 });
    }
    return NextResponse.json({ error: err.message || 'Could not settle the payment.' }, { status: 400 });
  }
}
