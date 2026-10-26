'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Check, X, Loader2 } from 'lucide-react';
import { useApp } from '@/store/AppContext';

export function PaymentReturnContent({ cancelled = false }: { cancelled?: boolean }) {
  const searchParams = useSearchParams();
  const { dispatch } = useApp();
  const [status, setStatus] = useState<'loading' | 'success' | 'failed'>('loading');
  const [orderNumber, setOrderNumber] = useState<string>('');

  useEffect(() => {
    async function processPayment() {
      const orderNo = searchParams.get('order_number') || sessionStorage.getItem('pending_order_number') || '';
      const paymentStatus = cancelled ? 'cancelled' : (searchParams.get('status') || 'succeeded');
      const paymentId = searchParams.get('payment_id') || undefined;

      if (!orderNo) {
        setStatus('failed');
        return;
      }
      setOrderNumber(orderNo);

      try {
        const res = await fetch('/api/payments/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            order_number: orderNo,
            payment_id: paymentId,
            status: paymentStatus === 'succeeded' ? 'succeeded' : 'cancelled',
          }),
        });
        const data = await res.json();
        if (res.ok && data.success && paymentStatus === 'succeeded') {
          // Payment done — empty the cart and refresh orders like a completed checkout
          dispatch({ type: 'CLEAR_CART' });
          dispatch({ type: 'REMOVE_COUPON' });
          try {
            const ordersRes = await fetch('/api/orders');
            if (ordersRes.ok) {
              const ordersData = await ordersRes.json();
              dispatch({ type: 'SET_ORDERS', orders: ordersData.orders || [] });
            }
          } catch {}
          setStatus('success');
        } else {
          setStatus('failed');
        }
      } catch {
        setStatus('failed');
      } finally {
        sessionStorage.removeItem('pending_order_number');
      }
    }

    processPayment();
  }, [searchParams, cancelled]);

  if (status === 'loading') {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <Loader2 size={48} className="animate-spin text-primary-600 mx-auto mb-4" />
        <h1 className="text-xl font-bold text-navy-900 mb-2">Processing Payment...</h1>
        <p className="text-navy-500">Please wait while we verify your payment with Dodo Payments.</p>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Check size={40} className="text-green-600" />
        </div>
        <h1 className="text-2xl font-bold text-navy-900 mb-2">Payment Successful!</h1>
        <p className="text-navy-500 mb-6">Your payment has been processed via Dodo Payments.</p>
        {orderNumber && (
          <div className="bg-gray-50 rounded-xl p-6 text-left mb-6">
            <p className="text-sm text-navy-500">Order Number</p>
            <p className="font-bold text-navy-900 text-lg">{orderNumber}</p>
            <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
              <Check size={12} /> Verified by Dodo Payments
            </p>
          </div>
        )}
        <div className="flex gap-3 justify-center">
          <Link href="/account/orders" className="px-6 py-3 border border-gray-200 rounded-xl font-medium text-navy-700 hover:bg-gray-50">View Orders</Link>
          <Link href="/products" className="px-6 py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700">Continue Shopping</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-16 text-center">
      <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <X size={40} className="text-red-600" />
      </div>
      <h1 className="text-2xl font-bold text-navy-900 mb-2">{cancelled ? 'Payment Cancelled' : 'Payment Failed'}</h1>
      <p className="text-navy-500 mb-6">Your payment could not be processed. Please try again.</p>
      {orderNumber && <p className="text-xs text-navy-400 mb-4">Order reference: {orderNumber}</p>}
      <div className="flex gap-3 justify-center">
        <Link href="/cart" className="px-6 py-3 border border-gray-200 rounded-xl font-medium text-navy-700 hover:bg-gray-50">Back to Cart</Link>
        <Link href="/products" className="px-6 py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700">Continue Shopping</Link>
      </div>
    </div>
  );
}
