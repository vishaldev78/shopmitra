import React, { createContext, useContext, useReducer, useEffect, useState, type ReactNode } from 'react';
import { db, initDatabase, seedDatabase } from '../lib/db';

// Types
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
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: 'customer' | 'admin' | 'super_admin';
  is_active: boolean;
}

export interface Order {
  id: string;
  order_number: string;
  user_id: string | null;
  items: Array<{
    product_id: string;
    product_name: string;
    product_image?: string;
    quantity: number;
    unit_price: number;
    total_price: number;
  }>;
  subtotal: number;
  discount: number;
  shipping: number;
  tax: number;
  total: number;
  status: string;
  payment_status: string;
  payment_method: string;
  payment_id?: string;
  shipping_address: any;
  created_at: string;
}

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
}

interface AppState {
  cart: CartItem[];
  wishlist: string[];
  user: AuthUser | null;
  orders: Order[];
  products: Product[];
  banners: Banner[];
  isLoggedIn: boolean;
  couponCode: string | null;
  couponDiscount: number;
  notification: { type: 'success' | 'error' | 'info'; message: string } | null;
  dbReady: boolean;
  loading: boolean;
}

type Action =
  | { type: 'ADD_TO_CART'; product: Product; quantity: number }
  | { type: 'UPDATE_CART_QUANTITY'; productId: string; quantity: number }
  | { type: 'REMOVE_FROM_CART'; productId: string }
  | { type: 'CLEAR_CART' }
  | { type: 'TOGGLE_WISHLIST'; productId: string }
  | { type: 'LOGIN'; user: AuthUser }
  | { type: 'LOGOUT' }
  | { type: 'ADD_ORDER'; order: Order }
  | { type: 'APPLY_COUPON'; code: string; discount: number }
  | { type: 'REMOVE_COUPON' }
  | { type: 'SET_NOTIFICATION'; notification: AppState['notification'] }
  | { type: 'SET_PRODUCTS'; products: Product[] }
  | { type: 'SET_BANNERS'; banners: Banner[] }
  | { type: 'SET_DB_READY'; ready: boolean }
  | { type: 'SET_LOADING'; loading: boolean }
  | { type: 'UPDATE_PRODUCT'; product: Product }
  | { type: 'DELETE_PRODUCT'; productId: string }
  | { type: 'ADD_PRODUCT'; product: Product }
  | { type: 'ADD_BANNER'; banner: Banner }
  | { type: 'UPDATE_BANNER'; banner: Banner }
  | { type: 'DELETE_BANNER'; bannerId: string };

const initialState: AppState = {
  cart: [],
  wishlist: [],
  user: null,
  orders: [],
  products: [],
  banners: [],
  isLoggedIn: false,
  couponCode: null,
  couponDiscount: 0,
  notification: null,
  dbReady: false,
  loading: true,
};

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'ADD_TO_CART': {
      const existingIndex = state.cart.findIndex(item => item.product.id === action.product.id);
      if (existingIndex >= 0) {
        const newCart = [...state.cart];
        newCart[existingIndex].quantity += action.quantity;
        return { ...state, cart: newCart };
      }
      return { ...state, cart: [...state.cart, { product: action.product, quantity: action.quantity }] };
    }
    case 'UPDATE_CART_QUANTITY':
      return { ...state, cart: state.cart.map(item => item.product.id === action.productId ? { ...item, quantity: Math.max(1, Math.min(action.quantity, item.product.stock)) } : item) };
    case 'REMOVE_FROM_CART':
      return { ...state, cart: state.cart.filter(item => item.product.id !== action.productId) };
    case 'CLEAR_CART':
      return { ...state, cart: [] };
    case 'TOGGLE_WISHLIST': {
      const isInWishlist = state.wishlist.includes(action.productId);
      return { ...state, wishlist: isInWishlist ? state.wishlist.filter(id => id !== action.productId) : [...state.wishlist, action.productId] };
    }
    case 'LOGIN':
      return { ...state, user: action.user, isLoggedIn: true };
    case 'LOGOUT':
      return { ...state, user: null, isLoggedIn: false };
    case 'ADD_ORDER':
      return { ...state, orders: [action.order, ...state.orders], cart: [], couponCode: null, couponDiscount: 0 };
    case 'APPLY_COUPON':
      return { ...state, couponCode: action.code, couponDiscount: action.discount };
    case 'REMOVE_COUPON':
      return { ...state, couponCode: null, couponDiscount: 0 };
    case 'SET_NOTIFICATION':
      return { ...state, notification: action.notification };
    case 'SET_PRODUCTS':
      return { ...state, products: action.products };
    case 'SET_BANNERS':
      return { ...state, banners: action.banners };
    case 'SET_DB_READY':
      return { ...state, dbReady: action.ready };
    case 'SET_LOADING':
      return { ...state, loading: action.loading };
    case 'UPDATE_PRODUCT':
      return { ...state, products: state.products.map(p => p.id === action.product.id ? action.product : p) };
    case 'DELETE_PRODUCT':
      return { ...state, products: state.products.filter(p => p.id !== action.productId) };
    case 'ADD_PRODUCT':
      return { ...state, products: [...state.products, action.product] };
    case 'ADD_BANNER':
      return { ...state, banners: [...state.banners, action.banner] };
    case 'UPDATE_BANNER':
      return { ...state, banners: state.banners.map(b => b.id === action.banner.id ? action.banner : b) };
    case 'DELETE_BANNER':
      return { ...state, banners: state.banners.filter(b => b.id !== action.bannerId) };
    default:
      return state;
  }
}

const AppContext = createContext<{ state: AppState; dispatch: React.Dispatch<Action> } | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState, (init) => {
    try {
      const saved = localStorage.getItem('shopmitra_state');
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...init, cart: parsed.cart || [], wishlist: parsed.wishlist || [] };
      }
    } catch {}
    return init;
  });

  // Initialize database and load data
  useEffect(() => {
    async function init() {
      try {
        dispatch({ type: 'SET_LOADING', loading: true });

        // Initialize database schema
        await initDatabase();

        // Seed demo data
        await seedDatabase();

        // Load products from REAL database
        const products = await db`
          SELECT p.*, c.name as category_name
          FROM products p
          LEFT JOIN categories c ON p.category_id = c.id
          WHERE p.is_active = true
          ORDER BY p.created_at DESC
        `;

        // Load banners from REAL database
        const banners = await db`
          SELECT * FROM banners WHERE is_active = true ORDER BY sort_order
        `;

        // Map products
        const mappedProducts: Product[] = products.map((p: any) => ({
          id: p.id,
          name: p.name,
          slug: p.slug,
          description: p.description,
          short_description: p.short_description,
          price: Number(p.price),
          compare_price: p.compare_price ? Number(p.compare_price) : null,
          images: Array.isArray(p.images) ? p.images : [],
          category_id: p.category_id,
          category_name: p.category_name,
          brand: p.brand,
          sku: p.sku,
          stock: Number(p.stock),
          rating: Number(p.rating),
          review_count: Number(p.review_count),
          is_featured: p.is_featured,
          is_active: p.is_active,
          tags: Array.isArray(p.tags) ? p.tags : [],
          specifications: typeof p.specifications === 'string' ? JSON.parse(p.specifications) : (p.specifications || {}),
          created_at: p.created_at,
        }));

        dispatch({ type: 'SET_PRODUCTS', products: mappedProducts });
        dispatch({ type: 'SET_BANNERS', banners: banners as Banner[] });
        dispatch({ type: 'SET_DB_READY', ready: true });

        // Check for existing auth
        const token = localStorage.getItem('shopmitra_token');
        const userStr = localStorage.getItem('shopmitra_user');
        if (token && userStr) {
          try {
            const user = JSON.parse(userStr);
            const decoded = JSON.parse(atob(token));
            if (decoded.exp > Date.now()) {
              dispatch({ type: 'LOGIN', user });

              // Load user orders from REAL database
              const orders = await db`
                SELECT * FROM orders WHERE user_id = ${user.id} ORDER BY created_at DESC
              `;

              if (orders.length > 0) {
                const mappedOrders: Order[] = orders.map((o: any) => ({
                  id: o.id,
                  order_number: o.order_number,
                  user_id: o.user_id,
                  items: [],
                  subtotal: Number(o.subtotal),
                  discount: Number(o.discount),
                  shipping: Number(o.shipping),
                  tax: Number(o.tax),
                  total: Number(o.total),
                  status: o.status,
                  payment_status: o.payment_status,
                  payment_method: o.payment_method,
                  payment_id: o.payment_id,
                  shipping_address: o.shipping_address,
                  created_at: o.created_at,
                }));
                // Update state with orders
                dispatch({ type: 'ADD_ORDER', order: mappedOrders[0] });
              }
            }
          } catch {}
        }
      } catch (error) {
        console.error('Initialization error:', error);
      } finally {
        dispatch({ type: 'SET_LOADING', loading: false });
      }
    }
    init();
  }, []);

  // Persist cart and wishlist
  useEffect(() => {
    localStorage.setItem('shopmitra_state', JSON.stringify({ cart: state.cart, wishlist: state.wishlist }));
  }, [state.cart, state.wishlist]);

  // Auto-dismiss notifications
  useEffect(() => {
    if (state.notification) {
      const timer = setTimeout(() => dispatch({ type: 'SET_NOTIFICATION', notification: null }), 3000);
      return () => clearTimeout(timer);
    }
  }, [state.notification]);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}

// Helper functions
export function getCartTotal(cart: CartItem[], couponDiscount: number = 0) {
  const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const discount = Math.round(subtotal * (couponDiscount / 100));
  const shipping = subtotal > 999 ? 0 : 99;
  const tax = Math.round((subtotal - discount) * 0.18);
  const total = subtotal - discount + shipping + tax;
  return { subtotal, discount, shipping, tax, total };
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(price);
}

export function getDiscount(price: number, comparePrice: number | null): number {
  if (!comparePrice || comparePrice <= price) return 0;
  return Math.round(((comparePrice - price) / comparePrice) * 100);
}

export function generateOrderNumber(): string {
  return 'SM-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
}

// Auth helpers using REAL database
export async function loginUser(email: string, password: string): Promise<{ success: boolean; user?: AuthUser; error?: string }> {
  try {
    const users = await db`
      SELECT id, email, name, role, is_active, password_hash FROM users WHERE email = ${email}
    `;

    if (users.length === 0) {
      return { success: false, error: 'Invalid email or password' };
    }

    const user = users[0];
    if (user.password_hash !== password) {
      return { success: false, error: 'Invalid email or password' };
    }

    if (!user.is_active) {
      return { success: false, error: 'Account is deactivated' };
    }

    const authUser: AuthUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      is_active: user.is_active,
    };

    const token = btoa(JSON.stringify({ userId: user.id, role: user.role, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 }));
    localStorage.setItem('shopmitra_token', token);
    localStorage.setItem('shopmitra_user', JSON.stringify(authUser));

    return { success: true, user: authUser };
  } catch (error: any) {
    return { success: false, error: error.message || 'Login failed' };
  }
}

export async function registerUser(email: string, password: string, name: string): Promise<{ success: boolean; user?: AuthUser; error?: string }> {
  try {
    const existing = await db`SELECT id FROM users WHERE email = ${email}`;
    if (existing.length > 0) {
      return { success: false, error: 'Email already registered' };
    }

    const result = await db`
      INSERT INTO users (email, password_hash, name, role, is_active)
      VALUES (${email}, ${password}, ${name}, 'customer', true)
      RETURNING id, email, name, role, is_active
    `;

    const authUser: AuthUser = {
      id: result[0].id,
      email: result[0].email,
      name: result[0].name,
      role: result[0].role,
      is_active: result[0].is_active,
    };

    const token = btoa(JSON.stringify({ userId: authUser.id, role: authUser.role, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 }));
    localStorage.setItem('shopmitra_token', token);
    localStorage.setItem('shopmitra_user', JSON.stringify(authUser));

    return { success: true, user: authUser };
  } catch (error: any) {
    return { success: false, error: error.message || 'Registration failed' };
  }
}

export function logoutUser() {
  localStorage.removeItem('shopmitra_token');
  localStorage.removeItem('shopmitra_user');
}

export function isAdmin(user: AuthUser | null): boolean {
  return user?.role === 'admin' || user?.role === 'super_admin';
}

// Coupon validation using REAL database
export async function validateCoupon(code: string, orderAmount: number): Promise<{ valid: boolean; discount: number; error?: string }> {
  try {
    const coupons = await db`
      SELECT * FROM coupons WHERE code = ${code.toUpperCase()} AND is_active = true
    `;

    if (coupons.length === 0) {
      return { valid: false, discount: 0, error: 'Invalid coupon code' };
    }

    const coupon = coupons[0];
    if (Number(coupon.min_order_amount) > orderAmount) {
      return { valid: false, discount: 0, error: `Minimum order: ₹${coupon.min_order_amount}` };
    }

    let discount = 0;
    if (coupon.discount_type === 'percentage') {
      discount = Math.round(orderAmount * Number(coupon.discount_value) / 100);
    } else {
      discount = Number(coupon.discount_value);
    }

    return { valid: true, discount };
  } catch (error) {
    return { valid: false, discount: 0, error: 'Failed to validate coupon' };
  }
}
