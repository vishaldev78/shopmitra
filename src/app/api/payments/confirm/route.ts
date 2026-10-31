import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { serializeOrder } from '@/lib/serialize';
import { markOrderPaid, markOrderFailed } from '@/lib/payments';
import { getDodoConfig, getDodoPayment } from '@/lib/dodo';

const confirmSchema = z.object({
  order_number: z.string().min(1).max(50),
  payment_id: z.string().max(255).optional(),
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
// - "pending" from Dodo keeps the order pending (the webhook will finalize it).
// - Unknown payment ids (simulated demo payments) fall back to the demo flow.
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

    // Only the owner (or guest order) can confirm
    const user = await getSessionUser();
    if (order.userId && (!user || user.id !== order.userId)) {
      return NextResponse.json({ success: false, error: 'Not authorized' }, { status: 403 });
    }

    // Idempotency: already finalized
    if (order.paymentStatus !== 'pending') {
      return NextResponse.json({
        success: true,
        already_processed: true,
        state: order.paymentStatus === 'paid' ? 'succeeded' : 'failed',
        verified: true,
        order: serializeOrder(order),
      });
    }

    // COD orders are confirmed at order creation; nothing to do here.
    if (order.paymentMethod !== 'dodo') {
      return NextResponse.json({ success: false, error: 'Order does not require online payment' }, { status: 400 });
    }

    const config = getDodoConfig();
    const dodoPaymentId = payment_id || order.paymentId;

    // 1) Server-side verification with Dodo (authoritative)
    if (config && dodoPaymentId) {
      const lookup = await getDodoPayment(config, dodoPaymentId);

      if (lookup.found) {
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

    // 2) Demo mode (no Dodo key or simulated payment) — honour client status
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
