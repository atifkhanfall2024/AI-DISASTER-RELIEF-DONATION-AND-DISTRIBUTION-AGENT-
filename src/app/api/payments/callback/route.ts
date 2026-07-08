import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Payment from '@/lib/models/Payment';
import { verifyJazzCashResponse } from '@/lib/payments';
import { completeDonationFromPayment } from '@/lib/donations';

export const dynamic = 'force-dynamic';

// POST /api/payments/callback — JazzCash's ReturnURL. The customer's browser
// posts the gateway response back here, so this works on localhost too.
// We verify the secure hash, settle the pending payment exactly once, and
// send the person to the human-readable result page.
export async function POST(req: Request) {
  const origin = process.env.NEXTAUTH_URL || new URL(req.url).origin;
  const resultUrl = (qs: string) => NextResponse.redirect(`${origin}/donate/result?${qs}`, 303);

  try {
    const form = await req.formData();
    const params: Record<string, string> = {};
    form.forEach((v, k) => (params[k] = String(v)));

    const txnRef = params.pp_TxnRefNo || '';
    await connectDB();
    const payment = await Payment.findOne({ txnRef });
    if (!payment) return resultUrl('status=failed&reason=unknown-transaction');

    // Idempotency: a settled payment is never processed twice.
    if (payment.status !== 'pending') {
      return resultUrl(`status=${payment.status === 'paid' ? 'paid' : 'failed'}&ref=${txnRef}`);
    }

    const verdict = verifyJazzCashResponse(params);
    payment.gatewayTxnId = verdict.gatewayTxnId;
    payment.gatewayResponse = `${verdict.code} ${verdict.message}`.trim();

    if (!verdict.hashOk) {
      payment.status = 'failed';
      await payment.save();
      return resultUrl(`status=failed&reason=hash-mismatch&ref=${txnRef}&request=${payment.request}`);
    }
    if (!verdict.success) {
      payment.status = 'failed';
      await payment.save();
      return resultUrl(`status=failed&reason=${encodeURIComponent(verdict.code)}&ref=${txnRef}&request=${payment.request}`);
    }

    payment.status = 'paid';
    await payment.save();
    const settled = await completeDonationFromPayment(payment);
    const qs = new URLSearchParams({ status: 'paid', ref: txnRef, split: String(settled.length) });
    if (settled[0]) qs.set('receipt', settled[0].receiptNo);
    if (payment.kind === 'direct' && payment.request) qs.set('request', String(payment.request));
    return resultUrl(qs.toString());
  } catch (err: any) {
    console.error('Payment callback error:', err);
    return resultUrl('status=failed&reason=server-error');
  }
}
