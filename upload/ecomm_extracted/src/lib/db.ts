import { neon } from '@neondatabase/serverless';

// Real Neon PostgreSQL database connection
const DATABASE_URL = 'postgresql://neondb_owner:npg_i5px1sYZqyLu@ep-round-king-avxa8z0s-pooler.c-11.us-east-1.aws.neon.tech/neondb?sslmode=require';

export const db = neon(DATABASE_URL);

// Test connection
export async function testConnection() {
  try {
    await db`SELECT 1 as test`;
    console.log('✅ Connected to Neon PostgreSQL');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
}

// Initialize database schema
export async function initDatabase() {
  try {
    // Users table
    await db`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'customer',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;

    // Products table
    await db`
      CREATE TABLE IF NOT EXISTS products (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255) UNIQUE NOT NULL,
        description TEXT,
        short_description TEXT,
        price DECIMAL(10,2) NOT NULL,
        compare_price DECIMAL(10,2),
        images TEXT[] DEFAULT '{}',
        category_id UUID,
        brand VARCHAR(255),
        sku VARCHAR(100),
        stock INTEGER DEFAULT 0,
        rating DECIMAL(2,1) DEFAULT 0,
        review_count INTEGER DEFAULT 0,
        is_featured BOOLEAN DEFAULT false,
        is_active BOOLEAN DEFAULT true,
        tags TEXT[] DEFAULT '{}',
        specifications JSONB DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;

    // Categories table
    await db`
      CREATE TABLE IF NOT EXISTS categories (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255) UNIQUE NOT NULL,
        sort_order INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true
      )
    `;

    // Orders table
    await db`
      CREATE TABLE IF NOT EXISTS orders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_number VARCHAR(50) UNIQUE NOT NULL,
        user_id UUID REFERENCES users(id),
        subtotal DECIMAL(10,2) NOT NULL,
        discount DECIMAL(10,2) DEFAULT 0,
        shipping DECIMAL(10,2) DEFAULT 0,
        tax DECIMAL(10,2) DEFAULT 0,
        total DECIMAL(10,2) NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        payment_status VARCHAR(50) DEFAULT 'pending',
        payment_method VARCHAR(50),
        payment_id VARCHAR(255),
        shipping_address JSONB NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;

    // Order items table
    await db`
      CREATE TABLE IF NOT EXISTS order_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
        product_id UUID REFERENCES products(id),
        product_name VARCHAR(255) NOT NULL,
        product_image TEXT,
        quantity INTEGER NOT NULL,
        unit_price DECIMAL(10,2) NOT NULL,
        total_price DECIMAL(10,2) NOT NULL
      )
    `;

    // Banners table
    await db`
      CREATE TABLE IF NOT EXISTS banners (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(255) NOT NULL,
        subtitle VARCHAR(500),
        cta_text VARCHAR(100),
        cta_link VARCHAR(500),
        image_url TEXT,
        background_color VARCHAR(100),
        is_active BOOLEAN DEFAULT true,
        sort_order INTEGER DEFAULT 0
      )
    `;

    // Coupons table
    await db`
      CREATE TABLE IF NOT EXISTS coupons (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        code VARCHAR(50) UNIQUE NOT NULL,
        discount_type VARCHAR(20),
        discount_value DECIMAL(10,2) NOT NULL,
        min_order_amount DECIMAL(10,2) DEFAULT 0,
        is_active BOOLEAN DEFAULT true
      )
    `;

    console.log('✅ Database tables created');
    return true;
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    return false;
  }
}

// Seed demo data
export async function seedDatabase() {
  try {
    // Check if data exists
    const productCount = await db`SELECT COUNT(*) as count FROM products`;
    if (Number(productCount[0].count) > 0) {
      console.log('✅ Database already seeded');
      return true;
    }

    // Create admin user (password: admin123)
    await db`
      INSERT INTO users (email, password_hash, name, role, is_active)
      VALUES ('admin@shopmitra.in', 'admin123', 'Admin User', 'super_admin', true)
      ON CONFLICT (email) DO NOTHING
    `;

    // Create demo customer (password: demo123)
    await db`
      INSERT INTO users (email, password_hash, name, role, is_active)
      VALUES ('demo@shopmitra.in', 'demo123', 'Demo Customer', 'customer', true)
      ON CONFLICT (email) DO NOTHING
    `;

    // Create categories
    const categories = [
      { name: 'Electronics', slug: 'electronics', sort_order: 1 },
      { name: 'Fashion', slug: 'fashion', sort_order: 2 },
      { name: 'Home & Living', slug: 'home-living', sort_order: 3 },
      { name: 'Beauty', slug: 'beauty', sort_order: 4 },
      { name: 'Sports', slug: 'sports', sort_order: 5 },
    ];

    for (const cat of categories) {
      await db`
        INSERT INTO categories (name, slug, sort_order, is_active)
        VALUES (${cat.name}, ${cat.slug}, ${cat.sort_order}, true)
        ON CONFLICT (slug) DO NOTHING
      `;
    }

    // Get category IDs
    const electronics = await db`SELECT id FROM categories WHERE slug = 'electronics'`;
    const fashion = await db`SELECT id FROM categories WHERE slug = 'fashion'`;
    const homeLiving = await db`SELECT id FROM categories WHERE slug = 'home-living'`;
    const beauty = await db`SELECT id FROM categories WHERE slug = 'beauty'`;
    const sports = await db`SELECT id FROM categories WHERE slug = 'sports'`;

    // Create products with real images
    const products = [
      {
        name: 'iPhone 15 Pro Max',
        slug: 'iphone-15-pro-max',
        description: 'The most advanced iPhone ever with A17 Pro chip, titanium design, and incredible camera system.',
        short_description: 'A17 Pro chip, titanium design, 48MP camera',
        price: 134900,
        compare_price: 159900,
        images: ['https://image.qwenlm.ai/generated-images/a7f87cfc-8fb3-4a71-aded-78d8c769cc33/_result.png'],
        category_id: electronics[0]?.id,
        brand: 'Apple',
        sku: 'APL-IP15PM-256',
        stock: 45,
        rating: 4.8,
        review_count: 2847,
        is_featured: true,
        tags: ['bestseller', 'new'],
        specifications: { Display: '6.7" Super Retina XDR', Chip: 'A17 Pro', Storage: '256GB' },
      },
      {
        name: 'MacBook Air M3',
        slug: 'macbook-air-m3',
        description: 'Supercharged by M3 chip. The remarkably thin MacBook Air with powerful performance.',
        short_description: 'M3 chip, 15.3" display, 18hr battery',
        price: 149900,
        compare_price: 169900,
        images: ['https://image.qwenlm.ai/generated-images/3bd8d36c-e557-450f-bb8e-fdceca9899ca/_result.png'],
        category_id: electronics[0]?.id,
        brand: 'Apple',
        sku: 'APL-MBA-M3-512',
        stock: 30,
        rating: 4.9,
        review_count: 1523,
        is_featured: true,
        tags: ['bestseller', 'trending'],
        specifications: { Chip: 'Apple M3', Memory: '8GB', Storage: '512GB SSD' },
      },
      {
        name: 'Sony WH-1000XM5',
        slug: 'sony-wh1000xm5',
        description: 'Industry-leading noise cancellation with Auto NC Optimizer. Up to 30 hours battery.',
        short_description: 'Best-in-class ANC, 30hr battery',
        price: 29990,
        compare_price: 34990,
        images: ['https://image.qwenlm.ai/generated-images/cd977d4e-85ae-4d6f-9b28-8321823ab989/_result.png'],
        category_id: electronics[0]?.id,
        brand: 'Sony',
        sku: 'SNY-WH1000XM5',
        stock: 78,
        rating: 4.7,
        review_count: 3201,
        is_featured: true,
        tags: ['bestseller'],
        specifications: { Driver: '30mm', Battery: '30 hours', Weight: '250g' },
      },
      {
        name: 'Premium Cotton T-Shirt',
        slug: 'premium-cotton-tee',
        description: 'Ultra-soft 100% organic cotton t-shirt with relaxed fit.',
        short_description: '100% organic cotton, relaxed fit',
        price: 1499,
        compare_price: 2499,
        images: ['https://image.qwenlm.ai/generated-images/d65995bb-0a5c-4842-8354-83634e47e693/_result.png'],
        category_id: fashion[0]?.id,
        brand: 'ShopMitra Essentials',
        sku: 'SVE-TEE-001',
        stock: 200,
        rating: 4.5,
        review_count: 892,
        is_featured: false,
        tags: ['sale', 'sustainable'],
        specifications: { Material: '100% Organic Cotton', Fit: 'Relaxed' },
      },
      {
        name: 'Ergonomic Office Chair',
        slug: 'ergonomic-office-chair',
        description: 'Premium ergonomic office chair with adjustable lumbar support.',
        short_description: 'Adjustable lumbar, breathable mesh',
        price: 24999,
        compare_price: 34999,
        images: ['https://image.qwenlm.ai/generated-images/390adde3-1064-4efc-8ce0-be8ab593c062/_result.png'],
        category_id: homeLiving[0]?.id,
        brand: 'ErgoMax',
        sku: 'ERM-CHR-PRO',
        stock: 25,
        rating: 4.6,
        review_count: 654,
        is_featured: true,
        tags: ['trending'],
        specifications: { Material: 'Mesh & Aluminum', Weight_Capacity: '150kg' },
      },
      {
        name: 'Vitamin C Serum',
        slug: 'vitamin-c-serum',
        description: 'Advanced 20% Vitamin C serum with Hyaluronic Acid.',
        short_description: '20% Vitamin C, anti-aging',
        price: 1299,
        compare_price: 1999,
        images: ['https://image.qwenlm.ai/generated-images/9fb78c46-e26f-4a52-b49f-15f2dbba6d7e/_result.png'],
        category_id: beauty[0]?.id,
        brand: 'GlowLab',
        sku: 'GLW-VC-30ML',
        stock: 150,
        rating: 4.4,
        review_count: 1876,
        is_featured: false,
        tags: ['bestseller', 'sale'],
        specifications: { Volume: '30ml', Ingredients: '20% Vitamin C, HA' },
      },
      {
        name: 'Smart Fitness Watch',
        slug: 'smart-fitness-watch',
        description: 'Advanced fitness tracker with GPS, heart rate monitoring.',
        short_description: 'GPS, HR monitor, 14-day battery',
        price: 19999,
        compare_price: 24999,
        images: ['https://image.qwenlm.ai/generated-images/cdaf3905-e413-4c81-ac44-9b08f8d4fd50/_result.png'],
        category_id: electronics[0]?.id,
        brand: 'FitTech',
        sku: 'FT-WATCH-ULT',
        stock: 60,
        rating: 4.5,
        review_count: 2103,
        is_featured: true,
        tags: ['trending', 'new'],
        specifications: { Display: '1.43" AMOLED', Battery: '14 days' },
      },
      {
        name: 'Yoga Mat Premium',
        slug: 'yoga-mat-premium',
        description: 'Professional-grade yoga mat with superior grip.',
        short_description: '6mm thick, non-slip, eco-friendly',
        price: 2499,
        compare_price: 3499,
        images: ['https://image.qwenlm.ai/generated-images/849e78fc-803d-4496-a7db-5f33288dda19/_result.png'],
        category_id: sports[0]?.id,
        brand: 'ZenFlex',
        sku: 'ZF-MAT-PRO',
        stock: 85,
        rating: 4.6,
        review_count: 445,
        is_featured: false,
        tags: ['sustainable'],
        specifications: { Material: 'Eco TPE', Thickness: '6mm' },
      },
      {
        name: 'Designer Leather Handbag',
        slug: 'designer-leather-handbag',
        description: 'Handcrafted genuine leather handbag.',
        short_description: 'Genuine leather, handcrafted',
        price: 8999,
        compare_price: 12999,
        images: ['https://image.qwenlm.ai/generated-images/c6894af0-a41c-48ab-8fd3-09abf3067d3c/_result.png'],
        category_id: fashion[0]?.id,
        brand: 'LuxeCraft',
        sku: 'LC-BAG-001',
        stock: 35,
        rating: 4.7,
        review_count: 234,
        is_featured: true,
        tags: ['trending'],
        specifications: { Material: 'Genuine Leather' },
      },
    ];

    for (const product of products) {
      await db`
        INSERT INTO products (name, slug, description, short_description, price, compare_price, images, category_id, brand, sku, stock, rating, review_count, is_featured, tags, specifications)
        VALUES (${product.name}, ${product.slug}, ${product.description}, ${product.short_description}, ${product.price}, ${product.compare_price}, ${product.images}, ${product.category_id}, ${product.brand}, ${product.sku}, ${product.stock}, ${product.rating}, ${product.review_count}, ${product.is_featured}, ${product.tags}, ${JSON.stringify(product.specifications)}::jsonb)
        ON CONFLICT (slug) DO NOTHING
      `;
    }

    // Create banners
    const banners = [
      {
        title: 'Summer Sale',
        subtitle: 'Up to 50% off on electronics',
        cta_text: 'Shop Now',
        cta_link: '/products?category=electronics',
        image_url: 'https://image.qwenlm.ai/generated-images/a0ad549f-a02b-479a-aed8-6caff47dcee1/_result.png',
        background_color: 'from-indigo-600 to-purple-600',
        sort_order: 1,
      },
      {
        title: 'New Arrivals',
        subtitle: 'Discover the latest trends',
        cta_text: 'Explore',
        cta_link: '/products?category=fashion',
        image_url: '',
        background_color: 'from-emerald-600 to-teal-600',
        sort_order: 2,
      },
      {
        title: 'Free Shipping',
        subtitle: 'On orders above ₹999',
        cta_text: 'Learn More',
        cta_link: '/shipping-policy',
        image_url: '',
        background_color: 'from-amber-500 to-orange-600',
        sort_order: 3,
      },
    ];

    for (const banner of banners) {
      await db`
        INSERT INTO banners (title, subtitle, cta_text, cta_link, image_url, background_color, sort_order, is_active)
        VALUES (${banner.title}, ${banner.subtitle}, ${banner.cta_text}, ${banner.cta_link}, ${banner.image_url}, ${banner.background_color}, ${banner.sort_order}, true)
      `;
    }

    // Create coupons
    const coupons = [
      { code: 'SAVE10', discount_type: 'percentage', discount_value: 10, min_order_amount: 500 },
      { code: 'FIRST20', discount_type: 'percentage', discount_value: 20, min_order_amount: 1000 },
      { code: 'SHOP15', discount_type: 'percentage', discount_value: 15, min_order_amount: 750 },
    ];

    for (const coupon of coupons) {
      await db`
        INSERT INTO coupons (code, discount_type, discount_value, min_order_amount, is_active)
        VALUES (${coupon.code}, ${coupon.discount_type}, ${coupon.discount_value}, ${coupon.min_order_amount}, true)
        ON CONFLICT (code) DO NOTHING
      `;
    }

    console.log('✅ Database seeded successfully');
    return true;
  } catch (error) {
    console.error('❌ Database seeding failed:', error);
    return false;
  }
}
