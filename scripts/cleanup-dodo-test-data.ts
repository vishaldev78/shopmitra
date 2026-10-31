/**
 * Final cleanup for Dodo payment integration testing.
 * Deletes only agent-created test orders and restores their stock.
 * Keeps the user's own orders (Vishal Kumar / real customer names).
 */
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function main() {
  // Agent-created test orders only
  const testOrders = await db.order.findMany({
    where: {
      OR: [
        { shippingAddress: { contains: 'Debug User' } },
        { shippingAddress: { contains: 'Real Dodo Test' } },
        { shippingAddress: { contains: 'Demo Customer' } },
        { shippingAddress: { contains: 'Test User' } },
        { shippingAddress: { contains: 'COD User' } },
      ],
    },
    include: { items: true },
  });

  for (const order of testOrders) {
    // Restore stock only for orders whose stock was actually decremented (paid)
    if (order.paymentStatus === 'paid') {
      for (const item of order.items) {
        if (item.productId) {
          await db.product.update({ where: { id: item.productId }, data: { stock: { increment: item.quantity } } });
        }
      }
    }
    await db.order.delete({ where: { id: order.id } });
    console.log('deleted', order.orderNumber, `(${order.paymentStatus}${order.paymentStatus === 'paid' ? ', stock restored' : ''})`);
  }

  console.log('✅ cleanup done');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
