import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { serializeBanner } from '@/lib/serialize';

// PATCH /api/banners/[id] — admin update (toggle active, etc.)
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  try {
    const { id } = await ctx.params;
    const body = await req.json();
    const banner = await db.banner.update({
      where: { id },
      data: { isActive: body.is_active != null ? Boolean(body.is_active) : undefined },
    });
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
