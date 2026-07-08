import Donation from '@/lib/models/Donation';
import ReliefRequest from '@/lib/models/Request';
import Log from '@/lib/models/Log';
import User from '@/lib/models/User';
import { notifyDonationReceived, notifyFundDonation } from '@/lib/notify';
import type { IPayment } from '@/lib/models/Payment';

interface SettledDonation {
  requestId: string;
  area: string;
  amount: number;
  receiptNo: string;
}

/**
 * Turn a gateway-confirmed Payment into permanent Donation records.
 *
 *  - direct  payment → one Donation for payment.request
 *  - smart/general   → one Donation per allocation (the engine already split
 *                      the amount across the highest-priority underfunded needs)
 *
 * Creates the Donation(s), bumps each request's raised total, writes the audit
 * log, and fires notifications. Called from payment callbacks only — never a
 * public API — so money always flows through a verified gateway.
 */
export async function completeDonationFromPayment(
  payment: IPayment & { save(): Promise<any> }
): Promise<SettledDonation[]> {
  // Normalize both shapes into a list of {requestId, amount}.
  const legs =
    payment.kind === 'direct'
      ? [{ request: payment.request, amount: payment.amount }]
      : payment.allocations.map((a) => ({ request: a.request, amount: a.amount }));

  const donorUser = payment.donor
    ? await User.findById(payment.donor).select('email').lean<any>()
    : null;
  const donorEmail = donorUser?.email as string | undefined;

  const settled: SettledDonation[] = [];
  const donationIds: any[] = [];

  for (const leg of legs) {
    const relief = await ReliefRequest.findById(leg.request);
    if (!relief) continue; // skip a vanished request rather than fail the whole settlement

    const donation = await Donation.create({
      request: relief._id,
      donor: payment.donor,
      donorName: payment.donorName,
      amount: leg.amount,
      paymentMethod: payment.method,
      message: payment.message
    });
    donationIds.push(donation._id);

    relief.donationRaised = (relief.donationRaised || 0) + leg.amount;
    await relief.save();

    await Log.create({
      actorName: payment.donorName,
      actorType: 'donor',
      action: `Donated PKR ${leg.amount.toLocaleString()} (${payment.method}${
        payment.kind !== 'direct' ? ', smart-allocated' : ''
      })`,
      type: 'donation',
      relatedId: `#${relief._id.toString().slice(-6).toUpperCase()}`
    });

    settled.push({
      requestId: relief._id.toString(),
      area: relief.area,
      amount: leg.amount,
      receiptNo: donation.receiptNo
    });

    // Direct donations get the full donor-receipt + focal heads-up here.
    // For smart/general we send focal heads-up per request but a single donor
    // summary afterwards (so the donor isn't spammed with N receipts).
    if (payment.kind === 'direct') {
      await notifyDonationReceived({
        request: relief,
        donorEmail,
        donorName: payment.donorName,
        amount: leg.amount,
        receiptNo: donation.receiptNo,
        method: payment.method
      });
    } else {
      await notifyDonationReceived({
        request: relief,
        donorEmail: undefined, // donor gets one summary below, not per-leg
        donorName: payment.donorName,
        amount: leg.amount,
        receiptNo: donation.receiptNo,
        method: payment.method
      });
    }
  }

  (payment as any).donations = donationIds;
  await payment.save();

  if (payment.kind !== 'direct' && donorEmail) {
    await notifyFundDonation({
      donorEmail,
      donorName: payment.donorName,
      total: payment.amount,
      kind: payment.kind,
      legs: settled
    });
  }

  return settled;
}
