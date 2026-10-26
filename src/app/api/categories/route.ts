import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { serializeCategory } from '@/lib/serialize';

// GET /api/categories — public category list
export async function GET() {
  try {
    const categories = await db.category.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
    return NextResponse.json({ categories: categories.map(serializeCategory) });
  } catch (error) {
    console.error('categories GET error:', error);
    return NextResponse.json({ error: 'Failed to load categories' }, { status: 500 });
  }
}
