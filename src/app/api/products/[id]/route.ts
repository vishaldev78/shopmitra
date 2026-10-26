import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { serializeProduct } from '@/lib/serialize';

// PATCH /api/products/[id] — admin update
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  try {
    const { id } = await ctx.params;
    const body = await req.json();

    const existing = await db.product.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const images =
      body.image_url != null ? JSON.stringify([body.image_url].filter(Boolean)) : undefined;

    const product = await db.product.update({
      where: { id },
      data: {
        name: body.name != null ? String(body.name) : undefined,
        slug: body.slug != null ? String(body.slug).toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') : undefined,
        description: body.description != null ? String(body.description) : undefined,
        price: body.price != null ? Number(body.price) : undefined,
        comparePrice: body.compare_price !== undefined ? (body.compare_price ? Number(body.compare_price) : null) : undefined,
        images,
        categoryId: body.category_id !== undefined ? body.category_id || null : undefined,
        brand: body.brand != null ? String(body.brand) : undefined,
        sku: body.sku != null ? String(body.sku) : undefined,
        stock: body.stock != null ? Number(body.stock) : undefined,
      },
      include: { category: { select: { name: true } } },
    });

    return NextResponse.json({ product: serializeProduct(product) });
  } catch (error) {
    console.error('product PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
  }
}

// DELETE /api/products/[id] — admin delete
export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  try {
    const { id } = await ctx.params;
    await db.product.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('product DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
  }
}
