'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight, Lock, ShieldCheck } from 'lucide-react';
import { useApp, validateCoupon } from '@/store/AppContext';
import { getCartTotal, formatPrice, getDiscount } from '@/lib/utils';

export default function Cart() {
  const { state, dispatch } = useApp();
  const [couponInput, setCouponInput] = useState('');
  const [applying, setApplying] = useState(false);
  const totals = getCartTotal(state.cart, state.couponDiscount);

  const applyCoupon = async () => {
    if (!couponInput.trim()) return;
    setApplying(true);
    const result = await validateCoupon(couponInput, totals.subtotal);
    if (result.valid) {
      dispatch({ type: 'APPLY_COUPON', code: couponInput.toUpperCase(), discount: Math.round((result.discount / totals.subtotal) * 100) });
      dispatch({ type: 'SET_NOTIFICATION', notification: { type: 'success', message: 'Coupon applied!' } });
      setCouponInput('');
    } else {
      dispatch({ type: 'SET_NOTIFICATION', notification: { type: 'error', message: result.error || 'Invalid coupon' } });
    }
    setApplying(false);
  };

  if (state.cart.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <ShoppingBag size={72} className="text-navy-300 mx-auto mb-6" strokeWidth={1.2} />
        <h1 className="text-2xl font-bold text-navy-900 mb-2">Your cart is empty</h1>
        <p className="text-navy-500 mb-6">Looks like you haven&apos;t added anything yet.</p>
        <Link href="/products" className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700 transition"><ShoppingBag size={18} /> Start Shopping</Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-navy-900 mb-6">Shopping Cart ({state.cart.reduce((s, i) => s + i.quantity, 0)} items)</h1>
      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          {state.cart.map((item) => {
            const discount = getDiscount(item.product.price, item.product.compare_price);
            const hasImage = item.product.images?.[0]?.startsWith('http');
            return (
              <div key={item.product.id} className="flex gap-4 p-4 bg-white border border-gray-100 rounded-xl">
                <Link href={`/product/${item.product.slug}`} className="w-20 h-20 md:w-24 md:h-24 bg-gray-50 rounded-lg flex items-center justify-center overflow-hidden shrink-0">
                  {hasImage ? <img src={item.product.images[0]} alt={item.product.name} className="w-full h-full object-cover" /> : <span className="text-3xl">📦</span>}
                </Link>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <Link href={`/product/${item.product.slug}`} className="font-medium text-navy-900 hover:text-primary-600 transition line-clamp-1">{item.product.name}</Link>
                      <p className="text-xs text-navy-500 mt-0.5">{item.product.brand}</p>
                    </div>
                    <button onClick={() => dispatch({ type: 'REMOVE_FROM_CART', productId: item.product.id })} aria-label="Remove item" className="p-1.5 text-navy-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"><Trash2 size={16} /></button>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center border border-gray-200 rounded-lg">
                      <button onClick={() => dispatch({ type: 'UPDATE_CART_QUANTITY', productId: item.product.id, quantity: item.quantity - 1 })} className="p-1.5 hover:bg-gray-50"><Minus size={14} /></button>
                      <span className="px-3 py-1 text-sm font-medium border-x border-gray-200">{item.quantity}</span>
                      <button onClick={() => dispatch({ type: 'UPDATE_CART_QUANTITY', productId: item.product.id, quantity: item.quantity + 1 })} className="p-1.5 hover:bg-gray-50"><Plus size={14} /></button>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-navy-900">{formatPrice(item.product.price * item.quantity)}</p>
                      {discount > 0 && <p className="text-xs text-green-600">{discount}% off</p>}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          <Link href="/products" className="inline-flex items-center gap-2 text-primary-600 text-sm font-medium hover:text-primary-700 mt-4">← Continue Shopping</Link>
        </div>

        <div className="lg:col-span-1">
          <div className="bg-gray-50 rounded-xl p-6 sticky top-28">
            <h2 className="text-lg font-bold text-navy-900 mb-4">Order Summary</h2>
            <div className="mb-4">
              {state.couponCode ? (
                <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                  <span className="text-sm font-medium text-green-700">{state.couponCode} applied</span>
                  <button onClick={() => dispatch({ type: 'REMOVE_COUPON' })} className="text-xs text-red-500">Remove</button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input type="text" value={couponInput} onChange={(e) => setCouponInput(e.target.value)} placeholder="Coupon code" className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                  <button onClick={applyCoupon} disabled={applying} className="px-4 py-2 bg-navy-900 text-white text-sm rounded-lg hover:bg-navy-800 disabled:opacity-50">Apply</button>
                </div>
              )}
              <p className="text-xs text-navy-400 mt-1.5">Try: SAVE10, FIRST20, SHOP15</p>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-navy-600">Subtotal</span><span className="font-medium">{formatPrice(totals.subtotal)}</span></div>
              {totals.discount > 0 && <div className="flex justify-between text-green-600"><span>Discount</span><span>-{formatPrice(totals.discount)}</span></div>}
              <div className="flex justify-between"><span className="text-navy-600">Shipping</span><span className={totals.shipping === 0 ? 'text-green-600 font-medium' : ''}>{totals.shipping === 0 ? 'FREE' : formatPrice(totals.shipping)}</span></div>
              <div className="flex justify-between"><span className="text-navy-600">Tax (GST 18%)</span><span className="font-medium">{formatPrice(totals.tax)}</span></div>
              <hr />
              <div className="flex justify-between text-lg"><span className="font-bold text-navy-900">Total</span><span className="font-bold text-navy-900">{formatPrice(totals.total)}</span></div>
            </div>
            <Link href="/checkout" className="block w-full mt-6 py-3 bg-primary-600 text-white text-center rounded-xl font-semibold hover:bg-primary-700 transition">Proceed to Checkout <ArrowRight size={16} className="inline ml-1" /></Link>
            <div className="mt-4 flex items-center justify-center gap-4 text-xs text-navy-400"><span className="flex items-center gap-1"><Lock size={12} /> Secure Checkout</span><span className="flex items-center gap-1"><ShieldCheck size={12} /> Dodo Payments</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
