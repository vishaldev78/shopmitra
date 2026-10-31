import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { serializeUserRow } from '@/lib/serialize';

const patchSchema = z.object({
  role: z.enum(['customer', 'admin', 'super_admin']).optional(),
  is_active: z.boolean().optional(),
});

// PATCH /api/admin/users/[id] — manage a customer/staff account.
// Rules: admins manage customers; only super_admins manage staff accounts;
// nobody can deactivate or demote their own account.
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const admin = await getSessionUser();
    if (!admin || (admin.role !== 'admin' && admin.role !== 'super_admin')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { id } = await ctx.params;
    const parsed = patchSchema.safeParse(await req.json());
    if (!parsed.success || (!parsed.data.role && typeof parsed.data.is_active !== 'boolean')) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
    }

    const target = await db.user.findUnique({ where: { id }, include: { _count: { select: { orders: true } } } });
    if (!target) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Only super_admins may touch admin/super_admin accounts.
    if (target.role !== 'customer' && admin.role !== 'super_admin') {
      return NextResponse.json({ error: 'Only super admins can manage staff accounts' }, { status: 403 });
    }
    // No self-lockout.
    if (target.id === admin.id && (parsed.data.is_active === false || (parsed.data.role && parsed.data.role !== admin.role))) {
      return NextResponse.json({ error: 'You cannot change your own access level' }, { status: 400 });
    }

    const updated = await db.user.update({
      where: { id },
      data: {
        ...(parsed.data.role ? { role: parsed.data.role } : {}),
        ...(typeof parsed.data.is_active === 'boolean' ? { isActive: parsed.data.is_active } : {}),
      },
      include: { _count: { select: { orders: true } } },
    });

    return NextResponse.json({ user: serializeUserRow(updated) });
  } catch (error) {
    console.error('admin user PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}
