import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { serializeOrder } from '@/lib/serialize';
import { generateOrderNumber } from '@/lib/utils';
import { sendOrderEmail, emailBaseUrl } from '@/lib/mailer';

const shippingAddressSchema = z.object({
  fullName: z.string().min(1).max(120),
  phone: z.string().min(10).max(15),
  addressLine1: z.string().min(1).max(300),
  addressLine2: z.string().max(300).optional().default(''),
  city: z.string().min(1).max(120),
  state: z.string().min(1).max(120),
  postalCode: z.string().min(6).max(10),
  country: z.string().max(120).optional().default('India'),
});

const createOrderSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.number().int().min(1).max(99),
      })
    )
    .min(1),
  shipping_address: shippingAddressSchema,
  payment_method: z.enum(['cod', 'dodo']),
  coupon_code: z.string().max(50).optional().nullable(),
});

// GET /api/orders — user's own orders; scope=all for admin (super_admin: all orders,
// seller: only orders containing their products)
export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Login required' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const scope = searchParams.get('scope');
    const isAdmin = user.role === 'admin' || user.role === 'super_admin';

    let where: { userId?: string | null; items?: { some: { product: { sellerId: string } } } } = { userId: user.id };
    if (scope === 'all' && isAdmin) {
      where = user.role === 'super_admin'
        ? {}
        : { items: { some: { product: { sellerId: user.id } } } };
    }

    const orders = await db.order.findMany({
      where,
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ orders: orders.map(serializeOrder) });
  } catch (error) {
    console.error('orders GET error:', error);
    return NextResponse.json({ error: 'Failed to load orders' }, { status: 500 });
  }
}

// POST /api/orders — create a new order (recomputes totals server-side)
export async function POST(req: NextRequest) {
  const user = await getSessionUser();

  try {
    const body = await req.json();
    const parsed = createOrderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid order data. Check address and items.' }, { status: 400 });
    }
    const { items, shipping_address, payment_method, coupon_code } = parsed.data;

    // Load products and validate stock
    const productIds = items.map((i) => i.productId);
    const products = await db.product.findMany({ where: { id: { in: productIds }, isActive: true } });
    if (products.length !== productIds.length) {
      return NextResponse.json({ error: 'Some products are no longer available' }, { status: 400 });
    }

    for (const item of items) {
      const product = products.find((p) => p.id === item.productId)!;
      if (product.stock < item.quantity) {
        return NextResponse.json({ error: `Insufficient stock for ${product.name}` }, { status: 400 });
      }
    }

    // Server-side totals (never trust client numbers)
    const subtotal = Math.round(items.reduce((sum, i) => sum + products.find((p) => p.id === i.productId)!.price * i.quantity, 0));

    // Coupon
    let discount = 0;
    let appliedCoupon: string | null = null;
    if (coupon_code) {
      const coupon = await db.coupon.findUnique({ where: { code: coupon_code.toUpperCase() } });
      if (coupon && coupon.isActive && subtotal >= coupon.minOrderAmount) {
        discount = Math.min(
          subtotal,
          coupon.discountType === 'percentage'
            ? Math.round((subtotal * coupon.discountValue) / 100)
            : Math.round(coupon.discountValue)
        );
        appliedCoupon = coupon.code;
      }
    }

    const shipping = subtotal > 999 ? 0 : 99;
    const tax = Math.round((subtotal - discount) * 0.18);
    const total = subtotal - discount + shipping + tax;

    const orderNumber = generateOrderNumber();

    // COD orders are confirmed immediately (payment due on delivery);
    // Dodo orders stay pending until payment is confirmed via webhook/return.
    const isCod = payment_method === 'cod';

    const order = await db.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          orderNumber,
          userId: user?.id ?? null,
          subtotal,
          discount,
          shipping,
          tax,
          total,
          status: isCod ? 'confirmed' : 'pending',
          paymentStatus: 'pending',
          paymentMethod: payment_method,
          couponCode: appliedCoupon,
          shippingAddress: JSON.stringify(shipping_address),
          items: {
            create: items.map((i) => {
              const p = products.find((pr) => pr.id === i.productId)!;
              return {
                productId: p.id,
                productName: p.name,
                productImage: (JSON.parse(p.images || '[]')[0] as string) ?? null,
                quantity: i.quantity,
                unitPrice: p.price,
                totalPrice: p.price * i.quantity,
              };
            }),
          },
        },
        include: { items: true },
      });

      // Decrement stock for COD orders right away; for Dodo it happens on payment confirm
      if (isCod) {
        for (const i of items) {
          await tx.product.update({
            where: { id: i.productId },
            data: { stock: { decrement: i.quantity } },
          });
        }
      }

      return created;
    });

    // COD orders are confirmed the moment they are placed — send the order
    // confirmation email now. Online orders get theirs when payment succeeds
    // (markOrderPaid → sendOrderEmail('confirmed')).
    if (isCod) {
      void sendOrderEmail(order, 'placed', emailBaseUrl(req.nextUrl.origin));
    }

    return NextResponse.json({ order: serializeOrder(order) }, { status: 201 });
  } catch (error) {
    console.error('orders POST error:', error);
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
  }
}
