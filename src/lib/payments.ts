import { db } from '@/lib/db';
import { serializeOrder } from '@/lib/serialize';
import { sendOrderEmail } from '@/lib/mailer';

/**
 * Shared payment finalization logic used by BOTH the payment-return confirm
 * endpoint and the Dodo webhook endpoint, so order state is consistent no
 * matter which path confirms the payment first.
 */

/**
 * Mark an order as paid and decrement product stock inside a single transaction.
 * Idempotent: orders that are no longer `pending` are returned untouched.
 * Fires the "payment received / order confirmed" transactional email exactly
 * once — only when this call performed the transition.
 */
export async function markOrderPaid(orderId: string, paymentId: string | null | undefined) {
  const pre = await db.order.findUnique({ where: { id: orderId }, select: { paymentStatus: true } });
  const wasPending = pre?.paymentStatus === 'pending';

  const updated = await db.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId }, include: { items: true } });
    if (!order) return null;
    if (order.paymentStatus !== 'pending') return order; // already finalized

    const upd = await tx.order.update({
      where: { id: orderId },
      data: {
        paymentStatus: 'paid',
        paymentId: paymentId ?? order.paymentId,
        status: 'confirmed',
      },
      include: { items: true },
    });

    for (const item of order.items) {
      if (item.productId) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });
      }
    }
    return upd;
  });

  if (wasPending && updated) {
    void sendOrderEmail(updated, 'confirmed');
  }
  return updated;
}

/**
 * Mark an order as failed/cancelled. Idempotent: orders that are no longer
 * `pending` are returned untouched. Notifies the customer exactly once.
 */
export async function markOrderFailed(orderId: string) {
  const order = await db.order.findUnique({ where: { id: orderId } });
  if (!order) return null;
  if (order.paymentStatus !== 'pending') return order; // already finalized
  const updated = await db.order.update({
    where: { id: orderId },
    data: { paymentStatus: 'failed', status: 'cancelled' },
    include: { items: true },
  });
  void sendOrderEmail(updated, 'cancelled');
  return updated;
}

/**
 * Locate an order for a Dodo webhook event: prefer metadata.order_number,
 * fall back to a stored paymentId match.
 */
export async function findOrderForPayment(paymentId: string | undefined, metadataOrderNumber: string | undefined) {
  if (metadataOrderNumber) {
    const byNumber = await db.order.findUnique({ where: { orderNumber: metadataOrderNumber } });
    if (byNumber) return byNumber;
  }
  if (paymentId) {
    const byPaymentId = await db.order.findFirst({ where: { paymentId } });
    if (byPaymentId) return byPaymentId;
  }
  return null;
}

export { serializeOrder };
