import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/orders/track?orderNumber=SM-XXXX — public minimal order status
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orderNumber = searchParams.get('orderNumber')?.trim();
    if (!orderNumber) {
      return NextResponse.json({ found: false, error: 'Order number required' }, { status: 400 });
    }

    const order = await db.order.findUnique({
      where: { orderNumber },
      select: { orderNumber: true, status: true, paymentStatus: true, createdAt: true, total: true },
    });

    if (!order) {
      return NextResponse.json({ found: false });
    }

    return NextResponse.json({
      found: true,
      order: {
        order_number: order.orderNumber,
        status: order.status,
        payment_status: order.paymentStatus,
        created_at: order.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('order track error:', error);
    return NextResponse.json({ found: false, error: 'Failed to track order' }, { status: 500 });
  }
}
