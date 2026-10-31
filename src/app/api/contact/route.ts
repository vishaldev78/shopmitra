import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';

const contactSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email().max(255),
  subject: z.string().min(1).max(200),
  message: z.string().min(1).max(5000),
});

// POST /api/contact — store contact form submissions
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = contactSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'Please fill in all fields correctly' }, { status: 400 });
    }

    await db.contactMessage.create({ data: parsed.data });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('contact error:', error);
    return NextResponse.json({ success: false, error: 'Failed to send message' }, { status: 500 });
  }
}
