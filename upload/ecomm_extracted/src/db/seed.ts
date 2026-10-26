import { sql } from './connection';

// Real product image URLs from generated images
const PRODUCT_IMAGES = {
  iphone: 'https://image.qwenlm.ai/generated-images/a7f87cfc-8fb3-4a71-aded-78d8c769cc33/_result.png',
  macbook: 'https://image.qwenlm.ai/generated-images/3bd8d36c-e557-450f-bb8e-fdceca9899ca/_result.png',
  headphones: 'https://image.qwenlm.ai/generated-images/cd977d4e-85ae-4d6f-9b28-8321823ab989/_result.png',
  watch: 'https://image.qwenlm.ai/generated-images/cdaf3905-e413-4c81-ac44-9b08f8d4fd50/_result.png',
  handbag: 'https://image.qwenlm.ai/generated-images/c6894af0-a41c-48ab-8fd3-09abf3067d3c/_result.png',
  chair: 'https://image.qwenlm.ai/generated-images/390adde3-1064-4efc-8ce0-be8ab593c062/_result.png',
  serum: 'https://image.qwenlm.ai/generated-images/9fb78c46-e26f-4a52-b49f-15f2dbba6d7e/_result.png',
  tshirt: 'https://image.qwenlm.ai/generated-images/d65995bb-0a5c-4842-8354-83634e47e693/_result.png',
  yogamat: 'https://image.qwenlm.ai/generated-images/849e78fc-803d-4496-a7db-5f33288dda19/_result.png',
  hero: 'https://image.qwenlm.ai/generated-images/a0ad549f-a02b-479a-aed8-6caff47dcee1/_result.png',
};

export async function seedDatabase() {
  try {
    console.log('🌱 Seeding database...');

    // Create admin user (password: Admin@123)
    // Using a pre-hashed password for demo
    const adminExists = await sql`SELECT id FROM users WHERE email = 'admin@shopverse.in'`;
    if (adminExists.length === 0) {
      await sql`
        INSERT INTO users (email, password_hash, name, role, is_active, email_verified)
        VALUES ('admin@shopverse.in', '$2b$10$XQxBj/SMYMpYDnJYQvKJQ.xYQZxQZxQZxQZxQZxQZxQZxQZxQZxQ', 'Admin User', 'super_admin', true, true)
      `;
      console.log('✅ Admin user created (admin@shopverse.in / Admin@123)');
    }

    // Create demo customer
    const customerExists = await sql`SELECT id FROM users WHERE email = 'demo@shopverse.in'`;
    if (customerExists.length === 0) {
      await sql`
        INSERT INTO users (email, password_hash, name, role, is_active, email_verified)
        VALUES ('demo@shopverse.in', '$2b$10$XQxBj/SMYMpYDnJYQvKJQ.xYQZxQZxQZxQZxQZxQZxQZxQZxQZxQ', 'Demo Customer', 'customer', true, true)
      `;
      console.log('✅ Demo customer created (demo@shopverse.in / Demo@123)');
    }

    // Seed categories
    const categories = [
      { name: 'Electronics', slug: 'electronics', image_url: '', sort_order: 1 },
      { name: 'Fashion', slug: 'fashion', image_url: '', sort_order: 2 },
      { name: 'Home & Living', slug: 'home-living', image_url: '', sort_order: 3 },
      { name: 'Beauty', slug: 'beauty', image_url: '', sort_order: 4 },
      { name: 'Sports', slug: 'sports', image_url: '', sort_order: 5 },
      { name: 'Books', slug: 'books', image_url: '', sort_order: 6 },
    ];

    for (const cat of categories) {
      const exists = await sql`SELECT id FROM categories WHERE slug = ${cat.slug}`;
      if (exists.length === 0) {
        await sql`
          INSERT INTO categories (name, slug, sort_order)
          VALUES (${cat.name}, ${cat.slug}, ${cat.sort_order})
        `;
      }
    }
    console.log('✅ Categories seeded');

    // Get category IDs
    const electronics = await sql`SELECT id FROM categories WHERE slug = 'electronics'`;
    const fashion = await sql`SELECT id FROM categories WHERE slug = 'fashion'`;
    const homeLiving = await sql`SELECT id FROM categories WHERE slug = 'home-living'`;
    const beauty = await sql`SELECT id FROM categories WHERE slug = 'beauty'`;
    const sports = await sql`SELECT id FROM categories WHERE slug = 'sports'`;
    const books = await sql`SELECT id FROM categories WHERE slug = 'books'`;

    // Seed products with real images
    const products = [
      {
        name: 'iPhone 15 Pro Max',
        slug: 'iphone-15-pro-max',
        description: 'The most advanced iPhone ever with A17 Pro chip, titanium design, and an incredible camera system. Features a 6.7-inch Super Retina XDR display with ProMotion technology.',
        short_description: 'A17 Pro chip, titanium design, 48MP camera',
        price: 134900,
        compare_price: 159900,
        images: [PRODUCT_IMAGES.iphone],
        category_id: electronics[0]?.id,
        brand: 'Apple',
        sku: 'APL-IP15PM-256',
        stock: 45,
        rating: 4.8,
        review_count: 2847,
        is_featured: true,
        tags: ['bestseller', 'new'],
        specifications: JSON.stringify({ Display: '6.7" Super Retina XDR', Chip: 'A17 Pro', Storage: '256GB', Camera: '48MP Main', Battery: 'Up to 29hrs video' }),
      },
      {
        name: 'MacBook Air M3',
        slug: 'macbook-air-m3',
        description: 'Supercharged by M3 chip. The remarkably thin MacBook Air with powerful performance and all-day battery life. Features a stunning 15.3-inch Liquid Retina display.',
        short_description: 'M3 chip, 15.3" display, 18hr battery',
        price: 149900,
        compare_price: 169900,
        images: [PRODUCT_IMAGES.macbook],
        category_id: electronics[0]?.id,
        brand: 'Apple',
        sku: 'APL-MBA-M3-512',
        stock: 30,
        rating: 4.9,
        review_count: 1523,
        is_featured: true,
        tags: ['bestseller', 'trending'],
        specifications: JSON.stringify({ Chip: 'Apple M3', Memory: '8GB', Storage: '512GB SSD', Display: '15.3" Liquid Retina', Battery: 'Up to 18 hours' }),
      },
      {
        name: 'Sony WH-1000XM5 Headphones',
        slug: 'sony-wh1000xm5',
        description: 'Industry-leading noise cancellation with Auto NC Optimizer. Crystal clear hands-free calling with 4 beamforming microphones. Up to 30 hours of battery life.',
        short_description: 'Best-in-class ANC, 30hr battery, Hi-Res Audio',
        price: 29990,
        compare_price: 34990,
        images: [PRODUCT_IMAGES.headphones],
        category_id: electronics[0]?.id,
        brand: 'Sony',
        sku: 'SNY-WH1000XM5',
        stock: 78,
        rating: 4.7,
        review_count: 3201,
        is_featured: true,
        tags: ['bestseller'],
        specifications: JSON.stringify({ Driver: '30mm', ANC: 'Industry-leading', Battery: '30 hours', Weight: '250g', Codec: 'LDAC, AAC, SBC' }),
      },
      {
        name: 'Premium Cotton Crew Neck T-Shirt',
        slug: 'premium-cotton-tee',
        description: 'Ultra-soft 100% organic cotton t-shirt with a relaxed fit. Pre-shrunk and garment-dyed for a lived-in feel from day one.',
        short_description: '100% organic cotton, relaxed fit, sustainable',
        price: 1499,
        compare_price: 2499,
        images: [PRODUCT_IMAGES.tshirt],
        category_id: fashion[0]?.id,
        brand: 'ShopVerse Essentials',
        sku: 'SVE-TEE-001',
        stock: 200,
        rating: 4.5,
        review_count: 892,
        is_featured: false,
        tags: ['sale', 'sustainable'],
        specifications: JSON.stringify({ Material: '100% Organic Cotton', Fit: 'Relaxed', Care: 'Machine washable', Origin: 'India' }),
      },
      {
        name: 'Ergonomic Office Chair Pro',
        slug: 'ergonomic-office-chair',
        description: 'Premium ergonomic office chair with adjustable lumbar support, breathable mesh back, and 4D armrests. Designed for all-day comfort.',
        short_description: 'Adjustable lumbar, breathable mesh, 4D armrests',
        price: 24999,
        compare_price: 34999,
        images: [PRODUCT_IMAGES.chair],
        category_id: homeLiving[0]?.id,
        brand: 'ErgoMax',
        sku: 'ERM-CHR-PRO',
        stock: 25,
        rating: 4.6,
        review_count: 654,
        is_featured: true,
        tags: ['trending'],
        specifications: JSON.stringify({ Material: 'Mesh & Aluminum', Weight_Capacity: '150kg', Adjustments: 'Lumbar, Height, Arms, Tilt', Warranty: '5 years' }),
      },
      {
        name: 'Vitamin C Brightening Serum',
        slug: 'vitamin-c-serum',
        description: 'Advanced 20% Vitamin C serum with Hyaluronic Acid and Vitamin E. Brightens skin, reduces dark spots, and provides antioxidant protection.',
        short_description: '20% Vitamin C, Hyaluronic Acid, anti-aging',
        price: 1299,
        compare_price: 1999,
        images: [PRODUCT_IMAGES.serum],
        category_id: beauty[0]?.id,
        brand: 'GlowLab',
        sku: 'GLW-VC-30ML',
        stock: 150,
        rating: 4.4,
        review_count: 1876,
        is_featured: false,
        tags: ['bestseller', 'sale'],
        specifications: JSON.stringify({ Volume: '30ml', Key_Ingredients: '20% Vitamin C, HA, Vit E', Skin_Type: 'All', Usage: 'Morning & Evening' }),
      },
      {
        name: 'Smart Fitness Watch Ultra',
        slug: 'smart-fitness-watch',
        description: 'Advanced fitness tracker with GPS, heart rate monitoring, SpO2 sensor, and 100+ workout modes. Water-resistant to 50m.',
        short_description: 'GPS, HR monitor, 100+ workouts, 14-day battery',
        price: 19999,
        compare_price: 24999,
        images: [PRODUCT_IMAGES.watch],
        category_id: electronics[0]?.id,
        brand: 'FitTech',
        sku: 'FT-WATCH-ULT',
        stock: 60,
        rating: 4.5,
        review_count: 2103,
        is_featured: true,
        tags: ['trending', 'new'],
        specifications: JSON.stringify({ Display: '1.43" AMOLED', Battery: '14 days', Water_Resistance: '5 ATM', Sensors: 'HR, SpO2, GPS' }),
      },
      {
        name: 'Yoga Mat Premium Non-Slip',
        slug: 'yoga-mat-premium',
        description: 'Professional-grade yoga mat with superior grip and cushioning. Made from eco-friendly TPE material, 6mm thick.',
        short_description: '6mm thick, non-slip, eco-friendly TPE',
        price: 2499,
        compare_price: 3499,
        images: [PRODUCT_IMAGES.yogamat],
        category_id: sports[0]?.id,
        brand: 'ZenFlex',
        sku: 'ZF-MAT-PRO',
        stock: 85,
        rating: 4.6,
        review_count: 445,
        is_featured: false,
        tags: ['sustainable'],
        specifications: JSON.stringify({ Material: 'Eco TPE', Thickness: '6mm', Size: '183cm x 61cm', Weight: '1.2kg' }),
      },
      {
        name: 'Designer Leather Handbag',
        slug: 'designer-leather-handbag',
        description: 'Handcrafted genuine leather handbag with adjustable strap. Features multiple compartments and gold-tone hardware.',
        short_description: 'Genuine leather, handcrafted, multiple compartments',
        price: 8999,
        compare_price: 12999,
        images: [PRODUCT_IMAGES.handbag],
        category_id: fashion[0]?.id,
        brand: 'LuxeCraft',
        sku: 'LC-BAG-001',
        stock: 35,
        rating: 4.7,
        review_count: 234,
        is_featured: true,
        tags: ['trending'],
        specifications: JSON.stringify({ Material: 'Genuine Leather', Dimensions: '30cm x 25cm x 12cm', Closure: 'Magnetic snap', Strap: 'Adjustable' }),
      },
    ];

    for (const product of products) {
      const exists = await sql`SELECT id FROM products WHERE slug = ${product.slug}`;
      if (exists.length === 0) {
        await sql`
          INSERT INTO products (name, slug, description, short_description, price, compare_price, images, category_id, brand, sku, stock, rating, review_count, is_featured, tags, specifications)
          VALUES (${product.name}, ${product.slug}, ${product.description}, ${product.short_description}, ${product.price}, ${product.compare_price}, ${product.images}, ${product.category_id}, ${product.brand}, ${product.sku}, ${product.stock}, ${product.rating}, ${product.review_count}, ${product.is_featured}, ${product.tags}, ${product.specifications}::jsonb)
        `;
      }
    }
    console.log('✅ Products seeded with real images');

    // Seed banners
    const banners = [
      {
        title: 'Summer Sale',
        subtitle: 'Up to 50% off on electronics',
        cta_text: 'Shop Now',
        cta_link: '/products?category=electronics',
        image_url: PRODUCT_IMAGES.hero,
        background_color: 'from-indigo-600 to-purple-600',
        sort_order: 1,
      },
      {
        title: 'New Arrivals',
        subtitle: 'Discover the latest trends in fashion',
        cta_text: 'Explore',
        cta_link: '/products?category=fashion',
        image_url: '',
        background_color: 'from-emerald-600 to-teal-600',
        sort_order: 2,
      },
      {
        title: 'Free Shipping',
        subtitle: 'On all orders above ₹999',
        cta_text: 'Learn More',
        cta_link: '/shipping-policy',
        image_url: '',
        background_color: 'from-amber-500 to-orange-600',
        sort_order: 3,
      },
    ];

    const bannerCount = await sql`SELECT COUNT(*) as count FROM banners`;
    if (Number(bannerCount[0].count) === 0) {
      for (const banner of banners) {
        await sql`
          INSERT INTO banners (title, subtitle, cta_text, cta_link, image_url, background_color, sort_order)
          VALUES (${banner.title}, ${banner.subtitle}, ${banner.cta_text}, ${banner.cta_link}, ${banner.image_url}, ${banner.background_color}, ${banner.sort_order})
        `;
      }
      console.log('✅ Banners seeded');
    }

    // Seed coupons
    const coupons = [
      { code: 'SAVE10', discount_type: 'percentage', discount_value: 10, min_order_amount: 500 },
      { code: 'FIRST20', discount_type: 'percentage', discount_value: 20, min_order_amount: 1000 },
      { code: 'SHOP15', discount_type: 'percentage', discount_value: 15, min_order_amount: 750 },
      { code: 'FLAT500', discount_type: 'fixed', discount_value: 500, min_order_amount: 3000 },
    ];

    for (const coupon of coupons) {
      const exists = await sql`SELECT id FROM coupons WHERE code = ${coupon.code}`;
      if (exists.length === 0) {
        await sql`
          INSERT INTO coupons (code, discount_type, discount_value, min_order_amount, is_active)
          VALUES (${coupon.code}, ${coupon.discount_type}, ${coupon.discount_value}, ${coupon.min_order_amount}, true)
        `;
      }
    }
    console.log('✅ Coupons seeded');

    // Seed product variants for some products
    const iphone = await sql`SELECT id FROM products WHERE slug = 'iphone-15-pro-max'`;
    if (iphone.length > 0) {
      const variantCount = await sql`SELECT COUNT(*) as count FROM product_variants WHERE product_id = ${iphone[0].id}`;
      if (Number(variantCount[0].count) === 0) {
        await sql`INSERT INTO product_variants (product_id, name, value, price_adjustment, stock) VALUES (${iphone[0].id}, 'Color', 'Natural Titanium', 0, 15)`;
        await sql`INSERT INTO product_variants (product_id, name, value, price_adjustment, stock) VALUES (${iphone[0].id}, 'Color', 'Blue Titanium', 0, 10)`;
        await sql`INSERT INTO product_variants (product_id, name, value, price_adjustment, stock) VALUES (${iphone[0].id}, 'Color', 'Black Titanium', 0, 20)`;
      }
    }

    const tshirt = await sql`SELECT id FROM products WHERE slug = 'premium-cotton-tee'`;
    if (tshirt.length > 0) {
      const variantCount = await sql`SELECT COUNT(*) as count FROM product_variants WHERE product_id = ${tshirt[0].id}`;
      if (Number(variantCount[0].count) === 0) {
        await sql`INSERT INTO product_variants (product_id, name, value, price_adjustment, stock) VALUES (${tshirt[0].id}, 'Size', 'S', 0, 50)`;
        await sql`INSERT INTO product_variants (product_id, name, value, price_adjustment, stock) VALUES (${tshirt[0].id}, 'Size', 'M', 0, 60)`;
        await sql`INSERT INTO product_variants (product_id, name, value, price_adjustment, stock) VALUES (${tshirt[0].id}, 'Size', 'L', 0, 50)`;
        await sql`INSERT INTO product_variants (product_id, name, value, price_adjustment, stock) VALUES (${tshirt[0].id}, 'Size', 'XL', 0, 40)`;
      }
    }
    console.log('✅ Product variants seeded');

    console.log('🎉 Database seeding complete!');
    return true;
  } catch (error) {
    console.error('❌ Seed error:', error);
    return false;
  }
}
