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
  // Client-reported status — used ONLY to FINALIZE simulated/demo payments
  // and it is always optional. A status-check poll (no `status` field) never
  // mutates an order; with a real Dodo reference the authoritative status is
  // always fetched server-side from Dodo.
  status: z.enum(['succeeded', 'failed', 'cancelled']).optional(),
});

// POST /api/payments/confirm
// Dual-purpose endpoint:
//   1. Status check  — `{ order_number }` only. Read-only: resolves the order's
//      live payment state (used by the in-page payment modal while the hosted
//      checkout window is open).
//   2. Finalization  — `{ order_number, payment_id, status }`. Finalizes a
//      simulated/demo payment, or reconciles a Dodo payment after return.
//
// Professional behaviour:
// - When the order carries a real Dodo reference (cks_… / pay_…) and a key is
//   configured, the payment status is verified SERVER-SIDE via
//   GET /payments/{id} — the client-reported status is never trusted, and a
//   failed lookup can never fall back to a client "succeeded" report.
// - Authorization: a payment that Dodo verifies as belonging to this order
//   (metadata.order_number or amount+currency match) is accepted even without
//   a session — the payer may return on another device. Client-reported
//   status ALONE is never enough for an order that belongs to a user.
// - Simulated payments are referenced by an unguessable `sim_…` id issued at
//   checkout; finalizing one requires the caller to present it.
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
    const storedRef = order.paymentId ?? null;
    const simRef = storedRef?.startsWith('sim_') ? storedRef : null;
    const hasRealRef = Boolean(config && storedRef && !simRef);

    // 1) Server-side verification with Dodo (authoritative). Any order with a
    //    real Dodo reference goes through here and STAYS here — verification
    //    failures are surfaced as "still pending", never as client-reported
    //    success.
    if (hasRealRef) {
      let dodoPaymentId = payment_id || storedRef!;

      // 1a) Checkout-session reference (cks_…): resolve it to a payment id.
      //     payment_id is null on the session until the customer pays.
      if (dodoPaymentId.startsWith('cks_')) {
        const session = await getDodoCheckoutSession(config!, dodoPaymentId);
        if (session.found && session.session.payment_id) {
          dodoPaymentId = session.session.payment_id;
          // fall through — the payment itself is verified below
        } else {
          // Not paid yet. Only the order owner may watch an unsettled
          // session; everyone else learns nothing about the order.
          if (!isOwner) {
            return NextResponse.json({ success: false, error: 'Not authorized' }, { status: 403 });
          }
          if (!session.found) {
            console.error('dodo session lookup failed:', session.code, session.message);
            return NextResponse.json({ success: true, state: 'pending', verified: false, notice: 'Payment verification temporarily unavailable' });
          }
          // Customer has not completed payment yet
          return NextResponse.json({ success: true, state: 'pending', verified: true, order: serializeOrder(order) });
        }
      }

      // 1b) Authoritative payment status
      const lookup = await getDodoPayment(config!, dodoPaymentId);
      if (lookup.found) {
        // The Dodo payment must reference THIS order — via metadata
        // order_number, or an exact amount+currency match — before we
        // accept it as proof of payment for a user-owned order.
        const matchesOrder = dodoPaymentReferencesOrder(lookup.payment, order, config!);
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

      // Payment id not found on Dodo (or read failed). Without proof the
      // payment belongs to this order, an anonymous caller learns nothing.
      console.error('dodo payment lookup failed:', lookup.code, lookup.message);
      if (!isOwner) {
        return NextResponse.json({ success: false, error: 'Not authorized' }, { status: 403 });
      }
      return NextResponse.json({ success: true, state: 'pending', verified: false, notice: 'Payment verification temporarily unavailable' });
    }

    // 2) Simulated / demo payments (no API key, or a sim_ reference).
    //    Requires the owner's session, the exact payment reference, and an
    //    explicit final status — a bare status check never mutates the order.
    if (!isOwner) {
      return NextResponse.json({ success: false, error: 'Not authorized' }, { status: 403 });
    }
    if (!status) {
      return NextResponse.json({ success: true, state: 'pending', verified: false, order: serializeOrder(order) });
    }
    if (simRef && payment_id !== simRef) {
      return NextResponse.json({ success: false, error: 'Payment reference mismatch' }, { status: 400 });
    }

    if (status === 'succeeded') {
      const updated = await markOrderPaid(order.id, payment_id ?? simRef);
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
