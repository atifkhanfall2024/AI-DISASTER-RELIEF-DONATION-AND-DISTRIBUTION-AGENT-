import nodemailer, { Transporter } from 'nodemailer';

const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;

/** Email sending is only "real" once SMTP credentials are present. */
export function isEmailConfigured() {
  return !!(SMTP_HOST && SMTP_USER && SMTP_PASS);
}

let transporter: Transporter | null = null;
function getTransport(): Transporter | null {
  if (!isEmailConfigured()) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: '64.233.184.109', // Hardcoded to bypass DNS blocks in Pakistan
      port: Number(SMTP_PORT || 587),
      secure: Number(SMTP_PORT) === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
      tls: { servername: 'smtp.gmail.com' }
    });
  }
  return transporter;
}

/**
 * Send an email via Nodemailer. If SMTP isn't configured (local dev), we log the
 * message to the server console instead of failing, so OTP flows stay testable.
 */
export async function sendEmail(to: string, subject: string, text: string, html?: string) {
  const t = getTransport();
  if (!t) {
    console.log(`\n📧 [DEV EMAIL — no SMTP configured]\n   to: ${to}\n   subject: ${subject}\n   ${text}\n`);
    return { delivered: false };
  }
  await t.sendMail({ from: SMTP_FROM || SMTP_USER, to, subject, text, html });
  return { delivered: true };
}
