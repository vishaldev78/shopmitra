import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

const couponPatchSchema = z.object({
  code: z.string().trim().min(1).max(50).optional(),
  discount_type: z.enum(['percentage', 'fixed']).optional(),
  discount_value: z.number().positive().optional(),
  min_order_amount: z.number().min(0).optional(),
  is_active: z.boolean().optional(),
}).refine((coupon) => Object.keys(coupon).length > 0, { message: 'Nothing to update' });

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  try {
    const parsed = couponPatchSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid coupon update' }, { status: 400 });
    }
    const { id } = await ctx.params;
    const existing = await db.coupon.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'Coupon not found' }, { status: 404 });

    const discountType = parsed.data.discount_type ?? existing.discountType;
    const discountValue = parsed.data.discount_value ?? existing.discountValue;
    if (discountType === 'percentage' && discountValue > 100) {
      return NextResponse.json({ error: 'Percentage discount cannot exceed 100' }, { status: 400 });
    }
    if (parsed.data.code !== undefined) {
      const code = parsed.data.code.toUpperCase();
      const duplicate = await db.coupon.findUnique({ where: { code } });
      if (duplicate && duplicate.id !== id) {
        return NextResponse.json({ error: 'A coupon with this code already exists' }, { status: 409 });
      }
    }

    const coupon = await db.coupon.update({
      where: { id },
      data: {
        ...(parsed.data.code !== undefined ? { code: parsed.data.code.toUpperCase() } : {}),
        ...(parsed.data.discount_type !== undefined ? { discountType: parsed.data.discount_type } : {}),
        ...(parsed.data.discount_value !== undefined ? { discountValue: parsed.data.discount_value } : {}),
        ...(parsed.data.min_order_amount !== undefined ? { minOrderAmount: parsed.data.min_order_amount } : {}),
        ...(parsed.data.is_active !== undefined ? { isActive: parsed.data.is_active } : {}),
      },
    });
    return NextResponse.json({ coupon: {
      id: coupon.id,
      code: coupon.code,
      discount_type: coupon.discountType,
      discount_value: coupon.discountValue,
      min_order_amount: coupon.minOrderAmount,
      is_active: coupon.isActive,
    } });
  } catch (error) {
    console.error('coupons PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update coupon' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  try {
    const { id } = await ctx.params;
    await db.coupon.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('coupons DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete coupon' }, { status: 500 });
  }
}
