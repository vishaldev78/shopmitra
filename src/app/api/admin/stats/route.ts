import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { serializeOrder, serializeProduct } from '@/lib/serialize';

// GET /api/admin/stats — dashboard overview (admin only)
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  try {
    const [orders, customerCount, productCount, lowStockProducts] = await Promise.all([
      db.order.findMany({ include: { items: true }, orderBy: { createdAt: 'desc' } }),
      db.user.count({ where: { role: 'customer' } }),
      db.product.count({ where: { isActive: true } }),
      db.product.findMany({ where: { isActive: true, stock: { lt: 20 } }, orderBy: { stock: 'asc' }, take: 12 }),
    ]);

    return NextResponse.json({
      stats: {
        totalRevenue: orders.reduce((s, o) => s + Number(o.total || 0), 0),
        totalOrders: orders.length,
        totalCustomers: customerCount,
        totalProducts: productCount,
        lowStock: lowStockProducts.map(serializeProduct),
        recentOrders: orders.slice(0, 5).map(serializeOrder),
      },
    });
  } catch (error) {
    console.error('admin stats error:', error);
    return NextResponse.json({ error: 'Failed to load stats' }, { status: 500 });
  }
}
