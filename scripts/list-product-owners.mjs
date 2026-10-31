#!/usr/bin/env node
/**
 * list-product-owners.mjs — who owns each product?
 * sellerId null = platform catalog (added by prisma/seed.ts, no seller account)
 * otherwise shows the seller's email + shop.
 *
 * Usage:
 *   node scripts/with-env.mjs node scripts/list-product-owners.mjs
 */
import { loadProjectEnv } from './with-env.mjs';
import { PrismaClient } from '@prisma/client';

loadProjectEnv();
const db = new PrismaClient();

try {
  const products = await db.product.findMany({
    orderBy: { createdAt: 'asc' },
    select: {
      name: true, price: true, isActive: true, createdAt: true,
      seller: { select: { email: true, name: true, shopName: true, role: true } },
    },
  });

  const byOwner = new Map();
  for (const p of products) {
    const key = p.seller ? `${p.seller.email} (${p.seller.shopName ?? p.seller.name})` : 'PLATFORM CATALOG (seed)';
    if (!byOwner.has(key)) byOwner.set(key, []);
    byOwner.get(key).push(p);
  }

  console.log(`Total products: ${products.length}\n`);
  for (const [owner, items] of byOwner) {
    console.log(`── ${owner} — ${items.length} product(s)`);
    for (const p of items) {
      console.log(`   • ${p.name} | ₹${p.price} | ${p.isActive ? 'active' : 'inactive'} | added: ${p.createdAt.toISOString().slice(0, 10)}`);
    }
    console.log('');
  }
} finally {
  await db.$disconnect();
}
