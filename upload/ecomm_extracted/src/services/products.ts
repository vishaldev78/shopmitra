import { sql } from '../db/connection';
import { type AuthUser, isAdmin } from './auth';

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  short_description: string | null;
  price: number;
  compare_price: number | null;
  images: string[];
  category_id: string | null;
  category_name?: string;
  brand: string | null;
  sku: string | null;
  stock: number;
  rating: number;
  review_count: number;
  is_featured: boolean;
  is_active: boolean;
  tags: string[];
  specifications: Record<string, string>;
  created_at: string;
  updated_at: string;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  name: string;
  value: string;
  price_adjustment: number;
  stock: number;
}

// Get all products with filters
export async function getProducts(filters: {
  category?: string;
  search?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  tag?: string;
  sort?: string;
  page?: number;
  limit?: number;
} = {}): Promise<{ products: Product[]; total: number }> {
  try {
    let query = sql`
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.is_active = true
    `;

    const conditions: any[] = [];

    if (filters.category) {
      conditions.push(sql`p.category_id IN (SELECT id FROM categories WHERE slug = ${filters.category})`);
    }
    if (filters.search) {
      conditions.push(sql`(p.name ILIKE ${'%' + filters.search + '%'} OR p.description ILIKE ${'%' + filters.search + '%'} OR p.brand ILIKE ${'%' + filters.search + '%'})`);
    }
    if (filters.brand) {
      conditions.push(sql`p.brand = ${filters.brand}`);
    }
    if (filters.minPrice) {
      conditions.push(sql`p.price >= ${filters.minPrice}`);
    }
    if (filters.maxPrice) {
      conditions.push(sql`p.price <= ${filters.maxPrice}`);
    }
    if (filters.tag) {
      conditions.push(sql`${filters.tag} = ANY(p.tags)`);
    }

    // Build the full query with conditions
    let whereClause = '';
    if (conditions.length > 0) {
      whereClause = ' AND ' + conditions.map((_, i) => `__cond_${i}`).join(' AND ');
    }

    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const offset = (page - 1) * limit;

    let orderBy = 'p.created_at DESC';
    switch (filters.sort) {
      case 'price-low': orderBy = 'p.price ASC'; break;
      case 'price-high': orderBy = 'p.price DESC'; break;
      case 'rating': orderBy = 'p.rating DESC'; break;
      case 'newest': orderBy = 'p.created_at DESC'; break;
      case 'popularity': orderBy = 'p.review_count DESC'; break;
    }

    // Simple approach - fetch all and filter in memory for complex queries
    const allProducts = await sql`
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.is_active = true
      ORDER BY ${sql.unsafe(orderBy)}
    `;

    let filtered = allProducts as any[];

    if (filters.category) {
      filtered = filtered.filter((p: any) => {
        const catSlug = getCategorySlug(p.category_id, allProducts);
        return catSlug === filters.category;
      });
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      filtered = filtered.filter((p: any) =>
        p.name?.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q) ||
        p.brand?.toLowerCase().includes(q)
      );
    }
    if (filters.brand) {
      filtered = filtered.filter((p: any) => p.brand === filters.brand);
    }
    if (filters.minPrice) {
      filtered = filtered.filter((p: any) => Number(p.price) >= filters.minPrice!);
    }
    if (filters.maxPrice) {
      filtered = filtered.filter((p: any) => Number(p.price) <= filters.maxPrice!);
    }
    if (filters.tag) {
      filtered = filtered.filter((p: any) => Array.isArray(p.tags) && p.tags.includes(filters.tag));
    }

    const total = filtered.length;
    const paginated = filtered.slice(offset, offset + limit);

    return {
      products: paginated.map(mapProduct),
      total,
    };
  } catch (error) {
    console.error('Get products error:', error);
    return { products: [], total: 0 };
  }
}

function getCategorySlug(categoryId: string, products: any[]): string | null {
  // This is a simplified helper - in production you'd join properly
  return null;
}

function mapProduct(row: any): Product {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    short_description: row.short_description,
    price: Number(row.price),
    compare_price: row.compare_price ? Number(row.compare_price) : null,
    images: Array.isArray(row.images) ? row.images : [],
    category_id: row.category_id,
    category_name: row.category_name,
    brand: row.brand,
    sku: row.sku,
    stock: Number(row.stock),
    rating: Number(row.rating),
    review_count: Number(row.review_count),
    is_featured: row.is_featured,
    is_active: row.is_active,
    tags: Array.isArray(row.tags) ? row.tags : [],
    specifications: typeof row.specifications === 'string' ? JSON.parse(row.specifications) : (row.specifications || {}),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

// Get single product by slug
export async function getProductBySlug(slug: string): Promise<Product | null> {
  try {
    const result = await sql`
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.slug = ${slug}
    `;
    if (result.length === 0) return null;
    return mapProduct(result[0]);
  } catch (error) {
    console.error('Get product error:', error);
    return null;
  }
}

// Get product by ID
export async function getProductById(id: string): Promise<Product | null> {
  try {
    const result = await sql`
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.id = ${id}
    `;
    if (result.length === 0) return null;
    return mapProduct(result[0]);
  } catch (error) {
    return null;
  }
}

// Get product variants
export async function getProductVariants(productId: string): Promise<ProductVariant[]> {
  try {
    const result = await sql`SELECT * FROM product_variants WHERE product_id = ${productId}`;
    return result.map((v: any) => ({
      id: v.id,
      product_id: v.product_id,
      name: v.name,
      value: v.value,
      price_adjustment: Number(v.price_adjustment),
      stock: Number(v.stock),
    }));
  } catch (error) {
    return [];
  }
}

// CREATE product (admin only)
export async function createProduct(user: AuthUser, data: {
  name: string;
  slug: string;
  description?: string;
  short_description?: string;
  price: number;
  compare_price?: number;
  images?: string[];
  category_id?: string;
  brand?: string;
  sku?: string;
  stock?: number;
  is_featured?: boolean;
  tags?: string[];
  specifications?: Record<string, string>;
}): Promise<{ success: boolean; product?: Product; error?: string }> {
  if (!isAdmin(user)) {
    return { success: false, error: 'Unauthorized: Admin access required' };
  }

  try {
    const result = await sql`
      INSERT INTO products (name, slug, description, short_description, price, compare_price, images, category_id, brand, sku, stock, is_featured, tags, specifications)
      VALUES (
        ${data.name},
        ${data.slug},
        ${data.description || null},
        ${data.short_description || null},
        ${data.price},
        ${data.compare_price || null},
        ${data.images || []},
        ${data.category_id || null},
        ${data.brand || null},
        ${data.sku || null},
        ${data.stock || 0},
        ${data.is_featured || false},
        ${data.tags || []},
        ${JSON.stringify(data.specifications || {})}::jsonb
      )
      RETURNING *
    `;

    // Log the action
    await sql`
      INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
      VALUES (${user.id}, 'create_product', 'product', ${result[0].id}, ${JSON.stringify({ name: data.name })}::jsonb)
    `;

    return { success: true, product: mapProduct(result[0]) };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to create product' };
  }
}

// UPDATE product (admin only)
export async function updateProduct(user: AuthUser, productId: string, data: Partial<{
  name: string;
  description: string;
  short_description: string;
  price: number;
  compare_price: number;
  images: string[];
  category_id: string;
  brand: string;
  sku: string;
  stock: number;
  is_featured: boolean;
  is_active: boolean;
  tags: string[];
  specifications: Record<string, string>;
}>): Promise<{ success: boolean; error?: string }> {
  if (!isAdmin(user)) {
    return { success: false, error: 'Unauthorized: Admin access required' };
  }

  try {
    if (data.name !== undefined) await sql`UPDATE products SET name = ${data.name}, updated_at = NOW() WHERE id = ${productId}`;
    if (data.description !== undefined) await sql`UPDATE products SET description = ${data.description}, updated_at = NOW() WHERE id = ${productId}`;
    if (data.short_description !== undefined) await sql`UPDATE products SET short_description = ${data.short_description}, updated_at = NOW() WHERE id = ${productId}`;
    if (data.price !== undefined) await sql`UPDATE products SET price = ${data.price}, updated_at = NOW() WHERE id = ${productId}`;
    if (data.compare_price !== undefined) await sql`UPDATE products SET compare_price = ${data.compare_price}, updated_at = NOW() WHERE id = ${productId}`;
    if (data.images !== undefined) await sql`UPDATE products SET images = ${data.images}, updated_at = NOW() WHERE id = ${productId}`;
    if (data.category_id !== undefined) await sql`UPDATE products SET category_id = ${data.category_id}, updated_at = NOW() WHERE id = ${productId}`;
    if (data.brand !== undefined) await sql`UPDATE products SET brand = ${data.brand}, updated_at = NOW() WHERE id = ${productId}`;
    if (data.stock !== undefined) await sql`UPDATE products SET stock = ${data.stock}, updated_at = NOW() WHERE id = ${productId}`;
    if (data.is_featured !== undefined) await sql`UPDATE products SET is_featured = ${data.is_featured}, updated_at = NOW() WHERE id = ${productId}`;
    if (data.is_active !== undefined) await sql`UPDATE products SET is_active = ${data.is_active}, updated_at = NOW() WHERE id = ${productId}`;
    if (data.tags !== undefined) await sql`UPDATE products SET tags = ${data.tags}, updated_at = NOW() WHERE id = ${productId}`;
    if (data.specifications !== undefined) await sql`UPDATE products SET specifications = ${JSON.stringify(data.specifications)}::jsonb, updated_at = NOW() WHERE id = ${productId}`;

    await sql`
      INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
      VALUES (${user.id}, 'update_product', 'product', ${productId}, ${JSON.stringify(data)}::jsonb)
    `;

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to update product' };
  }
}

// DELETE product (admin only)
export async function deleteProduct(user: AuthUser, productId: string): Promise<{ success: boolean; error?: string }> {
  if (!isAdmin(user)) {
    return { success: false, error: 'Unauthorized: Admin access required' };
  }

  try {
    // Check if product has orders
    const orderCheck = await sql`
      SELECT COUNT(*) as count FROM order_items WHERE product_id = ${productId}
    `;
    if (Number(orderCheck[0].count) > 0) {
      // Soft delete - just deactivate
      await sql`UPDATE products SET is_active = false, updated_at = NOW() WHERE id = ${productId}`;
    } else {
      await sql`DELETE FROM products WHERE id = ${productId}`;
    }

    await sql`
      INSERT INTO audit_logs (user_id, action, entity_type, entity_id)
      VALUES (${user.id}, 'delete_product', 'product', ${productId})
    `;

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to delete product' };
  }
}

// Get all categories
export async function getCategories() {
  try {
    return await sql`SELECT * FROM categories WHERE is_active = true ORDER BY sort_order`;
  } catch (error) {
    return [];
  }
}

// Get featured products
export async function getFeaturedProducts(): Promise<Product[]> {
  try {
    const result = await sql`
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.is_active = true AND p.is_featured = true
      ORDER BY p.review_count DESC
      LIMIT 8
    `;
    return result.map(mapProduct);
  } catch (error) {
    return [];
  }
}
