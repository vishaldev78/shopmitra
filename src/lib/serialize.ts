import type { Product, Order, Banner, Category, OrderItem, AdminUserRow, ShippingAddress, SavedAddress } from '@/lib/types';

type AnyRecord = Record<string, unknown>;

export function serializeProduct(p: AnyRecord & { category?: { name: string } | null }): Product {
  return {
    id: p.id as string,
    name: p.name as string,
    slug: p.slug as string,
    description: (p.description as string) ?? null,
    short_description: (p.shortDescription as string) ?? null,
    price: Number(p.price),
    compare_price: p.comparePrice != null ? Number(p.comparePrice) : null,
    images: safeParseArray(p.images as string),
    category_id: (p.categoryId as string) ?? null,
    category_name: p.category?.name,
    brand: (p.brand as string) ?? null,
    sku: (p.sku as string) ?? null,
    stock: Number(p.stock ?? 0),
    rating: Number(p.rating ?? 0),
    review_count: Number(p.reviewCount ?? 0),
    is_featured: Boolean(p.isFeatured),
    is_active: Boolean(p.isActive),
    tags: safeParseArray(p.tags as string),
    specifications: safeParseObject(p.specifications as string),
    created_at: (p.createdAt as Date).toISOString(),
  };
}

export function serializeOrder(o: AnyRecord & { items?: AnyRecord[] }): Order {
  return {
    id: o.id as string,
    order_number: o.orderNumber as string,
    user_id: (o.userId as string) ?? null,
    items: (o.items ?? []).map(
      (i): OrderItem => ({
        product_id: (i.productId as string) ?? null,
        product_name: i.productName as string,
        product_image: (i.productImage as string) ?? null,
        quantity: Number(i.quantity),
        unit_price: Number(i.unitPrice),
        total_price: Number(i.totalPrice),
      })
    ),
    subtotal: Number(o.subtotal),
    discount: Number(o.discount),
    shipping: Number(o.shipping),
    tax: Number(o.tax),
    total: Number(o.total),
    status: o.status as string,
    payment_status: o.paymentStatus as string,
    payment_method: o.paymentMethod as string,
    payment_id: (o.paymentId as string) ?? null,
    coupon_code: (o.couponCode as string) ?? null,
    shipping_address: safeParseObject(o.shippingAddress as string) as unknown as ShippingAddress,
    created_at: (o.createdAt as Date).toISOString(),
  };
}

export function serializeBanner(b: AnyRecord): Banner {
  return {
    id: b.id as string,
    title: b.title as string,
    subtitle: (b.subtitle as string) ?? null,
    cta_text: (b.ctaText as string) ?? null,
    cta_link: (b.ctaLink as string) ?? null,
    image_url: (b.imageUrl as string) ?? null,
    background_color: (b.backgroundColor as string) ?? null,
    is_active: Boolean(b.isActive),
    sort_order: Number(b.sortOrder ?? 0),
  };
}

export function serializeCategory(c: AnyRecord): Category {
  return {
    id: c.id as string,
    name: c.name as string,
    slug: c.slug as string,
    sort_order: Number(c.sortOrder ?? 0),
    is_active: Boolean(c.isActive),
  };
}

export function serializeUserRow(u: AnyRecord & { _count?: { orders?: number } }): AdminUserRow {
  return {
    id: u.id as string,
    name: u.name as string,
    email: u.email as string,
    role: u.role as string,
    is_active: Boolean(u.isActive),
    created_at: (u.createdAt as Date).toISOString(),
    order_count: Number(u._count?.orders ?? 0),
  };
}

export function serializeAddress(a: AnyRecord): SavedAddress {
  return {
    id: a.id as string,
    label: (a.label as string) || 'Home',
    fullName: a.fullName as string,
    phone: a.phone as string,
    addressLine1: a.addressLine1 as string,
    addressLine2: (a.addressLine2 as string) || '',
    city: a.city as string,
    state: a.state as string,
    postalCode: a.postalCode as string,
    country: (a.country as string) || 'India',
    isDefault: Boolean(a.isDefault),
  };
}

function safeParseArray(value?: string | null): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function safeParseObject(value?: string | null): Record<string, string> {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}
