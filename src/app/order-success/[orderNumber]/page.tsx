'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { Check } from 'lucide-react';
import { formatPrice } from '@/lib/utils';
import type { Order } from '@/lib/types';

export default function OrderSuccess({ params }: { params: Promise<{ orderNumber: string }> }) {
  const { orderNumber } = use(params);
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/orders/${orderNumber}`)
      .then((r) => (r.ok ? r.json() : { order: null }))
      .then((data) => setOrder(data.order || null))
      .catch(() => setOrder(null))
      .finally(() => setLoading(false));
  }, [orderNumber]);

  return (
    <div className="max-w-lg mx-auto px-4 py-16 text-center">
      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6"><Check size={40} className="text-green-600" strokeWidth={2.5} /></div>
      <h1 className="text-2xl font-bold text-navy-900 mb-2">Order Placed Successfully!</h1>
      <p className="text-navy-500 mb-6">Thank you for your purchase. Your order has been confirmed.</p>
      {loading ? (
        <div className="py-6"><div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto" /></div>
      ) : order ? (
        <div className="bg-gray-50 rounded-xl p-6 text-left mb-6">
          <p className="text-sm text-navy-500">Order Number</p>
          <p className="font-bold text-navy-900 text-lg">{order.order_number}</p>
          <p className="text-sm text-navy-500 mt-3">Total Amount</p>
          <p className="font-bold text-navy-900">{formatPrice(order.total)}</p>
          <p className="text-sm text-navy-500 mt-3">Payment</p>
          <p className="font-medium text-navy-900 capitalize">{order.payment_method === 'dodo' ? 'Dodo Payments' : order.payment_method === 'cod' ? 'Cash on Delivery' : order.payment_method}</p>
        </div>
      ) : (
        <div className="bg-gray-50 rounded-xl p-6 text-left mb-6">
          <p className="text-sm text-navy-500">Order Number</p>
          <p className="font-bold text-navy-900 text-lg">{orderNumber}</p>
        </div>
      )}
      <div className="flex gap-3 justify-center">
        <Link href="/account/orders" className="px-6 py-3 border border-gray-200 rounded-xl font-medium text-navy-700 hover:bg-gray-50 transition">View Orders</Link>
        <Link href="/products" className="px-6 py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition">Continue Shopping</Link>
      </div>
    </div>
  );
}
