'use client';

/**
 * Checkout — marketplace-style progressive flow (Login → Delivery Address →
 * Payment), modelled on the big Indian marketplaces:
 *  - Signed-out visitors are taken straight to sign-in, then dropped back here.
 *  - A saved address is offered automatically; the long form is shown only
 *    once. After that it's just "Deliver here" or "Edit".
 *  - One-tap current-location detection and PIN-code lookup.
 *  - Payment options show UPI apps (PhonePe / GPay / Paytm), cards and Cash
 *    on Delivery. Online payments open as an overlay inside this page.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Banknote, Check, ChevronDown, Loader2, MapPin, Pencil, Plus,
  ShieldCheck, Smartphone, CreditCard, Lock, BadgeCheck,
} from 'lucide-react';
import { useApp } from '@/store/AppContext';
import { getCartTotal, formatPrice } from '@/lib/utils';
import type { Order, ShippingAddress, SavedAddress } from '@/lib/types';
import { PaymentModal, type PaymentProvider } from '@/components/shop/PaymentModal';
import { AddressForm, type AddressFormData } from '@/components/shop/AddressForm';
import { UpiAppsRow, CardNetworksRow, UpiMark } from '@/components/shop/PaymentLogos';
import { SkeletonLine } from '@/components/shop/Skeletons';

type Step = 'address' | 'payment';
type Method = 'online' | 'cod';

interface PaymentSession {
  orderNumber: string;
  amount: number;
  provider: PaymentProvider;
  paymentMode: 'test' | 'live';
  checkoutUrl: string;
  simulatedPaymentId: string | null;
}

const savedToShipping = (a: SavedAddress): ShippingAddress => ({
  fullName: a.fullName,
  phone: a.phone,
  addressLine1: a.addressLine1,
  addressLine2: a.addressLine2,
  city: a.city,
  state: a.state,
  postalCode: a.postalCode,
  country: a.country || 'India',
});

export default function Checkout() {
  const { state, dispatch } = useApp();
  const router = useRouter();
  const [step, setStep] = useState<Step>('address');
  const [method, setMethod] = useState<Method>('online');
  const [upiSub, setUpiSub] = useState<'upi' | 'card'>('upi');
  const [processing, setProcessing] = useState(false);

  // Saved delivery addresses — asked for once, reused forever after.
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [addressesLoaded, setAddressesLoaded] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null); // null => adding new

  const [session, setSession] = useState<PaymentSession | null>(null);
  const [attempt, setAttempt] = useState(0);
  const activeOrderRef = useRef<string | null>(null);

  const totals = getCartTotal(state.cart, state.couponDiscount);
  const sessionLoaded = state.dbReady;
  const selectedAddress = addresses.find((a) => a.id === selectedId) || null;

  // ── Auth wall ────────────────────────────────────────────────────────────
  // Signed-out visitors go straight to the sign-in page; after signing in
  // they land back here with their cart intact.
  useEffect(() => {
    if (sessionLoaded && !state.isLoggedIn) {
      router.replace('/login?redirect=/checkout');
    }
  }, [sessionLoaded, state.isLoggedIn, router]);

  // ── Load saved addresses once the session is known ──────────────────────
  useEffect(() => {
    if (!sessionLoaded || !state.isLoggedIn || addressesLoaded) return;
    setAddressesLoaded(true);
    fetch('/api/addresses')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const list: SavedAddress[] = d?.addresses ?? [];
        setAddresses(list);
        setSelectedId(list[0]?.id ?? null);
        // No saved address yet → open the form right away (the only time).
        if (list.length === 0) setFormOpen(true);
      })
      .catch(() => setFormOpen(true));
  }, [sessionLoaded, state.isLoggedIn, addressesLoaded]);

  const refreshOrders = useCallback(() => {
    fetch('/api/orders')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d) dispatch({ type: 'SET_ORDERS', orders: d.orders || [] }); })
      .catch(() => {});
  }, [dispatch]);

  const handleFinalized = useCallback((orderNumber: string, outcome: 'succeeded' | 'failed') => {
    if (outcome !== 'succeeded') return;
    dispatch({ type: 'CLEAR_CART' });
    dispatch({ type: 'REMOVE_COUPON' });
    refreshOrders();
    setTimeout(() => router.push(`/order-success/${orderNumber}`), 1400);
  }, [dispatch, router, refreshOrders]);

  /** Create (or reuse) a payment session for an order and open the overlay. */
  const startPayment = useCallback(async (orderNumber: string) => {
    const payRes = await fetch('/api/payments/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        order_number: orderNumber,
        customer_email: state.user?.email || '',
        customer_name: state.user?.name || '',
      }),
    });
    const payData = await payRes.json();
    if (!payRes.ok || !payData.success || !payData.checkout_url) {
      throw new Error(payData.error || 'Payment initialization failed');
    }
    activeOrderRef.current = orderNumber;
    setSession({
      orderNumber,
      amount: totals.total,
      provider: payData.provider === 'dodo' ? 'dodo' : 'simulated',
      paymentMode: payData.payment_mode === 'live' ? 'live' : 'test',
      checkoutUrl: payData.checkout_url,
      simulatedPaymentId: payData.payment_id ?? null,
    });
    setAttempt((n) => n + 1);
  }, [state.user?.email, state.user?.name, totals.total]);

  // ── Address persistence from the inline form ────────────────────────────
  const handleFormSave = async (data: AddressFormData): Promise<boolean> => {
    try {
      const editing = editingId;
      const res = await fetch(editing ? `/api/addresses/${editing}` : '/api/addresses', {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const saved = await res.json();
      if (!res.ok || !saved.address) {
        throw new Error(saved.error || 'Could not save the address');
      }
      const addr: SavedAddress = saved.address;
      setAddresses((list) => {
        const next = editing ? list.map((a) => (a.id === addr.id ? addr : a)) : [...list, addr];
        // Keep the default first, like the API returns them.
        return [...next].sort((a, b) => Number(b.isDefault) - Number(a.isDefault));
      });
      setSelectedId(addr.id);
      setFormOpen(false);
      setEditingId(null);
      dispatch({ type: 'SET_NOTIFICATION', notification: { type: 'success', message: 'Address saved' } });
      return true;
    } catch (error) {
      dispatch({ type: 'SET_NOTIFICATION', notification: { type: 'error', message: (error as Error).message } });
      return false;
    }
  };

  const handleDeleteAddress = async (id: string) => {
    try {
      const res = await fetch(`/api/addresses/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Could not delete the address');
      setAddresses((list) => {
        const next = list.filter((a) => a.id !== id);
        setSelectedId(next[0]?.id ?? null);
        return next;
      });
      dispatch({ type: 'SET_NOTIFICATION', notification: { type: 'success', message: 'Address removed' } });
    } catch (error) {
      dispatch({ type: 'SET_NOTIFICATION', notification: { type: 'error', message: (error as Error).message } });
    }
  };

  // ── Place order ──────────────────────────────────────────────────────────
  const placeOrder = async () => {
    if (!selectedAddress) {
      setStep('address');
      dispatch({ type: 'SET_NOTIFICATION', notification: { type: 'error', message: 'Please add a delivery address first' } });
      return;
    }
    setProcessing(true);
    try {
      const createRes = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: state.cart.map((item) => ({ productId: item.product.id, quantity: item.quantity })),
          shipping_address: savedToShipping(selectedAddress),
          payment_method: method === 'cod' ? 'cod' : 'dodo',
          coupon_code: state.couponCode,
        }),
      });
      const createData = await createRes.json();
      if (!createRes.ok) {
        throw new Error(createData.error || 'Failed to create order');
      }
      const order: Order = createData.order;

      if (method === 'online') {
        await startPayment(order.order_number);
        setProcessing(false);
        return;
      }

      // Cash on Delivery — the order is confirmed server-side already.
      dispatch({ type: 'CLEAR_CART' });
      dispatch({ type: 'REMOVE_COUPON' });
      dispatch({ type: 'SET_NOTIFICATION', notification: { type: 'success', message: 'Order placed successfully!' } });
      refreshOrders();
      setProcessing(false);
      router.push(`/order-success/${order.order_number}`);
    } catch (error) {
      dispatch({ type: 'SET_NOTIFICATION', notification: { type: 'error', message: (error as Error).message || 'Failed to place order. Please try again.' } });
      setProcessing(false);
    }
  };

  // ── Boot state: shimmer skeleton while the session resolves ─────────────
  if (!sessionLoaded) {
    return (
      <div className="shell py-6" role="status" aria-label="Loading checkout">
        <SkeletonLine className="h-4 w-28 mb-6" />
        <SkeletonLine className="h-8 w-44 mb-6" />
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
              <SkeletonLine className="h-5 w-40" />
              <div className="grid sm:grid-cols-2 gap-4">
                {Array.from({ length: 6 }).map((_, i) => <SkeletonLine key={i} className="h-11 w-full" />)}
              </div>
              <SkeletonLine className="h-12 w-48 rounded-xl" />
            </div>
          </div>
          <div className="space-y-3">
            <div className="bg-gray-50 rounded-xl p-6 space-y-3">
              <SkeletonLine className="h-5 w-36" />
              {Array.from({ length: 4 }).map((_, i) => <SkeletonLine key={i} className="h-4 w-full" />)}
              <SkeletonLine className="h-6 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Session loaded and no user — the effect above is navigating to sign-in.
  if (!state.isLoggedIn) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 text-navy-500">
        <Loader2 size={28} className="animate-spin text-primary-600" />
        <p className="text-sm">Taking you to sign in…</p>
      </div>
    );
  }

  if (state.cart.length === 0) {
    return (
      <div className="shell py-16 text-center">
        <h1 className="text-2xl font-bold text-navy-900 mb-2">Nothing to checkout</h1>
        <p className="text-navy-500 mb-6">Your cart is empty — add something you love.</p>
        <Link href="/products" className="px-6 py-3 bg-primary-600 text-white rounded-xl font-medium inline-block">Shop Now</Link>
      </div>
    );
  }

  const ctaLabel = method === 'cod' ? `Place Order · ${formatPrice(totals.total)}` : `Pay ${formatPrice(totals.total)} Securely`;

  return (
    <div className="shell pb-28 lg:pb-6 pt-4">
      {/* Stepper — marketplace style */}
      <div className="flex items-center gap-1 mb-5 overflow-x-auto">
        {[
          { key: 'login', label: 'Login', done: true },
          { key: 'address', label: 'Address', done: step === 'payment' },
          { key: 'payment', label: 'Payment', done: false },
        ].map((s, i) => (
          <div key={s.key} className="flex items-center shrink-0">
            <div className={`flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-semibold uppercase tracking-wide ${s.done ? 'text-green-600' : s.key === (step === 'address' ? 'address' : 'payment') ? 'text-primary-700' : 'text-navy-400'}`}>
              {s.done ? <Check size={13} className="text-green-600" /> : null}
              {s.label}
            </div>
            {i < 2 && <ChevronDown size={14} className="-rotate-90 text-navy-300 mx-0.5" />}
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-4">
          {/* ── 1. Login (always complete — the wall above guarantees it) ── */}
          <section className="bg-white border border-gray-200 rounded-xl px-5 py-4 flex items-center gap-3">
            <BadgeCheck size={18} className="text-green-600 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-navy-900">Login <Check size={13} className="inline text-green-600" /></p>
              <p className="text-xs text-navy-500 truncate">{state.user?.name} · {state.user?.email}</p>
            </div>
          </section>

          {/* ── 2. Delivery Address ──────────────────────────────────────── */}
          <section className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <header className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 bg-gray-50/60">
              <h2 className="text-sm font-bold uppercase tracking-wide text-navy-900 flex items-center gap-2">
                <MapPin size={15} className="text-primary-600" /> Delivery Address
              </h2>
              {step === 'payment' && selectedAddress && (
                <button onClick={() => { setStep('address'); }} className="text-xs font-semibold text-primary-600 hover:text-primary-700 flex items-center gap-1">
                  <Pencil size={12} /> Change
                </button>
              )}
            </header>

            <div className="p-5">
              {step === 'address' ? (
                addressesLoaded ? (
                  <div className="space-y-4">
                    {/* Saved addresses — shown once saved, never re-asked */}
                    {addresses.map((a) => {
                      const editing = formOpen && editingId === a.id;
                      if (editing) {
                        return (
                          <div key={a.id} className="border border-primary-200 rounded-xl p-4 bg-primary-50/40">
                            <p className="text-sm font-semibold text-navy-900 mb-3">Edit address</p>
                            <AddressForm
                              compact
                              initial={a}
                              submitLabel="Save Changes"
                              onSave={handleFormSave}
                              onCancel={() => { setFormOpen(false); setEditingId(null); }}
                              onNotify={(type, message) => dispatch({ type: 'SET_NOTIFICATION', notification: { type, message } })}
                            />
                          </div>
                        );
                      }
                      const active = selectedId === a.id;
                      return (
                        <label
                          key={a.id}
                          className={`block border-2 rounded-xl p-4 cursor-pointer transition ${active ? 'border-primary-500 bg-primary-50/40' : 'border-gray-200 hover:border-gray-300'}`}
                        >
                          <div className="flex items-start gap-3">
                            <input
                              type="radio"
                              name="address"
                              checked={active}
                              onChange={() => setSelectedId(a.id)}
                              className="mt-1 accent-primary-600"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-navy-900 text-sm">{a.fullName}</span>
                                <span className="text-[10px] font-bold uppercase tracking-wide bg-navy-900 text-white px-1.5 py-0.5 rounded">{a.label}</span>
                                {a.isDefault && <span className="text-[10px] font-semibold text-green-700 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded">DEFAULT</span>}
                              </div>
                              <p className="text-sm text-navy-600 mt-1">
                                {a.addressLine1}{a.addressLine2 ? `, ${a.addressLine2}` : ''}, {a.city}, {a.state} — {a.postalCode}
                              </p>
                              <p className="text-xs text-navy-400 mt-0.5">Phone: {a.phone}</p>
                              <div className="flex gap-3 mt-2.5">
                                <button
                                  type="button"
                                  onClick={(e) => { e.preventDefault(); setEditingId(a.id); setFormOpen(true); }}
                                  className="text-xs font-semibold text-primary-600 hover:text-primary-700 flex items-center gap-1"
                                >
                                  <Pencil size={11} /> Edit
                                </button>
                                {addresses.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={(e) => { e.preventDefault(); handleDeleteAddress(a.id); }}
                                    className="text-xs font-medium text-navy-400 hover:text-red-600 transition"
                                  >
                                    Remove
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </label>
                      );
                    })}

                    {/* New address form */}
                    {formOpen && editingId === null && (
                      <div className="border border-primary-200 rounded-xl p-4 bg-primary-50/40">
                        <p className="text-sm font-semibold text-navy-900 mb-3">Add a new address</p>
                        <AddressForm
                          compact
                          initial={{ fullName: state.user?.name || '' }}
                          submitLabel="Save and Deliver Here"
                          onSave={handleFormSave}
                          onCancel={addresses.length > 0 ? () => setFormOpen(false) : undefined}
                          onNotify={(type, message) => dispatch({ type: 'SET_NOTIFICATION', notification: { type, message } })}
                        />
                      </div>
                    )}

                    {!formOpen && (
                      <button
                        type="button"
                        onClick={() => { setEditingId(null); setFormOpen(true); }}
                        className="w-full border-2 border-dashed border-gray-200 rounded-xl p-3.5 text-sm font-medium text-primary-600 hover:bg-primary-50/50 hover:border-primary-200 transition flex items-center justify-center gap-1.5"
                      >
                        <Plus size={15} /> Add a new address
                      </button>
                    )}

                    <button
                      onClick={() => {
                        if (!selectedAddress) {
                          dispatch({ type: 'SET_NOTIFICATION', notification: { type: 'error', message: 'Please select or add a delivery address' } });
                          return;
                        }
                        setStep('payment');
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      disabled={!selectedAddress || formOpen}
                      className="w-full sm:w-auto px-8 py-3 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700 transition disabled:opacity-50"
                    >
                      Deliver Here
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3" role="status" aria-label="Loading saved addresses">
                    <SkeletonLine className="h-20 w-full rounded-xl" />
                    <SkeletonLine className="h-10 w-40" />
                  </div>
                )
              ) : (
                /* Collapsed summary at payment step */
                selectedAddress && (
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-navy-900">
                        {selectedAddress.fullName} <span className="text-[10px] font-bold uppercase bg-navy-900 text-white px-1.5 py-0.5 rounded ml-1">{selectedAddress.label}</span>
                      </p>
                      <p className="text-sm text-navy-600 mt-0.5">
                        {selectedAddress.addressLine1}{selectedAddress.addressLine2 ? `, ${selectedAddress.addressLine2}` : ''}, {selectedAddress.city}, {selectedAddress.state} — {selectedAddress.postalCode}
                      </p>
                      <p className="text-xs text-navy-400 mt-0.5">Phone: {selectedAddress.phone}</p>
                    </div>
                    <button onClick={() => setStep('address')} className="text-xs font-semibold text-primary-600 hover:text-primary-700 shrink-0 flex items-center gap-1">
                      <Pencil size={12} /> Edit
                    </button>
                  </div>
                )
              )}
            </div>
          </section>

          {/* ── 3. Order items ───────────────────────────────────────────── */}
          <section className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <header className="px-5 py-3.5 border-b border-gray-100 bg-gray-50/60">
              <h2 className="text-sm font-bold uppercase tracking-wide text-navy-900">Order Summary ({state.cart.length} {state.cart.length === 1 ? 'item' : 'items'})</h2>
            </header>
            <div className="p-5 space-y-3.5">
              {state.cart.map((item) => (
                <div key={item.product.id} className="flex items-center gap-3.5">
                  {item.product.images?.[0]?.startsWith('http') ? (
                    <img src={item.product.images[0]} alt={item.product.name} className="w-14 h-14 rounded-lg object-cover border border-gray-100" />
                  ) : (
                    <span className="w-14 h-14 rounded-lg bg-gray-100 flex items-center justify-center text-2xl">{item.product.images?.[0] || '📦'}</span>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-navy-900 truncate">{item.product.name}</p>
                    <p className="text-xs text-navy-500">Qty: {item.quantity}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-navy-900">{formatPrice(item.product.price * item.quantity)}</p>
                    {item.product.compare_price && item.product.compare_price > item.product.price && (
                      <p className="text-xs text-navy-400 line-through">{formatPrice(item.product.compare_price * item.quantity)}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ── 4. Payment options ───────────────────────────────────────── */}
          {step === 'payment' && (
            <section className="bg-white border border-gray-200 rounded-xl overflow-hidden animate-fade-in">
              <header className="px-5 py-3.5 border-b border-gray-100 bg-gray-50/60">
                <h2 className="text-sm font-bold uppercase tracking-wide text-navy-900 flex items-center gap-2">
                  <Lock size={14} className="text-primary-600" /> Payment Options
                </h2>
              </header>
              <div className="p-5 space-y-3">
                {/* UPI */}
                <div className={`border-2 rounded-xl transition ${method === 'online' && upiSub === 'upi' ? 'border-primary-500 bg-primary-50/40' : 'border-gray-200'}`}>
                  <label className="flex items-center gap-3.5 p-4 cursor-pointer">
                    <input
                      type="radio"
                      name="payment"
                      checked={method === 'online' && upiSub === 'upi'}
                      onChange={() => { setMethod('online'); setUpiSub('upi'); }}
                      className="accent-primary-600"
                    />
                    <Smartphone size={20} className="text-navy-700 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2.5">
                        <p className="font-semibold text-navy-900 text-sm">UPI</p>
                        <UpiMark height={15} />
                      </div>
                      <p className="text-xs text-navy-500 mt-0.5">Pay instantly from any bank account</p>
                    </div>
                  </label>
                  {method === 'online' && upiSub === 'upi' && (
                    <div className="px-4 pb-4 pt-1 animate-fade-in">
                      <UpiAppsRow />
                    </div>
                  )}
                </div>

                {/* Cards */}
                <div className={`border-2 rounded-xl transition ${method === 'online' && upiSub === 'card' ? 'border-primary-500 bg-primary-50/40' : 'border-gray-200'}`}>
                  <label className="flex items-center gap-3.5 p-4 cursor-pointer">
                    <input
                      type="radio"
                      name="payment"
                      checked={method === 'online' && upiSub === 'card'}
                      onChange={() => { setMethod('online'); setUpiSub('card'); }}
                      className="accent-primary-600"
                    />
                    <CreditCard size={20} className="text-navy-700 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-navy-900 text-sm">Credit / Debit Card</p>
                      <p className="text-xs text-navy-500 mt-0.5">Visa, Mastercard, RuPay & more</p>
                    </div>
                  </label>
                  {method === 'online' && upiSub === 'card' && (
                    <div className="px-4 pb-4 pt-1 animate-fade-in">
                      <CardNetworksRow />
                    </div>
                  )}
                </div>

                {/* Cash on Delivery */}
                <label className={`flex items-center gap-3.5 p-4 border-2 rounded-xl cursor-pointer transition ${method === 'cod' ? 'border-primary-500 bg-primary-50/40' : 'border-gray-200'}`}>
                  <input
                    type="radio"
                    name="payment"
                    checked={method === 'cod'}
                    onChange={() => setMethod('cod')}
                    className="accent-primary-600"
                  />
                  <Banknote size={20} className="text-navy-700 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-navy-900 text-sm">Cash on Delivery</p>
                    <p className="text-xs text-navy-500 mt-0.5">Pay in cash when your order arrives</p>
                  </div>
                  <Banknote size={16} className="text-green-600 shrink-0" />
                </label>

                <div className="hidden lg:flex gap-3 pt-2">
                  <button onClick={() => setStep('address')} className="px-6 py-3 border border-gray-200 rounded-xl font-medium text-navy-700 hover:bg-gray-50 transition">Back</button>
                  <button
                    onClick={placeOrder}
                    disabled={processing}
                    className="flex-1 py-3 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700 transition disabled:opacity-50"
                  >
                    {processing ? (
                      <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Processing…</span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        {method === 'online' && <Lock size={14} />} {ctaLabel}
                      </span>
                    )}
                  </button>
                </div>
              </div>
            </section>
          )}
        </div>

        {/* ── Price details (sticky on desktop) ──────────────────────────── */}
        <aside className="lg:col-span-1">
          <div className="bg-white border border-gray-200 rounded-xl p-5 lg:sticky lg:top-28">
            <h2 className="text-sm font-bold uppercase tracking-wide text-navy-400 pb-3 border-b border-gray-100">Price Details</h2>
            <div className="space-y-2.5 text-sm py-4">
              <div className="flex justify-between"><span className="text-navy-600">Price ({state.cart.length} items)</span><span className="text-navy-900">{formatPrice(totals.subtotal)}</span></div>
              {totals.discount > 0 && (
                <div className="flex justify-between text-green-600"><span>Coupon {state.couponCode ? `(${state.couponCode})` : 'discount'}</span><span>− {formatPrice(totals.discount)}</span></div>
              )}
              <div className="flex justify-between"><span className="text-navy-600">Delivery Charges</span><span className={totals.shipping === 0 ? 'text-green-600 font-medium' : 'text-navy-900'}>{totals.shipping === 0 ? 'FREE' : formatPrice(totals.shipping)}</span></div>
              <div className="flex justify-between"><span className="text-navy-600">Tax (GST 18%)</span><span className="text-navy-900">{formatPrice(totals.tax)}</span></div>
              <div className="border-t border-dashed border-gray-200 pt-3 flex justify-between text-base font-bold"><span>Total Amount</span><span>{formatPrice(totals.total)}</span></div>
              {totals.shipping === 0 && <p className="text-xs text-green-600 font-medium">You saved {formatPrice(totals.shipping + totals.discount)} on this order 🎉</p>}
            </div>
            <div className="flex items-center gap-2 text-[11px] text-navy-400 border-t border-gray-100 pt-3">
              <ShieldCheck size={14} className="text-green-600 shrink-0" />
              <span>Safe and Secure Payments · Easy returns · 100% Authentic products</span>
            </div>
          </div>
        </aside>
      </div>

      {/* Mobile sticky action bar — marketplace style */}
      {step === 'payment' && (
        <div className="fixed bottom-0 inset-x-0 z-40 lg:hidden bg-white border-t border-gray-200 px-4 py-3 flex items-center gap-3 shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
          <div className="flex-1">
            <p className="text-lg font-bold text-navy-900 leading-tight">{formatPrice(totals.total)}</p>
            <p className="text-[10px] text-navy-400">Inclusive of all taxes</p>
          </div>
          <button
            onClick={placeOrder}
            disabled={processing}
            className="px-7 py-3 bg-primary-600 text-white rounded-xl font-semibold text-sm hover:bg-primary-700 transition disabled:opacity-50"
          >
            {processing ? 'Processing…' : method === 'cod' ? 'Place Order' : 'Pay Now'}
          </button>
        </div>
      )}

      {/* In-page secure payment overlay — stays inside this app */}
      {session && (
        <PaymentModal
          key={attempt}
          open
          orderNumber={session.orderNumber}
          amount={session.amount}
          provider={session.provider}
          paymentMode={session.paymentMode}
          checkoutUrl={session.checkoutUrl}
          simulatedPaymentId={session.simulatedPaymentId}
          onFinalized={handleFinalized}
          onRetry={async () => {
            const orderNumber = activeOrderRef.current;
            if (!orderNumber) return;
            try {
              await startPayment(orderNumber);
            } catch (error) {
              dispatch({ type: 'SET_NOTIFICATION', notification: { type: 'error', message: (error as Error).message || 'Could not restart payment' } });
            }
          }}
          onClose={() => {
            setSession(null);
            activeOrderRef.current = null;
          }}
        />
      )}
    </div>
  );
}
