#!/usr/bin/env node
/**
 * list-users.mjs — dump all registered accounts (email, role, shop, status).
 * Passwords are bcrypt hashes and are never printed — only resettable.
 *
 * Usage:
 *   node scripts/with-env.mjs node scripts/list-users.mjs
 */
import { loadProjectEnv } from './with-env.mjs';
import { PrismaClient } from '@prisma/client';

loadProjectEnv();
const db = new PrismaClient();

try {
  const users = await db.user.findMany({
    orderBy: { createdAt: 'asc' },
    select: {
      email: true, name: true, role: true, shopName: true,
      isActive: true, createdAt: true,
      _count: { select: { products: true, orders: true, addresses: true } },
    },
  });

  console.log(`Total accounts: ${users.length}\n`);
  for (const u of users) {
    const status = u.isActive ? 'active' : 'BLOCKED';
    console.log(`• ${u.email}`);
    console.log(`  name: ${u.name} | role: ${u.role} | shop: ${u.shopName ?? '—'} | ${status} | joined: ${u.createdAt.toISOString().slice(0, 10)}`);
    console.log(`  products: ${u._count.products} | orders: ${u._count.orders} | addresses: ${u._count.addresses}`);
  }
} finally {
  await db.$disconnect();
}
