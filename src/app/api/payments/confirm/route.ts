import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { serializeOrder } from '@/lib/serialize';

const confirmSchema = z.object({
  order_number: z.string().min(1).max(50),
  payment_id: z.string().max(255).optional(),
  status: z.enum(['succeeded', 'failed', 'cancelled']).default('succeeded'),
});

// POST /api/payments/confirm
// Finalizes a pending order after payment return: marks paid/failed,
// decrements stock on success. Called by the payment-return page.
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
      return NextResponse.json({ success: true, already_processed: true, order: serializeOrder(order) });
    }

    if (status === 'succeeded') {
      const updated = await db.$transaction(async (tx) => {
        const o = await tx.order.update({
          where: { id: order.id },
          data: {
            paymentStatus: 'paid',
            paymentId: payment_id ?? 'pay_' + Date.now().toString(36),
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
        return o;
      });

      return NextResponse.json({ success: true, order: serializeOrder(updated) });
    }

    // failed / cancelled
    const updated = await db.order.update({
      where: { id: order.id },
      data: { paymentStatus: 'failed', status: 'cancelled' },
      include: { items: true },
    });

    return NextResponse.json({ success: true, order: serializeOrder(updated) });
  } catch (error) {
    console.error('payment confirm error:', error);
    return NextResponse.json({ success: false, error: 'Failed to confirm payment' }, { status: 500 });
  }
}
