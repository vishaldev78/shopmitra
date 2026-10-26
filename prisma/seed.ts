/**
 * ShopMitra Database Seeder
 * Populates SQLite (via Prisma) with demo catalog data.
 * Run: npx tsx prisma/seed.ts  (or bun prisma/seed.ts)
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const db = new PrismaClient();

async function main() {
  const productCount = await db.product.count();
  if (productCount > 0) {
    console.log('✅ Database already seeded');
    return;
  }

  // ---- Users (passwords properly hashed) ----
  await db.user.upsert({
    where: { email: 'admin@shopmitra.in' },
    update: {},
    create: {
      email: 'admin@shopmitra.in',
      passwordHash: await bcrypt.hash('admin123', 10),
      name: 'Admin User',
      role: 'super_admin',
    },
  });

  await db.user.upsert({
    where: { email: 'demo@shopmitra.in' },
    update: {},
    create: {
      email: 'demo@shopmitra.in',
      passwordHash: await bcrypt.hash('demo123', 10),
      name: 'Demo Customer',
      role: 'customer',
    },
  });

  // ---- Categories ----
  const categoryData = [
    { name: 'Electronics', slug: 'electronics', sortOrder: 1 },
    { name: 'Fashion', slug: 'fashion', sortOrder: 2 },
    { name: 'Home & Living', slug: 'home-living', sortOrder: 3 },
    { name: 'Beauty', slug: 'beauty', sortOrder: 4 },
    { name: 'Sports', slug: 'sports', sortOrder: 5 },
  ];

  const categories: Record<string, string> = {};
  for (const cat of categoryData) {
    const c = await db.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat,
    });
    categories[cat.slug] = c.id;
  }

  // ---- Products ----
  const products = [
    {
      name: 'iPhone 15 Pro Max',
      slug: 'iphone-15-pro-max',
      description: 'The most advanced iPhone ever with A17 Pro chip, titanium design, and incredible camera system.',
      shortDescription: 'A17 Pro chip, titanium design, 48MP camera',
      price: 134900,
      comparePrice: 159900,
      images: ['https://image.qwenlm.ai/generated-images/a7f87cfc-8fb3-4a71-aded-78d8c769cc33/_result.png'],
      categorySlug: 'electronics',
      brand: 'Apple',
      sku: 'APL-IP15PM-256',
      stock: 45,
      rating: 4.8,
      reviewCount: 2847,
      isFeatured: true,
      tags: ['bestseller', 'new'],
      specifications: { Display: '6.7" Super Retina XDR', Chip: 'A17 Pro', Storage: '256GB' },
    },
    {
      name: 'MacBook Air M3',
      slug: 'macbook-air-m3',
      description: 'Supercharged by M3 chip. The remarkably thin MacBook Air with powerful performance.',
      shortDescription: 'M3 chip, 15.3" display, 18hr battery',
      price: 149900,
      comparePrice: 169900,
      images: ['https://image.qwenlm.ai/generated-images/3bd8d36c-e557-450f-bb8e-fdceca9899ca/_result.png'],
      categorySlug: 'electronics',
      brand: 'Apple',
      sku: 'APL-MBA-M3-512',
      stock: 30,
      rating: 4.9,
      reviewCount: 1523,
      isFeatured: true,
      tags: ['bestseller', 'trending'],
      specifications: { Chip: 'Apple M3', Memory: '8GB', Storage: '512GB SSD' },
    },
    {
      name: 'Sony WH-1000XM5',
      slug: 'sony-wh1000xm5',
      description: 'Industry-leading noise cancellation with Auto NC Optimizer. Up to 30 hours battery.',
      shortDescription: 'Best-in-class ANC, 30hr battery',
      price: 29990,
      comparePrice: 34990,
      images: ['https://image.qwenlm.ai/generated-images/cd977d4e-85ae-4d6f-9b28-8321823ab989/_result.png'],
      categorySlug: 'electronics',
      brand: 'Sony',
      sku: 'SNY-WH1000XM5',
      stock: 78,
      rating: 4.7,
      reviewCount: 3201,
      isFeatured: true,
      tags: ['bestseller'],
      specifications: { Driver: '30mm', Battery: '30 hours', Weight: '250g' },
    },
    {
      name: 'Premium Cotton T-Shirt',
      slug: 'premium-cotton-tee',
      description: 'Ultra-soft 100% organic cotton t-shirt with relaxed fit.',
      shortDescription: '100% organic cotton, relaxed fit',
      price: 1499,
      comparePrice: 2499,
      images: ['https://image.qwenlm.ai/generated-images/d65995bb-0a5c-4842-8354-83634e47e693/_result.png'],
      categorySlug: 'fashion',
      brand: 'ShopMitra Essentials',
      sku: 'SVE-TEE-001',
      stock: 200,
      rating: 4.5,
      reviewCount: 892,
      isFeatured: false,
      tags: ['sale', 'sustainable'],
      specifications: { Material: '100% Organic Cotton', Fit: 'Relaxed' },
    },
    {
      name: 'Ergonomic Office Chair',
      slug: 'ergonomic-office-chair',
      description: 'Premium ergonomic office chair with adjustable lumbar support.',
      shortDescription: 'Adjustable lumbar, breathable mesh',
      price: 24999,
      comparePrice: 34999,
      images: ['https://image.qwenlm.ai/generated-images/390adde3-1064-4efc-8ce0-be8ab593c062/_result.png'],
      categorySlug: 'home-living',
      brand: 'ErgoMax',
      sku: 'ERM-CHR-PRO',
      stock: 25,
      rating: 4.6,
      reviewCount: 654,
      isFeatured: true,
      tags: ['trending'],
      specifications: { Material: 'Mesh & Aluminum', Weight_Capacity: '150kg' },
    },
    {
      name: 'Vitamin C Serum',
      slug: 'vitamin-c-serum',
      description: 'Advanced 20% Vitamin C serum with Hyaluronic Acid.',
      shortDescription: '20% Vitamin C, anti-aging',
      price: 1299,
      comparePrice: 1999,
      images: ['https://image.qwenlm.ai/generated-images/9fb78c46-e26f-4a52-b49f-15f2dbba6d7e/_result.png'],
      categorySlug: 'beauty',
      brand: 'GlowLab',
      sku: 'GLW-VC-30ML',
      stock: 150,
      rating: 4.4,
      reviewCount: 1876,
      isFeatured: false,
      tags: ['bestseller', 'sale'],
      specifications: { Volume: '30ml', Ingredients: '20% Vitamin C, HA' },
    },
    {
      name: 'Smart Fitness Watch',
      slug: 'smart-fitness-watch',
      description: 'Advanced fitness tracker with GPS, heart rate monitoring.',
      shortDescription: 'GPS, HR monitor, 14-day battery',
      price: 19999,
      comparePrice: 24999,
      images: ['https://image.qwenlm.ai/generated-images/cdaf3905-e413-4c81-ac44-9b08f8d4fd50/_result.png'],
      categorySlug: 'electronics',
      brand: 'FitTech',
      sku: 'FT-WATCH-ULT',
      stock: 60,
      rating: 4.5,
      reviewCount: 2103,
      isFeatured: true,
      tags: ['trending', 'new'],
      specifications: { Display: '1.43" AMOLED', Battery: '14 days' },
    },
    {
      name: 'Yoga Mat Premium',
      slug: 'yoga-mat-premium',
      description: 'Professional-grade yoga mat with superior grip.',
      shortDescription: '6mm thick, non-slip, eco-friendly',
      price: 2499,
      comparePrice: 3499,
      images: ['https://image.qwenlm.ai/generated-images/849e78fc-803d-4496-a7db-5f33288dda19/_result.png'],
      categorySlug: 'sports',
      brand: 'ZenFlex',
      sku: 'ZF-MAT-PRO',
      stock: 85,
      rating: 4.6,
      reviewCount: 445,
      isFeatured: false,
      tags: ['sustainable'],
      specifications: { Material: 'Eco TPE', Thickness: '6mm' },
    },
    {
      name: 'Designer Leather Handbag',
      slug: 'designer-leather-handbag',
      description: 'Handcrafted genuine leather handbag.',
      shortDescription: 'Genuine leather, handcrafted',
      price: 8999,
      comparePrice: 12999,
      images: ['https://image.qwenlm.ai/generated-images/c6894af0-a41c-48ab-8fd3-09abf3067d3c/_result.png'],
      categorySlug: 'fashion',
      brand: 'LuxeCraft',
      sku: 'LC-BAG-001',
      stock: 35,
      rating: 4.7,
      reviewCount: 234,
      isFeatured: true,
      tags: ['trending'],
      specifications: { Material: 'Genuine Leather' },
    },
  ];

  for (const p of products) {
    const { categorySlug, specifications, tags, images, ...rest } = p;
    await db.product.upsert({
      where: { slug: p.slug },
      update: {},
      create: {
        ...rest,
        categoryId: categories[categorySlug],
        images: JSON.stringify(images),
        tags: JSON.stringify(tags),
        specifications: JSON.stringify(specifications),
      },
    });
  }

  // ---- Banners ----
  const bannerCount = await db.banner.count();
  if (bannerCount === 0) {
    await db.banner.createMany({
      data: [
        {
          title: 'Summer Sale',
          subtitle: 'Up to 50% off on electronics',
          ctaText: 'Shop Now',
          ctaLink: '/products?category=electronics',
          imageUrl: 'https://image.qwenlm.ai/generated-images/a0ad549f-a02b-479a-aed8-6caff47dcee1/_result.png',
          backgroundColor: 'from-indigo-600 to-purple-600',
          sortOrder: 1,
        },
        {
          title: 'New Arrivals',
          subtitle: 'Discover the latest trends',
          ctaText: 'Explore',
          ctaLink: '/products?category=fashion',
          imageUrl: '',
          backgroundColor: 'from-emerald-600 to-teal-600',
          sortOrder: 2,
        },
        {
          title: 'Free Shipping',
          subtitle: 'On orders above ₹999',
          ctaText: 'Learn More',
          ctaLink: '/shipping-policy',
          imageUrl: '',
          backgroundColor: 'from-amber-500 to-orange-600',
          sortOrder: 3,
        },
      ],
    });
  }

  // ---- Coupons ----
  await db.coupon.upsert({ where: { code: 'SAVE10' }, update: {}, create: { code: 'SAVE10', discountType: 'percentage', discountValue: 10, minOrderAmount: 500 } });
  await db.coupon.upsert({ where: { code: 'FIRST20' }, update: {}, create: { code: 'FIRST20', discountType: 'percentage', discountValue: 20, minOrderAmount: 1000 } });
  await db.coupon.upsert({ where: { code: 'SHOP15' }, update: {}, create: { code: 'SHOP15', discountType: 'percentage', discountValue: 15, minOrderAmount: 750 } });

  console.log('✅ Database seeded successfully');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
