/**
 * E2E API verification for developer account-management features.
 * Creates temp test users, verifies: stats accounts breakdown, users list
 * shop_name, password reset + re-login, block/unblock login denial,
 * banner full edit. Cleans up temp data afterwards.
 * Run: node scripts/with-env.mjs node scripts/test-account-mgmt.mjs
 */
const BASE = 'http://localhost:3000';
let cookie = '';

async function api(path, opts = {}) {
  const res = await fetch(BASE + path, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(cookie ? { cookie } : {}), ...(opts.headers || {}) },
  });
  const setCookie = res.headers.get('set-cookie');
  if (setCookie) cookie = setCookie.split(';')[0];
  let data = null;
  try { data = await res.json(); } catch {}
  return { status: res.status, data };
}

const results = [];
function check(name, ok, extra = '') {
  results.push(`${ok ? 'PASS' : 'FAIL'} ${name}${extra ? ` — ${extra}` : ''}`);
  if (!ok) process.exitCode = 1;
}

async function main() {
  // -- Setup: temp super_admin + temp customer (direct DB) --
  const { PrismaClient } = await import('@prisma/client');
  const db = new PrismaClient();
  const bcrypt = (await import('bcryptjs')).default;
  const ts = Date.now();
  const superEmail = `dev-test-${ts}@test.local`;
  const custEmail = `cust-test-${ts}@test.local`;
  await db.user.deleteMany({ where: { email: { in: [superEmail, custEmail] } } });
  const superUser = await db.user.create({ data: { email: superEmail, passwordHash: await bcrypt.hash('TestPass1!', 10), name: 'Dev Test', role: 'super_admin' } });
  let cust = await db.user.create({ data: { email: custEmail, passwordHash: await bcrypt.hash('CustPass1!', 10), name: 'Cust Test', role: 'customer' } });
  await db.$disconnect();

  cookie = '';
  // -- 1. Login as temp super_admin --
  let r = await api('/api/auth', { method: 'POST', body: JSON.stringify({ action: 'login', email: superEmail, password: 'TestPass1!' }) });
  check('temp super_admin login', r.status === 200 && r.data?.user?.role === 'super_admin');

  // -- 2. Stats: accounts breakdown --
  r = await api('/api/admin/stats');
  const acc = r.data?.stats?.accounts;
  check('stats accounts breakdown', r.status === 200 && acc && typeof acc.total === 'number' && typeof acc.merchants === 'number' && typeof acc.customers === 'number' && typeof acc.blocked === 'number',
    JSON.stringify(acc));

  // -- 3. Users list: shop_name present --
  r = await api('/api/admin/users');
  const owner = (r.data?.users || []).find((u) => u.email === 'admin@shopmitra.in');
  check('users list has shop_name', r.status === 200 && owner && owner.shop_name === 'Mitea' && owner.role === 'super_admin',
    owner ? `role=${owner.role} shop=${owner.shop_name}` : 'owner not found');

  // -- 4. Password reset on temp customer --
  r = await api(`/api/admin/users/${cust.id}`, { method: 'PATCH', body: JSON.stringify({ password: 'NewPass99$' }) });
  check('password reset 200', r.status === 200);

  // re-login with old password must fail, new must succeed
  cookie = '';
  r = await api('/api/auth', { method: 'POST', body: JSON.stringify({ action: 'login', email: custEmail, password: 'CustPass1!' }) });
  check('old password rejected', r.status === 401);
  r = await api('/api/auth', { method: 'POST', body: JSON.stringify({ action: 'login', email: custEmail, password: 'NewPass99$' }) });
  check('new password accepted', r.status === 200 && r.data?.user?.email === custEmail);
  cookie = '';

  // -- 5. Block → login denied; unblock → login ok --
  cookie = '';
  r = await api('/api/auth', { method: 'POST', body: JSON.stringify({ action: 'login', email: superEmail, password: 'TestPass1!' }) });
  check('re-login super_admin', r.status === 200);
  r = await api(`/api/admin/users/${cust.id}`, { method: 'PATCH', body: JSON.stringify({ is_active: false }) });
  check('block user', r.status === 200 && r.data?.user?.is_active === false);
  cookie = '';
  r = await api('/api/auth', { method: 'POST', body: JSON.stringify({ action: 'login', email: custEmail, password: 'NewPass99$' }) });
  check('blocked login denied 403', r.status === 403, `got ${r.status}`);
  cookie = '';
  await api('/api/auth', { method: 'POST', body: JSON.stringify({ action: 'login', email: superEmail, password: 'TestPass1!' }) });
  r = await api(`/api/admin/users/${cust.id}`, { method: 'PATCH', body: JSON.stringify({ is_active: true }) });
  check('unblock user', r.status === 200 && r.data?.user?.is_active === true);

  // -- 6. Role change: customer → admin (seller) --
  r = await api(`/api/admin/users/${cust.id}`, { method: 'PATCH', body: JSON.stringify({ role: 'admin' }) });
  check('role change to admin', r.status === 200 && r.data?.user?.role === 'admin');
  r = await api(`/api/admin/users/${cust.id}`, { method: 'PATCH', body: JSON.stringify({ role: 'customer' }) });
  check('role back to customer', r.status === 200 && r.data?.user?.role === 'customer');

  // -- 7. Banner full edit --
  const banners = (await api('/api/banners')).data?.banners || [];
  const b = banners[0];
  check('banners exist', banners.length > 0);
  if (b) {
    const newTitle = `${b.title} EDITED`;
    r = await api(`/api/banners/${b.id}`, { method: 'PATCH', body: JSON.stringify({ title: newTitle, subtitle: 'E2E subtitle', background_color: 'from-rose-500 to-pink-600' }) });
    check('banner edit', r.status === 200 && r.data?.banner?.title === newTitle && r.data?.banner?.subtitle === 'E2E subtitle');
    // revert
    r = await api(`/api/banners/${b.id}`, { method: 'PATCH', body: JSON.stringify({ title: b.title, subtitle: b.subtitle || '', background_color: b.background_color || 'from-indigo-600 to-purple-600' }) });
    check('banner revert', r.status === 200 && r.data?.banner?.title === b.title);
  }

  // -- 8. Non-super (seller) cannot reset password --
  const { PrismaClient: PC } = await import('@prisma/client');
  const db2 = new PC();
  const seller = await db2.user.create({ data: { email: `seller-test-${ts}@test.local`, passwordHash: await bcrypt.hash('SellPass1!', 10), name: 'Seller Test', role: 'admin', shopName: 'Test Shop' } });
  await db2.$disconnect();
  cookie = '';
  await api('/api/auth', { method: 'POST', body: JSON.stringify({ action: 'login', email: seller.email, password: 'SellPass1!' }) });
  r = await api(`/api/admin/users/${cust.id}`, { method: 'PATCH', body: JSON.stringify({ password: 'Hacked123!' }) });
  check('seller password-reset forbidden 403', r.status === 403, `got ${r.status}`);
  r = await api(`/api/admin/users/${cust.id}`, { method: 'PATCH', body: JSON.stringify({ is_active: false }) });
  check('seller CAN block customer (by design)', r.status === 200);
  // restore
  cookie = '';
  await api('/api/auth', { method: 'POST', body: JSON.stringify({ action: 'login', email: superEmail, password: 'TestPass1!' }) });
  await api(`/api/admin/users/${cust.id}`, { method: 'PATCH', body: JSON.stringify({ is_active: true }) });

  // -- Cleanup temp users --
  const db3 = new (await import('@prisma/client')).PrismaClient();
  await db3.user.deleteMany({ where: { email: { in: [superEmail, custEmail, seller.email] } } });
  const remaining = await db3.user.findMany({ select: { email: true, role: true } });
  console.log('REMAINING USERS:', JSON.stringify(remaining));
  await db3.$disconnect();

  console.log(results.join('\n'));
}

main().catch((e) => { console.error('E2E ERROR:', e); process.exit(1); });
