import crypto from 'crypto';

/**
 * Dodo Payments server-side utilities.
 *
 * Docs: https://docs.dodopayments.com/api-reference/introduction
 * - Test mode base URL:  https://test.dodopayments.com
 * - Live mode base URL:  https://live.dodopayments.com
 * - Auth: `Authorization: Bearer <api_key>`
 *
 * Webhook signatures follow the Standard Webhooks spec:
 * - Headers: webhook-id, webhook-timestamp, webhook-signature
 * - Signed content: `{id}.{timestamp}.{rawBody}`
 * - Secret: strip `whsec_` prefix, then base64-decode
 * - Signature: base64(HMAC-SHA256(signedContent, secret)) in `v1,<sig>` format
 * - Reject timestamps more than 5 minutes away (replay protection)
 */

const TEST_BASE_URL = 'https://test.dodopayments.com';
const LIVE_BASE_URL = 'https://live.dodopayments.com';

export interface DodoConfig {
  apiKey: string;
  baseUrl: string;
  testMode: boolean;
}

/** Returns the Dodo config when an API key is present, otherwise null (demo mode). */
export function getDodoConfig(): DodoConfig | null {
  const apiKey = process.env.DODO_PAYMENTS_API_KEY?.trim();
  if (!apiKey) return null;
  const testMode = (process.env.DODO_PAYMENTS_ENVIRONMENT ?? 'test_mode') !== 'live_mode';
  return { apiKey, baseUrl: testMode ? TEST_BASE_URL : LIVE_BASE_URL, testMode };
}

export interface DodoCheckoutInput {
  /** Registered Dodo product ids (pdt_...) with quantity */
  product_cart: { product_id: string; quantity: number }[];
  customer: { email?: string; name?: string };
  return_url: string;
  cancel_url: string;
  metadata: Record<string, string>;
}

export type DodoResult<T> = { ok: true; data: T } | { ok: false; code: string; message: string; status: number };

/** POST /checkouts — create a hosted checkout session. */
export async function createDodoCheckout(config: DodoConfig, input: DodoCheckoutInput): Promise<DodoResult<{ checkout_url: string; session_id?: string; payment_id?: string }>> {
  try {
    const res = await fetch(`${config.baseUrl}/checkouts`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        product_cart: input.product_cart,
        customer: input.customer,
        return_url: input.return_url,
        cancel_url: input.cancel_url,
        metadata: input.metadata,
      }),
      signal: AbortSignal.timeout(15000),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, code: (body as { code?: string }).code ?? 'DODO_API_ERROR', message: (body as { message?: string; detail?: string }).message ?? (body as { detail?: string }).detail ?? `Dodo checkout failed (${res.status})`, status: res.status };
    }
    const checkoutUrl = (body as { checkout_url?: string }).checkout_url;
    if (!checkoutUrl) {
      return { ok: false, code: 'MISSING_CHECKOUT_URL', message: 'Dodo did not return a checkout_url', status: 502 };
    }
    return {
      ok: true,
      data: {
        checkout_url: checkoutUrl,
        session_id: (body as { session_id?: string }).session_id,
        payment_id: (body as { payment_id?: string }).payment_id,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Network error contacting Dodo Payments';
    return { ok: false, code: 'DODO_NETWORK_ERROR', message, status: 504 };
  }
}

export interface DodoCheckoutSession {
  id: string;
  /** null until the customer completes (or attempts) payment */
  payment_id: string | null;
  payment_status: string | null;
}

/**
 * GET /checkouts/{session_id} — checkout session status. `payment_id` becomes
 * available once the customer completes the payment; use it with
 * getDodoPayment() for the authoritative status.
 */
export async function getDodoCheckoutSession(config: DodoConfig, sessionId: string): Promise<{ found: true; session: DodoCheckoutSession } | { found: false; status: number; code: string; message: string }> {
  const res = await fetch(`${config.baseUrl}/checkouts/${encodeURIComponent(sessionId)}`, {
    headers: { Authorization: `Bearer ${config.apiKey}` },
    signal: AbortSignal.timeout(15000),
  }).catch(() => null);

  if (!res) return { found: false, status: 504, code: 'DODO_NETWORK_ERROR', message: 'Network error contacting Dodo Payments' };
  if (res.status === 404) return { found: false, status: 404, code: 'SESSION_NOT_FOUND', message: 'Checkout session not found on Dodo' };

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const b = body as { code?: string; message?: string };
    return { found: false, status: res.status, code: b.code ?? 'DODO_API_ERROR', message: b.message ?? `Dodo session lookup failed (${res.status})` };
  }
  const b = body as Record<string, unknown>;
  return {
    found: true,
    session: {
      id: (b.id as string) ?? sessionId,
      payment_id: (b.payment_id as string | null) ?? null,
      payment_status: (b.payment_status as string | null) ?? null,
    },
  };
}

export type DodoPaymentStatus = 'succeeded' | 'pending' | 'failed' | 'cancelled' | string;

export interface DodoPayment {
  payment_id: string;
  status: DodoPaymentStatus;
  total_amount?: number;
  currency?: string;
  metadata?: Record<string, string>;
}

/**
 * POST /products — register a store product on Dodo so it can be sold via
 * checkout sessions. Prices use the smallest currency unit (paise for INR).
 * Requires the API key to have products:write.
 */
export async function createDodoProduct(config: DodoConfig, input: { name: string; description?: string; price: number; currency: string }): Promise<DodoResult<{ product_id: string }>> {
  try {
    const res = await fetch(`${config.baseUrl}/products`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: input.name.slice(0, 200),
        description: input.description?.slice(0, 500) || undefined,
        tax_category: 'digital_products',
        price: {
          type: 'one_time_price',
          currency: input.currency.toUpperCase(),
          price: Math.round(input.price * 100), // minor units (paise)
          discount_bps: 0,
          purchasing_power_parity: false,
          tax_inclusive: true,
        },
      }),
      signal: AbortSignal.timeout(15000),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      const b = body as { code?: string; message?: string };
      return { ok: false, code: b.code ?? 'DODO_API_ERROR', message: b.message ?? `Dodo product creation failed (${res.status})`, status: res.status };
    }
    const productId = (body as { product_id?: string }).product_id;
    if (!productId) {
      return { ok: false, code: 'MISSING_PRODUCT_ID', message: 'Dodo did not return a product_id', status: 502 };
    }
    return { ok: true, data: { product_id: productId } };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Network error contacting Dodo Payments';
    return { ok: false, code: 'DODO_NETWORK_ERROR', message, status: 504 };
  }
}

/** GET /payments/{id} — authoritative payment status used for server-side verification. */
export async function getDodoPayment(config: DodoConfig, paymentId: string): Promise<{ found: true; payment: DodoPayment } | { found: false; status: number; code: string; message: string }> {
  const res = await fetch(`${config.baseUrl}/payments/${encodeURIComponent(paymentId)}`, {
    headers: { Authorization: `Bearer ${config.apiKey}` },
    signal: AbortSignal.timeout(15000),
  }).catch(() => null);

  if (!res) return { found: false, status: 504, code: 'DODO_NETWORK_ERROR', message: 'Network error contacting Dodo Payments' };
  if (res.status === 404) return { found: false, status: 404, code: 'PAYMENT_NOT_FOUND', message: 'Payment not found on Dodo' };

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const b = body as { code?: string; message?: string };
    return { found: false, status: res.status, code: b.code ?? 'DODO_API_ERROR', message: b.message ?? `Dodo payment lookup failed (${res.status})` };
  }
  const p = body as Record<string, unknown>;
  return {
    found: true,
    payment: {
      payment_id: (p.payment_id as string) ?? paymentId,
      status: (p.status as DodoPaymentStatus) ?? 'pending',
      total_amount: p.total_amount as number | undefined,
      currency: p.currency as string | undefined,
      metadata: (p.metadata as Record<string, string>) ?? undefined,
    },
  };
}

export type WebhookVerifyResult = { ok: true; event: { type: string; data: Record<string, unknown>; id?: string } } | { ok: false; reason: string };

/**
 * Verify a Dodo webhook request (Standard Webhooks spec) and parse the event.
 * Always call with the RAW request body (before JSON parsing).
 */
export function verifyDodoWebhook(rawBody: string, headers: Headers): WebhookVerifyResult {
  const secret = process.env.DODO_PAYMENTS_WEBHOOK_KEY?.trim();
  if (!secret) return { ok: false, reason: 'Webhook secret not configured (set DODO_PAYMENTS_WEBHOOK_KEY)' };

  const id = headers.get('webhook-id');
  const timestamp = headers.get('webhook-timestamp');
  const signatureHeader = headers.get('webhook-signature');
  if (!id || !timestamp || !signatureHeader) return { ok: false, reason: 'Missing webhook signature headers' };

  // Replay protection: reject events older/newer than 5 minutes
  const ts = Number.parseInt(timestamp, 10);
  if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > 300) {
    return { ok: false, reason: 'Webhook timestamp outside tolerance' };
  }

  // whsec_ secrets are base64-encoded; fall back to utf-8 for raw secrets
  const key = secret.startsWith('whsec_') ? Buffer.from(secret.slice(6), 'base64') : Buffer.from(secret, 'utf8');
  const signedContent = `${id}.${timestamp}.${rawBody}`;
  const expected = crypto.createHmac('sha256', key).update(signedContent).digest('base64');

  const signatures = signatureHeader.split(' ').map((s) => s.trim()).filter(Boolean);
  const matched = signatures.some((sig) => {
    const [version, hash] = sig.split(',');
    if (version !== 'v1' || !hash) return false;
    const a = Buffer.from(hash, 'base64');
    const b = Buffer.from(expected, 'base64');
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  });
  if (!matched) return { ok: false, reason: 'Invalid webhook signature' };

  try {
    const event = JSON.parse(rawBody) as { type: string; data: Record<string, unknown> };
    return { ok: true, event };
  } catch {
    return { ok: false, reason: 'Invalid webhook JSON payload' };
  }
}
