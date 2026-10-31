'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { Search, ShoppingCart, Heart, User, Menu, X, ChevronDown, Package, LogOut, Settings, MapPin, Truck } from 'lucide-react';
import { useApp, logoutUser } from '@/store/AppContext';
import { Logo, LogoMark } from './Logo';

export function Header() {
  const { state, dispatch } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const userMenuRef = useRef<HTMLDivElement>(null);
  const cartCount = state.cart.reduce((sum, item) => sum + item.quantity, 0);

  // Close menus on route change (adjust state during render — React approved pattern)
  const [lastPathname, setLastPathname] = useState(pathname);
  if (lastPathname !== pathname) {
    setLastPathname(pathname);
    if (mobileMenuOpen) setMobileMenuOpen(false);
    if (userMenuOpen) setUserMenuOpen(false);
  }

  // Close user menu on outside click
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  };

  const isActive = (path: string) => pathname === path;

  const handleLogout = async () => {
    await logoutUser();
    dispatch({ type: 'LOGOUT' });
    setUserMenuOpen(false);
    router.push('/');
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-sm">
      {/* Top bar */}
      <div className="bg-gradient-to-r from-navy-900 via-indigo-900 to-navy-900 text-white text-xs py-1.5">
        <div className="shell flex justify-between items-center">
          <span className="flex items-center gap-1.5 min-w-0 truncate">
            <Truck size={13} className="shrink-0" /> <span className="truncate">Free shipping above ₹999</span>
            <span className="hidden sm:inline"><span className="opacity-50 px-1">·</span> Secure Online Payments</span>
            <span className="hidden md:inline"><span className="opacity-50 px-1">·</span> Easy 30-day returns</span>
          </span>
          <div className="hidden sm:flex gap-4">
            <Link href="/track-order" className="hover:text-primary-300 transition">Track Order</Link>
            <Link href="/contact" className="hover:text-primary-300 transition">Help</Link>
          </div>
        </div>
      </div>

      {/* Main header */}
      <div className="shell py-3">
        <div className="flex items-center gap-4">
          {/* Mobile menu button */}
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} aria-label="Toggle menu" className="lg:hidden p-2 hover:bg-gray-100 rounded-lg">
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>

          {/* Logo */}
          <Link href="/" className="shrink-0 hidden sm:block">
            <Logo size="md" />
          </Link>
          <Link href="/" className="shrink-0 sm:hidden">
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
            <div className="relative" ref={userMenuRef}>
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
                      <Link href="/account" className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50">
                        <User size={16} /> My Account
                      </Link>
                      <Link href="/account/orders" className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50">
                        <Package size={16} /> My Orders
                      </Link>
                      <Link href="/account/addresses" className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50">
                        <MapPin size={16} /> Addresses
                      </Link>
                      <Link href="/wishlist" className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50">
                        <Heart size={16} /> Wishlist
                      </Link>
                      <hr className="my-2" />
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 w-full"
                      >
                        <LogOut size={16} /> Logout
                      </button>
                    </>
                  ) : (
                    <>
                      <Link href="/login" className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50">
                        <User size={16} /> Login
                      </Link>
                      <Link href="/register" className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50">
                        <Settings size={16} /> Register
                      </Link>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Wishlist */}
            <Link href="/wishlist" className="relative p-2.5 hover:bg-gray-50 rounded-lg transition hidden sm:block">
              <Heart size={20} className="text-navy-700" />
              {state.wishlist.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-medium">
                  {state.wishlist.length}
                </span>
              )}
            </Link>

            {/* Cart */}
            <Link href="/cart" className="relative p-2.5 hover:bg-gray-50 rounded-lg transition">
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
          <Link href="/products" className={`px-3 py-1.5 text-sm font-medium rounded-lg transition ${isActive('/products') ? 'bg-primary-50 text-primary-700' : 'text-navy-700 hover:bg-gray-50'}`}>All Products</Link>
          <Link href="/products?category=electronics" className="px-3 py-1.5 text-sm text-navy-600 hover:bg-gray-50 rounded-lg transition">Electronics</Link>
          <Link href="/products?category=fashion" className="px-3 py-1.5 text-sm text-navy-600 hover:bg-gray-50 rounded-lg transition">Fashion</Link>
          <Link href="/products?category=home-living" className="px-3 py-1.5 text-sm text-navy-600 hover:bg-gray-50 rounded-lg transition">Home & Living</Link>
          <Link href="/products?category=beauty" className="px-3 py-1.5 text-sm text-navy-600 hover:bg-gray-50 rounded-lg transition">Beauty</Link>
          <Link href="/products?category=sports" className="px-3 py-1.5 text-sm text-navy-600 hover:bg-gray-50 rounded-lg transition">Sports</Link>
          <Link href="/products?tag=bestseller" className="px-3 py-1.5 text-sm font-medium text-amber-600 hover:bg-amber-50 rounded-lg transition">🔥 Bestsellers</Link>
          <Link href="/products?tag=sale" className="px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition">🏷️ Sale</Link>
        </nav>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-gray-100 bg-white animate-fade-in">
          <div className="px-4 py-3 space-y-1">
            <Link href="/products" className="block px-3 py-2 text-sm font-medium text-navy-700 hover:bg-gray-50 rounded-lg">All Products</Link>
            <Link href="/products?category=electronics" className="block px-3 py-2 text-sm text-navy-600 hover:bg-gray-50 rounded-lg">Electronics</Link>
            <Link href="/products?category=fashion" className="block px-3 py-2 text-sm text-navy-600 hover:bg-gray-50 rounded-lg">Fashion</Link>
            <Link href="/products?category=home-living" className="block px-3 py-2 text-sm text-navy-600 hover:bg-gray-50 rounded-lg">Home & Living</Link>
            <Link href="/products?category=beauty" className="block px-3 py-2 text-sm text-navy-600 hover:bg-gray-50 rounded-lg">Beauty</Link>
            <Link href="/products?category=sports" className="block px-3 py-2 text-sm text-navy-600 hover:bg-gray-50 rounded-lg">Sports</Link>
            <hr className="my-2" />
            <Link href="/wishlist" className="block px-3 py-2 text-sm text-navy-600 hover:bg-gray-50 rounded-lg">Wishlist ({state.wishlist.length})</Link>
            <Link href="/track-order" className="block px-3 py-2 text-sm text-navy-600 hover:bg-gray-50 rounded-lg">Track Order</Link>
            <Link href="/admin" className="block px-3 py-2 text-sm text-navy-600 hover:bg-gray-50 rounded-lg">Admin Dashboard</Link>
          </div>
        </div>
      )}
    </header>
  );
}
