/**
 * Cleanup script: removes test orders/user created during API verification
 * and restores product stock.
 */
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function main() {
  const testOrders = await db.order.findMany({
    where: {
      OR: [
        { shippingAddress: { contains: 'Test User' } },
        { shippingAddress: { contains: 'COD User' } },
        { orderNumber: { in: ['SM-MVPIDN5M-S2RH', 'SM-MVPIEU56-N27I'] } },
      ],
    },
  });

  for (const order of testOrders) {
    for (const item of await db.orderItem.findMany({ where: { orderId: order.id } })) {
      if (item.productId) {
        await db.product.update({ where: { id: item.productId }, data: { stock: { increment: item.quantity } } });
      }
    }
    await db.order.delete({ where: { id: order.id } });
    console.log('deleted order', order.orderNumber);
  }

  const u = await db.user.findUnique({ where: { email: 'newuser@test.com' } });
  if (u) {
    await db.user.delete({ where: { id: u.id } });
    console.log('deleted test user');
  }

  console.log('✅ cleanup done');
}

main().finally(() => db.$disconnect());
