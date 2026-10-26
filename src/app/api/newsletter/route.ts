import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';

const newsletterSchema = z.object({
  email: z.string().email().max(255),
});

// POST /api/newsletter — subscribe an email
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = newsletterSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'Please enter a valid email' }, { status: 400 });
    }

    await db.subscriber.upsert({
      where: { email: parsed.data.email.toLowerCase() },
      update: {},
      create: { email: parsed.data.email.toLowerCase() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('newsletter error:', error);
    return NextResponse.json({ success: false, error: 'Subscription failed' }, { status: 500 });
  }
}
