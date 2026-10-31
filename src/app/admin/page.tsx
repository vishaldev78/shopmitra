'use client';

import { useState, useEffect } from 'react';
import { BarChart3, Package, Users, ShoppingBag, TrendingUp, AlertTriangle, Edit, Trash2, Plus, Search, Image as ImageIcon } from 'lucide-react';
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
        <div className="text-6xl mb-4">🔒</div>
        <h1 className="text-2xl font-bold text-navy-900 mb-2">Admin Access Required</h1>
        <p className="text-navy-500 mb-4">You need admin privileges to access this page.</p>
        <p className="text-sm text-navy-400">Login as: admin@shopmitra.in / admin123</p>
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
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold text-navy-900">Admin Dashboard</h1><p className="text-sm text-navy-500">Manage your store • Role: {state.user?.role}</p></div>
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

  useEffect(() => {
    fetch('/api/categories').then((r) => r.json()).then((data) => setCategories(data.categories || []));
  }, []);

  const filtered = state.products.filter((p) => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const handleSave = async () => {
    if (!formData.name || !formData.price) return;
    const ok = await saveProduct(formData, editProduct);
    if (ok) {
      setShowAddForm(false);
      setEditProduct(null);
      setFormData(emptyForm);
    }
  };

  const handleDelete = async (productId: string) => {
    if (confirm('Are you sure you want to delete this product?')) {
      await deleteProduct(productId);
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
        <div className="px-4 py-3 border-t border-gray-100"><p className="text-sm text-navy-500">Showing {filtered.length} of {state.products.length} products</p></div>
      </div>
    </div>
  );
}

function OrdersManagement() {
  const { state } = useApp();
  const [orders, setOrders] = useState(state.orders);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Admin sees all orders via scope=all
    fetch('/api/orders?scope=all')
      .then((r) => (r.ok ? r.json() : { orders: state.orders }))
      .then((data) => setOrders(data.orders || []))
      .finally(() => setLoading(false));
  }, [state.orders.length]);

  return (
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
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-xs font-medium text-navy-900">{order.order_number}</td>
                <td className="px-4 py-3 text-navy-700">{order.shipping_address?.fullName || 'Guest'}</td>
                <td className="px-4 py-3 text-navy-500">{new Date(order.created_at).toLocaleDateString()}</td>
                <td className="px-4 py-3 text-right font-medium text-navy-900">{formatPrice(order.total)}</td>
                <td className="px-4 py-3 text-center"><span className={`text-xs px-2 py-1 rounded-full ${order.payment_status === 'paid' ? 'bg-green-100 text-green-700' : order.payment_status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{order.payment_status}</span></td>
                <td className="px-4 py-3 text-center"><span className={`text-xs px-2 py-1 rounded-full ${order.status === 'delivered' ? 'bg-green-100 text-green-700' : order.status === 'shipped' ? 'bg-blue-100 text-blue-700' : order.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{order.status}</span></td>
              </tr>
            ))}
            {!loading && orders.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-navy-400">No orders yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BannersManagement() {
  const { state } = useApp();
  const { addBanner, deleteBanner, toggleBanner } = useAdminMutations();
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({ title: '', subtitle: '', cta_text: '', cta_link: '', image_url: '', background_color: 'from-indigo-600 to-purple-600' });

  const handleAdd = async () => {
    if (!formData.title) return;
    const ok = await addBanner(formData);
    if (ok) {
      setShowAddForm(false);
      setFormData({ title: '', subtitle: '', cta_text: '', cta_link: '', image_url: '', background_color: 'from-indigo-600 to-purple-600' });
    }
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
        <button onClick={() => setShowAddForm(!showAddForm)} className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700"><Plus size={14} /> Add Banner</button>
      </div>

      {showAddForm && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 animate-fade-in">
          <h3 className="font-bold text-navy-900 mb-4">Create Banner</h3>
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
            <button onClick={handleAdd} className="px-6 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700">Create Banner</button>
            <button onClick={() => setShowAddForm(false)} className="px-6 py-2 border border-gray-200 rounded-lg text-sm font-medium text-navy-700 hover:bg-gray-50">Cancel</button>
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
  const { state } = useApp();
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/users')
      .then((r) => (r.ok ? r.json() : { users: [] }))
      .then((data) => setUsers(data.users || []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-navy-600">Customer</th>
              <th className="text-left px-4 py-3 font-medium text-navy-600">Email</th>
              <th className="text-center px-4 py-3 font-medium text-navy-600">Role</th>
              <th className="text-right px-4 py-3 font-medium text-navy-600">Orders</th>
              <th className="text-center px-4 py-3 font-medium text-navy-600">Status</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3"><div className="flex items-center gap-2"><div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-xs font-medium text-primary-700">{u.name?.split(' ').map((n) => n[0]).join('')}</div><span className="font-medium text-navy-900">{u.name}</span></div></td>
                <td className="px-4 py-3 text-navy-600">{u.email}</td>
                <td className="px-4 py-3 text-center"><span className={`text-xs px-2 py-1 rounded-full ${u.role === 'super_admin' ? 'bg-purple-100 text-purple-700' : u.role === 'admin' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>{u.role}</span></td>
                <td className="px-4 py-3 text-right text-navy-700">{u.order_count}</td>
                <td className="px-4 py-3 text-center"><span className={`text-xs px-2 py-1 rounded-full ${u.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{u.is_active ? 'Active' : 'Disabled'}</span></td>
              </tr>
            ))}
            {!loading && users.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-navy-400">No customers found</td></tr>
            )}
          </tbody>
        </table>
      </div>
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
        <h3 className="font-bold text-navy-900 mb-4">Payment - Dodo Payments</h3>
        <div className="space-y-4">
          <div><label className="block text-sm font-medium text-navy-700 mb-1">Dodo API Key</label><input type="password" placeholder="Configured via DODO_PAYMENTS_API_KEY env var" disabled className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50" /></div>
          <p className="text-xs text-navy-400">Set <code className="bg-gray-100 px-1 rounded">DODO_PAYMENTS_API_KEY</code> in the server environment to enable live payments. Without it, a built-in simulated checkout is used.</p>
          <div className="flex items-center gap-2"><input type="checkbox" id="cod-enable" defaultChecked className="rounded text-primary-600" /><label htmlFor="cod-enable" className="text-sm text-navy-600">Enable Cash on Delivery</label></div>
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
