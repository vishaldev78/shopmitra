import { createHmac, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import type { AuthUser } from '@/lib/types';

const SESSION_COOKIE = 'shopmitra_session';
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function getSecret(): string {
  return process.env.SESSION_SECRET || 'shopmitra-dev-secret-change-in-production';
}

// ---- Password hashing (bcrypt) ----

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(password, hash);
  } catch {
    return false;
  }
}

// ---- Signed session tokens (HMAC-SHA256) ----

interface SessionPayload {
  userId: string;
  role: string;
  exp: number;
}

function base64url(input: string | Buffer): string {
  return Buffer.from(input).toString('base64url');
}

export function createSessionToken(userId: string, role: string): string {
  const payload: SessionPayload = { userId, role, exp: Date.now() + SESSION_TTL_MS };
  const body = base64url(JSON.stringify(payload));
  const sig = createHmac('sha256', getSecret()).update(body).digest('base64url');
  return `${body}.${sig}`;
}

export function verifySessionToken(token: string): SessionPayload | null {
  try {
    const [body, sig] = token.split('.');
    if (!body || !sig) return null;
    const expected = createHmac('sha256', getSecret()).update(body).digest('base64url');
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString()) as SessionPayload;
    if (!payload.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

// ---- Cookie helpers (server-side) ----

export async function setSessionCookie(userId: string, role: string): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, createSessionToken(userId, role), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_MS / 1000,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 });
}

export async function getSessionUser(): Promise<AuthUser | null> {
  try {
    const store = await cookies();
    const token = store.get(SESSION_COOKIE)?.value;
    if (!token) return null;
    const payload = verifySessionToken(token);
    if (!payload) return null;
    const user = await db.user.findUnique({ where: { id: payload.userId } });
    if (!user || !user.isActive) return null;
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as AuthUser['role'],
      is_active: user.isActive,
    };
  } catch {
    return null;
  }
}

export async function requireAdmin(): Promise<AuthUser | null> {
  const user = await getSessionUser();
  if (!user) return null;
  if (user.role !== 'admin' && user.role !== 'super_admin') return null;
  return user;
}
