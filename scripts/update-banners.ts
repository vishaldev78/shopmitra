/**
 * One-off: attach the generated banner artwork to the store's banners and add
 * an Electronics hero. Safe to re-run (idempotent by title).
 */
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

const artwork: { title: string; imageUrl: string; sortOrder?: number; ctaLink?: string; subtitle?: string }[] = [
  { title: 'Summer Sale', imageUrl: '/banners/festive.png', sortOrder: 1 },
  { title: 'New Arrivals', imageUrl: '/banners/fashion.png', sortOrder: 2 },
  { title: 'Electronics Mega Deals', imageUrl: '/banners/electronics.png', sortOrder: 3, ctaLink: '/products?category=electronics', subtitle: 'Latest gadgets at unbeatable prices' },
  { title: 'Free Shipping', imageUrl: '/banners/home.png', sortOrder: 4 },
];

async function main() {
  for (const art of artwork) {
    const existing = await db.banner.findFirst({ where: { title: art.title } });
    if (existing) {
      await db.banner.update({
        where: { id: existing.id },
        data: {
          imageUrl: art.imageUrl,
          ...(art.sortOrder != null ? { sortOrder: art.sortOrder } : {}),
          ...(art.ctaLink ? { ctaLink: art.ctaLink } : {}),
          ...(art.subtitle ? { subtitle: art.subtitle } : {}),
          isActive: true,
        },
      });
      console.log(`updated: ${art.title}`);
    } else {
      await db.banner.create({
        data: {
          title: art.title,
          subtitle: art.subtitle ?? 'Top picks for your home',
          ctaText: 'Shop Now',
          ctaLink: art.ctaLink ?? '/products',
          imageUrl: art.imageUrl,
          backgroundColor: 'from-indigo-600 to-purple-600',
          sortOrder: art.sortOrder ?? 5,
          isActive: true,
        },
      });
      console.log(`created: ${art.title}`);
    }
  }
  const count = await db.banner.count();
  console.log(`total banners: ${count}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
