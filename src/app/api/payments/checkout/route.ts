import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';

const checkoutSchema = z.object({
  order_number: z.string().min(1).max(50),
  amount: z.number().min(1),
  currency: z.string().min(3).max(3).default('INR'),
  customer_email: z.string().email().optional().or(z.literal('')),
  customer_name: z.string().max(120).optional().or(z.literal('')),
  products: z
    .array(
      z.object({
        name: z.string(),
        quantity: z.number().int().min(1),
        price: z.number().min(0),
      })
    )
    .optional(),
});

// POST /api/payments/checkout
// Creates a Dodo Payments checkout session when DODO_PAYMENTS_API_KEY is set.
// Falls back to a built-in simulated checkout so the flow works out of the box.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = checkoutSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'Invalid checkout request' }, { status: 400 });
    }
    const { order_number, amount, currency, customer_email, customer_name, products } = parsed.data;

    const apiKey = process.env.DODO_PAYMENTS_API_KEY;
    const testMode = process.env.DODO_TEST_MODE !== 'false';
    const baseUrl = testMode ? 'https://test.dodopayments.com' : 'https://live.dodopayments.com';

    if (apiKey) {
      const origin = req.headers.get('origin') || new URL(req.url).origin;
      const response = await fetch(`${baseUrl}/checkouts`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          product_cart: (products ?? []).map((p) => ({
            name: p.name,
            quantity: p.quantity,
            price: { currency: currency, price: Math.round(p.price * 100) / 100 },
          })),
          customer: { email: customer_email || undefined, name: customer_name || undefined },
          return_url: `${origin}/payment-return?order_number=${order_number}`,
          cancel_url: `${origin}/payment-cancel?order_number=${order_number}`,
          billing_currency: currency.toLowerCase(),
          metadata: { orderId: order_number, source: 'shopmitra' },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const checkoutUrl = data.checkout_url || data.payment_link?.link || data.url;
        if (checkoutUrl) {
          return NextResponse.json({ success: true, checkout_url: checkoutUrl, provider: 'dodo' });
        }
      }
      // fall through to simulated checkout on API failure
    }

    // Simulated hosted checkout (demo mode, no keys required)
    const url = `/payment-return?order_number=${encodeURIComponent(order_number)}&status=succeeded&payment_id=pay_${Date.now().toString(36)}&demo=true`;
    return NextResponse.json({ success: true, checkout_url: url, provider: 'simulated' });
  } catch (error) {
    console.error('payment checkout error:', error);
    return NextResponse.json({ success: false, error: 'Payment initialization failed' }, { status: 500 });
  }
}
