'use client';

import React, { createContext, useContext, useReducer, useEffect, useState, useCallback, type ReactNode } from 'react';
import type { Product, CartItem, AuthUser, Order, Banner, Category } from '@/lib/types';

interface AppState {
  cart: CartItem[];
  wishlist: string[];
  user: AuthUser | null;
  orders: Order[];
  products: Product[];
  banners: Banner[];
  categories: Category[];
  isLoggedIn: boolean;
  couponCode: string | null;
  couponDiscount: number;
  notification: { type: 'success' | 'error' | 'info'; message: string } | null;
  dbReady: boolean;
  loading: boolean;
}

type Action =
  | { type: 'HYDRATE'; cart: CartItem[]; wishlist: string[] }
  | { type: 'ADD_TO_CART'; product: Product; quantity: number }
  | { type: 'UPDATE_CART_QUANTITY'; productId: string; quantity: number }
  | { type: 'REMOVE_FROM_CART'; productId: string }
  | { type: 'CLEAR_CART' }
  | { type: 'TOGGLE_WISHLIST'; productId: string }
  | { type: 'LOGIN'; user: AuthUser }
  | { type: 'LOGOUT' }
  | { type: 'SET_ORDERS'; orders: Order[] }
  | { type: 'ADD_ORDER'; order: Order }
  | { type: 'APPLY_COUPON'; code: string; discount: number }
  | { type: 'REMOVE_COUPON' }
  | { type: 'SET_NOTIFICATION'; notification: AppState['notification'] }
  | { type: 'SET_PRODUCTS'; products: Product[] }
  | { type: 'SET_BANNERS'; banners: Banner[] }
  | { type: 'SET_CATEGORIES'; categories: Category[] }
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
  categories: [],
  isLoggedIn: false,
  couponCode: null,
  couponDiscount: 0,
  notification: null,
  dbReady: false,
  loading: true,
};

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'HYDRATE':
      return { ...state, cart: action.cart, wishlist: action.wishlist };
    case 'ADD_TO_CART': {
      const existingIndex = state.cart.findIndex((item) => item.product.id === action.product.id);
      if (existingIndex >= 0) {
        const newCart = [...state.cart];
        newCart[existingIndex].quantity += action.quantity;
        return { ...state, cart: newCart };
      }
      return { ...state, cart: [...state.cart, { product: action.product, quantity: action.quantity }] };
    }
    case 'UPDATE_CART_QUANTITY':
      return {
        ...state,
        cart: state.cart.map((item) =>
          item.product.id === action.productId
            ? { ...item, quantity: Math.max(1, Math.min(action.quantity, item.product.stock)) }
            : item
        ),
      };
    case 'REMOVE_FROM_CART':
      return { ...state, cart: state.cart.filter((item) => item.product.id !== action.productId) };
    case 'CLEAR_CART':
      return { ...state, cart: [] };
    case 'TOGGLE_WISHLIST': {
      const isInWishlist = state.wishlist.includes(action.productId);
      return {
        ...state,
        wishlist: isInWishlist ? state.wishlist.filter((id) => id !== action.productId) : [...state.wishlist, action.productId],
      };
    }
    case 'LOGIN':
      return { ...state, user: action.user, isLoggedIn: true };
    case 'LOGOUT':
      return { ...state, user: null, isLoggedIn: false, orders: [] };
    case 'SET_ORDERS':
      return { ...state, orders: action.orders };
    case 'ADD_ORDER':
      return { ...state, orders: [action.order, ...state.orders.filter((o) => o.id !== action.order.id)], cart: [], couponCode: null, couponDiscount: 0 };
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
    case 'SET_CATEGORIES':
      return { ...state, categories: action.categories };
    case 'SET_DB_READY':
      return { ...state, dbReady: action.ready };
    case 'SET_LOADING':
      return { ...state, loading: action.loading };
    case 'UPDATE_PRODUCT':
      return { ...state, products: state.products.map((p) => (p.id === action.product.id ? action.product : p)) };
    case 'DELETE_PRODUCT':
      return { ...state, products: state.products.filter((p) => p.id !== action.productId) };
    case 'ADD_PRODUCT':
      return { ...state, products: [action.product, ...state.products] };
    case 'ADD_BANNER':
      return { ...state, banners: [...state.banners, action.banner] };
    case 'UPDATE_BANNER':
      return { ...state, banners: state.banners.map((b) => (b.id === action.banner.id ? action.banner : b)) };
    case 'DELETE_BANNER':
      return { ...state, banners: state.banners.filter((b) => b.id !== action.bannerId) };
    default:
      return state;
  }
}

const AppContext = createContext<{ state: AppState; dispatch: React.Dispatch<Action> } | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [bootstrapped, setBootstrapped] = useState(false);

  // Hydrate persisted cart/wishlist after mount (avoids SSR hydration mismatch)
  useEffect(() => {
    try {
      const saved = localStorage.getItem('shopmitra_state');
      if (saved) {
        const parsed = JSON.parse(saved);
        dispatch({ type: 'HYDRATE', cart: parsed.cart || [], wishlist: parsed.wishlist || [] });
      }
    } catch {}
  }, []);

  // Initialize: load catalog + session in parallel
  useEffect(() => {
    async function init() {
      try {
        dispatch({ type: 'SET_LOADING', loading: true });

        const [productsRes, bannersRes, categoriesRes, meRes] = await Promise.all([
          fetch('/api/products').then((r) => (r.ok ? r.json() : { products: [] })),
          fetch('/api/banners').then((r) => (r.ok ? r.json() : { banners: [] })),
          fetch('/api/categories').then((r) => (r.ok ? r.json() : { categories: [] })),
          fetch('/api/auth').then((r) => (r.ok ? r.json() : { user: null })),
        ]);

        dispatch({ type: 'SET_PRODUCTS', products: productsRes.products || [] });
        dispatch({ type: 'SET_BANNERS', banners: bannersRes.banners || [] });
        dispatch({ type: 'SET_CATEGORIES', categories: categoriesRes.categories || [] });

        const user = meRes.user as AuthUser | null;
        if (user) {
          dispatch({ type: 'LOGIN', user });
          const ordersRes = await fetch('/api/orders').then((r) => (r.ok ? r.json() : { orders: [] }));
          dispatch({ type: 'SET_ORDERS', orders: ordersRes.orders || [] });
        }

        dispatch({ type: 'SET_DB_READY', ready: true });
      } catch (error) {
        console.error('Initialization error:', error);
        dispatch({ type: 'SET_DB_READY', ready: true });
      } finally {
        dispatch({ type: 'SET_LOADING', loading: false });
        setBootstrapped(true);
      }
    }
    init();
  }, []);

  // Persist cart and wishlist
  useEffect(() => {
    if (!bootstrapped) return;
    try {
      localStorage.setItem('shopmitra_state', JSON.stringify({ cart: state.cart, wishlist: state.wishlist }));
    } catch {}
  }, [state.cart, state.wishlist, bootstrapped]);

  // Auto-dismiss notifications
  useEffect(() => {
    if (state.notification) {
      const timer = setTimeout(() => dispatch({ type: 'SET_NOTIFICATION', notification: null }), 3000);
      return () => clearTimeout(timer);
    }
  }, [state.notification]);

  return <AppContext.Provider value={{ state, dispatch }}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}

// ---- Auth API helpers ----

export async function loginUser(
  email: string,
  password: string
): Promise<{ success: boolean; user?: AuthUser; error?: string }> {
  try {
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'login', email, password }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) return { success: false, error: data.error || 'Login failed' };
    return { success: true, user: data.user };
  } catch {
    return { success: false, error: 'Login failed. Please try again.' };
  }
}

export async function registerUser(
  email: string,
  password: string,
  name: string
): Promise<{ success: boolean; user?: AuthUser; error?: string }> {
  try {
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'register', email, password, name }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) return { success: false, error: data.error || 'Registration failed' };
    return { success: true, user: data.user };
  } catch {
    return { success: false, error: 'Registration failed. Please try again.' };
  }
}

export async function logoutUser(): Promise<void> {
  try {
    await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'logout' }),
    });
  } catch {}
}

export async function validateCoupon(
  code: string,
  orderAmount: number
): Promise<{ valid: boolean; discount: number; error?: string }> {
  try {
    const res = await fetch('/api/coupons/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, order_amount: orderAmount }),
    });
    const data = await res.json();
    return { valid: !!data.valid, discount: data.discount || 0, error: data.error };
  } catch {
    return { valid: false, discount: 0, error: 'Failed to validate coupon' };
  }
}

// ---- Client-side admin mutations (call API then update local state) ----

export function useAdminMutations() {
  const { dispatch } = useApp();

  const saveProduct = useCallback(
    async (formData: Record<string, string>, editProduct: Product | null): Promise<boolean> => {
      try {
        if (editProduct) {
          const res = await fetch(`/api/products/${editProduct.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Update failed');
          dispatch({ type: 'UPDATE_PRODUCT', product: data.product });
          dispatch({ type: 'SET_NOTIFICATION', notification: { type: 'success', message: 'Product updated!' } });
        } else {
          const res = await fetch('/api/products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Create failed');
          dispatch({ type: 'ADD_PRODUCT', product: data.product });
          dispatch({ type: 'SET_NOTIFICATION', notification: { type: 'success', message: 'Product created!' } });
        }
        return true;
      } catch (error) {
        dispatch({
          type: 'SET_NOTIFICATION',
          notification: { type: 'error', message: 'Failed to save product: ' + (error as Error).message },
        });
        return false;
      }
    },
    [dispatch]
  );

  const deleteProduct = useCallback(
    async (productId: string): Promise<boolean> => {
      try {
        const res = await fetch(`/api/products/${productId}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Delete failed');
        dispatch({ type: 'DELETE_PRODUCT', productId });
        dispatch({ type: 'SET_NOTIFICATION', notification: { type: 'success', message: 'Product deleted!' } });
        return true;
      } catch (error) {
        dispatch({
          type: 'SET_NOTIFICATION',
          notification: { type: 'error', message: 'Failed to delete product: ' + (error as Error).message },
        });
        return false;
      }
    },
    [dispatch]
  );

  const addBanner = useCallback(
    async (formData: Record<string, string>): Promise<boolean> => {
      try {
        const res = await fetch('/api/banners', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Create failed');
        dispatch({ type: 'ADD_BANNER', banner: data.banner });
        dispatch({ type: 'SET_NOTIFICATION', notification: { type: 'success', message: 'Banner created!' } });
        return true;
      } catch (error) {
        dispatch({
          type: 'SET_NOTIFICATION',
          notification: { type: 'error', message: 'Failed to create banner: ' + (error as Error).message },
        });
        return false;
      }
    },
    [dispatch]
  );

  const deleteBanner = useCallback(
    async (bannerId: string): Promise<boolean> => {
      try {
        const res = await fetch(`/api/banners/${bannerId}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Delete failed');
        dispatch({ type: 'DELETE_BANNER', bannerId });
        dispatch({ type: 'SET_NOTIFICATION', notification: { type: 'success', message: 'Banner deleted!' } });
        return true;
      } catch (error) {
        dispatch({
          type: 'SET_NOTIFICATION',
          notification: { type: 'error', message: 'Failed to delete banner: ' + (error as Error).message },
        });
        return false;
      }
    },
    [dispatch]
  );

  const toggleBanner = useCallback(
    async (banner: Banner): Promise<void> => {
      try {
        const res = await fetch(`/api/banners/${banner.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ is_active: !banner.is_active }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Update failed');
        dispatch({ type: 'UPDATE_BANNER', banner: data.banner });
      } catch (error) {
        dispatch({
          type: 'SET_NOTIFICATION',
          notification: { type: 'error', message: 'Failed to update banner: ' + (error as Error).message },
        });
      }
    },
    [dispatch]
  );

  return { saveProduct, deleteProduct, addBanner, deleteBanner, toggleBanner };
}
