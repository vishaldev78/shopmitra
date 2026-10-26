import { sql } from '../db/connection';

// Password hashing using Web Crypto API
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + 'shopverse_salt_2024');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const computed = await hashPassword(password);
  return computed === hash;
}

// JWT-like token management
function generateToken(userId: string, role: string): string {
  const payload = { userId, role, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 };
  return btoa(JSON.stringify(payload));
}

function decodeToken(token: string): { userId: string; role: string; exp: number } | null {
  try {
    const payload = JSON.parse(atob(token));
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: 'customer' | 'admin' | 'super_admin';
  avatar_url?: string;
  is_active: boolean;
}

// Register new user
export async function registerUser(email: string, password: string, name: string): Promise<{ success: boolean; user?: AuthUser; token?: string; error?: string }> {
  try {
    const existing = await sql`SELECT id FROM users WHERE email = ${email}`;
    if (existing.length > 0) {
      return { success: false, error: 'Email already registered' };
    }

    const passwordHash = await hashPassword(password);
    const result = await sql`
      INSERT INTO users (email, password_hash, name, role, is_active, email_verified)
      VALUES (${email}, ${passwordHash}, ${name}, 'customer', true, false)
      RETURNING id, email, name, role, avatar_url, is_active
    `;

    const user: AuthUser = {
      id: result[0].id,
      email: result[0].email,
      name: result[0].name,
      role: result[0].role,
      avatar_url: result[0].avatar_url,
      is_active: result[0].is_active,
    };
    const token = generateToken(user.id, user.role);
    localStorage.setItem('shopverse_token', token);
    localStorage.setItem('shopverse_user', JSON.stringify(user));

    return { success: true, user, token };
  } catch (error: any) {
    console.error('Register error:', error);
    return { success: false, error: error.message || 'Registration failed' };
  }
}

// Login user
export async function loginUser(email: string, password: string): Promise<{ success: boolean; user?: AuthUser; token?: string; error?: string }> {
  try {
    const result = await sql`
      SELECT id, email, password_hash, name, role, avatar_url, is_active
      FROM users WHERE email = ${email}
    `;

    if (result.length === 0) {
      return { success: false, error: 'Invalid email or password' };
    }

    const userRecord = result[0];
    if (!userRecord.is_active) {
      return { success: false, error: 'Account is deactivated' };
    }

    const isValid = await verifyPassword(password, userRecord.password_hash);
    if (!isValid) {
      return { success: false, error: 'Invalid email or password' };
    }

    const user: AuthUser = {
      id: userRecord.id,
      email: userRecord.email,
      name: userRecord.name,
      role: userRecord.role,
      avatar_url: userRecord.avatar_url,
      is_active: userRecord.is_active,
    };

    const token = generateToken(user.id, user.role);
    localStorage.setItem('shopverse_token', token);
    localStorage.setItem('shopverse_user', JSON.stringify(user));

    // Log the action
    await sql`
      INSERT INTO audit_logs (user_id, action, entity_type, details)
      VALUES (${user.id}, 'login', 'user', ${JSON.stringify({ email })}::jsonb)
    `;

    return { success: true, user, token };
  } catch (error: any) {
    console.error('Login error:', error);
    return { success: false, error: error.message || 'Login failed' };
  }
}

// Get current user from token
export function getCurrentUser(): AuthUser | null {
  try {
    const token = localStorage.getItem('shopverse_token');
    if (!token) return null;

    const decoded = decodeToken(token);
    if (!decoded) {
      localStorage.removeItem('shopverse_token');
      localStorage.removeItem('shopverse_user');
      return null;
    }

    const userStr = localStorage.getItem('shopverse_user');
    if (!userStr) return null;

    return JSON.parse(userStr);
  } catch {
    return null;
  }
}

// Logout
export function logout() {
  localStorage.removeItem('shopverse_token');
  localStorage.removeItem('shopverse_user');
}

// Check if user has required role
export function hasRole(user: AuthUser | null, requiredRoles: string[]): boolean {
  if (!user) return false;
  return requiredRoles.includes(user.role);
}

// Check if user is admin
export function isAdmin(user: AuthUser | null): boolean {
  return hasRole(user, ['admin', 'super_admin']);
}

// Update user profile
export async function updateProfile(userId: string, data: { name?: string; phone?: string }): Promise<{ success: boolean; error?: string }> {
  try {
    if (data.name) {
      await sql`UPDATE users SET name = ${data.name}, updated_at = NOW() WHERE id = ${userId}`;
    }
    if (data.phone) {
      await sql`UPDATE users SET phone = ${data.phone}, updated_at = NOW() WHERE id = ${userId}`;
    }
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Change password
export async function changePassword(userId: string, currentPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await sql`SELECT password_hash FROM users WHERE id = ${userId}`;
    if (result.length === 0) return { success: false, error: 'User not found' };

    const isValid = await verifyPassword(currentPassword, result[0].password_hash);
    if (!isValid) return { success: false, error: 'Current password is incorrect' };

    const newHash = await hashPassword(newPassword);
    await sql`UPDATE users SET password_hash = ${newHash}, updated_at = NOW() WHERE id = ${userId}`;

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
