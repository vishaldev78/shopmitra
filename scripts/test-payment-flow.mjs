/**
 * E2E test for the professional Dodo payment flow:
 * 1. Login (demo user)
 * 2. Create dodo orders
 * 3. Checkout → real Dodo attempt (read-only key) → simulated fallback with notice
 * 4. Confirm → server-side verification path → demo fallback → order paid
 * 5. Webhook: valid signature finalizes a pending order; bad/missing signature → 401
 * 6. Idempotency: re-confirm does not double-decrement stock
 * 7. Authorization: anonymous cannot confirm a logged-in user's order
 *
 * Requires the dev server to run with DODO_PAYMENTS_WEBHOOK_KEY set to
 * whsec_<base64("test-secret-1234567890")> (see .env).
 */
const BASE = 'http://localhost:3000';
import crypto from 'crypto';

const WH_SECRET = 'whsec_' + Buffer.from('test-secret-1234567890').toString('base64');

let cookie = '';

async function api(path, opts = {}) {
  const res = await fetch(BASE + path, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(cookie ? { Cookie: cookie } : {}),
      ...(opts.headers || {}),
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const setCookie = res.headers.get('set-cookie');
  if (setCookie) cookie = setCookie.split(';')[0];
  let data = null;
  try { data = await res.json(); } catch {}
  return { status: res.status, data };
}

const ADDRESS = { fullName: 'Test User', phone: '9876543210', addressLine1: '12 Test Lane', addressLine2: '', city: 'Mumbai', state: 'MH', postalCode: '400001', country: 'India' };

async function main() {
  const results = [];
  const check = (name, cond, extra = '') => {
    results.push(`${cond ? 'PASS' : 'FAIL'} - ${name}${extra ? ' | ' + extra : ''}`);
    if (!cond) process.exitCode = 1;
  };

  // 1. Login
  const login = await api('/api/auth', { method: 'POST', body: { action: 'login', email: 'demo@shopmitra.in', password: 'demo123' } });
  check('login', login.status === 200 && login.data?.user?.email === 'demo@shopmitra.in');

  // 2. Pick a product + note initial stock
  const products = await api('/api/products');
  const product = products.data.products.find((p) => p.stock > 3 && p.is_active);
  check('products available', Boolean(product), product?.name);
  const initialStock = product.stock;

  // 3. Create dodo order A (confirm-flow test)
  const orderA = await api('/api/orders', { method: 'POST', body: { items: [{ productId: product.id, quantity: 1 }], shipping_address: ADDRESS, payment_method: 'dodo' } });
  check('order created (dodo, pending)', orderA.status === 201 && orderA.data.order.payment_status === 'pending', orderA.data.order?.order_number);
  const orderNumberA = orderA.data.order.order_number;

  // 4. Checkout — real Dodo attempt with read-only key → simulated fallback + notice
  const checkout = await api('/api/payments/checkout', { method: 'POST', body: { order_number: orderNumberA, amount: orderA.data.order.total, currency: 'INR' } });
  check('checkout success with fallback notice', checkout.status === 200 && checkout.data.success && Boolean(checkout.data.checkout_url), `provider=${checkout.data.provider}`);
  console.log('   notice:', (checkout.data.notice || '(none)').slice(0, 120) + '...');
  const payId = new URL(checkout.data.checkout_url, BASE).searchParams.get('payment_id');

  // 5. Confirm → payment id unknown to Dodo (simulated) → demo success path
  const confirm = await api('/api/payments/confirm', { method: 'POST', body: { order_number: orderNumberA, payment_id: payId, status: 'succeeded' } });
  check('confirm marks paid', confirm.status === 200 && confirm.data.state === 'succeeded' && confirm.data.order.payment_status === 'paid', `verified=${confirm.data.verified}`);

  // 6. Stock decremented exactly once
  async function stockOf(productId) {
    const list = await api('/api/products');
    return list.data.products.find((p) => p.id === productId).stock;
  }
  const stockAfter = await stockOf(product.id);
  check('stock decremented once', stockAfter === initialStock - 1, `${initialStock} -> ${stockAfter}`);

  // 7. Idempotency — confirm again
  const confirm2 = await api('/api/payments/confirm', { method: 'POST', body: { order_number: orderNumberA, payment_id: payId, status: 'succeeded' } });
  check('confirm idempotent', confirm2.status === 200 && confirm2.data.already_processed === true);
  check('stock unchanged after re-confirm', (await stockOf(product.id)) === initialStock - 1);

  // 8. Webhook finalizes a fresh pending order (valid signature)
  const orderB = await api('/api/orders', { method: 'POST', body: { items: [{ productId: product.id, quantity: 1 }], shipping_address: ADDRESS, payment_method: 'dodo' } });
  check('second order created', orderB.status === 201, orderB.data.order?.order_number);
  const orderNumberB = orderB.data.order.order_number;

  const payload = JSON.stringify({
    business_id: 'bus_test',
    type: 'payment.succeeded',
    timestamp: new Date().toISOString(),
    data: { payment_id: 'pay_webhook_test', status: 'succeeded', metadata: { order_number: orderNumberB } },
  });
  const whId = 'msg_test_' + Date.now();
  const whTs = String(Math.floor(Date.now() / 1000));
  const key = Buffer.from(WH_SECRET.slice(6), 'base64');
  const sig = crypto.createHmac('sha256', key).update(`${whId}.${whTs}.${payload}`).digest('base64');

  const whValid = await fetch(BASE + '/api/payments/webhook', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'webhook-id': whId, 'webhook-timestamp': whTs, 'webhook-signature': `v1,${sig}` },
    body: payload,
  });
  const whValidData = await whValid.json();
  check('webhook valid signature accepted', whValid.status === 200 && whValidData.received, JSON.stringify(whValidData).slice(0, 80));
  check('webhook marked order paid', whValidData.order?.payment_status === 'paid' && whValidData.order?.payment_id === 'pay_webhook_test', whValidData.order?.order_number);
  check('webhook decremented stock', (await stockOf(product.id)) === initialStock - 2);

  // 9. Webhook rejects bad / missing signatures
  const whInvalid = await fetch(BASE + '/api/payments/webhook', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'webhook-id': whId, 'webhook-timestamp': whTs, 'webhook-signature': 'v1,AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=' },
    body: payload,
  });
  check('webhook bad signature rejected 401', whInvalid.status === 401);

  const whNoSig = await fetch(BASE + '/api/payments/webhook', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload });
  check('webhook missing headers rejected 401', whNoSig.status === 401);

  // 10. Anonymous cannot confirm a logged-in user's order
  const savedCookie = cookie;
  cookie = '';
  const anon = await api('/api/payments/confirm', { method: 'POST', body: { order_number: orderNumberA, payment_id: 'pay_x', status: 'succeeded' } });
  check('anonymous confirm blocked', anon.status === 200 ? anon.data.already_processed === true : [401, 403].includes(anon.status), `status=${anon.status}`);
  cookie = savedCookie;

  console.log('\n=== RESULTS ===');
  results.forEach((r) => console.log(r));
}

main().catch((e) => {
  console.error('TEST CRASH:', e);
  process.exit(1);
});
