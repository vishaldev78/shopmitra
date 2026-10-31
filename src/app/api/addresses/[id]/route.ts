import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { serializeAddress } from '@/lib/serialize';

const updateSchema = z.object({
  label: z.enum(['Home', 'Work', 'Other']).optional(),
  fullName: z.string().min(1).max(120).optional(),
  phone: z.string().min(10).max(15).optional(),
  addressLine1: z.string().min(1).max(300).optional(),
  addressLine2: z.string().max(300).optional(),
  city: z.string().min(1).max(100).optional(),
  state: z.string().min(1).max(100).optional(),
  postalCode: z.string().min(6).max(10).optional(),
  country: z.string().max(100).optional(),
  isDefault: z.boolean().optional(),
});

// PATCH /api/addresses/[id] — edit a saved address (owner only)
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Login required' }, { status: 401 });
    }
    const { id } = await ctx.params;
    const parsed = updateSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid address details' }, { status: 400 });
    }

    const existing = await db.address.findUnique({ where: { id } });
    if (!existing || existing.userId !== user.id) {
      return NextResponse.json({ error: 'Address not found' }, { status: 404 });
    }

    const address = await db.$transaction(async (tx) => {
      if (parsed.data.isDefault === true) {
        await tx.address.updateMany({ where: { userId: user.id, isDefault: true }, data: { isDefault: false } });
      }
      return tx.address.update({ where: { id }, data: parsed.data });
    });

    return NextResponse.json({ address: serializeAddress(address) });
  } catch (error) {
    console.error('address PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update address' }, { status: 500 });
  }
}

// DELETE /api/addresses/[id] — remove a saved address (owner only).
// If the default address is deleted, the most recent remaining one is promoted.
export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Login required' }, { status: 401 });
    }
    const { id } = await ctx.params;

    const existing = await db.address.findUnique({ where: { id } });
    if (!existing || existing.userId !== user.id) {
      return NextResponse.json({ error: 'Address not found' }, { status: 404 });
    }

    await db.$transaction(async (tx) => {
      await tx.address.delete({ where: { id } });
      if (existing.isDefault) {
        const next = await tx.address.findFirst({
          where: { userId: user.id },
          orderBy: { updatedAt: 'desc' },
        });
        if (next) {
          await tx.address.update({ where: { id: next.id }, data: { isDefault: true } });
        }
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('address DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete address' }, { status: 500 });
  }
}
