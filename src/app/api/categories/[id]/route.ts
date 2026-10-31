import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { serializeCategory } from '@/lib/serialize';

const categoryPatchSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  slug: z.string().trim().min(1).max(100).optional(),
  sort_order: z.number().int().min(0).optional(),
  is_active: z.boolean().optional(),
}).refine((data) => Object.keys(data).length > 0, { message: 'Nothing to update' });

function makeSlug(value: string): string {
  return value.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  try {
    const parsed = categoryPatchSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid category update' }, { status: 400 });
    }
    const { id } = await ctx.params;
    const data = {
      ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
      ...(parsed.data.slug !== undefined ? { slug: makeSlug(parsed.data.slug) } : {}),
      ...(parsed.data.sort_order !== undefined ? { sortOrder: parsed.data.sort_order } : {}),
      ...(parsed.data.is_active !== undefined ? { isActive: parsed.data.is_active } : {}),
    };
    if ('slug' in data && !data.slug) {
      return NextResponse.json({ error: 'A valid category slug is required' }, { status: 400 });
    }
    if (data.slug) {
      const duplicate = await db.category.findUnique({ where: { slug: data.slug } });
      if (duplicate && duplicate.id !== id) {
        return NextResponse.json({ error: 'A category with this slug already exists' }, { status: 409 });
      }
    }
    const category = await db.category.update({ where: { id }, data });
    return NextResponse.json({ category: serializeCategory(category) });
  } catch (error) {
    console.error('categories PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update category' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  try {
    const { id } = await ctx.params;
    await db.category.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('categories DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete category' }, { status: 500 });
  }
}
