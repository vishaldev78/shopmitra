import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { serializeUserRow } from '@/lib/serialize';

// GET /api/admin/users — customer list (admin only)
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  try {
    const users = await db.user.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { orders: true } } },
    });
    return NextResponse.json({ users: users.map(serializeUserRow) });
  } catch (error) {
    console.error('admin users error:', error);
    return NextResponse.json({ error: 'Failed to load users' }, { status: 500 });
  }
}
