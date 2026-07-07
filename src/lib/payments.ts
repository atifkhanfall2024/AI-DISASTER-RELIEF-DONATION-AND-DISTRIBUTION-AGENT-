import crypto from 'crypto';

/**
 * Payment gateway layer.
 *
 * Same philosophy as sms.ts/mailer.ts: a real provider activates automatically
 * once its env keys are present, and a safe local fallback keeps the full flow
 * demoable without any external account.
 *
 *  - Real:  JazzCash Hosted Checkout (sandbox or live) via Page Redirection.
 *           Set JAZZCASH_MERCHANT_ID / JAZZCASH_PASSWORD / JAZZCASH_INTEGRITY_SALT
 *           (sandbox signup: https://sandbox.jazzcash.com.pk). The user's browser
 *           carries the redirect + return POST, so localhost works fine in dev.
 *  - Demo:  a built-in gateway page (/pay/demo) that exercises the exact same
 *           pending → paid/failed lifecycle and callback path.
 */

const { JAZZCASH_MERCHANT_ID, JAZZCASH_PASSWORD, JAZZCASH_INTEGRITY_SALT } = process.env;

const JAZZCASH_SANDBOX_URL =
  process.env.JAZZCASH_GATEWAY_URL ||
  'https://sandbox.jazzcash.com.pk/CustomerPortal/transactionmanagement/merchantform/';

export function isJazzCashConfigured() {
  return !!(JAZZCASH_MERCHANT_ID && JAZZCASH_PASSWORD && JAZZCASH_INTEGRITY_SALT);
}

/** Unique transaction reference we hand to the gateway, e.g. RA20260707123045AB12 */
export function makeTxnRef() {
  const d = new Date();
  const stamp = [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
    String(d.getHours()).padStart(2, '0'),
    String(d.getMinutes()).padStart(2, '0'),
    String(d.getSeconds()).padStart(2, '0')
  ].join('');
  return `RA${stamp}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

function fmtDateTime(d: Date) {
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
    String(d.getHours()).padStart(2, '0'),
    String(d.getMinutes()).padStart(2, '0'),
    String(d.getSeconds()).padStart(2, '0')
  ].join('');
}

/**
 * JazzCash secure hash: sort the pp_/ppmpf_ fields alphabetically, join the
 * NON-EMPTY values with '&' after prepending the integrity salt, then
 * HMAC-SHA256 the string using the salt as the key.
 */
export function jazzCashSecureHash(fields: Record<string, string>, salt: string) {
  const values = Object.keys(fields)
    .filter((k) => k !== 'pp_SecureHash')
    .sort()
    .map((k) => fields[k])
    .filter((v) => v !== undefined && v !== null && v !== '');
  const message = `${salt}&${values.join('&')}`;
  return crypto.createHmac('sha256', salt).update(message).digest('hex').toUpperCase();
}

/** Build the hosted-checkout form (action URL + hidden fields) for a payment. */
export function buildJazzCashCheckout(input: {
  txnRef: string;
  amount: number; // PKR
  description: string;
  returnUrl: string;
}) {
  const now = new Date();
  const expiry = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour to complete

  const fields: Record<string, string> = {
    pp_Version: '1.1',
    pp_TxnType: '', // hosted page lets the customer pick wallet/card
    pp_Language: 'EN',
    pp_MerchantID: JAZZCASH_MERCHANT_ID as string,
    pp_Password: JAZZCASH_PASSWORD as string,
    pp_TxnRefNo: input.txnRef,
    pp_Amount: String(Math.round(input.amount * 100)), // paisa
    pp_TxnCurrency: 'PKR',
    pp_TxnDateTime: fmtDateTime(now),
    pp_TxnExpiryDateTime: fmtDateTime(expiry),
    pp_BillReference: input.txnRef,
    pp_Description: input.description.slice(0, 100),
    pp_ReturnURL: input.returnUrl
  };
  fields.pp_SecureHash = jazzCashSecureHash(fields, JAZZCASH_INTEGRITY_SALT as string);

  return { action: JAZZCASH_SANDBOX_URL, fields };
}

/** Verify a JazzCash return POST: recompute the hash and check the response code. */
export function verifyJazzCashResponse(params: Record<string, string>) {
  const received = params.pp_SecureHash || '';
  const relevant: Record<string, string> = {};
  for (const [k, v] of Object.entries(params)) {
    if ((k.startsWith('pp_') || k.startsWith('ppmpf_')) && k !== 'pp_SecureHash') relevant[k] = v;
  }
  const expected = jazzCashSecureHash(relevant, JAZZCASH_INTEGRITY_SALT as string);
  const hashOk = received.toUpperCase() === expected;
  const code = params.pp_ResponseCode || '';
  return {
    hashOk,
    success: hashOk && code === '000',
    code,
    gatewayTxnId: params.pp_RetreivalReferenceNo || params.pp_TxnRefNo || '',
    message: params.pp_ResponseMessage || ''
  };
}
