import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';

const validateSchema = z.object({
  code: z.string().min(1).max(50),
  order_amount: z.number().min(0),
});

// POST /api/coupons/validate — check a coupon code against an amount
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = validateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ valid: false, discount: 0, error: 'Invalid request' }, { status: 400 });
    }
    const { code, order_amount } = parsed.data;

    const coupon = await db.coupon.findUnique({ where: { code: code.toUpperCase() } });

    if (!coupon || !coupon.isActive) {
      return NextResponse.json({ valid: false, discount: 0, error: 'Invalid coupon code' });
    }

    if (coupon.minOrderAmount > order_amount) {
      return NextResponse.json({ valid: false, discount: 0, error: `Minimum order: ₹${coupon.minOrderAmount}` });
    }

    const discount =
      coupon.discountType === 'percentage'
        ? Math.round((order_amount * coupon.discountValue) / 100)
        : Math.round(coupon.discountValue);

    return NextResponse.json({ valid: true, discount, code: coupon.code });
  } catch (error) {
    console.error('coupon validate error:', error);
    return NextResponse.json({ valid: false, discount: 0, error: 'Failed to validate coupon' }, { status: 500 });
  }
}
