import { db } from '@/lib/db';

// ---- Types shared between client and server ----

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  short_description: string | null;
  price: number;
  compare_price: number | null;
  images: string[];
  category_id: string | null;
  category_name?: string;
  brand: string | null;
  sku: string | null;
  stock: number;
  rating: number;
  review_count: number;
  is_featured: boolean;
  is_active: boolean;
  tags: string[];
  specifications: Record<string, string>;
  seller?: { name: string; shopName: string | null } | null;
  created_at: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: 'customer' | 'admin' | 'super_admin';
  is_active: boolean;
}

export interface OrderItem {
  product_id: string | null;
  product_name: string;
  product_image?: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface Order {
  id: string;
  order_number: string;
  user_id: string | null;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  shipping: number;
  tax: number;
  total: number;
  status: string;
  payment_status: string;
  payment_method: string;
  payment_id?: string | null;
  coupon_code?: string | null;
  shipping_address: ShippingAddress;
  created_at: string;
}

export interface ShippingAddress {
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country?: string;
}

export interface Banner {
  id: string;
  title: string;
  subtitle: string | null;
  cta_text: string | null;
  cta_link: string | null;
  image_url: string | null;
  background_color: string | null;
  is_active: boolean;
  sort_order: number;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
  is_active: boolean;
}

export interface AdminUserRow {
  id: string;
  name: string;
  email: string;
  role: string;
  shop_name: string | null;
  is_active: boolean;
  created_at: string;
  order_count: number;
}

/** Saved delivery address — mirrors ShippingAddress fields so it can be sent
 *  straight to the order API, plus management metadata. */
export interface SavedAddress {
  id: string;
  label: string; // Home | Work | Other
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
}

export interface AdminAccountTotals {
  total: number;
  merchants: number;
  customers: number;
  blocked: number;
}

export interface AdminStats {
  totalRevenue: number;
  totalOrders: number;
  totalCustomers: number;
  totalProducts: number;
  lowStock: Product[];
  recentOrders: Order[];
  /** Only present for super_admin — full account breakdown by role. */
  accounts?: AdminAccountTotals;
}
