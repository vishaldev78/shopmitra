import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { hashPassword, verifyPassword, setSessionCookie, clearSessionCookie, getSessionUser } from '@/lib/auth';

const registerSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email().max(255),
  password: z.string().min(6).max(128),
  accountType: z.enum(['customer', 'seller']).optional().default('customer'),
  shopName: z.string().min(2).max(60).optional(),
});

const loginSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(1).max(128),
});

// POST /api/auth — { action: 'register' | 'login' | 'logout' }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const action = (body as { action?: string }).action;

    if (action === 'logout') {
      await clearSessionCookie();
      return NextResponse.json({ success: true });
    }

    if (action === 'register') {
      const parsed = registerSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ success: false, error: 'Invalid input. Password must be at least 6 characters.' }, { status: 400 });
      }
      const { name, email, password, accountType, shopName } = parsed.data;

      const existing = await db.user.findUnique({ where: { email: email.toLowerCase() } });
      if (existing) {
        return NextResponse.json({ success: false, error: 'Email already registered' }, { status: 409 });
      }

      // Sellers register as admins of their own shop (multi-vendor marketplace).
      const isSeller = accountType === 'seller';
      const user = await db.user.create({
        data: {
          email: email.toLowerCase(),
          passwordHash: await hashPassword(password),
          name,
          role: isSeller ? 'admin' : 'customer',
          ...(isSeller ? { shopName: shopName?.trim() || `${name}'s Shop` } : {}),
        },
      });

      await setSessionCookie(user.id, user.role);
      return NextResponse.json({
        success: true,
        user: { id: user.id, email: user.email, name: user.name, role: user.role, is_active: user.isActive },
      });
    }

    if (action === 'login') {
      const parsed = loginSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ success: false, error: 'Please provide valid email and password' }, { status: 400 });
      }
      const { email, password } = parsed.data;

      const user = await db.user.findUnique({ where: { email: email.toLowerCase() } });
      if (!user) {
        return NextResponse.json({ success: false, error: 'Invalid email or password' }, { status: 401 });
      }

      const passwordOk = await verifyPassword(password, user.passwordHash);
      if (!passwordOk) {
        return NextResponse.json({ success: false, error: 'Invalid email or password' }, { status: 401 });
      }

      if (!user.isActive) {
        return NextResponse.json({ success: false, error: 'Account is deactivated' }, { status: 403 });
      }

      await setSessionCookie(user.id, user.role);
      return NextResponse.json({
        success: true,
        user: { id: user.id, email: user.email, name: user.name, role: user.role, is_active: user.isActive },
      });
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('auth error:', error);
    return NextResponse.json({ success: false, error: 'Authentication failed' }, { status: 500 });
  }
}

// GET /api/auth — current session user
export async function GET() {
  const user = await getSessionUser();
  return NextResponse.json({ user });
}
