import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { createDodoCheckout, createDodoProduct, getDodoConfig } from '@/lib/dodo';

const checkoutSchema = z.object({
  order_number: z.string().min(1).max(50),
  // Remaining fields are accepted for backward compatibility but the order
  // stored in the database is always the source of truth for amount/items.
  amount: z.number().min(1).optional(),
  currency: z.string().min(3).max(3).default('INR'),
  customer_email: z.string().email().optional().or(z.literal('')),
  customer_name: z.string().max(120).optional().or(z.literal('')),
});

// POST /api/payments/checkout
// Creates a Dodo Payments hosted checkout session for a pending order.
//
// Professional behaviour:
// - The order (amount, items, customer) is loaded from the database — client
//   supplied amounts are never trusted.
// - When DODO_PAYMENTS_API_KEY is configured we call POST /checkouts. If the
//   key lacks checkout_sessions:write (or Dodo errors out) we return the real
//   error details and fall back to the built-in simulated checkout so the demo
//   flow keeps working; the response carries `provider` and `notice` so the
//   client can show what actually happened.
// - With no API key at all the simulated checkout is used out of the box.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = checkoutSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'Invalid checkout request' }, { status: 400 });
    }
    const { order_number, customer_email, customer_name } = parsed.data;

    // 1) Load the order — DB is the single source of truth
    const order = await db.order.findUnique({ where: { orderNumber: order_number }, include: { items: true } });
    if (!order) {
      return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
    }
    if (order.paymentMethod !== 'dodo') {
      return NextResponse.json({ success: false, error: 'Order is not a Dodo payment order' }, { status: 400 });
    }
    if (order.paymentStatus !== 'pending') {
      return NextResponse.json({ success: false, error: 'Order payment already processed' }, { status: 409 });
    }

    // 2) Ownership check — only the buyer (or a guest order) can pay
    const user = await getSessionUser();
    if (order.userId && (!user || user.id !== order.userId)) {
      return NextResponse.json({ success: false, error: 'Not authorized' }, { status: 403 });
    }

    const config = getDodoConfig();
    const origin = req.headers.get('origin') || new URL(req.url).origin;
    const returnUrl = `${origin}/payment-return?order_number=${encodeURIComponent(order.orderNumber)}`;
    const cancelUrl = `${origin}/payment-cancel?order_number=${encodeURIComponent(order.orderNumber)}`;

    // 3) Real Dodo checkout session
    // Dodo requires registered product ids (pdt_...). Store products are
    // auto-synced: any product without a Dodo mapping is created on Dodo
    // (products:write) once, then cached in the dodoProductId column.
    const payable = order.items.every((i) => Boolean(i.productId));
    if (config && payable) {
      const shipping = JSON.parse(order.shippingAddress || '{}') as { fullName?: string };

      // 3a) Ensure every ordered product exists on Dodo (auto-sync, cached)
      const cart: { product_id: string; quantity: number }[] = [];
      let syncError: string | null = null;
      for (const item of order.items) {
        const product = await db.product.findUnique({ where: { id: item.productId as string } });
        if (!product) {
          syncError = `Product ${item.productName} no longer exists`;
          break;
        }
        let dodoId = product.dodoProductId;
        if (!dodoId) {
          const created = await createDodoProduct(config, {
            name: product.name,
            description: product.shortDescription ?? product.description ?? undefined,
            price: product.price,
            currency: 'INR',
          });
          if (created.ok) {
            dodoId = created.data.product_id;
            await db.product.update({ where: { id: product.id }, data: { dodoProductId: dodoId } });
          } else {
            syncError = `Product sync failed for ${product.name} (${created.code}: ${created.message})`;
            break;
          }
        }
        cart.push({ product_id: dodoId, quantity: item.quantity });
      }

      // 3b) Create the hosted checkout session
      if (!syncError) {
        const result = await createDodoCheckout(config, {
          product_cart: cart,
          customer: {
            email: customer_email || user?.email || undefined,
            name: customer_name || shipping.fullName || user?.name || undefined,
          },
          return_url: returnUrl,
          cancel_url: cancelUrl,
          metadata: { order_number: order.orderNumber, source: 'shopmitra' },
        });

        if (result.ok) {
          // Persist the Dodo session/payment reference so the return flow and
          // webhooks can reconcile: session_id now, real payment id after.
          const reference = result.data.payment_id ?? result.data.session_id;
          if (reference) {
            await db.order.update({ where: { id: order.id }, data: { paymentId: reference } });
          }
          return NextResponse.json({
            success: true,
            checkout_url: result.data.checkout_url,
            session_id: result.data.session_id,
            payment_id: result.data.payment_id,
            provider: 'dodo',
          });
        }
        syncError = `${result.code}: ${result.message}`;
      }

      // Real integration attempted but failed — surface the reason, then keep
      // the demo usable via the simulated checkout.
      console.error('dodo checkout failed:', syncError);
      const simulated = simulatedCheckoutUrl(order.orderNumber);
      return NextResponse.json({
        success: true,
        checkout_url: simulated,
        provider: 'simulated',
        notice: `Dodo Payments checkout unavailable (${syncError}). Using simulated checkout.`,
      });
    }

    // 4) No API key — simulated hosted checkout (demo mode)
    return NextResponse.json({ success: true, checkout_url: simulatedCheckoutUrl(order.orderNumber), provider: 'simulated' });
  } catch (error) {
    console.error('payment checkout error:', error);
    return NextResponse.json({ success: false, error: 'Payment initialization failed' }, { status: 500 });
  }
}

function simulatedCheckoutUrl(orderNumber: string) {
  const paymentId = `pay_${Date.now().toString(36)}`;
  return `/payment-return?order_number=${encodeURIComponent(orderNumber)}&status=succeeded&payment_id=${paymentId}&demo=true`;
}
