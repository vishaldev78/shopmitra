/**
 * mailer.ts — transactional email delivery via Resend.
 *
 * Behaviour:
 * - RESEND_API_KEY set      → emails are delivered through Resend's REST API.
 * - RESEND_API_KEY missing  → dev mode: the email is logged to the server
 *   console instead of being sent (nothing ever crashes the request path).
 * - Every attempt (sent / logged / failed) is recorded in the EmailLog table
 *   so the admin can audit exactly which customer emails went out.
 *
 * Sending is always fire-and-forget from API routes: `void sendOrderEmail(...)`
 * — email failures must never break checkout or admin actions.
 */
import { Resend } from 'resend';
import { db } from '@/lib/db';
import { renderOrderEmail, type OrderEmailKind } from '@/lib/emails';

const FROM = process.env.EMAIL_FROM || 'ShopMitra <onboarding@resend.dev>';

let resend: Resend | null = null;
function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  if (!resend) resend = new Resend(process.env.RESEND_API_KEY);
  return resend;
}

/** Absolute base URL used for links inside emails. */
export function emailBaseUrl(origin?: string | null): string {
  return process.env.NEXT_PUBLIC_APP_URL || origin || 'https://shopmitra.in';
}

interface SendInput {
  to: string;
  subject: string;
  html: string;
  template: string;
  orderId?: string;
}

export async function sendMail({ to, subject, html, template, orderId }: SendInput): Promise<{ ok: boolean; status: string }> {
  const client = getResend();
  let status = 'logged';
  let error: string | null = null;

  if (!client) {
    console.log(`[email:dev] → ${to} | ${subject} (RESEND_API_KEY not set — not sent, logged to EmailLog)`);
  } else {
    try {
      const result = await client.emails.send({ from: FROM, to, subject, html });
      if (result.error) {
        status = 'failed';
        error = result.error.message || 'Resend rejected the email';
        console.error(`[email] Resend error for ${to}:`, result.error);
      } else {
        status = 'sent';
      }
    } catch (e) {
      status = 'failed';
      error = e instanceof Error ? e.message : 'Unknown Resend network error';
      console.error(`[email] failed for ${to}:`, error);
    }
  }

  try {
    await db.emailLog.create({ data: { to, subject, template, status, error, orderId: orderId ?? null } });
  } catch (e) {
    console.error('[email] EmailLog write failed:', e);
  }

  return { ok: status !== 'failed', status };
}

/**
 * Send the right transactional email for an order lifecycle event.
 * Resolves the recipient from the order's user (orders are login-gated,
 * so this is always available); silently skips guest orders.
 */
export async function sendOrderEmail(
  order: { id: string; orderNumber: string; userId: string | null; subtotal: number; discount: number; shipping: number; tax: number; total: number; paymentMethod: string; paymentStatus: string; couponCode?: string | null },
  kind: OrderEmailKind,
  baseUrl?: string
): Promise<void> {
  try {
    if (!order.userId) return;
    const user = await db.user.findUnique({ where: { id: order.userId }, select: { email: true, name: true } });
    if (!user?.email) return;

    const items = await db.orderItem.findMany({
      where: { orderId: order.id },
      select: { productName: true, quantity: true, totalPrice: true },
    });

    const { subject, html } = renderOrderEmail(order, items, kind, baseUrl || emailBaseUrl());
    await sendMail({ to: user.email, subject, html, template: `order.${kind}`, orderId: order.id });
  } catch (e) {
    // Never let email problems break the order flow.
    console.error('[email] sendOrderEmail failed:', e);
  }
}
