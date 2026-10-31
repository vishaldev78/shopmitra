/**
 * E2E test for the professional Dodo payment flow (real checkout + webhooks):
 * 1. Login (demo user) → create dodo order
 * 2. Checkout → auto-syncs products to Dodo → REAL hosted checkout session
 * 3. Confirm on unpaid session → state=pending, order stays pending (server-side verification)
 * 4. Webhook (valid signature) finalizes a fresh order → paid + stock decrement
 * 5. Webhook bad/missing signature → 401
 * 6. Anonymous cannot confirm another user's pending order → 403
 *
 * Requires dev server with DODO_PAYMENTS_* env (see .env) and write-scoped key.
 */
import crypto from 'crypto';

const BASE = 'http://localhost:3000';

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

async function stockOf(productId) {
  const list = await api('/api/products');
  return list.data.products.find((p) => p.id === productId).stock;
}

async function main() {
  const results = [];
  const check = (name, cond, extra = '') => {
    results.push(`${cond ? 'PASS' : 'FAIL'} - ${name}${extra ? ' | ' + extra : ''}`);
    if (!cond) process.exitCode = 1;
  };

  // 1. Login + product
  const login = await api('/api/auth', { method: 'POST', body: { action: 'login', email: 'demo@shopmitra.in', password: 'demo123' } });
  check('login', login.status === 200 && login.data?.user?.email === 'demo@shopmitra.in');
  const products = await api('/api/products');
  const product = products.data.products.find((p) => p.stock > 3 && p.is_active);
  check('products available', Boolean(product), product?.name);
  const initialStock = product.stock;

  // 2. Order A → checkout → REAL Dodo session (auto product sync)
  const orderA = await api('/api/orders', { method: 'POST', body: { items: [{ productId: product.id, quantity: 1 }], shipping_address: ADDRESS, payment_method: 'dodo' } });
  check('order A created (dodo, pending)', orderA.status === 201 && orderA.data.order.payment_status === 'pending', orderA.data.order?.order_number);
  const orderNumberA = orderA.data.order.order_number;

  const checkout = await api('/api/payments/checkout', { method: 'POST', body: { order_number: orderNumberA, amount: orderA.data.order.total, currency: 'INR' } });
  const isRealDodo = checkout.data.provider === 'dodo' && /dodopayments\.com/.test(checkout.data.checkout_url || '');
  check('real Dodo hosted checkout created', checkout.status === 200 && checkout.data.success && isRealDodo, checkout.data.checkout_url || '');
  console.log('   checkout_url:', checkout.data.checkout_url);
  console.log('   notice:', checkout.data.notice || '(none)');

  // 3. Confirm on unpaid session → server-side verification → pending
  const confirmPending = await api('/api/payments/confirm', { method: 'POST', body: { order_number: orderNumberA, payment_id: null, status: 'succeeded' } });
  check('unpaid session confirm stays pending (server-verified)', confirmPending.status === 200 && confirmPending.data.state === 'pending' && confirmPending.data.verified === true, JSON.stringify({ state: confirmPending.data.state, verified: confirmPending.data.verified }));
  check('pending order does not decrement stock', (await stockOf(product.id)) === initialStock);

  // 4. Webhook finalizes a fresh order B (valid signature)
  const orderB = await api('/api/orders', { method: 'POST', body: { items: [{ productId: product.id, quantity: 1 }], shipping_address: ADDRESS, payment_method: 'dodo' } });
  check('order B created', orderB.status === 201, orderB.data.order?.order_number);
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
  check('webhook marked order B paid', whValidData.order?.payment_status === 'paid' && whValidData.order?.payment_id === 'pay_webhook_test', whValidData.order?.order_number);
  check('webhook decremented stock once', (await stockOf(product.id)) === initialStock - 1, `${initialStock} -> ${await stockOf(product.id)}`);

  // 5. Webhook rejects bad / missing signatures
  const whInvalid = await fetch(BASE + '/api/payments/webhook', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'webhook-id': whId, 'webhook-timestamp': whTs, 'webhook-signature': 'v1,AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=' },
    body: payload,
  });
  check('webhook bad signature rejected 401', whInvalid.status === 401);
  const whNoSig = await fetch(BASE + '/api/payments/webhook', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload });
  check('webhook missing headers rejected 401', whNoSig.status === 401);

  // 6. Anonymous cannot confirm pending order A
  const savedCookie = cookie;
  cookie = '';
  const anon = await api('/api/payments/confirm', { method: 'POST', body: { order_number: orderNumberA, payment_id: 'pay_x', status: 'succeeded' } });
  check('anonymous confirm blocked', [401, 403].includes(anon.status), `status=${anon.status}`);
  cookie = savedCookie;

  // 7. COD order still works end-to-end (regression check)
  const codOrder = await api('/api/orders', { method: 'POST', body: { items: [{ productId: product.id, quantity: 1 }], shipping_address: ADDRESS, payment_method: 'cod' } });
  check('COD order confirmed immediately', codOrder.status === 201 && codOrder.data.order.payment_status === 'pending' && codOrder.data.order.status === 'confirmed');

  console.log('\n=== RESULTS ===');
  results.forEach((r) => console.log(r));
}

main().catch((e) => {
  console.error('TEST CRASH:', e);
  process.exit(1);
});
