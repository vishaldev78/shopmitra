import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { CartItem } from "@/lib/types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ---- ShopMitra shop helpers (ported from original app) ----

export function getCartTotal(cart: CartItem[], couponDiscount: number = 0) {
  const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0)
  const discount = Math.round(subtotal * (couponDiscount / 100))
  const shipping = subtotal > 999 ? 0 : 99
  const tax = Math.round((subtotal - discount) * 0.18)
  const total = subtotal - discount + shipping + tax
  return { subtotal, discount, shipping, tax, total }
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(price)
}

export function getDiscount(price: number, comparePrice: number | null): number {
  if (!comparePrice || comparePrice <= price) return 0
  return Math.round(((comparePrice - price) / comparePrice) * 100)
}

export function generateOrderNumber(): string {
  return 'SM-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase()
}

export function isAdminRole(role: string | null | undefined): boolean {
  return role === 'admin' || role === 'super_admin'
}
