import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { serializeProduct } from '@/lib/serialize';
import type { Prisma } from '@prisma/client';

// GET /api/products — public catalog with optional filters
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const featured = searchParams.get('featured');

    const where: Prisma.ProductWhereInput = { isActive: true };
    if (category) {
      where.category = { slug: category };
    }
    if (featured === 'true') {
      where.isFeatured = true;
    }
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { brand: { contains: search } },
        { description: { contains: search } },
      ];
    }

    const products = await db.product.findMany({
      where,
      include: { category: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ products: products.map(serializeProduct) });
  } catch (error) {
    console.error('products GET error:', error);
    return NextResponse.json({ error: 'Failed to load products' }, { status: 500 });
  }
}

// POST /api/products — admin create
export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const name = String(body.name || '').trim();
    const price = Number(body.price);
    if (!name || !price || price <= 0) {
      return NextResponse.json({ error: 'Name and a valid price are required' }, { status: 400 });
    }

    const slug =
      String(body.slug || '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '') ||
      name
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');

    const exists = await db.product.findUnique({ where: { slug } });
    if (exists) {
      return NextResponse.json({ error: 'A product with this slug already exists' }, { status: 409 });
    }

    const product = await db.product.create({
      data: {
        name,
        slug,
        description: body.description ? String(body.description) : null,
        price,
        comparePrice: body.compare_price ? Number(body.compare_price) : null,
        images: JSON.stringify(body.image_url ? [body.image_url] : []),
        categoryId: body.category_id || null,
        brand: body.brand ? String(body.brand) : null,
        sku: body.sku ? String(body.sku) : null,
        stock: body.stock ? Number(body.stock) : 0,
        isActive: true,
        isFeatured: false,
      },
      include: { category: { select: { name: true } } },
    });

    return NextResponse.json({ product: serializeProduct(product) }, { status: 201 });
  } catch (error) {
    console.error('products POST error:', error);
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
  }
}
