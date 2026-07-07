/**
 * Phone OTP sender.
 *
 * This app generates and verifies its own OTP codes server-side (see src/lib/otp.ts
 * and the Verification model), so the phone channel only needs a way to *deliver* a
 * code the server already made. A server SMS provider fits that model directly.
 *
 * Wired here: Twilio via its REST API (no SDK dependency — plain fetch). It activates
 * automatically once TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_FROM are set in
 * the environment. Until then we log the code to the server console so the phone-OTP
 * flow still works end-to-end in local development (the /api/otp/send route also
 * returns the code as `devCode` when NODE_ENV !== production).
 *
 * Note: true Firebase Phone Auth is client-side (RecaptchaVerifier +
 * signInWithPhoneNumber) and would bypass this server OTP system entirely, so it is
 * intentionally not used here.
 */

const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM } = process.env;

/** True once a real SMS provider's credentials are present. */
export function isSmsConfigured() {
  return !!(TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_FROM);
}

export async function sendSms(to: string, text: string) {
  if (!isSmsConfigured()) {
    console.log(`\n📱 [DEV SMS — no provider configured]\n   to: ${to}\n   ${text}\n`);
    return { delivered: false };
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
  const auth = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64');
  const body = new URLSearchParams({ To: to, From: TWILIO_FROM as string, Body: text });

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Twilio SMS failed (${res.status}): ${detail}`);
  }
  return { delivered: true };
}
