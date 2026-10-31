import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

const couponSchema = z.object({
  code: z.string().trim().min(1).max(50),
  discount_type: z.enum(['percentage', 'fixed']),
  discount_value: z.number().positive(),
  min_order_amount: z.number().min(0).optional().default(0),
  is_active: z.boolean().optional().default(true),
}).refine((coupon) => coupon.discount_type !== 'percentage' || coupon.discount_value <= 100, {
  message: 'Percentage discount cannot exceed 100',
});

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  try {
    const coupons = await db.coupon.findMany({ orderBy: { code: 'asc' } });
    return NextResponse.json({ coupons: coupons.map((coupon) => ({
      id: coupon.id,
      code: coupon.code,
      discount_type: coupon.discountType,
      discount_value: coupon.discountValue,
      min_order_amount: coupon.minOrderAmount,
      is_active: coupon.isActive,
    })) });
  } catch (error) {
    console.error('coupons GET error:', error);
    return NextResponse.json({ error: 'Failed to load coupons' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  try {
    const parsed = couponSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid coupon data' }, { status: 400 });
    }
    const code = parsed.data.code.toUpperCase();
    if (await db.coupon.findUnique({ where: { code } })) {
      return NextResponse.json({ error: 'A coupon with this code already exists' }, { status: 409 });
    }
    const coupon = await db.coupon.create({
      data: {
        code,
        discountType: parsed.data.discount_type,
        discountValue: parsed.data.discount_value,
        minOrderAmount: parsed.data.min_order_amount,
        isActive: parsed.data.is_active,
      },
    });
    return NextResponse.json({ coupon: {
      id: coupon.id,
      code: coupon.code,
      discount_type: coupon.discountType,
      discount_value: coupon.discountValue,
      min_order_amount: coupon.minOrderAmount,
      is_active: coupon.isActive,
    } }, { status: 201 });
  } catch (error) {
    console.error('coupons POST error:', error);
    return NextResponse.json({ error: 'Failed to create coupon' }, { status: 500 });
  }
}
