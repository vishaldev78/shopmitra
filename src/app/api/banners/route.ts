import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { serializeBanner } from '@/lib/serialize';

// GET /api/banners — public active banners
export async function GET() {
  try {
    const banners = await db.banner.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
    return NextResponse.json({ banners: banners.map(serializeBanner) });
  } catch (error) {
    console.error('banners GET error:', error);
    return NextResponse.json({ error: 'Failed to load banners' }, { status: 500 });
  }
}

// POST /api/banners — admin create
export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const title = String(body.title || '').trim();
    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const count = await db.banner.count();

    const banner = await db.banner.create({
      data: {
        title,
        subtitle: body.subtitle ? String(body.subtitle) : null,
        ctaText: body.cta_text ? String(body.cta_text) : null,
        ctaLink: body.cta_link ? String(body.cta_link) : null,
        imageUrl: body.image_url ? String(body.image_url) : null,
        backgroundColor: body.background_color ? String(body.background_color) : 'from-indigo-600 to-purple-600',
        sortOrder: count + 1,
        isActive: true,
      },
    });

    return NextResponse.json({ banner: serializeBanner(banner) }, { status: 201 });
  } catch (error) {
    console.error('banners POST error:', error);
    return NextResponse.json({ error: 'Failed to create banner' }, { status: 500 });
  }
}
