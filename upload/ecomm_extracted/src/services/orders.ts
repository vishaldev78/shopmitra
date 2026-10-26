import { sql } from '../db/connection';
import { type AuthUser, isAdmin } from './auth';

export interface Order {
  id: string;
  order_number: string;
  user_id: string | null;
  guest_email: string | null;
  subtotal: number;
  discount: number;
  shipping: number;
  tax: number;
  total: number;
  status: string;
  payment_status: string;
  payment_method: string | null;
  payment_id: string | null;
  shipping_address: any;
  billing_address: any;
  tracking_number: string | null;
  notes: string | null;
  items: OrderItem[];
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  product_id: string | null;
  product_name: string;
  product_image: string | null;
  variant_name: string | null;
  variant_value: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
}

function generateOrderNumber(): string {
  return 'SV-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
}

// Create order
export async function createOrder(data: {
  user_id?: string;
  guest_email?: string;
  items: Array<{
    product_id: string;
    product_name: string;
    product_image?: string;
    variant_name?: string;
    variant_value?: string;
    quantity: number;
    unit_price: number;
  }>;
  subtotal: number;
  discount: number;
  shipping: number;
  tax: number;
  total: number;
  payment_method: string;
  payment_id?: string;
  shipping_address: any;
  billing_address?: any;
  notes?: string;
}): Promise<{ success: boolean; order?: Order; error?: string }> {
  try {
    const orderNumber = generateOrderNumber();

    // Check stock availability
    for (const item of data.items) {
      const product = await sql`SELECT stock FROM products WHERE id = ${item.product_id}`;
      if (product.length === 0) {
        return { success: false, error: `Product not found: ${item.product_name}` };
      }
      if (Number(product[0].stock) < item.quantity) {
        return { success: false, error: `Insufficient stock for: ${item.product_name}` };
      }
    }

    // Create order
    const orderResult = await sql`
      INSERT INTO orders (order_number, user_id, guest_email, subtotal, discount, shipping, tax, total, status, payment_status, payment_method, payment_id, shipping_address, billing_address, notes)
      VALUES (
        ${orderNumber},
        ${data.user_id || null},
        ${data.guest_email || null},
        ${data.subtotal},
        ${data.discount},
        ${data.shipping},
        ${data.tax},
        ${data.total},
        'pending',
        ${data.payment_method === 'cod' ? 'pending' : 'paid'},
        ${data.payment_method},
        ${data.payment_id || null},
        ${JSON.stringify(data.shipping_address)}::jsonb,
        ${data.billing_address ? JSON.stringify(data.billing_address) : null}::jsonb,
        ${data.notes || null}
      )
      RETURNING *
    `;

    const orderId = orderResult[0].id;

    // Create order items
    for (const item of data.items) {
      await sql`
        INSERT INTO order_items (order_id, product_id, product_name, product_image, variant_name, variant_value, quantity, unit_price, total_price)
        VALUES (
          ${orderId},
          ${item.product_id},
          ${item.product_name},
          ${item.product_image || null},
          ${item.variant_name || null},
          ${item.variant_value || null},
          ${item.quantity},
          ${item.unit_price},
          ${item.unit_price * item.quantity}
        )
      `;

      // Decrement stock
      await sql`UPDATE products SET stock = stock - ${item.quantity} WHERE id = ${item.product_id}`;
    }

    // Get order items
    const items = await sql`SELECT * FROM order_items WHERE order_id = ${orderId}`;

    const order: Order = {
      ...(orderResult[0] as any),
      subtotal: Number(orderResult[0].subtotal),
      discount: Number(orderResult[0].discount),
      shipping: Number(orderResult[0].shipping),
      tax: Number(orderResult[0].tax),
      total: Number(orderResult[0].total),
      items: items.map((i: any) => ({
        ...i,
        unit_price: Number(i.unit_price),
        total_price: Number(i.total_price),
      })),
    };

    return { success: true, order };
  } catch (error: any) {
    console.error('Create order error:', error);
    return { success: false, error: error.message || 'Failed to create order' };
  }
}

// Get user orders
export async function getUserOrders(userId: string): Promise<Order[]> {
  try {
    const orders = await sql`
      SELECT * FROM orders WHERE user_id = ${userId} ORDER BY created_at DESC
    `;

    const ordersWithItems = await Promise.all(
      orders.map(async (o: any) => {
        const items = await sql`SELECT * FROM order_items WHERE order_id = ${o.id}`;
        return {
          ...o,
          subtotal: Number(o.subtotal),
          discount: Number(o.discount),
          shipping: Number(o.shipping),
          tax: Number(o.tax),
          total: Number(o.total),
          items: items.map((i: any) => ({
            ...i,
            unit_price: Number(i.unit_price),
            total_price: Number(i.total_price),
          })),
        };
      })
    );

    return ordersWithItems;
  } catch (error) {
    return [];
  }
}

// Get all orders (admin)
export async function getAllOrders(user: AuthUser): Promise<Order[]> {
  if (!isAdmin(user)) return [];

  try {
    const orders = await sql`
      SELECT o.*, u.name as customer_name, u.email as customer_email
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      ORDER BY o.created_at DESC
      LIMIT 100
    `;

    return orders.map((o: any): Order => ({
      id: o.id,
      order_number: o.order_number,
      user_id: o.user_id,
      guest_email: o.guest_email,
      subtotal: Number(o.subtotal),
      discount: Number(o.discount),
      shipping: Number(o.shipping),
      tax: Number(o.tax),
      total: Number(o.total),
      status: o.status,
      payment_status: o.payment_status,
      payment_method: o.payment_method,
      payment_id: o.payment_id,
      shipping_address: o.shipping_address,
      billing_address: o.billing_address,
      tracking_number: o.tracking_number,
      notes: o.notes,
      items: [],
      created_at: o.created_at,
      updated_at: o.updated_at,
    }));
  } catch (error) {
    return [];
  }
}

// Update order status (admin)
export async function updateOrderStatus(user: AuthUser, orderId: string, status: string): Promise<{ success: boolean; error?: string }> {
  if (!isAdmin(user)) {
    return { success: false, error: 'Unauthorized' };
  }

  try {
    await sql`UPDATE orders SET status = ${status}, updated_at = NOW() WHERE id = ${orderId}`;

    await sql`
      INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
      VALUES (${user.id}, 'update_order_status', 'order', ${orderId}, ${JSON.stringify({ status })}::jsonb)
    `;

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Cancel order
export async function cancelOrder(orderId: string, userId?: string): Promise<{ success: boolean; error?: string }> {
  try {
    const order = await sql`SELECT * FROM orders WHERE id = ${orderId}`;
    if (order.length === 0) return { success: false, error: 'Order not found' };

    if (order[0].status === 'delivered' || order[0].status === 'cancelled') {
      return { success: false, error: 'Cannot cancel this order' };
    }

    // Restore stock
    const items = await sql`SELECT * FROM order_items WHERE order_id = ${orderId}`;
    for (const item of items) {
      if (item.product_id) {
        await sql`UPDATE products SET stock = stock + ${item.quantity} WHERE id = ${item.product_id}`;
      }
    }

    await sql`UPDATE orders SET status = 'cancelled', updated_at = NOW() WHERE id = ${orderId}`;
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Get order by number
export async function getOrderByNumber(orderNumber: string): Promise<Order | null> {
  try {
    const result = await sql`SELECT * FROM orders WHERE order_number = ${orderNumber}`;
    if (result.length === 0) return null;

    const items = await sql`SELECT * FROM order_items WHERE order_id = ${result[0].id}`;
    return {
      ...(result[0] as any),
      subtotal: Number(result[0].subtotal),
      discount: Number(result[0].discount),
      shipping: Number(result[0].shipping),
      tax: Number(result[0].tax),
      total: Number(result[0].total),
      items: items.map((i: any) => ({
        ...i,
        unit_price: Number(i.unit_price),
        total_price: Number(i.total_price),
      })),
    };
  } catch (error) {
    return null;
  }
}

// Get dashboard stats
export async function getDashboardStats() {
  try {
    const totalRevenue = await sql`SELECT COALESCE(SUM(total), 0) as total FROM orders WHERE payment_status = 'paid'`;
    const totalOrders = await sql`SELECT COUNT(*) as count FROM orders`;
    const totalCustomers = await sql`SELECT COUNT(*) as count FROM users WHERE role = 'customer'`;
    const totalProducts = await sql`SELECT COUNT(*) as count FROM products WHERE is_active = true`;
    const pendingOrders = await sql`SELECT COUNT(*) as count FROM orders WHERE status = 'pending'`;
    const lowStock = await sql`SELECT * FROM products WHERE stock < 20 AND is_active = true ORDER BY stock ASC LIMIT 10`;

    return {
      totalRevenue: Number(totalRevenue[0].total),
      totalOrders: Number(totalOrders[0].count),
      totalCustomers: Number(totalCustomers[0].count),
      totalProducts: Number(totalProducts[0].count),
      pendingOrders: Number(pendingOrders[0].count),
      lowStockProducts: lowStock,
    };
  } catch (error) {
    return {
      totalRevenue: 0,
      totalOrders: 0,
      totalCustomers: 0,
      totalProducts: 0,
      pendingOrders: 0,
      lowStockProducts: [],
    };
  }
}
