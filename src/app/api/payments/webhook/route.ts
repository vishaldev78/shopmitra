import { NextRequest, NextResponse } from 'next/server';
import { verifyDodoWebhook } from '@/lib/dodo';
import { markOrderPaid, markOrderFailed, findOrderForPayment } from '@/lib/payments';
import { serializeOrder } from '@/lib/serialize';

// POST /api/payments/webhook
// Receives Dodo Payments webhook events (payment.succeeded, payment.failed, ...)
// and finalizes the matching order. This is the most reliable source of truth:
// even if the customer closes the browser before the return page fires, the
// webhook still confirms the order.
//
// Setup:
// 1. Dashboard → Developer → Webhooks → add endpoint: <your-domain>/api/payments/webhook
// 2. Subscribe to at least: payment.succeeded, payment.failed
// 3. Copy the signing secret into DODO_PAYMENTS_WEBHOOK_KEY in .env
export async function POST(req: NextRequest) {
  // Raw body is required for signature verification — never req.json() first
  const rawBody = await req.text();

  const verification = verifyDodoWebhook(rawBody, req.headers);
  if (!verification.ok) {
    console.error('dodo webhook rejected:', verification.reason);
    return NextResponse.json({ success: false, error: verification.reason }, { status: 401 });
  }

  const event = verification.event;
  const eventType = event.type;
  const data = (event.data ?? {}) as Record<string, unknown>;
  const paymentId = (data.payment_id as string) ?? undefined;
  const metadata = (data.metadata as Record<string, string> | undefined) ?? undefined;
  const orderNumber = metadata?.order_number ?? metadata?.orderId;

  try {
    if (eventType === 'payment.succeeded' || eventType === 'payment.failed' || eventType === 'payment.cancelled') {
      const order = await findOrderForPayment(paymentId, orderNumber);

      if (!order) {
        // Verified but unknown order — acknowledge so Dodo stops retrying
        console.error('dodo webhook: no order found for', eventType, paymentId, orderNumber);
        return NextResponse.json({ success: true, received: true, matched: false });
      }

      // Only Dodo-method pending orders are affected; COD / finalized orders
      // are safely ignored (idempotent via markOrderPaid/markOrderFailed).
      if (order.paymentMethod === 'dodo' && order.paymentStatus === 'pending') {
        if (eventType === 'payment.succeeded') {
          const updated = await markOrderPaid(order.id, paymentId);
          console.log('dodo webhook: order paid', updated?.orderNumber);
          return NextResponse.json({ success: true, received: true, order: serializeOrder(updated!) });
        }
        const updated = await markOrderFailed(order.id);
        console.log('dodo webhook: order failed/cancelled', updated?.orderNumber);
        return NextResponse.json({ success: true, received: true, order: serializeOrder(updated!) });
      }

      return NextResponse.json({ success: true, received: true, matched: true, ignored: true });
    }

    // Other event types (refunds, disputes, subscriptions...) — acknowledge
    return NextResponse.json({ success: true, received: true, ignored: true, type: eventType });
  } catch (error) {
    console.error('dodo webhook processing error:', error);
    // 500 tells Dodo to retry the delivery
    return NextResponse.json({ success: false, error: 'Webhook processing failed' }, { status: 500 });
  }
}
