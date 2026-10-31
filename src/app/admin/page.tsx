'use client';

import { useState, useEffect, useCallback } from 'react';
import { BarChart3, Package, Users, ShoppingBag, TrendingUp, AlertTriangle, Edit, Trash2, Plus, Search, Image as ImageIcon, ShieldAlert, Loader2, ShieldCheck, Ban, KeyRound, Store, UserCircle } from 'lucide-react';
import { useApp, useAdminMutations } from '@/store/AppContext';
import { formatPrice, isAdminRole } from '@/lib/utils';
import type { AdminStats, AdminUserRow, Banner, Product, Category } from '@/lib/types';

type AdminTab = 'dashboard' | 'products' | 'orders' | 'customers' | 'banners' | 'settings';

export default function AdminDashboard() {
  const { state } = useApp();
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');

  if (!state.isLoggedIn || !isAdminRole(state.user?.role)) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <ShieldAlert size={56} className="text-navy-300 mx-auto mb-4" strokeWidth={1.4} />
        <h1 className="text-2xl font-bold text-navy-900 mb-2">Seller Access Required</h1>
        <p className="text-navy-500 mb-4">Create your own shop account to sell on ShopMitra.</p>
        <p className="text-sm text-navy-400">Register as a seller on the Register page — no demo accounts exist.</p>
      </div>
    );
  }

  const tabs: { id: AdminTab; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <BarChart3 size={16} /> },
    { id: 'products', label: 'Products', icon: <Package size={16} /> },
    { id: 'orders', label: 'Orders', icon: <ShoppingBag size={16} /> },
    { id: 'banners', label: 'Banners', icon: <ImageIcon size={16} /> },
    { id: 'customers', label: 'Customers', icon: <Users size={16} /> },
    { id: 'settings', label: 'Settings', icon: <EyeIcon /> },
  ];

  return (
    <div className="shell py-6">
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold text-navy-900">{state.user?.role === 'super_admin' ? 'Admin Dashboard' : 'Seller Dashboard'}</h1><p className="text-sm text-navy-500">{state.user?.role === 'super_admin' ? 'Manage the platform' : `Manage your shop${state.user?.name ? ` • ${state.user.name}` : ''}`}</p></div>
        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">● Live</span>
      </div>

      <div className="flex gap-1 overflow-x-auto mb-6 bg-gray-100 p-1 rounded-xl">
        {tabs.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${activeTab === tab.id ? 'bg-white text-navy-900 shadow-sm' : 'text-navy-500 hover:text-navy-700'}`}>{tab.icon} {tab.label}</button>
        ))}
      </div>

      {activeTab === 'dashboard' && <DashboardOverview />}
      {activeTab === 'products' && <ProductsManagement />}
      {activeTab === 'orders' && <OrdersManagement />}
      {activeTab === 'banners' && <BannersManagement />}
      {activeTab === 'customers' && <CustomersManagement />}
      {activeTab === 'settings' && <StoreSettings />}
    </div>
  );
}

function EyeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" /><circle cx="12" cy="12" r="3" /></svg>
  );
}

function DashboardOverview() {
  const { state } = useApp();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/stats')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => data && setStats(data.stats))
      .finally(() => setLoading(false));
  }, [state.products.length]);

  const totalRevenue = stats?.totalRevenue ?? 0;
  const orders = stats?.recentOrders ?? [];
  const lowStockProducts = stats?.lowStock ?? [];
  const totalCustomers = stats?.totalCustomers ?? 0;

  const statCards = [
    { label: 'Total Revenue', value: formatPrice(totalRevenue), icon: <TrendingUp size={20} />, color: 'bg-green-50 text-green-600', change: '+12.5%' },
    { label: 'Total Orders', value: (stats?.totalOrders ?? 0).toString(), icon: <ShoppingBag size={20} />, color: 'bg-blue-50 text-blue-600', change: '+8.2%' },
    { label: 'Customers', value: totalCustomers.toString(), icon: <Users size={20} />, color: 'bg-purple-50 text-purple-600', change: '+15.3%' },
    { label: 'Products', value: (stats?.totalProducts ?? 0).toString(), icon: <Package size={20} />, color: 'bg-amber-50 text-amber-600', change: `${stats?.totalProducts ?? 0} active` },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, i) => (
          <div key={i} className="bg-white border border-gray-200 rounded-xl p-4 md:p-5">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${stat.color}`}>{stat.icon}</div>
              <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">{stat.change}</span>
            </div>
            <p className="text-2xl font-bold text-navy-900">{stat.value}</p>
            <p className="text-sm text-navy-500">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Account breakdown — super admin only */}
      {stats?.accounts && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 md:p-5">
          <h3 className="font-bold text-navy-900 mb-3">Accounts</h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: 'Total accounts', value: stats.accounts.total, icon: <UserCircle size={16} />, cls: 'bg-navy-50 text-navy-700' },
              { label: 'Merchants (sellers)', value: stats.accounts.merchants, icon: <Store size={16} />, cls: 'bg-blue-50 text-blue-700' },
              { label: 'Customers', value: stats.accounts.customers, icon: <Users size={16} />, cls: 'bg-purple-50 text-purple-700' },
              { label: 'Blocked', value: stats.accounts.blocked, icon: <Ban size={16} />, cls: 'bg-red-50 text-red-700' },
            ].map((a) => (
              <div key={a.label} className="flex items-center gap-3 bg-gray-50 rounded-lg p-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${a.cls}`}>{a.icon}</div>
                <div><p className="text-lg font-bold text-navy-900 leading-none">{a.value}</p><p className="text-xs text-navy-500 mt-0.5">{a.label}</p></div>
              </div>
            ))}
          </div>
          <p className="text-xs text-navy-400 mt-3">Manage every account in the Customers tab — change roles, block/unblock, reset passwords.</p>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="font-bold text-navy-900 mb-4">Revenue Overview</h3>
          <div className="flex items-end gap-2 h-40">
            {[65, 45, 78, 52, 89, 67, 92, 73, 85, 60, 95, 80].map((h, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full bg-primary-500 rounded-t-sm hover:bg-primary-600 transition" style={{ height: `${h}%` }} />
                <span className="text-[9px] text-navy-400">{['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'][i]}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="font-bold text-navy-900 mb-4">Recent Orders</h3>
          <div className="space-y-3">
            {orders.length === 0 && <p className="text-sm text-navy-400">No orders yet.</p>}
            {orders.map((order) => (
              <div key={order.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div><p className="text-sm font-medium text-navy-900">{order.order_number}</p><p className="text-xs text-navy-500">{order.shipping_address?.fullName || 'Guest'}</p></div>
                <div className="text-right"><p className="text-sm font-medium">{formatPrice(order.total)}</p><span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${order.status === 'delivered' ? 'bg-green-100 text-green-700' : order.status === 'shipped' ? 'bg-blue-100 text-blue-700' : order.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{order.status}</span></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {lowStockProducts.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3"><AlertTriangle size={18} className="text-amber-600" /><h3 className="font-bold text-amber-800">Low Stock Alert</h3></div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {lowStockProducts.map((p) => (
              <div key={p.id} className="flex items-center gap-3 bg-white rounded-lg p-3">
                {p.images?.[0]?.startsWith('http') ? <img src={p.images[0]} alt="" className="w-10 h-10 rounded object-cover" /> : <span className="text-2xl">📦</span>}
                <div className="flex-1 min-w-0"><p className="text-sm font-medium text-navy-900 truncate">{p.name}</p><p className="text-xs text-amber-600 font-medium">{p.stock} units left</p></div>
              </div>
            ))}
          </div>
        </div>
      )}
      {loading && <p className="text-sm text-navy-400">Loading stats...</p>}
    </div>
  );
}

const emptyForm = { name: '', slug: '', price: '', compare_price: '', brand: '', sku: '', stock: '', description: '', image_url: '', category_id: '' };

function ProductsManagement() {
  const { state } = useApp();
  const { saveProduct, deleteProduct } = useAdminMutations();
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [formData, setFormData] = useState(emptyForm);
  // Scoped server list: sellers get ONLY their own products (?manage=1).
  const [products, setProducts] = useState<Product[]>([]);
  const isSuper = state.user?.role === 'super_admin';

  const loadProducts = () => {
    fetch('/api/products?manage=1')
      .then((r) => (r.ok ? r.json() : { products: [] }))
      .then((d) => setProducts(d.products || []));
  };

  useEffect(() => {
    fetch('/api/categories').then((r) => r.json()).then((data) => setCategories(data.categories || []));
    loadProducts();
  }, []);

  const filtered = products.filter((p) => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const handleSave = async () => {
    if (!formData.name || !formData.price) return;
    const ok = await saveProduct(formData, editProduct);
    if (ok) {
      setShowAddForm(false);
      setEditProduct(null);
      setFormData(emptyForm);
      loadProducts();
    }
  };

  const handleDelete = async (productId: string) => {
    if (confirm('Are you sure you want to delete this product?')) {
      await deleteProduct(productId);
      loadProducts();
    }
  };

  const startEdit = (product: Product) => {
    setEditProduct(product);
    setFormData({
      name: product.name,
      slug: product.slug,
      price: String(product.price),
      compare_price: product.compare_price ? String(product.compare_price) : '',
      brand: product.brand || '',
      sku: product.sku || '',
      stock: String(product.stock),
      description: product.description || '',
      image_url: product.images?.[0] || '',
      category_id: product.category_id || '',
    });
    setShowAddForm(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-400" />
          <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search products..." className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
        </div>
        <button onClick={() => { setShowAddForm(true); setEditProduct(null); setFormData(emptyForm); }} className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700"><Plus size={14} /> Add Product</button>
      </div>

      {showAddForm && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 animate-fade-in">
          <h3 className="font-bold text-navy-900 mb-4">{editProduct ? 'Edit Product' : 'Add New Product'}</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-navy-700 mb-1">Name *</label><input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" /></div>
            <div><label className="block text-sm font-medium text-navy-700 mb-1">Slug</label><input type="text" value={formData.slug} onChange={(e) => setFormData({ ...formData, slug: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="auto-generated if empty" /></div>
            <div><label className="block text-sm font-medium text-navy-700 mb-1">Price (₹) *</label><input type="number" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" /></div>
            <div><label className="block text-sm font-medium text-navy-700 mb-1">Compare Price (₹)</label><input type="number" value={formData.compare_price} onChange={(e) => setFormData({ ...formData, compare_price: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" /></div>
            <div><label className="block text-sm font-medium text-navy-700 mb-1">Brand</label><input type="text" value={formData.brand} onChange={(e) => setFormData({ ...formData, brand: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" /></div>
            <div><label className="block text-sm font-medium text-navy-700 mb-1">SKU</label><input type="text" value={formData.sku} onChange={(e) => setFormData({ ...formData, sku: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" /></div>
            <div><label className="block text-sm font-medium text-navy-700 mb-1">Stock</label><input type="number" value={formData.stock} onChange={(e) => setFormData({ ...formData, stock: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" /></div>
            <div><label className="block text-sm font-medium text-navy-700 mb-1">Category</label>
              <select value={formData.category_id} onChange={(e) => setFormData({ ...formData, category_id: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                <option value="">Select category</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2"><label className="block text-sm font-medium text-navy-700 mb-1">Image URL</label><input type="text" value={formData.image_url} onChange={(e) => setFormData({ ...formData, image_url: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="https://..." /></div>
            <div className="sm:col-span-2"><label className="block text-sm font-medium text-navy-700 mb-1">Description</label><textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none" /></div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={handleSave} className="px-6 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700">{editProduct ? 'Update' : 'Create'} Product</button>
            <button onClick={() => { setShowAddForm(false); setEditProduct(null); }} className="px-6 py-2 border border-gray-200 rounded-lg text-sm font-medium text-navy-700 hover:bg-gray-50">Cancel</button>
          </div>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-navy-600">Product</th>
                <th className="text-left px-4 py-3 font-medium text-navy-600">SKU</th>
                <th className="text-right px-4 py-3 font-medium text-navy-600">Price</th>
                <th className="text-right px-4 py-3 font-medium text-navy-600">Stock</th>
                <th className="text-center px-4 py-3 font-medium text-navy-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-navy-400">{searchTerm ? 'No products match your search.' : isSuper ? 'No products yet.' : 'No products yet — click “Add Product” to start selling.'}</td></tr>
              )}
              {filtered.map((p) => (
                <tr key={p.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {p.images?.[0]?.startsWith('http') ? <img src={p.images[0]} alt="" className="w-10 h-10 rounded object-cover" /> : <span className="text-xl">📦</span>}
                      <div><p className="font-medium text-navy-900 truncate max-w-[200px]">{p.name}</p><p className="text-xs text-navy-500">{p.brand}</p></div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-navy-600 font-mono text-xs">{p.sku}</td>
                  <td className="px-4 py-3 text-right font-medium text-navy-900">{formatPrice(p.price)}</td>
                  <td className="px-4 py-3 text-right"><span className={`px-2 py-0.5 rounded-full text-xs ${p.stock < 20 ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>{p.stock}</span></td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => startEdit(p)} aria-label="Edit product" className="p-1.5 hover:bg-gray-100 rounded text-navy-500 hover:text-amber-600"><Edit size={14} /></button>
                      <button onClick={() => handleDelete(p.id)} aria-label="Delete product" className="p-1.5 hover:bg-gray-100 rounded text-navy-500 hover:text-red-600"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-gray-100"><p className="text-sm text-navy-500">{isSuper ? `Showing ${filtered.length} of ${products.length} products` : `Showing ${filtered.length} of your products`}</p></div>
      </div>
    </div>
  );
}

const STATUS_FLOW = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'] as const;

function statusPillCls(status: string): string {
  return status === 'delivered'
    ? 'bg-green-100 text-green-700'
    : status === 'shipped'
      ? 'bg-blue-100 text-blue-700'
      : status === 'cancelled'
        ? 'bg-red-100 text-red-700'
        : 'bg-amber-100 text-amber-700';
}

function OrdersManagement() {
  const { state, dispatch } = useApp();
  const [orders, setOrders] = useState(state.orders);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');

  const loadOrders = useCallback(() => {
    return fetch('/api/orders?scope=all')
      .then((r) => (r.ok ? r.json() : { orders: [] }))
      .then((data) => setOrders(data.orders || []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const patchOrder = async (orderNumber: string, body: Record<string, string>) => {
    setSavingId(orderNumber);
    try {
      const res = await fetch(`/api/orders/${orderNumber}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Update failed');
      setOrders((list) => list.map((o) => (o.order_number === orderNumber ? data.order : o)));
      dispatch({ type: 'SET_NOTIFICATION', notification: { type: 'success', message: `Order ${orderNumber} updated` } });
    } catch (error) {
      dispatch({ type: 'SET_NOTIFICATION', notification: { type: 'error', message: (error as Error).message } });
    } finally {
      setSavingId(null);
    }
  };

  const visible = filter === 'all' ? orders : orders.filter((o) => o.status === filter);

  return (
    <div className="space-y-4">
      {/* Status filter chips */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {['all', ...STATUS_FLOW].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap capitalize transition ${filter === f ? 'bg-navy-900 text-white' : 'bg-gray-100 text-navy-600 hover:bg-gray-200'}`}
          >
            {f} {f !== 'all' && `(${orders.filter((o) => o.status === f).length})`}
          </button>
        ))}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-navy-600">Order #</th>
                <th className="text-left px-4 py-3 font-medium text-navy-600">Customer</th>
                <th className="text-left px-4 py-3 font-medium text-navy-600">Date</th>
                <th className="text-right px-4 py-3 font-medium text-navy-600">Total</th>
                <th className="text-center px-4 py-3 font-medium text-navy-600">Payment</th>
                <th className="text-center px-4 py-3 font-medium text-navy-600">Status</th>
                <th className="text-center px-4 py-3 font-medium text-navy-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((order) => (
                <tr key={order.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs font-medium text-navy-900">{order.order_number}</td>
                  <td className="px-4 py-3 text-navy-700">
                    <p>{order.shipping_address?.fullName || 'Guest'}</p>
                    <p className="text-[11px] text-navy-400">{order.payment_method === 'cod' ? 'COD' : 'Prepaid'}</p>
                  </td>
                  <td className="px-4 py-3 text-navy-500 whitespace-nowrap">{new Date(order.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-right font-medium text-navy-900">{formatPrice(order.total)}</td>
                  <td className="px-4 py-3 text-center">
                    {order.payment_method === 'cod' ? (
                      order.payment_status === 'paid' ? (
                        <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">collected</span>
                      ) : (
                        <button
                          onClick={() => patchOrder(order.order_number, { payment_status: 'paid' })}
                          disabled={savingId === order.order_number}
                          className="text-xs px-2.5 py-1 rounded-full bg-green-600 text-white hover:bg-green-700 transition disabled:opacity-50"
                        >
                          Mark paid
                        </button>
                      )
                    ) : (
                      <span className={`text-xs px-2 py-1 rounded-full ${order.payment_status === 'paid' ? 'bg-green-100 text-green-700' : order.payment_status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{order.payment_status}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs px-2 py-1 rounded-full ${statusPillCls(order.status)}`}>{order.status}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <select
                        value={order.status}
                        disabled={savingId === order.order_number}
                        onChange={(e) => patchOrder(order.order_number, { status: e.target.value })}
                        className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
                        aria-label={`Update status for ${order.order_number}`}
                      >
                        {STATUS_FLOW.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                      {savingId === order.order_number && <Loader2 size={13} className="animate-spin text-primary-600" />}
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && visible.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-navy-400">No orders in this view</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <p className="text-xs text-navy-400">Cancelling an order returns reserved stock automatically; re-opening re-reserves it when available.</p>
    </div>
  );
}

const emptyBannerForm = { title: '', subtitle: '', cta_text: '', cta_link: '', image_url: '', background_color: 'from-indigo-600 to-purple-600' };

function BannersManagement() {
  const { state } = useApp();
  const { addBanner, updateBanner, deleteBanner, toggleBanner } = useAdminMutations();
  const [showForm, setShowForm] = useState(false);
  const [editBanner, setEditBanner] = useState<Banner | null>(null);
  const [formData, setFormData] = useState(emptyBannerForm);

  const openCreate = () => {
    setEditBanner(null);
    setFormData(emptyBannerForm);
    setShowForm(true);
  };

  const startEdit = (banner: Banner) => {
    setEditBanner(banner);
    setFormData({
      title: banner.title,
      subtitle: banner.subtitle || '',
      cta_text: banner.cta_text || '',
      cta_link: banner.cta_link || '',
      image_url: banner.image_url || '',
      background_color: banner.background_color || 'from-indigo-600 to-purple-600',
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditBanner(null);
  };

  const handleSave = async () => {
    if (!formData.title.trim()) return;
    const ok = editBanner ? await updateBanner(editBanner.id, formData) : await addBanner(formData);
    if (ok) closeForm();
  };

  const handleDelete = async (bannerId: string) => {
    if (confirm('Delete this banner?')) {
      await deleteBanner(bannerId);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold text-navy-900">Banners ({state.banners.length})</h2>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700"><Plus size={14} /> Add Banner</button>
      </div>

      {showForm && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 animate-fade-in">
          <h3 className="font-bold text-navy-900 mb-4">{editBanner ? 'Edit Banner' : 'Create Banner'}</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-navy-700 mb-1">Title *</label><input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" /></div>
            <div><label className="block text-sm font-medium text-navy-700 mb-1">Subtitle</label><input type="text" value={formData.subtitle} onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" /></div>
            <div><label className="block text-sm font-medium text-navy-700 mb-1">CTA Text</label><input type="text" value={formData.cta_text} onChange={(e) => setFormData({ ...formData, cta_text: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" /></div>
            <div><label className="block text-sm font-medium text-navy-700 mb-1">CTA Link</label><input type="text" value={formData.cta_link} onChange={(e) => setFormData({ ...formData, cta_link: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" /></div>
            <div className="sm:col-span-2"><label className="block text-sm font-medium text-navy-700 mb-1">Image URL</label><input type="text" value={formData.image_url} onChange={(e) => setFormData({ ...formData, image_url: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" /></div>
            <div><label className="block text-sm font-medium text-navy-700 mb-1">Background Gradient</label>
              <select value={formData.background_color} onChange={(e) => setFormData({ ...formData, background_color: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                <option value="from-indigo-600 to-purple-600">Indigo → Purple</option>
                <option value="from-emerald-600 to-teal-600">Emerald → Teal</option>
                <option value="from-amber-500 to-orange-600">Amber → Orange</option>
                <option value="from-rose-500 to-pink-600">Rose → Pink</option>
                <option value="from-navy-800 to-navy-900">Navy Dark</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={handleSave} className="px-6 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700">{editBanner ? 'Update Banner' : 'Create Banner'}</button>
            <button onClick={closeForm} className="px-6 py-2 border border-gray-200 rounded-lg text-sm font-medium text-navy-700 hover:bg-gray-50">Cancel</button>
          </div>
        </div>
      )}

      <div className="grid gap-4">
        {state.banners.map((banner: Banner) => (
          <div key={banner.id} className={`bg-gradient-to-r ${banner.background_color || 'from-indigo-600 to-purple-600'} rounded-xl p-5 text-white relative overflow-hidden`}>
            {banner.image_url && <img src={banner.image_url} alt="" className="absolute inset-0 w-full h-full object-cover opacity-20" />}
            <div className="relative flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold">{banner.title}</h3>
                <p className="opacity-90">{banner.subtitle}</p>
                {banner.cta_text && <span className="inline-block mt-2 px-3 py-1 bg-white/20 rounded text-sm">{banner.cta_text}</span>}
              </div>
              <div className="flex gap-2">
                <button onClick={() => toggleBanner(banner)} className={`px-3 py-1 rounded text-xs font-medium ${banner.is_active ? 'bg-green-500/30' : 'bg-red-500/30'}`}>{banner.is_active ? 'Active' : 'Inactive'}</button>
                <button onClick={() => startEdit(banner)} aria-label="Edit banner" className="p-1.5 bg-white/20 rounded hover:bg-white/30"><Edit size={14} /></button>
                <button onClick={() => handleDelete(banner.id)} aria-label="Delete banner" className="p-1.5 bg-white/20 rounded hover:bg-white/30"><Trash2 size={14} /></button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CustomersManagement() {
  const { state, dispatch } = useApp();
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'merchants' | 'customers'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'disabled'>('all');
  const [resetTarget, setResetTarget] = useState<AdminUserRow | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const isSuperAdmin = state.user?.role === 'super_admin';

  const loadUsers = useCallback(() => {
    return fetch('/api/admin/users')
      .then((r) => (r.ok ? r.json() : { users: [] }))
      .then((data) => setUsers(data.users || []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const patchUser = async (id: string, body: Record<string, string | boolean>, okMessage: string) => {
    setSavingId(id);
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Update failed');
      setUsers((list) => list.map((u) => (u.id === id ? data.user : u)));
      dispatch({ type: 'SET_NOTIFICATION', notification: { type: 'success', message: okMessage } });
    } catch (error) {
      dispatch({ type: 'SET_NOTIFICATION', notification: { type: 'error', message: (error as Error).message } });
    } finally {
      setSavingId(null);
    }
  };

  const handleResetPassword = async () => {
    if (!resetTarget || newPassword.length < 6) return;
    await patchUser(resetTarget.id, { password: newPassword }, `Password updated for ${resetTarget.name} — share it with them securely`);
    setResetTarget(null);
    setNewPassword('');
  };

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#$%&';
    const arr = new Uint32Array(12);
    crypto.getRandomValues(arr);
    setNewPassword(Array.from(arr, (n) => chars[n % chars.length]).join(''));
  };

  // Totals across every account (computed from the full list, not the filtered view)
  const totals = {
    all: users.length,
    merchants: users.filter((u) => u.role === 'admin' || u.role === 'super_admin').length,
    customers: users.filter((u) => u.role === 'customer').length,
    blocked: users.filter((u) => !u.is_active).length,
  };

  const filtered = users.filter((u) => {
    const q = searchTerm.trim().toLowerCase();
    if (q && !u.name.toLowerCase().includes(q) && !u.email.toLowerCase().includes(q) && !(u.shop_name || '').toLowerCase().includes(q)) return false;
    if (roleFilter === 'merchants' && u.role !== 'admin' && u.role !== 'super_admin') return false;
    if (roleFilter === 'customers' && u.role !== 'customer') return false;
    if (statusFilter === 'active' && !u.is_active) return false;
    if (statusFilter === 'disabled' && u.is_active) return false;
    return true;
  });

  const chips: { id: string; label: string; count: number; active: boolean; onClick: () => void }[] = [
    { id: 'all', label: 'All accounts', count: totals.all, active: roleFilter === 'all' && statusFilter === 'all', onClick: () => { setRoleFilter('all'); setStatusFilter('all'); } },
    { id: 'merchants', label: 'Merchants', count: totals.merchants, active: roleFilter === 'merchants', onClick: () => { setRoleFilter('merchants'); setStatusFilter('all'); } },
    { id: 'customers', label: 'Customers', count: totals.customers, active: roleFilter === 'customers', onClick: () => { setRoleFilter('customers'); setStatusFilter('all'); } },
    { id: 'blocked', label: 'Blocked', count: totals.blocked, active: statusFilter === 'disabled', onClick: () => { setRoleFilter('all'); setStatusFilter('disabled'); } },
  ];

  return (
    <div className="space-y-4">
      {/* Account totals */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {chips.map((c) => (
          <button
            key={c.id}
            onClick={c.onClick}
            className={`bg-white border rounded-xl p-4 text-left transition ${c.active ? 'border-primary-500 ring-1 ring-primary-500' : 'border-gray-200 hover:border-gray-300'}`}
          >
            <p className="text-2xl font-bold text-navy-900 leading-none">{c.count}</p>
            <p className="text-sm text-navy-500 mt-1">{c.label}</p>
          </button>
        ))}
      </div>

      {/* Search + filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, email or shop..."
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as typeof roleFilter)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          aria-label="Filter by role"
        >
          <option value="all">All roles</option>
          <option value="merchants">Merchants / admins</option>
          <option value="customers">Customers</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          aria-label="Filter by status"
        >
          <option value="all">All statuses</option>
          <option value="active">Active only</option>
          <option value="disabled">Blocked only</option>
        </select>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-navy-600">Account</th>
                <th className="text-left px-4 py-3 font-medium text-navy-600">Email</th>
                <th className="text-left px-4 py-3 font-medium text-navy-600">Role</th>
                <th className="text-right px-4 py-3 font-medium text-navy-600">Orders</th>
                <th className="text-left px-4 py-3 font-medium text-navy-600">Joined</th>
                <th className="text-center px-4 py-3 font-medium text-navy-600">Status</th>
                <th className="text-center px-4 py-3 font-medium text-navy-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-navy-400">Loading accounts...</td></tr>
              )}
              {filtered.map((u) => {
                const self = u.id === state.user?.id;
                const manageable = u.role === 'customer' || isSuperAdmin;
                return (
                  <tr key={u.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-xs font-medium text-primary-700">{u.name?.split(' ').map((n) => n[0]).join('')}</div>
                        <span className="font-medium text-navy-900">{u.name}{self && <span className="text-[10px] text-navy-400 ml-1">(you)</span>}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-navy-600">{u.email}</td>
                    <td className="px-4 py-3">
                      {isSuperAdmin && !self ? (
                        <select
                          value={u.role}
                          disabled={savingId === u.id}
                          onChange={(e) => patchUser(u.id, { role: e.target.value }, `${u.name} is now ${e.target.value.replace('_', ' ')}`)}
                          className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
                          aria-label={`Change role for ${u.email}`}
                        >
                          <option value="customer">customer</option>
                          <option value="admin">admin (seller)</option>
                          <option value="super_admin">super_admin</option>
                        </select>
                      ) : (
                        <div>
                          <span className={`text-xs px-2 py-1 rounded-full ${u.role === 'super_admin' ? 'bg-purple-100 text-purple-700' : u.role === 'admin' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>{u.role === 'admin' ? 'admin (seller)' : u.role}</span>
                          {u.role === 'admin' && u.shop_name && <p className="text-[11px] text-navy-400 mt-0.5 flex items-center gap-1"><Store size={10} /> {u.shop_name}</p>}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-navy-700">{u.order_count}</td>
                    <td className="px-4 py-3 text-navy-500 whitespace-nowrap">{new Date(u.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                    <td className="px-4 py-3 text-center"><span className={`text-xs px-2 py-1 rounded-full ${u.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{u.is_active ? 'Active' : 'Blocked'}</span></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-3">
                        {isSuperAdmin && (
                          <button
                            onClick={() => { setResetTarget(u); setNewPassword(''); }}
                            className="inline-flex items-center gap-1 text-xs font-medium text-navy-600 hover:text-primary-700"
                            title="Set a new password for this account"
                          >
                            <KeyRound size={12} /> Reset password
                          </button>
                        )}
                        {self ? (
                          <span className="text-[11px] text-navy-300">—</span>
                        ) : manageable ? (
                          u.is_active ? (
                            <button
                              onClick={() => patchUser(u.id, { is_active: false }, `${u.name} blocked — sign-in disabled`)}
                              disabled={savingId === u.id}
                              className="inline-flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
                            >
                              {savingId === u.id ? <Loader2 size={12} className="animate-spin" /> : <Ban size={12} />} Block
                            </button>
                          ) : (
                            <button
                              onClick={() => patchUser(u.id, { is_active: true }, `${u.name} unblocked`)}
                              disabled={savingId === u.id}
                              className="inline-flex items-center gap-1 text-xs font-medium text-green-700 hover:text-green-800 disabled:opacity-50"
                            >
                              {savingId === u.id ? <Loader2 size={12} className="animate-spin" /> : <ShieldCheck size={12} />} Unblock
                            </button>
                          )
                        ) : (
                          <span className="text-[11px] text-navy-300">super admin only</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-navy-400">{users.length === 0 ? 'No accounts yet' : 'No accounts match your search'}</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-gray-100">
          <p className="text-xs text-navy-400">Blocked accounts cannot sign in. Passwords are stored hashed and can never be viewed — use “Reset password” to set a new one you can share.</p>
        </div>
      </div>

      {/* Reset password modal */}
      {resetTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setResetTarget(null)}>
          <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center text-primary-600"><KeyRound size={18} /></div>
              <div>
                <h3 className="font-bold text-navy-900">Reset password</h3>
                <p className="text-xs text-navy-500">{resetTarget.name} · {resetTarget.email}</p>
              </div>
            </div>
            <label className="block text-sm font-medium text-navy-700 mb-1">New password</label>
            <div className="flex gap-2 mb-1">
              <input
                type="text"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <button onClick={generatePassword} className="px-3 py-2 border border-gray-200 rounded-lg text-xs font-medium text-navy-700 hover:bg-gray-50 whitespace-nowrap">Generate</button>
            </div>
            <p className="text-xs text-navy-400 mb-4">Passwords are stored hashed — nobody (not even super admins) can view the old one. Setting a new password here lets you share it with the user.</p>
            <div className="flex gap-3">
              <button
                onClick={handleResetPassword}
                disabled={newPassword.length < 6 || savingId === resetTarget.id}
                className="px-5 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
              >
                Set password
              </button>
              <button onClick={() => setResetTarget(null)} className="px-5 py-2 border border-gray-200 rounded-lg text-sm font-medium text-navy-700 hover:bg-gray-50">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StoreSettings() {
  const { state } = useApp();
  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="font-bold text-navy-900 mb-4">Store Information</h3>
        <div className="space-y-4">
          <div><label className="block text-sm font-medium text-navy-700 mb-1">Store Name</label><input type="text" defaultValue="ShopMitra" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" /></div>
          <div><label className="block text-sm font-medium text-navy-700 mb-1">Contact Email</label><input type="email" defaultValue="support@shopmitra.in" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" /></div>
          <div><label className="block text-sm font-medium text-navy-700 mb-1">Currency</label><select className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"><option>INR (₹)</option><option>USD ($)</option></select></div>
          <button className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700">Save Changes</button>
        </div>
      </div>
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="font-bold text-navy-900 mb-4">Payments</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <p className="text-sm font-medium text-navy-900">Online Payments</p>
              <p className="text-xs text-navy-500">UPI · Cards · Net Banking · Wallets</p>
            </div>
            <span className="text-xs font-semibold text-green-700 bg-green-100 px-2 py-1 rounded-full">Enabled</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <p className="text-sm font-medium text-navy-900">Cash on Delivery</p>
              <p className="text-xs text-navy-500">Collect payment when the order is delivered</p>
            </div>
            <span className="text-xs font-semibold text-green-700 bg-green-100 px-2 py-1 rounded-full">Enabled</span>
          </div>
          <p className="text-xs text-navy-400">Gateway credentials live in the server environment — they are never exposed to the storefront or this dashboard.</p>
        </div>
      </div>
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="font-bold text-navy-900 mb-4">Database Status</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-navy-600">SQLite + Prisma</span><span className="text-green-600 font-medium">Connected</span></div>
          <div className="flex justify-between"><span className="text-navy-600">Products</span><span className="font-medium">{state.products.length}</span></div>
          <div className="flex justify-between"><span className="text-navy-600">Orders</span><span className="font-medium">{state.orders.length}</span></div>
          <div className="flex justify-between"><span className="text-navy-600">Banners</span><span className="font-medium">{state.banners.length}</span></div>
        </div>
      </div>
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="font-bold text-navy-900 mb-4">Shipping & Tax</h3>
        <div className="space-y-4">
          <div><label className="block text-sm font-medium text-navy-700 mb-1">Free Shipping Threshold (₹)</label><input type="number" defaultValue={999} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" /></div>
          <div><label className="block text-sm font-medium text-navy-700 mb-1">Default Shipping Rate (₹)</label><input type="number" defaultValue={99} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" /></div>
          <div><label className="block text-sm font-medium text-navy-700 mb-1">GST Rate (%)</label><input type="number" defaultValue={18} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" /></div>
          <button className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700">Save Settings</button>
        </div>
      </div>
    </div>
  );
}
