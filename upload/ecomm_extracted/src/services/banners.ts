import { sql } from '../db/connection';
import { type AuthUser, isAdmin } from './auth';

export interface Banner {
  id: string;
  title: string;
  subtitle: string | null;
  cta_text: string | null;
  cta_link: string | null;
  image_url: string | null;
  background_color: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

// Get active banners
export async function getActiveBanners(): Promise<Banner[]> {
  try {
    const result = await sql`
      SELECT * FROM banners
      WHERE is_active = true
        AND (starts_at IS NULL OR starts_at <= NOW())
        AND (ends_at IS NULL OR ends_at >= NOW())
      ORDER BY sort_order ASC
    `;
    return result as Banner[];
  } catch (error) {
    return [];
  }
}

// Get all banners (admin)
export async function getAllBanners(user: AuthUser): Promise<Banner[]> {
  if (!isAdmin(user)) return [];
  try {
    const result = await sql`SELECT * FROM banners ORDER BY sort_order ASC`;
    return result as Banner[];
  } catch (error) {
    return [];
  }
}

// Create banner (admin)
export async function createBanner(user: AuthUser, data: {
  title: string;
  subtitle?: string;
  cta_text?: string;
  cta_link?: string;
  image_url?: string;
  background_color?: string;
  sort_order?: number;
}): Promise<{ success: boolean; banner?: Banner; error?: string }> {
  if (!isAdmin(user)) {
    return { success: false, error: 'Unauthorized: Admin access required' };
  }

  try {
    const result = await sql`
      INSERT INTO banners (title, subtitle, cta_text, cta_link, image_url, background_color, sort_order)
      VALUES (
        ${data.title},
        ${data.subtitle || null},
        ${data.cta_text || null},
        ${data.cta_link || null},
        ${data.image_url || null},
        ${data.background_color || null},
        ${data.sort_order || 0}
      )
      RETURNING *
    `;

    await sql`
      INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
      VALUES (${user.id}, 'create_banner', 'banner', ${result[0].id}, ${JSON.stringify({ title: data.title })}::jsonb)
    `;

    return { success: true, banner: result[0] as Banner };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Update banner (admin)
export async function updateBanner(user: AuthUser, bannerId: string, data: Partial<{
  title: string;
  subtitle: string;
  cta_text: string;
  cta_link: string;
  image_url: string;
  background_color: string;
  is_active: boolean;
  sort_order: number;
}>): Promise<{ success: boolean; error?: string }> {
  if (!isAdmin(user)) {
    return { success: false, error: 'Unauthorized: Admin access required' };
  }

  try {
    if (data.title !== undefined) await sql`UPDATE banners SET title = ${data.title}, updated_at = NOW() WHERE id = ${bannerId}`;
    if (data.subtitle !== undefined) await sql`UPDATE banners SET subtitle = ${data.subtitle}, updated_at = NOW() WHERE id = ${bannerId}`;
    if (data.cta_text !== undefined) await sql`UPDATE banners SET cta_text = ${data.cta_text}, updated_at = NOW() WHERE id = ${bannerId}`;
    if (data.cta_link !== undefined) await sql`UPDATE banners SET cta_link = ${data.cta_link}, updated_at = NOW() WHERE id = ${bannerId}`;
    if (data.image_url !== undefined) await sql`UPDATE banners SET image_url = ${data.image_url}, updated_at = NOW() WHERE id = ${bannerId}`;
    if (data.background_color !== undefined) await sql`UPDATE banners SET background_color = ${data.background_color}, updated_at = NOW() WHERE id = ${bannerId}`;
    if (data.is_active !== undefined) await sql`UPDATE banners SET is_active = ${data.is_active}, updated_at = NOW() WHERE id = ${bannerId}`;
    if (data.sort_order !== undefined) await sql`UPDATE banners SET sort_order = ${data.sort_order}, updated_at = NOW() WHERE id = ${bannerId}`;

    await sql`
      INSERT INTO audit_logs (user_id, action, entity_type, entity_id)
      VALUES (${user.id}, 'update_banner', 'banner', ${bannerId})
    `;

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Delete banner (admin)
export async function deleteBanner(user: AuthUser, bannerId: string): Promise<{ success: boolean; error?: string }> {
  if (!isAdmin(user)) {
    return { success: false, error: 'Unauthorized: Admin access required' };
  }

  try {
    await sql`DELETE FROM banners WHERE id = ${bannerId}`;

    await sql`
      INSERT INTO audit_logs (user_id, action, entity_type, entity_id)
      VALUES (${user.id}, 'delete_banner', 'banner', ${bannerId})
    `;

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Coupon management
export async function validateCoupon(code: string, orderAmount: number): Promise<{ valid: boolean; discount: number; type: string; error?: string }> {
  try {
    const result = await sql`
      SELECT * FROM coupons
      WHERE code = ${code.toUpperCase()}
        AND is_active = true
        AND (starts_at IS NULL OR starts_at <= NOW())
        AND (ends_at IS NULL OR ends_at >= NOW())
    `;

    if (result.length === 0) {
      return { valid: false, discount: 0, type: '', error: 'Invalid coupon code' };
    }

    const coupon = result[0];

    if (Number(coupon.min_order_amount) > orderAmount) {
      return { valid: false, discount: 0, type: '', error: `Minimum order amount: ₹${coupon.min_order_amount}` };
    }

    if (coupon.usage_limit && Number(coupon.used_count) >= Number(coupon.usage_limit)) {
      return { valid: false, discount: 0, type: '', error: 'Coupon usage limit reached' };
    }

    let discount = 0;
    if (coupon.discount_type === 'percentage') {
      discount = Math.round(orderAmount * Number(coupon.discount_value) / 100);
      if (coupon.max_discount) {
        discount = Math.min(discount, Number(coupon.max_discount));
      }
    } else {
      discount = Number(coupon.discount_value);
    }

    return { valid: true, discount, type: coupon.discount_type };
  } catch (error) {
    return { valid: false, discount: 0, type: '', error: 'Failed to validate coupon' };
  }
}

export async function incrementCouponUsage(code: string): Promise<void> {
  try {
    await sql`UPDATE coupons SET used_count = used_count + 1 WHERE code = ${code.toUpperCase()}`;
  } catch (error) {
    console.error('Failed to increment coupon usage:', error);
  }
}
