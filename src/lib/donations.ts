import Donation from '@/lib/models/Donation';
import ReliefRequest from '@/lib/models/Request';
import Log from '@/lib/models/Log';
import User from '@/lib/models/User';
import { notifyDonationReceived } from '@/lib/notify';
import type { IPayment } from '@/lib/models/Payment';

/**
 * Turn a gateway-confirmed Payment into the permanent Donation record:
 * creates the Donation (with receipt number), bumps the request's raised
 * total, and writes the audit log. Called from payment callbacks only —
 * never directly from a public API — so money always flows through a gateway.
 */
export async function completeDonationFromPayment(payment: IPayment & { save(): Promise<any> }) {
  const relief = await ReliefRequest.findById(payment.request);
  if (!relief) throw new Error('Relief request not found for this payment.');

  const donation = await Donation.create({
    request: relief._id,
    donor: payment.donor,
    donorName: payment.donorName,
    amount: payment.amount,
    paymentMethod: payment.method,
    message: payment.message
  });

  relief.donationRaised = (relief.donationRaised || 0) + payment.amount;
  await relief.save();

  (payment as any).donation = donation._id;
  await payment.save();

  await Log.create({
    actorName: payment.donorName,
    actorType: 'donor',
    action: `Donated PKR ${payment.amount.toLocaleString()} (${payment.method})`,
    type: 'donation',
    relatedId: `#${relief._id.toString().slice(-6).toUpperCase()}`
  });

  // Receipt to the donor + heads-up to the focal person (self-catching).
  const donorUser = payment.donor ? await User.findById(payment.donor).select('email').lean<any>() : null;
  await notifyDonationReceived({
    request: relief,
    donorEmail: donorUser?.email,
    donorName: payment.donorName,
    amount: payment.amount,
    receiptNo: donation.receiptNo,
    method: payment.method
  });

  return donation;
}
