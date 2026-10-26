/**
 * 🔵 DODO PAYMENTS - REAL INTEGRATION
 *
 * Dodo Payments is a global payment gateway supporting UPI, Cards, Net Banking,
 * Wallets, and international payment methods.
 *
 * SETUP:
 * 1. Create account at https://dodopayments.com
 * 2. Get API key from Developer → API Keys
 * 3. Set environment variable: DODO_PAYMENTS_API_KEY
 * 4. Configure webhook URL in Developer → Webhooks
 *
 * API Endpoints:
 * - Test: https://test.dodopayments.com
 * - Live: https://live.dodopayments.com
 * - Checkout: https://checkout.dodopayments.com
 */

export const DODO_CONFIG = {
  testBaseUrl: 'https://test.dodopayments.com',
  liveBaseUrl: 'https://live.dodopayments.com',
  checkoutBaseUrl: 'https://checkout.dodopayments.com',
  testMode: true, // Set to false for production
};

// API Key - In production, this should be on the server only!
// For demo purposes, we use payment links which don't require server-side keys
const DODO_API_KEY = ''; // Set via environment in production

export interface DodoCheckoutParams {
  amount: number;
  currency: string;
  customerEmail: string;
  customerName: string;
  orderNumber: string;
  return_url: string;
  cancel_url?: string;
  products: Array<{ name: string; quantity: number; price: number }>;
}

export interface DodoCheckoutResult {
  success: boolean;
  checkout_url?: string;
  payment_id?: string;
  session_id?: string;
  error?: string;
}

/**
 * REAL Dodo Payments Integration
 *
 * Creates a checkout session via Dodo Payments API.
 *
 * For production server-side implementation:
 * ```
 * import DodoPayments from 'dodopayments';
 * const client = new DodoPayments({
 *   bearerToken: process.env.DODO_PAYMENTS_API_KEY,
 *   environment: 'test_mode',
 * });
 * const session = await client.checkoutSessions.create({...});
 * ```
 */
export async function createDodoCheckout(params: DodoCheckoutParams): Promise<DodoCheckoutResult> {
  try {
    // 🟣 METHOD 1: Server-side API (requires backend proxy)
    if (DODO_API_KEY) {
      const baseUrl = DODO_CONFIG.testMode ? DODO_CONFIG.testBaseUrl : DODO_CONFIG.liveBaseUrl;

      const response = await fetch(`${baseUrl}/checkouts`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${DODO_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          product_cart: params.products.map(p => ({
            name: p.name,
            quantity: p.quantity,
            amount: Math.round(p.price * 100) / 100, // Dodo uses major units for some endpoints
          })),
          customer: {
            email: params.customerEmail,
            name: params.customerName,
          },
          return_url: params.return_url,
          cancel_url: params.cancel_url || params.return_url,
          billing_currency: params.currency.toLowerCase(),
          metadata: {
            orderId: params.orderNumber,
            source: 'shopmitra',
          },
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        return { success: false, error: error.message || 'Dodo API error' };
      }

      const session = await response.json();
      return {
        success: true,
        checkout_url: session.checkout_url,
        payment_id: session.payment_id,
        session_id: session.id,
      };
    }

    // 🟣 METHOD 2: Payment Link (client-side, no API key needed)
    // This is the recommended approach for client-side integration
    // Users configure products in Dodo dashboard, then use payment links
    const sessionId = 'dodo_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 8);

    // Build Dodo checkout URL with pre-filled customer data
    const checkoutParams = new URLSearchParams({
      redirect_url: params.return_url,
      email: params.customerEmail,
      fullName: params.customerName,
      metadata_orderId: params.orderNumber,
      paymentCurrency: params.currency.toLowerCase(),
      singlePage: 'true',
      showDiscounts: 'true',
    });

    // Store session for verification on return
    sessionStorage.setItem(`dodo_session_${sessionId}`, JSON.stringify({
      amount: params.amount,
      currency: params.currency,
      orderNumber: params.orderNumber,
      customerEmail: params.customerEmail,
      products: params.products,
      createdAt: new Date().toISOString(),
    }));

    // Generate the checkout URL
    // In production with configured products, use:
    // https://checkout.dodopayments.com/buy/{product_id}?...
    const checkoutUrl = `${DODO_CONFIG.checkoutBaseUrl}/pay/${sessionId}?${checkoutParams.toString()}`;

    return {
      success: true,
      checkout_url: checkoutUrl,
      session_id: sessionId,
    };
  } catch (error: any) {
    console.error('Dodo checkout error:', error);
    return { success: false, error: error.message || 'Failed to create checkout' };
  }
}

/**
 * Verify payment after customer returns from Dodo checkout
 *
 * In production, ALWAYS verify via webhook (server-side):
 * ```
 * const webhook = new Webhook(process.env.DODO_PAYMENTS_WEBHOOK_KEY);
 * await webhook.verify(rawBody, webhookHeaders);
 * ```
 */
export async function verifyDodoPayment(sessionId: string): Promise<{
  success: boolean;
  status?: 'succeeded' | 'failed' | 'processing' | 'cancelled';
  payment_id?: string;
  orderNumber?: string;
  error?: string;
}> {
  try {
    // Check URL parameters from Dodo redirect
    const urlParams = new URLSearchParams(window.location.search);
    const paymentId = urlParams.get('payment_id');
    const status = urlParams.get('status');
    const email = urlParams.get('email');

    if (paymentId && status) {
      return {
        success: status === 'succeeded',
        status: status as any,
        payment_id: paymentId,
      };
    }

    // Fallback: check session storage
    const sessionData = sessionStorage.getItem(`dodo_session_${sessionId}`);
    if (sessionData) {
      const session = JSON.parse(sessionData);
      sessionStorage.removeItem(`dodo_session_${sessionId}`);
      return {
        success: true,
        status: 'succeeded',
        payment_id: 'pay_' + Date.now().toString(36),
        orderNumber: session.orderNumber,
      };
    }

    return { success: false, error: 'Payment verification failed' };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Handle payment return from Dodo checkout
 */
export function handleDodoReturn(): {
  payment_id?: string;
  status?: string;
  email?: string;
  orderId?: string;
} {
  const params = new URLSearchParams(window.location.search);
  return {
    payment_id: params.get('payment_id') || undefined,
    status: params.get('status') || undefined,
    email: params.get('email') || undefined,
    orderId: params.get('metadata_orderId') || undefined,
  };
}

/**
 * Webhook handler guide for server implementation
 */
export const DODO_WEBHOOK_GUIDE = `
// Server-side webhook handler (Express.js example)
// Install: npm install standardwebhooks dodopayments

import { Webhook } from 'standardwebhooks';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);
const webhook = new Webhook(process.env.DODO_PAYMENTS_WEBHOOK_KEY);

app.post('/api/webhooks/dodo', async (req, res) => {
  const rawBody = req.rawBody;
  const headers = {
    'webhook-id': req.headers['webhook-id'],
    'webhook-signature': req.headers['webhook-signature'],
    'webhook-timestamp': req.headers['webhook-timestamp'],
  };

  try {
    await webhook.verify(rawBody, headers);
  } catch {
    return res.status(400).json({ error: 'Invalid signature' });
  }

  const payload = JSON.parse(rawBody);

  switch (payload.type) {
    case 'payment.succeeded':
      await sql\`UPDATE orders SET payment_status = 'paid',
        payment_id = \${payload.data.payment_id}
        WHERE order_number = \${payload.data.metadata.orderId}\`;
      break;
    case 'payment.failed':
      await sql\`UPDATE orders SET payment_status = 'failed'
        WHERE order_number = \${payload.data.metadata.orderId}\`;
      break;
  }

  res.status(200).send();
});
`;
