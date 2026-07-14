import { sendEmail } from '@/lib/mailer';
import User from '@/lib/models/User';
import Donation from '@/lib/models/Donation';
import type { IReliefRequest } from '@/lib/models/Request';

/**
 * Email notifications for the request/donation lifecycle.
 *
 * Design rules:
 *  - Never break an API because an email failed — every public function
 *    swallows (and logs) its own errors, and multi-recipient sends use
 *    Promise.allSettled.
 *  - Uses the same Nodemailer transport as OTP (src/lib/mailer.ts): real
 *    delivery once SMTP_* is configured, console logging otherwise.
 */

const APP_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000';
const BRAND = '#0F6E56';

const shortId = (id: any) => `#${id.toString().slice(-6).toUpperCase()}`;

function shell(title: string, bodyHtml: string, cta?: { label: string; url: string }) {
  return `
  <div style="background:#f1f5f9;padding:24px 12px;font-family:Segoe UI,Arial,sans-serif">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0">
      <div style="background:${BRAND};color:#fff;padding:18px 24px;font-size:18px;font-weight:600">
        ReliefAid
      </div>
      <div style="padding:24px">
        <h2 style="margin:0 0 12px;font-size:17px;color:#0f172a">${title}</h2>
        <div style="font-size:14px;color:#334155;line-height:1.6">${bodyHtml}</div>
        ${
          cta
            ? `<a href="${cta.url}" style="display:inline-block;margin-top:18px;background:${BRAND};color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-size:14px;font-weight:600">${cta.label}</a>`
            : ''
        }
      </div>
      <div style="padding:14px 24px;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8">
        AI-Powered Disaster Relief Donation &amp; Distribution Agent — this is an automated notification.
      </div>
    </div>
  </div>`;
}

function rows(pairs: [string, string][]) {
  return `<table style="width:100%;border-collapse:collapse;margin:12px 0">${pairs
    .map(
      ([k, v]) =>
        `<tr><td style="padding:6px 0;color:#64748b;font-size:13px">${k}</td><td style="padding:6px 0;color:#0f172a;font-size:13px;font-weight:600;text-align:right">${v}</td></tr>`
    )
    .join('')}</table>`;
}

async function sendMany(recipients: string[], subject: string, text: string, html: string) {
  const unique = Array.from(new Set(recipients.filter(Boolean)));
  if (!unique.length) return;
  const results = await Promise.allSettled(unique.map((to) => sendEmail(to, subject, text, html)));
  for (const r of results) {
    if (r.status === 'rejected') console.error('Notification email failed:', r.reason);
  }
}

/** New request scored by the AI → let every admin know it awaits review. */
export async function notifyRequestSubmitted(request: IReliefRequest) {
  try {
    const admins = await User.find({ role: 'admin' }).select('email').lean();
    const subject = `New relief request ${shortId(request._id)} — ${request.area}`;
    const detail = rows([
      ['Location', `${request.area}${request.district ? ', ' + request.district : ''}`],
      ['Disaster', request.disasterType || 'not specified'],
      ['Urgency', request.urgency],
      ['Families affected', String(request.familiesAffected)],
      ['AI priority score', `${request.aiScore ?? '—'}/10 (${request.aiRecommendation || 'review'})`]
    ]);
    await sendMany(
      admins.map((a: any) => a.email),
      subject,
      `A new relief request ${shortId(request._id)} for ${request.area} is awaiting review. AI score: ${request.aiScore}/10.`,
      shell('A new relief request awaits your review', detail, {
        label: 'Review Request',
        url: `${APP_URL}/admin/requests/${request._id}`
      })
    );
  } catch (err) {
    console.error('notifyRequestSubmitted failed:', err);
  }
}

/** Admin approved or rejected a request → tell the focal person. */
export async function notifyRequestDecision(
  request: IReliefRequest,
  action: 'approved' | 'rejected',
  adminNotes?: string
) {
  try {
    const focal = await User.findById(request.focal).select('email name').lean<any>();
    if (!focal?.email) return;
    const approved = action === 'approved';
    const subject = `Your relief request ${shortId(request._id)} was ${action}`;
    const body =
      `<p>Assalam-o-Alaikum ${focal.name},</p>` +
      (approved
        ? `<p>Good news — your relief request for <strong>${request.area}</strong> has been <strong style="color:${BRAND}">approved</strong> and is now visible to donors for funding.</p>`
        : `<p>Your relief request for <strong>${request.area}</strong> was <strong style="color:#b91c1c">rejected</strong> by the review team.</p>` +
          (adminNotes ? `<p style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:10px">Reason: ${adminNotes}</p>` : ''));
    await sendMany(
      [focal.email],
      subject,
      `Your relief request ${shortId(request._id)} for ${request.area} was ${action}.${adminNotes ? ' Notes: ' + adminNotes : ''}`,
      shell(subject, body, {
        label: 'Open Dashboard',
        url: `${APP_URL}/focal/dashboard`
      })
    );
  } catch (err) {
    console.error('notifyRequestDecision failed:', err);
  }
}

/** Gateway confirmed a donation → receipt to the donor, heads-up to the focal person. */
export async function notifyDonationReceived(input: {
  request: IReliefRequest;
  donorEmail?: string | null;
  donorName: string;
  amount: number;
  receiptNo: string;
  method: string;
}) {
  try {
    const detail = rows([
      ['Receipt No', input.receiptNo],
      ['Amount', `PKR ${input.amount.toLocaleString()}`],
      ['Payment method', input.method],
      ['Relief request', `${shortId(input.request._id)} — ${input.request.area}`]
    ]);

    const jobs: Promise<void>[] = [];
    if (input.donorEmail) {
      jobs.push(
        sendMany(
          [input.donorEmail],
          `Donation receipt ${input.receiptNo} — thank you!`,
          `Thank you ${input.donorName}! Your donation of PKR ${input.amount.toLocaleString()} to ${input.request.area} was received. Receipt: ${input.receiptNo}.`,
          shell(
            'Thank you for your donation!',
            `<p>Your contribution is on its way to verified needs in <strong>${input.request.area}</strong>.</p>${detail}`,
            { label: 'View Donation History', url: `${APP_URL}/donate/history` }
          )
        )
      );
    }

    jobs.push(
      (async () => {
        const focal = await User.findById(input.request.focal).select('email name').lean<any>();
        if (!focal?.email) return;
        await sendMany(
          [focal.email],
          `New donation for your request ${shortId(input.request._id)}`,
          `${input.donorName} donated PKR ${input.amount.toLocaleString()} to your relief request for ${input.request.area}.`,
          shell(
            'Your request received a donation',
            `<p><strong>${input.donorName}</strong> just donated to your relief request for <strong>${input.request.area}</strong>.</p>${detail}`,
            { label: 'Open Dashboard', url: `${APP_URL}/focal/dashboard` }
          )
        );
      })()
    );

    await Promise.allSettled(jobs);
  } catch (err) {
    console.error('notifyDonationReceived failed:', err);
  }
}

/** Smart/general fund donation → one summary receipt showing how it was split. */
export async function notifyFundDonation(input: {
  donorEmail: string;
  donorName: string;
  total: number;
  kind: 'smart' | 'general';
  legs: { area: string; amount: number; receiptNo: string }[];
}) {
  try {
    const breakdown = rows(
      input.legs.map((l) => [`${l.area} · ${l.receiptNo}`, `PKR ${l.amount.toLocaleString()}`] as [string, string])
    );
    const intro =
      input.kind === 'general'
        ? `Your General Relief Fund donation was automatically allocated by our priority engine to the areas that need it most:`
        : `Your donation was smart-allocated across the highest-priority underfunded needs:`;
    await sendMany(
      [input.donorEmail],
      `Donation receipt — PKR ${input.total.toLocaleString()} allocated to ${input.legs.length} area(s)`,
      `Thank you ${input.donorName}! Your PKR ${input.total.toLocaleString()} was allocated across ${input.legs.length} relief request(s).`,
      shell(
        'Thank you — your donation is on its way',
        `<p>${intro}</p>${breakdown}<p style="margin-top:12px;color:#64748b">Total: <strong>PKR ${input.total.toLocaleString()}</strong> across ${input.legs.length} area(s).</p>`,
        { label: 'View Donation History', url: `${APP_URL}/donate/history` }
      )
    );
  } catch (err) {
    console.error('notifyFundDonation failed:', err);
  }
}

/** Request fulfilled (final verified delivery) → close the loop with focal + every donor. */
export async function notifyRequestFulfilled(request: IReliefRequest) {
  try {
    const [focal, donations] = await Promise.all([
      User.findById(request.focal).select('email name').lean<any>(),
      Donation.find({ request: request._id }).populate('donor', 'email').lean()
    ]);
    const donorEmails = donations.map((d: any) => d.donor?.email).filter(Boolean);
    const recipients = [focal?.email, ...donorEmails].filter(Boolean) as string[];

    const raised = `PKR ${(request.donationRaised || 0).toLocaleString()}`;
    const subject = `Relief request ${shortId(request._id)} for ${request.area} is fulfilled 🎉`;
    await sendMany(
      recipients,
      subject,
      `The relief request for ${request.area} has been fulfilled. ${raised} was raised and aid delivery has been verified on the ground.`,
      shell(
        'Aid delivered — request fulfilled',
        `<p>The relief request for <strong>${request.area}</strong> has been marked <strong style="color:${BRAND}">fulfilled</strong>.</p>` +
          rows([
            ['Funds raised', raised],
            ['Families affected', String(request.familiesAffected)],
            ['Status', 'Verified aid delivery completed']
          ]) +
          `<p>Verified delivery records and proof photos are available on the request page.</p>`,
        { label: 'See Where The Aid Went', url: `${APP_URL}/donate/${request._id}` }
      )
    );
  } catch (err) {
    console.error('notifyRequestFulfilled failed:', err);
  }
}

/** In-Kind Item Pledge received by Admin → Thank you email to donor. */
export async function notifyPledgeReceived(pledge: any) {
  try {
    const detail = rows([
      ['Tracking ID', pledge.trackingId],
      ['Drop-off Location', pledge.dropoffLocation],
      ['Items Received', pledge.items.map((i: any) => `${i.quantity} ${i.unit} ${i.name}`).join(', ')]
    ]);

    await sendMany(
      [pledge.donorEmail],
      `Your Item Donation ${pledge.trackingId} was received — thank you!`,
      `Thank you ${pledge.donorName}! We successfully received your donation of physical relief items. Tracking ID: ${pledge.trackingId}.`,
      shell(
        'Thank you for your physical donation!',
        `<p>Assalam-o-Alaikum ${pledge.donorName},</p>
         <p>We are writing to confirm that our team has successfully received and verified your physical item donation at <strong>${pledge.dropoffLocation}</strong>.</p>
         ${detail}
         <p>These items have been added to our Central Inventory and will be dispatched to the most critical disaster areas very soon.</p>`,
        { label: 'Return to Website', url: APP_URL }
      )
    );
  } catch (err) {
    console.error('notifyPledgeReceived failed:', err);
  }
}
