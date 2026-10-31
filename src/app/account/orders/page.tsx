'use client';

import Link from 'next/link';
import { useApp } from '@/store/AppContext';
import { formatPrice } from '@/lib/utils';

export default function AccountOrders() {
  const { state } = useApp();
  if (!state.isLoggedIn) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <div className="text-6xl mb-4">🔒</div>
        <h1 className="text-2xl font-bold text-navy-900 mb-2">Please sign in</h1>
        <Link href="/login" className="px-6 py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition inline-block mt-4">Sign In</Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-navy-900 mb-6">My Orders</h1>
      {state.orders.length === 0 ? (
        <div className="text-center py-12"><div className="text-6xl mb-4">📦</div><h2 className="text-xl font-semibold text-navy-900 mb-2">No orders yet</h2><Link href="/products" className="px-6 py-3 bg-primary-600 text-white rounded-xl font-medium inline-block">Shop Now</Link></div>
      ) : (
        <div className="space-y-4">
          {state.orders.map((order) => (
            <div key={order.id} className="bg-white border border-gray-200 rounded-xl p-4 md:p-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                <div><p className="font-bold text-navy-900">{order.order_number}</p><p className="text-sm text-navy-500">Placed on {new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p></div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-3 py-1 rounded-full font-medium ${order.status === 'delivered' ? 'bg-green-100 text-green-700' : order.status === 'shipped' ? 'bg-blue-100 text-blue-700' : order.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{order.status}</span>
                  <span className="font-bold text-navy-900">{formatPrice(order.total)}</span>
                </div>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {order.items.map((item, i) => (
                  <div key={i} className="flex items-center gap-2 bg-gray-50 rounded-lg p-2 shrink-0">
                    {item.product_image?.startsWith('http') ? <img src={item.product_image} alt="" className="w-10 h-10 rounded object-cover" /> : <span className="text-2xl">📦</span>}
                    <div><p className="text-xs font-medium text-navy-900 max-w-[120px] truncate">{item.product_name}</p><p className="text-xs text-navy-500">Qty: {item.quantity}</p></div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
