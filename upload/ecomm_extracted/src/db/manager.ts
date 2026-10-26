import { initializeDatabase, sql } from '../db/connection';
import { seedDatabase } from '../db/seed';

// Database connection state
let dbInitialized = false;
let dbAvailable = false;
let initPromise: Promise<boolean> | null = null;

/**
 * Initialize the database connection and schema.
 * Falls back to localStorage if Neon is unreachable.
 */
export async function initDatabase(): Promise<boolean> {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      // Test connection
      await sql`SELECT 1 as test`;
      console.log('✅ Neon DB connection successful');

      // Initialize schema
      await initializeDatabase();

      // Seed data if empty
      const productCount = await sql`SELECT COUNT(*) as count FROM products`;
      if (Number(productCount[0].count) === 0) {
        await seedDatabase();
      }

      dbInitialized = true;
      dbAvailable = true;
      return true;
    } catch (error) {
      console.warn('⚠️ Neon DB unavailable, using localStorage fallback:', (error as Error).message);
      dbAvailable = false;
      return false;
    }
  })();

  return initPromise;
}

export function isDatabaseAvailable(): boolean {
  return dbAvailable;
}

/**
 * LocalStorage fallback for when Neon DB is unavailable.
 * This provides the same interface for the UI to work.
 */
export class LocalStorageDB {
  static get<T>(key: string, defaultValue: T): T {
    try {
      const data = localStorage.getItem(`sv_db_${key}`);
      return data ? JSON.parse(data) : defaultValue;
    } catch {
      return defaultValue;
    }
  }

  static set<T>(key: string, value: T): void {
    localStorage.setItem(`sv_db_${key}`, JSON.stringify(value));
  }

  static getAll<T>(key: string): T[] {
    return this.get<T[]>(key, []);
  }

  static push<T>(key: string, item: T): void {
    const items = this.getAll<T>(key);
    items.push(item);
    this.set(key, items);
  }

  static update<T extends { id: string }>(key: string, id: string, updates: Partial<T>): void {
    const items = this.getAll<T>(key);
    const index = items.findIndex(item => item.id === id);
    if (index >= 0) {
      items[index] = { ...items[index], ...updates };
      this.set(key, items);
    }
  }

  static remove<T extends { id: string }>(key: string, id: string): void {
    const items = this.getAll<T>(key);
    this.set(key, items.filter(item => item.id !== id));
  }

  static findById<T extends { id: string }>(key: string, id: string): T | undefined {
    return this.getAll<T>(key).find(item => item.id === id);
  }

  static findByField<T>(key: string, field: keyof T, value: any): T | undefined {
    return this.getAll<T>(key).find(item => item[field] === value);
  }
}

// Initialize localStorage with seed data if needed
export function initLocalStorageSeed() {
  const seeded = localStorage.getItem('sv_db_seeded');
  if (seeded) return;

  // Seed categories
  LocalStorageDB.set('categories', [
    { id: 'cat-1', name: 'Electronics', slug: 'electronics', sort_order: 1, is_active: true },
    { id: 'cat-2', name: 'Fashion', slug: 'fashion', sort_order: 2, is_active: true },
    { id: 'cat-3', name: 'Home & Living', slug: 'home-living', sort_order: 3, is_active: true },
    { id: 'cat-4', name: 'Beauty', slug: 'beauty', sort_order: 4, is_active: true },
    { id: 'cat-5', name: 'Sports', slug: 'sports', sort_order: 5, is_active: true },
    { id: 'cat-6', name: 'Books', slug: 'books', sort_order: 6, is_active: true },
  ]);

  // Seed products with real images
  LocalStorageDB.set('products', [
    {
      id: 'prod-1', name: 'iPhone 15 Pro Max', slug: 'iphone-15-pro-max',
      description: 'The most advanced iPhone ever with A17 Pro chip, titanium design, and an incredible camera system.',
      short_description: 'A17 Pro chip, titanium design, 48MP camera',
      price: 134900, compare_price: 159900,
      images: ['https://image.qwenlm.ai/generated-images/a7f87cfc-8fb3-4a71-aded-78d8c769cc33/_result.png'],
      category_id: 'cat-1', brand: 'Apple', sku: 'APL-IP15PM-256',
      stock: 45, rating: 4.8, review_count: 2847, is_featured: true, is_active: true,
      tags: ['bestseller', 'new'],
      specifications: { Display: '6.7" Super Retina XDR', Chip: 'A17 Pro', Storage: '256GB', Camera: '48MP Main' },
      created_at: '2024-01-15', updated_at: '2024-01-15',
    },
    {
      id: 'prod-2', name: 'MacBook Air M3', slug: 'macbook-air-m3',
      description: 'Supercharged by M3 chip. The remarkably thin MacBook Air with powerful performance and all-day battery life.',
      short_description: 'M3 chip, 15.3" display, 18hr battery',
      price: 149900, compare_price: 169900,
      images: ['https://image.qwenlm.ai/generated-images/3bd8d36c-e557-450f-bb8e-fdceca9899ca/_result.png'],
      category_id: 'cat-1', brand: 'Apple', sku: 'APL-MBA-M3-512',
      stock: 30, rating: 4.9, review_count: 1523, is_featured: true, is_active: true,
      tags: ['bestseller', 'trending'],
      specifications: { Chip: 'Apple M3', Memory: '8GB', Storage: '512GB SSD', Display: '15.3" Liquid Retina' },
      created_at: '2024-02-01', updated_at: '2024-02-01',
    },
    {
      id: 'prod-3', name: 'Sony WH-1000XM5', slug: 'sony-wh1000xm5',
      description: 'Industry-leading noise cancellation with Auto NC Optimizer. Up to 30 hours of battery life.',
      short_description: 'Best-in-class ANC, 30hr battery, Hi-Res Audio',
      price: 29990, compare_price: 34990,
      images: ['https://image.qwenlm.ai/generated-images/cd977d4e-85ae-4d6f-9b28-8321823ab989/_result.png'],
      category_id: 'cat-1', brand: 'Sony', sku: 'SNY-WH1000XM5',
      stock: 78, rating: 4.7, review_count: 3201, is_featured: true, is_active: true,
      tags: ['bestseller'],
      specifications: { Driver: '30mm', ANC: 'Industry-leading', Battery: '30 hours', Weight: '250g' },
      created_at: '2024-01-20', updated_at: '2024-01-20',
    },
    {
      id: 'prod-4', name: 'Premium Cotton T-Shirt', slug: 'premium-cotton-tee',
      description: 'Ultra-soft 100% organic cotton t-shirt with a relaxed fit.',
      short_description: '100% organic cotton, relaxed fit',
      price: 1499, compare_price: 2499,
      images: ['https://image.qwenlm.ai/generated-images/d65995bb-0a5c-4842-8354-83634e47e693/_result.png'],
      category_id: 'cat-2', brand: 'ShopVerse Essentials', sku: 'SVE-TEE-001',
      stock: 200, rating: 4.5, review_count: 892, is_featured: false, is_active: true,
      tags: ['sale', 'sustainable'],
      specifications: { Material: '100% Organic Cotton', Fit: 'Relaxed', Care: 'Machine washable' },
      created_at: '2024-03-01', updated_at: '2024-03-01',
    },
    {
      id: 'prod-5', name: 'Ergonomic Office Chair Pro', slug: 'ergonomic-office-chair',
      description: 'Premium ergonomic office chair with adjustable lumbar support, breathable mesh back.',
      short_description: 'Adjustable lumbar, breathable mesh, 4D armrests',
      price: 24999, compare_price: 34999,
      images: ['https://image.qwenlm.ai/generated-images/390adde3-1064-4efc-8ce0-be8ab593c062/_result.png'],
      category_id: 'cat-3', brand: 'ErgoMax', sku: 'ERM-CHR-PRO',
      stock: 25, rating: 4.6, review_count: 654, is_featured: true, is_active: true,
      tags: ['trending'],
      specifications: { Material: 'Mesh & Aluminum', Weight_Capacity: '150kg', Warranty: '5 years' },
      created_at: '2024-02-15', updated_at: '2024-02-15',
    },
    {
      id: 'prod-6', name: 'Vitamin C Brightening Serum', slug: 'vitamin-c-serum',
      description: 'Advanced 20% Vitamin C serum with Hyaluronic Acid and Vitamin E.',
      short_description: '20% Vitamin C, Hyaluronic Acid, anti-aging',
      price: 1299, compare_price: 1999,
      images: ['https://image.qwenlm.ai/generated-images/9fb78c46-e26f-4a52-b49f-15f2dbba6d7e/_result.png'],
      category_id: 'cat-4', brand: 'GlowLab', sku: 'GLW-VC-30ML',
      stock: 150, rating: 4.4, review_count: 1876, is_featured: false, is_active: true,
      tags: ['bestseller', 'sale'],
      specifications: { Volume: '30ml', Key_Ingredients: '20% Vitamin C, HA, Vit E', Skin_Type: 'All' },
      created_at: '2024-01-10', updated_at: '2024-01-10',
    },
    {
      id: 'prod-7', name: 'Smart Fitness Watch Ultra', slug: 'smart-fitness-watch',
      description: 'Advanced fitness tracker with GPS, heart rate monitoring, SpO2 sensor.',
      short_description: 'GPS, HR monitor, 100+ workouts, 14-day battery',
      price: 19999, compare_price: 24999,
      images: ['https://image.qwenlm.ai/generated-images/cdaf3905-e413-4c81-ac44-9b08f8d4fd50/_result.png'],
      category_id: 'cat-1', brand: 'FitTech', sku: 'FT-WATCH-ULT',
      stock: 60, rating: 4.5, review_count: 2103, is_featured: true, is_active: true,
      tags: ['trending', 'new'],
      specifications: { Display: '1.43" AMOLED', Battery: '14 days', Water_Resistance: '5 ATM' },
      created_at: '2024-03-10', updated_at: '2024-03-10',
    },
    {
      id: 'prod-8', name: 'Yoga Mat Premium', slug: 'yoga-mat-premium',
      description: 'Professional-grade yoga mat with superior grip and cushioning. Eco-friendly TPE.',
      short_description: '6mm thick, non-slip, eco-friendly TPE',
      price: 2499, compare_price: 3499,
      images: ['https://image.qwenlm.ai/generated-images/849e78fc-803d-4496-a7db-5f33288dda19/_result.png'],
      category_id: 'cat-5', brand: 'ZenFlex', sku: 'ZF-MAT-PRO',
      stock: 85, rating: 4.6, review_count: 445, is_featured: false, is_active: true,
      tags: ['sustainable'],
      specifications: { Material: 'Eco TPE', Thickness: '6mm', Size: '183cm x 61cm' },
      created_at: '2024-02-20', updated_at: '2024-02-20',
    },
    {
      id: 'prod-9', name: 'Designer Leather Handbag', slug: 'designer-leather-handbag',
      description: 'Handcrafted genuine leather handbag with adjustable strap.',
      short_description: 'Genuine leather, handcrafted, multiple compartments',
      price: 8999, compare_price: 12999,
      images: ['https://image.qwenlm.ai/generated-images/c6894af0-a41c-48ab-8fd3-09abf3067d3c/_result.png'],
      category_id: 'cat-2', brand: 'LuxeCraft', sku: 'LC-BAG-001',
      stock: 35, rating: 4.7, review_count: 234, is_featured: true, is_active: true,
      tags: ['trending'],
      specifications: { Material: 'Genuine Leather', Dimensions: '30cm x 25cm x 12cm', Closure: 'Magnetic snap' },
      created_at: '2024-02-28', updated_at: '2024-02-28',
    },
  ]);

  // Seed banners
  LocalStorageDB.set('banners', [
    {
      id: 'ban-1', title: 'Summer Sale', subtitle: 'Up to 50% off on electronics',
      cta_text: 'Shop Now', cta_link: '/products?category=electronics',
      image_url: 'https://image.qwenlm.ai/generated-images/a0ad549f-a02b-479a-aed8-6caff47dcee1/_result.png',
      background_color: 'from-indigo-600 to-purple-600', is_active: true, sort_order: 1,
      created_at: '2024-01-01', updated_at: '2024-01-01',
    },
    {
      id: 'ban-2', title: 'New Arrivals', subtitle: 'Discover the latest trends',
      cta_text: 'Explore', cta_link: '/products?category=fashion',
      image_url: '', background_color: 'from-emerald-600 to-teal-600',
      is_active: true, sort_order: 2, created_at: '2024-01-01', updated_at: '2024-01-01',
    },
    {
      id: 'ban-3', title: 'Free Shipping', subtitle: 'On orders above ₹999',
      cta_text: 'Learn More', cta_link: '/shipping-policy',
      image_url: '', background_color: 'from-amber-500 to-orange-600',
      is_active: true, sort_order: 3, created_at: '2024-01-01', updated_at: '2024-01-01',
    },
  ]);

  // Seed coupons
  LocalStorageDB.set('coupons', [
    { id: 'coup-1', code: 'SAVE10', discount_type: 'percentage', discount_value: 10, min_order_amount: 500, is_active: true, used_count: 0 },
    { id: 'coup-2', code: 'FIRST20', discount_type: 'percentage', discount_value: 20, min_order_amount: 1000, is_active: true, used_count: 0 },
    { id: 'coup-3', code: 'SHOP15', discount_type: 'percentage', discount_value: 15, min_order_amount: 750, is_active: true, used_count: 0 },
    { id: 'coup-4', code: 'FLAT500', discount_type: 'fixed', discount_value: 500, min_order_amount: 3000, is_active: true, used_count: 0 },
  ]);

  // Seed users
  LocalStorageDB.set('users', [
    { id: 'user-admin', email: 'admin@shopmitra.in', password_hash: 'admin123', name: 'Admin User', role: 'super_admin', is_active: true, created_at: '2024-01-01' },
    { id: 'user-demo', email: 'demo@shopmitra.in', password_hash: 'demo123', name: 'Demo Customer', role: 'customer', is_active: true, created_at: '2024-01-01' },
  ]);

  // Seed orders
  LocalStorageDB.set('orders', [
    {
      id: 'ord-1', order_number: 'SV-A1B2C3', user_id: 'user-demo', subtotal: 134900, discount: 0, shipping: 0, tax: 24282, total: 159182,
      status: 'delivered', payment_status: 'paid', payment_method: 'dodo', payment_id: 'pay_demo1',
      shipping_address: { fullName: 'Demo Customer', phone: '9876543210', addressLine1: '123 MG Road', city: 'Mumbai', state: 'Maharashtra', postalCode: '400001', country: 'India' },
      items: [{ product_id: 'prod-1', product_name: 'iPhone 15 Pro Max', product_image: 'https://image.qwenlm.ai/generated-images/a7f87cfc-8fb3-4a71-aded-78d8c769cc33/_result.png', quantity: 1, unit_price: 134900, total_price: 134900 }],
      created_at: '2024-03-15', updated_at: '2024-03-18',
    },
    {
      id: 'ord-2', order_number: 'SV-D4E5F6', user_id: 'user-demo', subtotal: 29990, discount: 3000, shipping: 0, tax: 4858, total: 31848,
      status: 'shipped', payment_status: 'paid', payment_method: 'dodo', payment_id: 'pay_demo2',
      shipping_address: { fullName: 'Demo Customer', phone: '9876543210', addressLine1: '123 MG Road', city: 'Mumbai', state: 'Maharashtra', postalCode: '400001', country: 'India' },
      items: [{ product_id: 'prod-3', product_name: 'Sony WH-1000XM5', product_image: 'https://image.qwenlm.ai/generated-images/cd977d4e-85ae-4d6f-9b28-8321823ab989/_result.png', quantity: 1, unit_price: 29990, total_price: 29990 }],
      created_at: '2024-03-14', updated_at: '2024-03-15',
    },
  ]);

  localStorage.setItem('sv_db_seeded', 'true');
  console.log('✅ LocalStorage seed data initialized');
}
