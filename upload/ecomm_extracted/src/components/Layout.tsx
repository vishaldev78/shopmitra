import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Search, ShoppingCart, Heart, User, Menu, X, ChevronDown, Package, LogOut, Settings, MapPin } from 'lucide-react';
import { useApp } from '../store/AppContext';
import { Logo, LogoMark } from './Logo';

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 page-transition">{children}</main>
      <Footer />
      <Notification />
    </div>
  );
}

function Notification() {
  const { state } = useApp();
  if (!state.notification) return null;
  const colors = { success: 'bg-green-500', error: 'bg-red-500', info: 'bg-blue-500' };
  return (
    <div className={`fixed top-20 right-4 z-50 ${colors[state.notification.type]} text-white px-6 py-3 rounded-lg shadow-lg animate-fade-in`}>
      {state.notification.message}
    </div>
  );
}

function Header() {
  const { state, dispatch } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const cartCount = state.cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-sm">
      {/* Top bar */}
      <div className="bg-gradient-to-r from-navy-900 via-indigo-900 to-navy-900 text-white text-xs py-1.5">
        <div className="max-w-7xl mx-auto px-4 flex justify-between items-center">
          <span>🎉 Free shipping on orders above ₹999 | 🔒 Secure Dodo Payments | ✨ Easy 30-day returns</span>
          <div className="hidden sm:flex gap-4">
            <Link to="/track-order" className="hover:text-primary-300 transition">Track Order</Link>
            <Link to="/contact" className="hover:text-primary-300 transition">Help</Link>
          </div>
        </div>
      </div>

      {/* Main header */}
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center gap-4">
          {/* Mobile menu button */}
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="lg:hidden p-2 hover:bg-gray-100 rounded-lg">
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>

          {/* Logo */}
          <Link to="/" className="shrink-0 hidden sm:block">
            <Logo size="md" />
          </Link>
          <Link to="/" className="shrink-0 sm:hidden">
            <LogoMark size={36} />
          </Link>

          {/* Search bar */}
          <form onSubmit={handleSearch} className="flex-1 max-w-2xl">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products, brands, categories..."
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            </div>
          </form>

          {/* Right actions */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* User menu */}
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-1.5 px-3 py-2 text-sm text-navy-700 hover:bg-gray-50 rounded-lg transition"
              >
                <User size={20} />
                <span className="hidden md:block">{state.isLoggedIn ? state.user?.name?.split(' ')[0] : 'Account'}</span>
                <ChevronDown size={14} className="hidden md:block" />
              </button>
              {userMenuOpen && (
                <div className="absolute right-0 top-full mt-1 w-56 bg-white rounded-xl shadow-xl border border-gray-100 py-2 animate-fade-in">
                  {state.isLoggedIn ? (
                    <>
                      <Link to="/account" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50">
                        <User size={16} /> My Account
                      </Link>
                      <Link to="/account/orders" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50">
                        <Package size={16} /> My Orders
                      </Link>
                      <Link to="/account/addresses" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50">
                        <MapPin size={16} /> Addresses
                      </Link>
                      <Link to="/wishlist" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50">
                        <Heart size={16} /> Wishlist
                      </Link>
                      <hr className="my-2" />
                      <button
                        onClick={() => { dispatch({ type: 'LOGOUT' }); setUserMenuOpen(false); navigate('/'); }}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 w-full"
                      >
                        <LogOut size={16} /> Logout
                      </button>
                    </>
                  ) : (
                    <>
                      <Link to="/login" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50">
                        <User size={16} /> Login
                      </Link>
                      <Link to="/register" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50">
                        <Settings size={16} /> Register
                      </Link>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Wishlist */}
            <Link to="/wishlist" className="relative p-2.5 hover:bg-gray-50 rounded-lg transition hidden sm:block">
              <Heart size={20} className="text-navy-700" />
              {state.wishlist.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-medium">
                  {state.wishlist.length}
                </span>
              )}
            </Link>

            {/* Cart */}
            <Link to="/cart" className="relative p-2.5 hover:bg-gray-50 rounded-lg transition">
              <ShoppingCart size={20} className="text-navy-700" />
              {cartCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-primary-600 text-white text-[10px] rounded-full flex items-center justify-center font-medium">
                  {cartCount}
                </span>
              )}
            </Link>
          </div>
        </div>

        {/* Navigation */}
        <nav className="hidden lg:flex items-center gap-1 mt-2 pt-2 border-t border-gray-50">
          <Link to="/products" className={`px-3 py-1.5 text-sm font-medium rounded-lg transition ${isActive('/products') ? 'bg-primary-50 text-primary-700' : 'text-navy-700 hover:bg-gray-50'}`}>All Products</Link>
          <Link to="/products?category=electronics" className="px-3 py-1.5 text-sm text-navy-600 hover:bg-gray-50 rounded-lg transition">Electronics</Link>
          <Link to="/products?category=fashion" className="px-3 py-1.5 text-sm text-navy-600 hover:bg-gray-50 rounded-lg transition">Fashion</Link>
          <Link to="/products?category=home-living" className="px-3 py-1.5 text-sm text-navy-600 hover:bg-gray-50 rounded-lg transition">Home & Living</Link>
          <Link to="/products?category=beauty" className="px-3 py-1.5 text-sm text-navy-600 hover:bg-gray-50 rounded-lg transition">Beauty</Link>
          <Link to="/products?category=sports" className="px-3 py-1.5 text-sm text-navy-600 hover:bg-gray-50 rounded-lg transition">Sports</Link>
          <Link to="/products?tag=bestseller" className="px-3 py-1.5 text-sm font-medium text-amber-600 hover:bg-amber-50 rounded-lg transition">🔥 Bestsellers</Link>
          <Link to="/products?tag=sale" className="px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition">🏷️ Sale</Link>
        </nav>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-gray-100 bg-white animate-fade-in">
          <div className="px-4 py-3 space-y-1">
            <Link to="/products" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 text-sm font-medium text-navy-700 hover:bg-gray-50 rounded-lg">All Products</Link>
            <Link to="/products?category=electronics" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 text-sm text-navy-600 hover:bg-gray-50 rounded-lg">Electronics</Link>
            <Link to="/products?category=fashion" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 text-sm text-navy-600 hover:bg-gray-50 rounded-lg">Fashion</Link>
            <Link to="/products?category=home-living" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 text-sm text-navy-600 hover:bg-gray-50 rounded-lg">Home & Living</Link>
            <Link to="/products?category=beauty" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 text-sm text-navy-600 hover:bg-gray-50 rounded-lg">Beauty</Link>
            <Link to="/products?category=sports" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 text-sm text-navy-600 hover:bg-gray-50 rounded-lg">Sports</Link>
            <hr className="my-2" />
            <Link to="/wishlist" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 text-sm text-navy-600 hover:bg-gray-50 rounded-lg">Wishlist ({state.wishlist.length})</Link>
            <Link to="/track-order" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 text-sm text-navy-600 hover:bg-gray-50 rounded-lg">Track Order</Link>
            <Link to="/admin" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 text-sm text-navy-600 hover:bg-gray-50 rounded-lg">Admin Dashboard</Link>
          </div>
        </div>
      )}
    </header>
  );
}

function Footer() {
  return (
    <footer className="bg-navy-900 text-white mt-12">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <div className="mb-4">
              <Logo size="md" />
            </div>
            <p className="text-navy-300 text-sm leading-relaxed">Your shopping friend — premium products at unbeatable prices with exceptional service and secure Dodo Payments.</p>
            <div className="flex gap-3 mt-4">
              {['facebook', 'twitter', 'instagram', 'youtube'].map(social => (
                <a key={social} href="#" className="w-9 h-9 bg-navy-800 rounded-lg flex items-center justify-center hover:bg-primary-600 transition text-sm">
                  {social[0].toUpperCase()}
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2.5 text-sm text-navy-300">
              <li><Link to="/about" className="hover:text-white transition">About Us</Link></li>
              <li><Link to="/contact" className="hover:text-white transition">Contact Us</Link></li>
              <li><Link to="/faq" className="hover:text-white transition">FAQ</Link></li>
              <li><Link to="/track-order" className="hover:text-white transition">Track Order</Link></li>
              <li><Link to="/admin" className="hover:text-white transition">Admin Dashboard</Link></li>
            </ul>
          </div>

          {/* Customer Service */}
          <div>
            <h3 className="font-semibold mb-4">Customer Service</h3>
            <ul className="space-y-2.5 text-sm text-navy-300">
              <li><Link to="/shipping-policy" className="hover:text-white transition">Shipping Policy</Link></li>
              <li><Link to="/return-policy" className="hover:text-white transition">Return & Refund</Link></li>
              <li><Link to="/privacy-policy" className="hover:text-white transition">Privacy Policy</Link></li>
              <li><Link to="/terms" className="hover:text-white transition">Terms & Conditions</Link></li>
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h3 className="font-semibold mb-4">Stay Updated</h3>
            <p className="text-navy-300 text-sm mb-3">Subscribe for exclusive deals and new arrivals.</p>
            <form onSubmit={(e) => e.preventDefault()} className="flex gap-2">
              <input type="email" placeholder="Your email" className="flex-1 px-3 py-2 bg-navy-800 border border-navy-700 rounded-lg text-sm text-white placeholder-navy-400 focus:outline-none focus:ring-2 focus:ring-primary-500" />
              <button className="px-4 py-2 bg-primary-600 hover:bg-primary-700 rounded-lg text-sm font-medium transition">Join</button>
            </form>
            <div className="mt-4 flex items-center gap-2 text-sm text-navy-300">
              <span>📞</span> 1800-123-4567
            </div>
            <div className="flex items-center gap-2 text-sm text-navy-300 mt-1">
              <span>✉️</span> support@shopmitra.in
            </div>
          </div>
        </div>

        <div className="border-t border-navy-800 mt-10 pt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-navy-400 text-sm">© 2024 ShopMitra. All rights reserved.</p>
          <div className="flex gap-4 text-sm text-navy-400">
            <span>💳 Secure Payments</span>
            <span>🔒 SSL Encrypted</span>
            <span>✅ Verified Seller</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
