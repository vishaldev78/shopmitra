import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { serializeOrder } from '@/lib/serialize';

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
