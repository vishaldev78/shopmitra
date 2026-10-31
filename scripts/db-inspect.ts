import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
async function main() {
  console.log('users:', JSON.stringify(await p.user.findMany({ select: { email: true, role: true, shopName: true } }), null, 1));
  console.log('orders:', await p.order.count());
  console.log('products:', await p.product.count());
}
main().finally(() => p.$disconnect());
