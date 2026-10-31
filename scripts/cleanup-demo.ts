/**
 * Removes all demo accounts (and their demo orders/addresses) from the database.
 * Every real user now registers their own account via /register (Shopper or Seller).
 * Run: node scripts/with-env.mjs tsx scripts/cleanup-demo.ts
 */
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

const DEMO_EMAILS = ['admin@shopmitra.in', 'demo@shopmitra.in', 'customer@shopmitra.in'];

async function main() {
  const users = await db.user.findMany({
    where: { email: { in: DEMO_EMAILS } },
    select: { id: true, email: true },
  });

  if (users.length === 0) {
    console.log('✅ No demo accounts found — nothing to clean');
    return;
  }

  const ids = users.map((u) => u.id);

  // Demo users' orders (incl. items via cascade) and addresses are demo data too.
  const orders = await db.order.deleteMany({ where: { userId: { in: ids } } });
  const removedUsers = await db.user.deleteMany({ where: { id: { in: ids } } });

  console.log(`🧹 Removed ${removedUsers.count} demo account(s) (${users.map((u) => u.email).join(', ')})`);
  console.log(`🧹 Removed ${orders.count} demo order(s)`);
}

main()
  .catch((e) => {
    console.error('cleanup failed:', e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
