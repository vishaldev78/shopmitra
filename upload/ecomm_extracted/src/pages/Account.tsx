import { Link } from 'react-router-dom';
import { User, Package, Heart, Settings, ChevronRight } from 'lucide-react';
import { useApp, formatPrice, type Product } from '../store/AppContext';
import { ProductCard } from './Home';

export function AccountDashboard() {
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
                { to: '/account', icon: <User size={16} />, label: 'Profile' },
                { to: '/account/orders', icon: <Package size={16} />, label: 'My Orders', badge: state.orders.length },
                { to: '/wishlist', icon: <Heart size={16} />, label: 'Wishlist', badge: state.wishlist.length },
              ].map(item => (
                <Link key={item.to} to={item.to} className="flex items-center justify-between px-3 py-2.5 rounded-lg text-sm text-navy-700 hover:bg-gray-50 transition">
                  <span className="flex items-center gap-3">{item.icon}{item.label}</span>
                  <span className="flex items-center gap-2">{item.badge ? <span className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full">{item.badge}</span> : null}<ChevronRight size={14} className="text-navy-400" /></span>
                </Link>
              ))}
              {state.user?.role !== 'customer' && (
                <Link to="/admin" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-amber-700 hover:bg-amber-50 transition">
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
                {state.orders.slice(0, 3).map(order => (
                  <div key={order.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div><p className="font-medium text-sm text-navy-900">{order.order_number}</p><p className="text-xs text-navy-500">{order.items.length} items • {new Date(order.created_at).toLocaleDateString()}</p></div>
                    <div className="text-right"><p className="font-medium text-sm">{formatPrice(order.total)}</p><span className={`text-xs px-2 py-0.5 rounded-full ${order.status === 'delivered' ? 'bg-green-100 text-green-700' : order.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{order.status}</span></div>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-navy-500">No orders yet. <Link to="/products" className="text-primary-600">Start shopping</Link></p>}
          </div>
        </div>
      </div>
    </div>
  );
}

export function AccountOrders() {
  const { state } = useApp();
  if (!state.isLoggedIn) return <NotLoggedIn />;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-navy-900 mb-6">My Orders</h1>
      {state.orders.length === 0 ? (
        <div className="text-center py-12"><div className="text-6xl mb-4">📦</div><h2 className="text-xl font-semibold text-navy-900 mb-2">No orders yet</h2><Link to="/products" className="px-6 py-3 bg-primary-600 text-white rounded-xl font-medium">Shop Now</Link></div>
      ) : (
        <div className="space-y-4">
          {state.orders.map(order => (
            <div key={order.id} className="bg-white border border-gray-200 rounded-xl p-4 md:p-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                <div><p className="font-bold text-navy-900">{order.order_number}</p><p className="text-sm text-navy-500">Placed on {new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p></div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-3 py-1 rounded-full font-medium ${order.status === 'delivered' ? 'bg-green-100 text-green-700' : order.status === 'shipped' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>{order.status}</span>
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

export function Wishlist() {
  const { state, dispatch } = useApp();
  const wishlistProducts = state.products.filter(p => state.wishlist.includes(p.id));

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-navy-900 mb-6">My Wishlist ({wishlistProducts.length})</h1>
      {wishlistProducts.length === 0 ? (
        <div className="text-center py-12"><div className="text-6xl mb-4">💝</div><h2 className="text-xl font-semibold text-navy-900 mb-2">Your wishlist is empty</h2><Link to="/products" className="px-6 py-3 bg-primary-600 text-white rounded-xl font-medium">Explore Products</Link></div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {wishlistProducts.map(product => (
            <ProductCard key={product.id} product={product} onAddToCart={() => { dispatch({ type: 'ADD_TO_CART', product, quantity: 1 }); dispatch({ type: 'SET_NOTIFICATION', notification: { type: 'success', message: 'Added to cart!' } }); }} />
          ))}
        </div>
      )}
    </div>
  );
}

export function TrackOrder() {
  const { state } = useApp();
  const orders = LocalStorageDB_getOrders();
  const [orderNumber, setOrderNumber] = useState('');
  const [result, setResult] = useState<any>(null);

  const handleTrack = () => {
    const order = orders.find((o: any) => o.order_number.toLowerCase() === orderNumber.toLowerCase());
    setResult(order ? { found: true, status: order.status } : { found: false });
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold text-navy-900 mb-2 text-center">Track Your Order</h1>
      <p className="text-navy-500 text-center mb-6">Enter your order number to check status</p>
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex gap-2">
          <input type="text" value={orderNumber} onChange={(e) => setOrderNumber(e.target.value)} placeholder="e.g., SV-ABC123" className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          <button onClick={handleTrack} className="px-6 py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700">Track</button>
        </div>
        {result && (
          <div className={`mt-4 p-4 rounded-lg ${result.found ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            {result.found ? <p className="font-medium text-green-700">Status: <span className="capitalize">{result.status}</span></p> : <p className="text-sm text-red-600">Order not found.</p>}
          </div>
        )}
      </div>
    </div>
  );
}

function LocalStorageDB_getOrders() {
  try { return JSON.parse(localStorage.getItem('sv_db_orders') || '[]'); } catch { return []; }
}

import { useState } from 'react';

function NotLoggedIn() {
  return (
    <div className="max-w-lg mx-auto px-4 py-16 text-center">
      <div className="text-6xl mb-4">🔒</div>
      <h1 className="text-2xl font-bold text-navy-900 mb-2">Please sign in</h1>
      <Link to="/login" className="px-6 py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition inline-block mt-4">Sign In</Link>
    </div>
  );
}
