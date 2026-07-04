/**
 * Phone OTP sender.
 *
 * Integration point for production: plug in your provider below. Two common paths:
 *   1. Firebase Phone Auth (client-side): use the Firebase Web SDK's
 *      `signInWithPhoneNumber` + `RecaptchaVerifier` in the browser. In that model
 *      Firebase sends the SMS and this server-side sender is bypassed entirely.
 *   2. A server SMS API (Twilio, Vonage, Infobip, etc.): POST `text` to `to` here.
 *
 * Until a provider is wired, we log the code to the server console so the phone-OTP
 * flow works end-to-end in local development (the /api/otp/send route also returns
 * the code as `devCode` when not in production).
 */

/** Flip to true (and implement below) once a real SMS/Firebase sender is wired. */
export function isSmsConfigured() {
  return false;
}

export async function sendSms(to: string, text: string) {
  if (!isSmsConfigured()) {
    console.log(`\n📱 [DEV SMS — no provider configured]\n   to: ${to}\n   ${text}\n`);
    return { delivered: false };
  }

  // TODO: implement real SMS delivery here (Firebase / Twilio / etc.).
  return { delivered: true };
}
