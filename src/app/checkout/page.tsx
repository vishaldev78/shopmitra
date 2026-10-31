'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Check, Banknote, ArrowLeft, Lock, ShieldCheck, Loader2 } from 'lucide-react';
import { useApp } from '@/store/AppContext';
import { getCartTotal, formatPrice } from '@/lib/utils';
import type { Order, ShippingAddress } from '@/lib/types';
import { PaymentModal, type PaymentProvider } from '@/components/shop/PaymentModal';
import { SkeletonLine } from '@/components/shop/Skeletons';

interface PaymentSession {
  orderNumber: string;
  amount: number;
  provider: PaymentProvider;
  checkoutUrl: string;
  simulatedPaymentId: string | null;
}

export default function Checkout() {
  const { state, dispatch } = useApp();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState('dodo');
  const [processing, setProcessing] = useState(false);
  const [address, setAddress] = useState<ShippingAddress>({ fullName: '', phone: '', addressLine1: '', addressLine2: '', city: '', state: '', postalCode: '', country: 'India' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [session, setSession] = useState<PaymentSession | null>(null);
  // Bumped on every payment retry so the modal remounts with fresh state.
  const [attempt, setAttempt] = useState(0);
  const activeOrderRef = useRef<string | null>(null);
  const totals = getCartTotal(state.cart, state.couponDiscount);
  const sessionLoaded = state.dbReady;

  // ── Auth wall ────────────────────────────────────────────────────────────
  // Signed-out visitors go straight to the sign-in page; after signing in
  // they land back here with their cart intact.
  useEffect(() => {
    if (sessionLoaded && !state.isLoggedIn) {
      router.replace('/login?redirect=/checkout');
    }
  }, [sessionLoaded, state.isLoggedIn, router]);

  const handleFinalized = useCallback((orderNumber: string, outcome: 'succeeded' | 'failed') => {
    if (outcome !== 'succeeded') return;
    dispatch({ type: 'CLEAR_CART' });
    dispatch({ type: 'REMOVE_COUPON' });
    // Refresh the orders list in the background while the success screen shows.
    fetch('/api/orders')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d) dispatch({ type: 'SET_ORDERS', orders: d.orders || [] }); })
      .catch(() => {});
    setTimeout(() => router.push(`/order-success/${orderNumber}`), 1400);
  }, [dispatch, router]);

  /** Create (or reuse) a payment session for an order and open the overlay. */
  const startPayment = useCallback(async (orderNumber: string) => {
    const payRes = await fetch('/api/payments/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        order_number: orderNumber,
        customer_email: state.user?.email || '',
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
      checkoutUrl: payData.checkout_url,
      simulatedPaymentId: payData.payment_id ?? null,
    });
    if (payData.notice) {
      // Provider fallback details are for the console, not the customer UI —
      // the sandbox overlay itself explains what is happening.
      console.warn('[payments]', payData.notice);
    }
    setAttempt((n) => n + 1);
  }, [state.user?.email, totals.total]);

  const handlePlaceOrder = async () => {
    setProcessing(true);
    try {
      // 1) Create the order server-side (totals recomputed on server)
      const createRes = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: state.cart.map((item) => ({ productId: item.product.id, quantity: item.quantity })),
          shipping_address: address,
          payment_method: paymentMethod,
          coupon_code: state.couponCode,
        }),
      });
      const createData = await createRes.json();
      if (!createRes.ok) {
        throw new Error(createData.error || 'Failed to create order');
      }
      const order: Order = createData.order;

      // 2) Dodo Payments — open the secure overlay (no page redirect)
      if (paymentMethod === 'dodo') {
        await startPayment(order.order_number);
        setProcessing(false);
        return;
      }

      // 3) COD — order already confirmed server-side
      dispatch({ type: 'ADD_ORDER', order });
      dispatch({ type: 'SET_NOTIFICATION', notification: { type: 'success', message: 'Order placed successfully!' } });
      setProcessing(false);
      router.push(`/order-success/${order.order_number}`);
    } catch (error) {
      console.error('Order creation error:', error);
      dispatch({ type: 'SET_NOTIFICATION', notification: { type: 'error', message: (error as Error).message || 'Failed to place order. Please try again.' } });
      setProcessing(false);
    }
  };

  // ── Boot state: shimmer skeleton while the session resolves ─────────────
  if (!sessionLoaded) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6" role="status" aria-label="Loading checkout">
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
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-navy-900 mb-2">Nothing to checkout</h1>
        <Link href="/products" className="px-6 py-3 bg-primary-600 text-white rounded-xl font-medium inline-block">Shop Now</Link>
      </div>
    );
  }

  const validateAddress = () => {
    const e: Record<string, string> = {};
    if (!address.fullName.trim()) e.fullName = 'Required';
    if (!address.phone.trim() || address.phone.length < 10) e.phone = 'Valid phone required';
    if (!address.addressLine1.trim()) e.addressLine1 = 'Required';
    if (!address.city.trim()) e.city = 'Required';
    if (!address.state.trim()) e.state = 'Required';
    if (!address.postalCode.trim() || address.postalCode.length < 6) e.postalCode = 'Valid pincode required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <Link href="/cart" className="flex items-center gap-2 text-sm text-navy-500 hover:text-primary-600 mb-6"><ArrowLeft size={16} /> Back to Cart</Link>
      <h1 className="text-2xl font-bold text-navy-900 mb-2">Checkout</h1>
      <p className="text-sm text-navy-500 mb-6">Signed in as <span className="font-medium text-navy-700">{state.user?.email}</span></p>

      <div className="flex items-center gap-2 mb-8">
        {[{ n: 1, label: 'Address' }, { n: 2, label: 'Payment' }, { n: 3, label: 'Review' }].map((s, i) => (
          <div key={s.n} className="flex items-center">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${step >= s.n ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-navy-400'}`}>
              {step > s.n ? <Check size={14} /> : <span>{s.n}</span>}<span className="hidden sm:inline">{s.label}</span>
            </div>
            {i < 2 && <div className={`w-8 h-0.5 mx-1 ${step > s.n ? 'bg-primary-500' : 'bg-gray-200'}`} />}
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          {step === 1 && (
            <div className="bg-white border border-gray-200 rounded-xl p-6 animate-fade-in">
              <h2 className="text-lg font-bold text-navy-900 mb-4">Shipping Address</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-navy-700 mb-1">Full Name *</label><input type="text" value={address.fullName} onChange={(e) => setAddress({ ...address, fullName: e.target.value })} className={`w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${errors.fullName ? 'border-red-300' : 'border-gray-200'}`} placeholder={state.user?.name} /></div>
                <div><label className="block text-sm font-medium text-navy-700 mb-1">Phone *</label><input type="tel" value={address.phone} onChange={(e) => setAddress({ ...address, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })} className={`w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${errors.phone ? 'border-red-300' : 'border-gray-200'}`} placeholder="9876543210" /></div>
                <div className="sm:col-span-2"><label className="block text-sm font-medium text-navy-700 mb-1">Address *</label><input type="text" value={address.addressLine1} onChange={(e) => setAddress({ ...address, addressLine1: e.target.value })} className={`w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${errors.addressLine1 ? 'border-red-300' : 'border-gray-200'}`} placeholder="House no., Street, Area" /></div>
                <div className="sm:col-span-2"><label className="block text-sm font-medium text-navy-700 mb-1">Landmark (optional)</label><input type="text" value={address.addressLine2 || ''} onChange={(e) => setAddress({ ...address, addressLine2: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" /></div>
                <div><label className="block text-sm font-medium text-navy-700 mb-1">City *</label><input type="text" value={address.city} onChange={(e) => setAddress({ ...address, city: e.target.value })} className={`w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${errors.city ? 'border-red-300' : 'border-gray-200'}`} /></div>
                <div><label className="block text-sm font-medium text-navy-700 mb-1">State *</label><input type="text" value={address.state} onChange={(e) => setAddress({ ...address, state: e.target.value })} className={`w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${errors.state ? 'border-red-300' : 'border-gray-200'}`} /></div>
                <div><label className="block text-sm font-medium text-navy-700 mb-1">Pincode *</label><input type="text" value={address.postalCode} onChange={(e) => setAddress({ ...address, postalCode: e.target.value.replace(/\D/g, '').slice(0, 6) })} className={`w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${errors.postalCode ? 'border-red-300' : 'border-gray-200'}`} placeholder="400001" /></div>
              </div>
              <button onClick={() => { if (validateAddress()) setStep(2); }} className="mt-6 px-6 py-3 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700 transition">Continue to Payment</button>
            </div>
          )}

          {step === 2 && (
            <div className="bg-white border border-gray-200 rounded-xl p-6 animate-fade-in">
              <h2 className="text-lg font-bold text-navy-900 mb-4">Payment Method</h2>
              <div className="space-y-3">
                <label className={`flex items-center gap-4 p-4 border-2 rounded-xl cursor-pointer transition ${paymentMethod === 'dodo' ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <input type="radio" name="payment" value="dodo" checked={paymentMethod === 'dodo'} onChange={() => setPaymentMethod('dodo')} className="text-primary-600" />
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-xs">dodo</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-navy-900">Dodo Payments</p>
                      <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium">RECOMMENDED</span>
                    </div>
                    <p className="text-xs text-navy-500">UPI, Cards, Net Banking, Wallets — Secured by Dodo</p>
                  </div>
                  <ShieldCheck size={20} className="text-green-600" />
                </label>
                <label className={`flex items-center gap-4 p-4 border-2 rounded-xl cursor-pointer transition ${paymentMethod === 'cod' ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <input type="radio" name="payment" value="cod" checked={paymentMethod === 'cod'} onChange={() => setPaymentMethod('cod')} className="text-primary-600" />
                  <Banknote size={20} className="text-navy-600" />
                  <div><p className="font-medium text-navy-900">Cash on Delivery</p><p className="text-xs text-navy-500">Pay when you receive your order</p></div>
                </label>
              </div>

              {paymentMethod === 'dodo' && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-xs text-blue-700 flex items-center gap-2">
                    <ShieldCheck size={14} className="shrink-0" />
                    A secure payment window will open right here — you stay on this page the whole time.
                  </p>
                </div>
              )}

              <div className="flex gap-3 mt-6">
                <button onClick={() => setStep(1)} className="px-6 py-3 border border-gray-200 rounded-xl font-medium text-navy-700 hover:bg-gray-50">Back</button>
                <button onClick={() => setStep(3)} className="px-6 py-3 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700">Review Order</button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="bg-white border border-gray-200 rounded-xl p-6 animate-fade-in">
              <h2 className="text-lg font-bold text-navy-900 mb-4">Review Your Order</h2>
              <div className="mb-6 p-4 bg-gray-50 rounded-xl">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-navy-900">{address.fullName}</p>
                    <p className="text-sm text-navy-600">{address.addressLine1}{address.addressLine2 ? `, ${address.addressLine2}` : ''}</p>
                    <p className="text-sm text-navy-600">{address.city}, {address.state} - {address.postalCode}</p>
                    <p className="text-sm text-navy-600">Phone: {address.phone}</p>
                  </div>
                  <button onClick={() => setStep(1)} className="text-xs text-primary-600 hover:text-primary-700">Edit</button>
                </div>
              </div>
              <div className="mb-6">
                <h3 className="font-medium text-navy-900 mb-3">Items ({state.cart.length})</h3>
                {state.cart.map((item) => (
                  <div key={item.product.id} className="flex items-center gap-3 py-2">
                    {item.product.images?.[0]?.startsWith('http') ? <img src={item.product.images[0]} alt="" className="w-12 h-12 rounded object-cover" /> : <span className="w-12 h-12 rounded bg-gray-100 flex items-center justify-center text-2xl">{item.product.images?.[0] || ''}</span>}
                    <div className="flex-1"><p className="text-sm font-medium text-navy-900 truncate">{item.product.name}</p><p className="text-xs text-navy-500">Qty: {item.quantity}</p></div>
                    <p className="text-sm font-medium">{formatPrice(item.product.price * item.quantity)}</p>
                  </div>
                ))}
              </div>
              <div className="mb-6 p-4 bg-gray-50 rounded-xl">
                <div className="flex justify-between items-center">
                  <p className="text-sm text-navy-600">Payment: <span className="font-medium text-navy-900">{paymentMethod === 'dodo' ? 'Dodo Payments (Secure)' : 'Cash on Delivery'}</span></p>
                  <button onClick={() => setStep(2)} className="text-xs text-primary-600 hover:text-primary-700">Edit</button>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep(2)} className="px-6 py-3 border border-gray-200 rounded-xl font-medium text-navy-700 hover:bg-gray-50">Back</button>
                <button onClick={handlePlaceOrder} disabled={processing} className="flex-1 py-3 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700 transition disabled:opacity-50">
                  {processing ? (
                    <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Processing...</span>
                  ) : paymentMethod === 'dodo' ? (
                    <span className="flex items-center justify-center gap-2">Pay {formatPrice(totals.total)} Securely <Lock size={15} /></span>
                  ) : (
                    `Place Order • ${formatPrice(totals.total)}`
                  )}
                </button>
              </div>
              {paymentMethod === 'dodo' && (
                <p className="text-xs text-navy-400 mt-3 text-center">You stay on this page — payment opens in a secure window</p>
              )}
            </div>
          )}
        </div>

        <div className="lg:col-span-1">
          <div className="bg-gray-50 rounded-xl p-6 sticky top-28">
            <h2 className="text-lg font-bold text-navy-900 mb-4">Order Summary</h2>
            <div className="space-y-2 text-sm mb-4">
              <div className="flex justify-between"><span className="text-navy-600">Subtotal</span><span>{formatPrice(totals.subtotal)}</span></div>
              {totals.discount > 0 && <div className="flex justify-between text-green-600"><span>Discount</span><span>-{formatPrice(totals.discount)}</span></div>}
              <div className="flex justify-between"><span className="text-navy-600">Shipping</span><span>{totals.shipping === 0 ? 'FREE' : formatPrice(totals.shipping)}</span></div>
              <div className="flex justify-between"><span className="text-navy-600">Tax</span><span>{formatPrice(totals.tax)}</span></div>
              <hr /><div className="flex justify-between text-lg font-bold"><span>Total</span><span>{formatPrice(totals.total)}</span></div>
            </div>
            <div className="flex items-center gap-2 text-xs text-navy-500 mt-3">
              <ShieldCheck size={14} className="text-green-600" />
              <span>Secured by Dodo Payments · 256-bit SSL</span>
            </div>
          </div>
        </div>
      </div>

      {/* In-page secure payment overlay — no navigation away */}
      {session && (
        <PaymentModal
          key={attempt}
          open
          orderNumber={session.orderNumber}
          amount={session.amount}
          provider={session.provider}
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
