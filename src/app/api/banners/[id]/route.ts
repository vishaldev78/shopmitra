import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { serializeBanner } from '@/lib/serialize';

// PATCH /api/banners/[id] — admin update (full edit: fields, toggle active)
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  try {
    const { id } = await ctx.params;
    const body = await req.json();

    const data: Record<string, unknown> = {};
    if (typeof body.title === 'string' && body.title.trim()) data.title = body.title.trim();
    if (body.subtitle !== undefined) data.subtitle = body.subtitle ? String(body.subtitle) : null;
    if (body.cta_text !== undefined) data.ctaText = body.cta_text ? String(body.cta_text) : null;
    if (body.cta_link !== undefined) data.ctaLink = body.cta_link ? String(body.cta_link) : null;
    if (body.image_url !== undefined) data.imageUrl = body.image_url ? String(body.image_url) : null;
    if (body.background_color) data.backgroundColor = String(body.background_color);
    if (body.sort_order != null) data.sortOrder = Number(body.sort_order) || 0;
    if (body.is_active != null) data.isActive = Boolean(body.is_active);

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
    }

    const banner = await db.banner.update({ where: { id }, data });
    return NextResponse.json({ banner: serializeBanner(banner) });
  } catch (error) {
    console.error('banner PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update banner' }, { status: 500 });
  }
}

// DELETE /api/banners/[id] — admin delete
export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  try {
    const { id } = await ctx.params;
    await db.banner.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('banner DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete banner' }, { status: 500 });
  }
}
