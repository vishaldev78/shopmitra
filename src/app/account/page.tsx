'use client';

import Link from 'next/link';
import { User, Package, Heart, Settings, ChevronRight, Lock } from 'lucide-react';
import { useApp } from '@/store/AppContext';
import { formatPrice } from '@/lib/utils';

export default function AccountDashboard() {
  const { state } = useApp();
  if (!state.isLoggedIn) return <NotLoggedIn />;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-navy-900 mb-6">My Account</h1>
      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center"><User size={20} className="text-primary-600" /></div>
              <div><p className="font-semibold text-navy-900">{state.user?.name}</p><p className="text-sm text-navy-500">{state.user?.email}</p></div>
            </div>
            <nav className="space-y-1">
              {[
                { to: '/account', icon: <User size={16} />, label: 'Profile', badge: 0 },
                { to: '/account/orders', icon: <Package size={16} />, label: 'My Orders', badge: state.orders.length },
                { to: '/wishlist', icon: <Heart size={16} />, label: 'Wishlist', badge: state.wishlist.length },
              ].map((item) => (
                <Link key={item.to} href={item.to} className="flex items-center justify-between px-3 py-2.5 rounded-lg text-sm text-navy-700 hover:bg-gray-50 transition">
                  <span className="flex items-center gap-3">{item.icon}{item.label}</span>
                  <span className="flex items-center gap-2">{item.badge ? <span className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full">{item.badge}</span> : null}<ChevronRight size={14} className="text-navy-400" /></span>
                </Link>
              ))}
              {(state.user?.role === 'admin' || state.user?.role === 'super_admin') && (
                <Link href="/admin" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-amber-700 hover:bg-amber-50 transition">
                  <Settings size={16} /> Admin Dashboard
                </Link>
              )}
            </nav>
          </div>
        </div>
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h2 className="font-bold text-navy-900 mb-4">Recent Orders</h2>
            {state.orders.length > 0 ? (
              <div className="space-y-3">
                {state.orders.slice(0, 3).map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div><p className="font-medium text-sm text-navy-900">{order.order_number}</p><p className="text-xs text-navy-500">{order.items.length} items • {new Date(order.created_at).toLocaleDateString()}</p></div>
                    <div className="text-right"><p className="font-medium text-sm">{formatPrice(order.total)}</p><span className={`text-xs px-2 py-0.5 rounded-full ${order.status === 'delivered' ? 'bg-green-100 text-green-700' : order.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{order.status}</span></div>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-navy-500">No orders yet. <Link href="/products" className="text-primary-600">Start shopping</Link></p>}
          </div>
        </div>
      </div>
    </div>
  );
}

function NotLoggedIn() {
  return (
    <div className="max-w-lg mx-auto px-4 py-16 text-center">
      <Lock size={48} className="text-navy-300 mx-auto mb-4" />
      <h1 className="text-2xl font-bold text-navy-900 mb-2">Please sign in</h1>
      <Link href="/login" className="px-6 py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition inline-block mt-4">Sign In</Link>
    </div>
  );
}
