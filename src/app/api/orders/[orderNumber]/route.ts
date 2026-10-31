import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { serializeOrder } from '@/lib/serialize';
import { markOrderPaid } from '@/lib/payments';

const patchSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'shipped', 'delivered', 'cancelled']).optional(),
  payment_status: z.enum(['pending', 'paid', 'failed']).optional(),
});

// GET /api/orders/[orderNumber] — order detail (owner or admin)
export async function GET(_req: NextRequest, ctx: { params: Promise<{ orderNumber: string }> }) {
  try {
    const { orderNumber } = await ctx.params;
    const user = await getSessionUser();

    const order = await db.order.findUnique({
      where: { orderNumber },
      include: { items: true },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Guests (no user attached) can view their own order summary via number;
    // logged-in users can only view their own orders unless admin.
    const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
    if (order.userId && (!user || (user.id !== order.userId && !isAdmin))) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    return NextResponse.json({ order: serializeOrder(order) });
  } catch (error) {
    console.error('order GET error:', error);
    return NextResponse.json({ error: 'Failed to load order' }, { status: 500 });
  }
}

// PATCH /api/orders/[orderNumber] — admin order workflow (status + payment).
// Stock is kept consistent: cancelling restores reserved units, re-opening a
// cancelled order re-reserves them, and flipping a pending online payment to
// paid runs the exact same fulfillment path as a gateway payment.
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ orderNumber: string }> }) {
  try {
    const user = await getSessionUser();
    if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { orderNumber } = await ctx.params;
    const parsed = patchSchema.safeParse(await req.json());
    if (!parsed.success || (!parsed.data.status && !parsed.data.payment_status)) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
    }

    const order = await db.order.findUnique({ where: { orderNumber }, include: { items: true } });
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const { status, payment_status } = parsed.data;

    // Payment status transitions (online orders only — COD is collected on
    // delivery and the stock was already reserved when the order was placed).
    if (payment_status && payment_status !== order.paymentStatus) {
      if (order.paymentMethod !== 'cod') {
        if (payment_status === 'paid' && order.paymentStatus === 'pending') {
          await markOrderPaid(order.id, order.paymentId || `admin_${Date.now().toString(36)}`);
        }
      }
    }

    // Status transitions with stock conservation.
    if (status && status !== order.status) {
      if (status === 'cancelled' && order.status !== 'cancelled') {
        await db.$transaction(async (tx) => {
          for (const item of order.items) {
            if (item.productId) {
              await tx.product.update({
                where: { id: item.productId },
                data: { stock: { increment: item.quantity } },
              });
            }
          }
          await tx.order.update({ where: { id: order.id }, data: { status } });
        });
      } else if (order.status === 'cancelled' && status !== 'cancelled') {
        // Re-opening a cancelled order — re-reserve stock if still available.
        const insufficient: string[] = [];
        for (const item of order.items) {
          if (!item.productId) continue;
          const p = await db.product.findUnique({ where: { id: item.productId }, select: { stock: true } });
          if (!p || p.stock < item.quantity) insufficient.push(item.productName);
        }
        if (insufficient.length > 0) {
          return NextResponse.json(
            { error: `Cannot reopen — insufficient stock for ${insufficient.join(', ')}` },
            { status: 409 }
          );
        }
        await db.$transaction(async (tx) => {
          for (const item of order.items) {
            if (item.productId) {
              await tx.product.update({
                where: { id: item.productId },
                data: { stock: { decrement: item.quantity } },
              });
            }
          }
          await tx.order.update({ where: { id: order.id }, data: { status } });
        });
      } else {
        await db.order.update({ where: { id: order.id }, data: { status } });
      }
    }

    const updated = await db.order.findUnique({ where: { id: order.id }, include: { items: true } });
    return NextResponse.json({ order: serializeOrder(updated!) });
  } catch (error) {
    console.error('order PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
  }
}
