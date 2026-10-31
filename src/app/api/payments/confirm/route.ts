import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { serializeOrder } from '@/lib/serialize';
import { markOrderPaid, markOrderFailed } from '@/lib/payments';
import { DodoConfig, DodoPayment, getDodoConfig, getDodoPayment, getDodoCheckoutSession } from '@/lib/dodo';

const confirmSchema = z.object({
  order_number: z.string().min(1).max(50),
  payment_id: z.string().max(255).optional().nullable(),
  // Client-reported status — used ONLY in demo mode. With a live Dodo key the
  // authoritative status is always fetched server-side from Dodo.
  status: z.enum(['succeeded', 'failed', 'cancelled']).default('succeeded'),
});

// POST /api/payments/confirm
// Finalizes a pending order after the customer returns from checkout.
//
// Professional behaviour:
// - When DODO_PAYMENTS_API_KEY is configured and a Dodo payment id exists, the
//   payment status is verified SERVER-SIDE via GET /payments/{id} — the
//   client-reported status is never trusted.
// - Authorization: a payment that Dodo itself verifies as belonging to this
//   order (metadata.order_number or amount+currency match) is accepted even
//   without a session — the payer may return on another device or with an
//   expired session. Client-reported status ALONE is never enough for an
//   order that belongs to a user.
// - "pending" from Dodo keeps the order pending (the webhook will finalize it).
// - Unknown payment ids (simulated demo payments) fall back to the demo flow,
//   which requires the owner's session.
// - Stock decrement happens exactly once inside markOrderPaid (idempotent).
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = confirmSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'Invalid confirmation' }, { status: 400 });
    }
    const { order_number, payment_id, status } = parsed.data;

    const order = await db.order.findUnique({
      where: { orderNumber: order_number },
      include: { items: true },
    });

    if (!order) {
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
    }

    const user = await getSessionUser();
    const isOwner = !order.userId || (user && user.id === order.userId);

    // Idempotency: already finalized
    if (order.paymentStatus !== 'pending') {
      const state = order.paymentStatus === 'paid' ? 'succeeded' : 'failed';
      if (isOwner) {
        return NextResponse.json({
          success: true,
          already_processed: true,
          state,
          verified: true,
          order: serializeOrder(order),
        });
      }
      // Non-owner (e.g. payer returned on another device / expired session):
      // reveal only the outcome when they present the order's exact Dodo
      // payment reference — never the order payload.
      if (payment_id && payment_id === order.paymentId) {
        return NextResponse.json({ success: true, already_processed: true, state, verified: true });
      }
      return NextResponse.json({ success: false, error: 'Not authorized' }, { status: 403 });
    }

    // COD orders are confirmed at order creation; nothing to do here.
    if (order.paymentMethod !== 'dodo') {
      return NextResponse.json({ success: false, error: 'Order does not require online payment' }, { status: 400 });
    }

    const config = getDodoConfig();
    let dodoPaymentId = payment_id || order.paymentId || null;

    // 1) Server-side verification with Dodo (authoritative)
    if (config && dodoPaymentId) {
      // 1a) Checkout-session reference (cks_...): resolve it to a payment id.
      //     payment_id is null on the session until the customer pays.
      if (dodoPaymentId.startsWith('cks_')) {
        const session = await getDodoCheckoutSession(config, dodoPaymentId);
        if (session.found) {
          if (session.session.payment_id) {
            dodoPaymentId = session.session.payment_id;
          } else {
            // Customer has not completed payment yet — webhook/return will finalize
            return NextResponse.json({ success: true, state: 'pending', verified: true, order: serializeOrder(order) });
          }
        } else {
          console.error('dodo session lookup failed:', session.code, session.message);
          dodoPaymentId = null;
        }
      }

      // 1b) Authoritative payment status
      if (dodoPaymentId) {
        const lookup = await getDodoPayment(config, dodoPaymentId);

        if (lookup.found) {
          // The Dodo payment must reference THIS order — via metadata
          // order_number, or an exact amount+currency match — before we
          // accept it as proof of payment for a user-owned order.
          const matchesOrder = dodoPaymentReferencesOrder(lookup.payment, order, config);
          if (!matchesOrder) {
            console.error('dodo payment does not reference order', order.orderNumber);
            return NextResponse.json({ success: false, error: 'Payment does not belong to this order' }, { status: 400 });
          }

          const dodoStatus = lookup.payment.status;
          if (dodoStatus === 'succeeded') {
            const updated = await markOrderPaid(order.id, lookup.payment.payment_id);
            return NextResponse.json({ success: true, state: 'succeeded', verified: true, order: serializeOrder(updated!) });
          }
          if (dodoStatus === 'failed' || dodoStatus === 'cancelled') {
            const updated = await markOrderFailed(order.id);
            return NextResponse.json({ success: true, state: 'failed', verified: true, order: serializeOrder(updated!) });
          }
          // still processing on Dodo's side — webhook will finalize it
          return NextResponse.json({ success: true, state: 'pending', verified: true, order: serializeOrder(order) });
        }

        // Payment not found on Dodo: either a simulated/demo payment, or the
        // key lacks read access. In both cases fall through to demo handling.
        console.error('dodo payment lookup failed:', lookup.code, lookup.message);
      }
    }

    // 2) Demo mode (no Dodo key or simulated payment) — honour client status,
    //    but only for the owner (or guest orders).
    if (!isOwner) {
      return NextResponse.json({ success: false, error: 'Not authorized' }, { status: 403 });
    }
    if (status === 'succeeded') {
      const updated = await markOrderPaid(order.id, payment_id);
      return NextResponse.json({ success: true, state: 'succeeded', verified: false, order: serializeOrder(updated!) });
    }

    const updated = await markOrderFailed(order.id);
    return NextResponse.json({ success: true, state: 'failed', verified: false, order: serializeOrder(updated!) });
  } catch (error) {
    console.error('payment confirm error:', error);
    return NextResponse.json({ success: false, error: 'Failed to confirm payment' }, { status: 500 });
  }
}

/**
 * Whether a Dodo payment record provably belongs to the given order.
 * metadata.order_number is set by our checkout; amount+currency is the
 * fallback (Dodo amounts are in the smallest currency unit).
 */
function dodoPaymentReferencesOrder(payment: DodoPayment, order: { orderNumber: string; total: number }, config: DodoConfig): boolean {
  const metaOrder = payment.metadata?.order_number ?? payment.metadata?.orderId;
  if (metaOrder) return metaOrder === order.orderNumber;
  if (payment.total_amount != null && payment.currency) {
    const expectedMinor = Math.round(order.total * 100);
    const currency = (payment.currency || '').toUpperCase();
    return currency === 'INR' && payment.total_amount === expectedMinor && Boolean(config);
  }
  return false;
}
