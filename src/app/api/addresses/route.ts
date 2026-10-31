import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { serializeAddress } from '@/lib/serialize';

const addressSchema = z.object({
  label: z.enum(['Home', 'Work', 'Other']).default('Home'),
  fullName: z.string().min(1).max(120),
  phone: z.string().min(10).max(15),
  addressLine1: z.string().min(1).max(300),
  addressLine2: z.string().max(300).default(''),
  city: z.string().min(1).max(100),
  state: z.string().min(1).max(100),
  postalCode: z.string().min(6).max(10),
  country: z.string().max(100).default('India'),
  isDefault: z.boolean().optional().default(false),
});

// GET /api/addresses — saved delivery addresses for the signed-in user
export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Login required' }, { status: 401 });
    }
    const addresses = await db.address.findMany({
      where: { userId: user.id },
      orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
    });
    return NextResponse.json({ addresses: addresses.map(serializeAddress) });
  } catch (error) {
    console.error('addresses GET error:', error);
    return NextResponse.json({ error: 'Failed to load addresses' }, { status: 500 });
  }
}

// POST /api/addresses — save a new address. The first address a customer adds
// becomes their default automatically, so checkout never asks again.
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Login required' }, { status: 401 });
    }
    const parsed = addressSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid address details' }, { status: 400 });
    }

    const existingCount = await db.address.count({ where: { userId: user.id } });
    const makeDefault = existingCount === 0 || parsed.data.isDefault === true;

    const address = await db.$transaction(async (tx) => {
      if (makeDefault) {
        await tx.address.updateMany({ where: { userId: user.id, isDefault: true }, data: { isDefault: false } });
      }
      return tx.address.create({
        data: { ...parsed.data, isDefault: makeDefault, userId: user.id },
      });
    });

    return NextResponse.json({ address: serializeAddress(address) }, { status: 201 });
  } catch (error) {
    console.error('addresses POST error:', error);
    return NextResponse.json({ error: 'Failed to save address' }, { status: 500 });
  }
}
