'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { Search, ShoppingCart, Heart, User, Menu, X, ChevronDown, Package, LogOut, Settings, MapPin, Truck } from 'lucide-react';
import { useApp, logoutUser } from '@/store/AppContext';
import { Logo } from './Logo';

export function Header() {
  const { state, dispatch } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const userMenuRef = useRef<HTMLDivElement>(null);
  const mobileSearchRef = useRef<HTMLInputElement>(null);
  const cartCount = state.cart.reduce((sum, item) => sum + item.quantity, 0);

  // Close menus on route change (adjust state during render — React approved pattern)
  const [lastPathname, setLastPathname] = useState(pathname);
  if (lastPathname !== pathname) {
    setLastPathname(pathname);
    if (mobileMenuOpen) setMobileMenuOpen(false);
    if (mobileSearchOpen) setMobileSearchOpen(false);
    if (userMenuOpen) setUserMenuOpen(false);
  }

  // Auto-focus the search input when the mobile search panel opens
  useEffect(() => {
    if (mobileSearchOpen) mobileSearchRef.current?.focus();
  }, [mobileSearchOpen]);

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
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          {/* Mobile menu button */}
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} aria-label="Toggle menu" className="lg:hidden p-2 hover:bg-gray-100 rounded-lg shrink-0">
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>

          {/* Logo — compact wordmark on phones, full lockup on larger screens */}
          <Link href="/" className="shrink-0" aria-label="ShopMitra home">
            <span className="sm:hidden">
              <Logo size="xs" tagline={false} />
            </span>
            <span className="hidden sm:inline">
              <Logo size="md" />
            </span>
          </Link>

          {/* Search bar — inline on desktop only. On phones the navbar shows a
              search icon instead; tapping it opens the search box below. */}
          <form onSubmit={handleSearch} className="hidden lg:block lg:flex-1 lg:max-w-2xl lg:mx-2">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for products, brands and more"
                aria-label="Search products"
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[15px] font-medium text-navy-900 placeholder:text-gray-500 placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
            </div>
          </form>

          {/* Right actions — search icon (phones) · profile · wishlist · cart pinned far right.
              Profile/wishlist/cart live only in the hamburger menu on phones. */}
          <div className="ml-auto flex items-center gap-0.5 sm:gap-1.5 shrink-0">
            {/* Search toggle — phones only: opens the search box below the navbar */}
            <button
              onClick={() => {
                setMobileSearchOpen(!mobileSearchOpen);
                if (!mobileSearchOpen) setMobileMenuOpen(false);
              }}
              aria-label="Search"
              aria-expanded={mobileSearchOpen}
              className={`lg:hidden p-2.5 rounded-lg transition ${mobileSearchOpen ? 'bg-primary-50 text-primary-600' : 'text-navy-700 hover:bg-gray-50'}`}
            >
              <Search size={21} />
            </button>

            {/* User menu — desktop only (in hamburger menu on phones) */}
            <div className="relative hidden lg:block" ref={userMenuRef}>
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                aria-label={state.isLoggedIn ? 'Account menu' : 'Login or register'}
                className="flex items-center gap-1.5 px-2 sm:px-3 py-2 text-sm text-navy-700 hover:bg-gray-50 rounded-lg transition"
              >
                <User size={21} />
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

            {/* Wishlist — desktop only (in hamburger menu on phones) */}
            <Link href="/wishlist" aria-label="Wishlist" className="relative hidden lg:block p-2.5 hover:bg-gray-50 rounded-lg transition">
              <Heart size={21} className="text-navy-700" />
              {state.wishlist.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-medium">
                  {state.wishlist.length}
                </span>
              )}
            </Link>

            {/* Cart — desktop only (in hamburger menu on phones) */}
            <Link href="/cart" aria-label="Cart" className="relative hidden lg:block p-2.5 hover:bg-gray-50 rounded-lg transition">
              <ShoppingCart size={21} className="text-navy-700" />
              {cartCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-primary-600 text-white text-[10px] rounded-full flex items-center justify-center font-medium">
                  {cartCount}
                </span>
              )}
            </Link>
          </div>
        </div>

        {/* Mobile search panel — opens below the navbar when the search icon is tapped */}
        {mobileSearchOpen && (
          <form onSubmit={handleSearch} className="lg:hidden mt-2 animate-fade-in">
            <div className="relative">
              <input
                ref={mobileSearchRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for products, brands and more"
                aria-label="Search products"
                className="w-full pl-10 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[15px] font-medium text-navy-900 placeholder:text-gray-500 placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
              <button
                type="button"
                onClick={() => setMobileSearchOpen(false)}
                aria-label="Close search"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-navy-700 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>
          </form>
        )}

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

      {/* Mobile menu — account, wishlist & cart live here on phones */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-gray-100 bg-white animate-fade-in">
          <div className="px-4 py-3 space-y-1">
            {/* Account section */}
            {state.isLoggedIn ? (
              <>
                <div className="px-3 pt-1 pb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Hi, {state.user?.name?.split(' ')[0] || 'there'}
                </div>
                <Link href="/account" className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-navy-700 hover:bg-gray-50 rounded-lg">
                  <User size={18} /> My Account
                </Link>
                <Link href="/account/orders" className="flex items-center gap-3 px-3 py-2.5 text-sm text-navy-600 hover:bg-gray-50 rounded-lg">
                  <Package size={18} /> My Orders
                </Link>
                <Link href="/account/addresses" className="flex items-center gap-3 px-3 py-2.5 text-sm text-navy-600 hover:bg-gray-50 rounded-lg">
                  <MapPin size={18} /> Addresses
                </Link>
                <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-lg w-full">
                  <LogOut size={18} /> Logout
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-navy-700 hover:bg-gray-50 rounded-lg">
                  <User size={18} /> Login
                </Link>
                <Link href="/register" className="flex items-center gap-3 px-3 py-2.5 text-sm text-navy-600 hover:bg-gray-50 rounded-lg">
                  <Settings size={18} /> Register
                </Link>
              </>
            )}

            <hr className="my-2" />

            {/* Wishlist & Cart (with live counts) */}
            <Link href="/wishlist" className="flex items-center justify-between px-3 py-2.5 text-sm text-navy-600 hover:bg-gray-50 rounded-lg">
              <span className="flex items-center gap-3">
                <Heart size={18} /> Wishlist
              </span>
              {state.wishlist.length > 0 && (
                <span className="min-w-5 px-1.5 h-5 bg-red-500 text-white text-[11px] rounded-full flex items-center justify-center font-medium">{state.wishlist.length}</span>
              )}
            </Link>
            <Link href="/cart" className="flex items-center justify-between px-3 py-2.5 text-sm text-navy-600 hover:bg-gray-50 rounded-lg">
              <span className="flex items-center gap-3">
                <ShoppingCart size={18} /> Cart
              </span>
              {cartCount > 0 && (
                <span className="min-w-5 px-1.5 h-5 bg-primary-600 text-white text-[11px] rounded-full flex items-center justify-center font-medium">{cartCount}</span>
              )}
            </Link>

            <hr className="my-2" />

            {/* Categories */}
            <Link href="/products" className="block px-3 py-2 text-sm font-medium text-navy-700 hover:bg-gray-50 rounded-lg">All Products</Link>
            <Link href="/products?category=electronics" className="block px-3 py-2 text-sm text-navy-600 hover:bg-gray-50 rounded-lg">Electronics</Link>
            <Link href="/products?category=fashion" className="block px-3 py-2 text-sm text-navy-600 hover:bg-gray-50 rounded-lg">Fashion</Link>
            <Link href="/products?category=home-living" className="block px-3 py-2 text-sm text-navy-600 hover:bg-gray-50 rounded-lg">Home & Living</Link>
            <Link href="/products?category=beauty" className="block px-3 py-2 text-sm text-navy-600 hover:bg-gray-50 rounded-lg">Beauty</Link>
            <Link href="/products?category=sports" className="block px-3 py-2 text-sm text-navy-600 hover:bg-gray-50 rounded-lg">Sports</Link>

            <hr className="my-2" />

            <Link href="/track-order" className="block px-3 py-2 text-sm text-navy-600 hover:bg-gray-50 rounded-lg">Track Order</Link>
            <Link href="/admin" className="block px-3 py-2 text-sm text-navy-600 hover:bg-gray-50 rounded-lg">Admin Dashboard</Link>
          </div>
        </div>
      )}
    </header>
  );
}
