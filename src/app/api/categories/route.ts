import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { serializeCategory } from '@/lib/serialize';

const categorySchema = z.object({
  name: z.string().trim().min(1).max(80),
  slug: z.string().trim().max(100).optional(),
  sort_order: z.number().int().min(0).optional(),
  is_active: z.boolean().optional(),
});

function makeSlug(value: string): string {
  return value.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

// GET /api/categories — public active categories; manage=1 includes inactive categories for admins.
export async function GET(req: NextRequest) {
  try {
    const manage = new URL(req.url).searchParams.get('manage') === '1';
    if (manage && !(await requireAdmin())) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const categories = await db.category.findMany({
      where: manage ? {} : { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
    return NextResponse.json({ categories: categories.map(serializeCategory) });
  } catch (error) {
    console.error('categories GET error:', error);
    return NextResponse.json({ error: 'Failed to load categories' }, { status: 500 });
  }
}

// POST /api/categories — admin create
export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  try {
    const parsed = categorySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'A category name is required' }, { status: 400 });
    }
    const slug = makeSlug(parsed.data.slug || parsed.data.name);
    if (!slug) {
      return NextResponse.json({ error: 'A valid category slug is required' }, { status: 400 });
    }
    if (await db.category.findUnique({ where: { slug } })) {
      return NextResponse.json({ error: 'A category with this slug already exists' }, { status: 409 });
    }

    const category = await db.category.create({
      data: { name: parsed.data.name, slug, sortOrder: parsed.data.sort_order ?? 0, isActive: parsed.data.is_active ?? true },
    });
    return NextResponse.json({ category: serializeCategory(category) }, { status: 201 });
  } catch (error) {
    console.error('categories POST error:', error);
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 });
  }
}
