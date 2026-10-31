import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { serializeOrder, serializeProduct } from '@/lib/serialize';

// GET /api/admin/stats — dashboard overview (admin only).
// Sellers see their own shop's numbers: orders containing their products,
// revenue from their items, their products. super_admin sees the platform.
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  try {
    const isSuper = admin.role === 'super_admin';
    const orderWhere = isSuper ? {} : { items: { some: { product: { sellerId: admin.id } } } };
    const productWhere = isSuper ? { isActive: true } : { isActive: true, sellerId: admin.id };

    const [orders, customerCount, productCount, lowStockProducts] = await Promise.all([
      db.order.findMany({ where: orderWhere, include: { items: true }, orderBy: { createdAt: 'desc' } }),
      db.user.count({ where: { role: 'customer' } }),
      db.product.count({ where: productWhere }),
      db.product.findMany({ where: { ...productWhere, stock: { lt: 20 } }, orderBy: { stock: 'asc' }, take: 12 }),
    ]);

    // Sellers earn from their own items only (an order can mix multiple sellers).
    const totalRevenue = isSuper
      ? orders.reduce((s, o) => s + Number(o.total || 0), 0)
      : (await db.orderItem.aggregate({
          _sum: { totalPrice: true },
          where: { product: { sellerId: admin.id } },
        }))._sum.totalPrice ?? 0;

    // Distinct buyers of this seller's products (sellers don't get the full customer count).
    const totalCustomers = isSuper
      ? customerCount
      : new Set(orders.map((o) => o.userId).filter(Boolean)).size;

    // Super admin gets the full account breakdown: every account on the platform,
    // how many are merchants (sellers), customers, and disabled/blocked.
    let accounts;
    if (isSuper) {
      const [total, merchants, customers, blocked] = await Promise.all([
        db.user.count(),
        db.user.count({ where: { role: 'admin' } }),
        db.user.count({ where: { role: 'customer' } }),
        db.user.count({ where: { isActive: false } }),
      ]);
      accounts = { total, merchants, customers, blocked };
    }

    return NextResponse.json({
      stats: {
        totalRevenue,
        totalOrders: orders.length,
        totalCustomers,
        totalProducts: productCount,
        lowStock: lowStockProducts.map(serializeProduct),
        recentOrders: orders.slice(0, 5).map(serializeOrder),
        ...(accounts ? { accounts } : {}),
      },
    });
  } catch (error) {
    console.error('admin stats error:', error);
    return NextResponse.json({ error: 'Failed to load stats' }, { status: 500 });
  }
}
