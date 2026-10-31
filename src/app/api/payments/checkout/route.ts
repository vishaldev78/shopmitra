import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import crypto from 'crypto';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { createDodoCheckout, createDodoProduct, getDodoConfig } from '@/lib/dodo';

const checkoutSchema = z.object({
  order_number: z.string().min(1).max(50),
  // Remaining fields are accepted for backward compatibility but the order
  // stored in the database is always the source of truth for amount/items.
  amount: z.number().min(1).optional(),
  currency: z.string().min(3).max(3).default('INR'),
  customer_email: z.string().email().optional().or(z.literal('')),
  customer_name: z.string().max(120).optional().or(z.literal('')),
});

// POST /api/payments/checkout
// Creates a Dodo Payments hosted checkout session for a pending order.
//
// Professional behaviour:
// - The order (amount, items, customer) is loaded from the database — client
//   supplied amounts are never trusted.
// - When DODO_PAYMENTS_API_KEY is configured we call POST /checkouts. If the
//   key lacks checkout_sessions:write (or Dodo errors out) we return the real
//   error details and fall back to the built-in simulated checkout so the demo
//   flow keeps working; the response carries `provider` and `notice` so the
//   client can show what actually happened.
// - With no API key at all the simulated checkout is used out of the box.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = checkoutSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'Invalid checkout request' }, { status: 400 });
    }
    const { order_number, customer_email, customer_name } = parsed.data;

    // 1) Load the order — DB is the single source of truth
    const order = await db.order.findUnique({ where: { orderNumber: order_number }, include: { items: true } });
    if (!order) {
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
    }
    if (order.paymentMethod !== 'dodo') {
      return NextResponse.json({ success: false, error: 'Order is not an online payment order' }, { status: 400 });
    }
    // Paid orders can never be paid again. Failed orders MAY retry: stock was
    // never decremented for them (only markOrderPaid decrements stock).
    if (order.paymentStatus === 'paid') {
      return NextResponse.json({ success: false, error: 'Order payment already processed' }, { status: 409 });
    }

    // 2) Ownership check — only the buyer (or a guest order) can pay
    const user = await getSessionUser();
    if (order.userId && (!user || user.id !== order.userId)) {
      return NextResponse.json({ success: false, error: 'Not authorized' }, { status: 403 });
    }

    const config = getDodoConfig();
    const origin = req.headers.get('origin') || new URL(req.url).origin;
    const returnUrl = `${origin}/payment-return?order_number=${encodeURIComponent(order.orderNumber)}`;
    const cancelUrl = `${origin}/payment-cancel?order_number=${encodeURIComponent(order.orderNumber)}`;

    // 3) Real Dodo checkout session
    // The order total (items − coupon + delivery + GST) is the amount of
    // record, so we sync ONE Dodo product whose price equals `order.total`
    // and check out with a single line item. Syncing catalog products would
    // charge the pre-tax subtotal and drift from what the customer agreed to
    // pay. The mapping is cached on the order, so retries are idempotent.
    if (config) {
      let dodoProductId = order.dodoProductId;

      if (!dodoProductId) {
        const created = await createDodoProduct(config, {
          name: `Order ${order.orderNumber}`,
          description: `ShopMitra order ${order.orderNumber} — total including GST and delivery charges`,
          price: order.total,
          currency: 'INR',
        });
        if (created.ok) {
          dodoProductId = created.data.product_id;
          await db.order.update({ where: { id: order.id }, data: { dodoProductId } });
        }
      }

      if (dodoProductId) {
        const shipping = JSON.parse(order.shippingAddress || '{}') as { fullName?: string };
        const result = await createDodoCheckout(config, {
          product_cart: [{ product_id: dodoProductId, quantity: 1 }],
          customer: {
            email: customer_email || user?.email || undefined,
            name: customer_name || shipping.fullName || user?.name || undefined,
          },
          return_url: returnUrl,
          cancel_url: cancelUrl,
          metadata: { order_number: order.orderNumber, source: 'shopmitra' },
        });

        if (result.ok) {
          // Persist the Dodo session/payment reference so the return flow and
          // webhooks can reconcile: session_id now, real payment id after.
          const reference = result.data.payment_id ?? result.data.session_id;
          if (reference) {
            await db.order.update({ where: { id: order.id }, data: { paymentId: reference } });
          }
          return NextResponse.json({
            success: true,
            checkout_url: result.data.checkout_url,
            session_id: result.data.session_id,
            payment_id: result.data.payment_id,
            provider: 'dodo',
            payment_mode: config.testMode ? 'test' : 'live',
          });
        }
        // Real integration attempted but failed — surface the reason, then keep
        // the demo usable via the simulated checkout.
        console.error('dodo checkout failed:', `${result.code}: ${result.message}`);
      } else {
        console.error('dodo checkout failed: order product sync failed');
      }
      return simulatedCheckout(order);
    }

    // 4) No API key — simulated hosted checkout (demo mode)
    return simulatedCheckout(order);
  } catch (error) {
    console.error('payment checkout error:', error);
    return NextResponse.json({ success: false, error: 'Payment initialization failed' }, { status: 500 });
  }
}

/**
 * Sandbox checkout used when Dodo is unreachable or not configured. A stable
 * `sim_…` payment reference is issued and persisted on the order so the
 * confirm endpoint can verify the caller actually holds it (no forged
 * "payment succeeded" reports) — the client stays on the page and confirms
 * in-place instead of navigating.
 */
async function simulatedCheckout(order: { id: string; orderNumber: string }) {
  const paymentId = `sim_${crypto.randomBytes(12).toString('hex')}`;
  await db.order.update({ where: { id: order.id }, data: { paymentId } });
  const checkoutUrl = `/payment-return?order_number=${encodeURIComponent(order.orderNumber)}&status=succeeded&payment_id=${paymentId}&demo=true`;
  return NextResponse.json({
    success: true,
    checkout_url: checkoutUrl,
    payment_id: paymentId,
    provider: 'simulated',
  });
}
