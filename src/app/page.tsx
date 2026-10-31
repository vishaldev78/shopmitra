'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight, Truck, Shield, RotateCcw, Headphones, ChevronLeft, ChevronRight } from 'lucide-react';
import { useApp } from '@/store/AppContext';
import { getDiscount } from '@/lib/utils';
import { ProductCard } from '@/components/shop/ProductCard';

export default function Home() {
  const { state, dispatch } = useApp();
  const [currentBanner, setCurrentBanner] = useState(0);
  const products = state.products;
  const banners = state.banners;
  const categories = state.categories;

  useEffect(() => {
    if (banners.length === 0) return;
    const timer = setInterval(() => setCurrentBanner((b) => (b + 1) % banners.length), 5000);
    return () => clearInterval(timer);
  }, [banners.length]);

  const featuredProducts = products.filter((p) => p.is_featured);
  const newArrivals = [...products]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 4);
  const saleProducts = products.filter((p) => getDiscount(p.price, p.compare_price) >= 20);

  const categoryEmojis: Record<string, string> = {
    electronics: '📱',
    fashion: '👕',
    'home-living': '🏠',
    beauty: '💄',
    sports: '⚽',
    books: '📚',
  };

  return (
    <div className="max-w-7xl mx-auto px-4">
      {/* Hero Banner */}
      {banners.length > 0 && (
        <section className="relative mt-6 rounded-2xl overflow-hidden">
          <div className={`bg-gradient-to-r ${banners[currentBanner]?.background_color || 'from-indigo-600 to-purple-600'} p-8 md:p-16 text-white transition-all duration-500`}>
            {banners[currentBanner]?.image_url && (
              <img src={banners[currentBanner].image_url} alt="" className="absolute inset-0 w-full h-full object-cover opacity-20" />
            )}
            <div className="relative max-w-xl">
              <h1 className="text-3xl md:text-5xl font-bold mb-3">{banners[currentBanner]?.title}</h1>
              <p className="text-lg md:text-xl opacity-90 mb-6">{banners[currentBanner]?.subtitle}</p>
              <Link href={banners[currentBanner]?.cta_link || '/products'} className="inline-flex items-center gap-2 bg-white text-navy-900 px-6 py-3 rounded-xl font-semibold hover:bg-gray-100 transition">
                {banners[currentBanner]?.cta_text || 'Shop Now'} <ArrowRight size={18} />
              </Link>
            </div>
            {banners.length > 1 && (
              <>
                <div className="absolute bottom-4 left-8 flex gap-2">
                  {banners.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentBanner(i)}
                      aria-label={`Go to banner ${i + 1}`}
                      className={`w-2.5 h-2.5 rounded-full transition ${i === currentBanner ? 'bg-white' : 'bg-white/40'}`}
                    />
                  ))}
                </div>
                <button onClick={() => setCurrentBanner((b) => (b - 1 + banners.length) % banners.length)} aria-label="Previous banner" className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center"><ChevronLeft size={20} /></button>
                <button onClick={() => setCurrentBanner((b) => (b + 1) % banners.length)} aria-label="Next banner" className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center"><ChevronRight size={20} /></button>
              </>
            )}
          </div>
        </section>
      )}

      {/* Features Bar */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
        {[
          { icon: <Truck size={24} />, title: 'Free Shipping', desc: 'On orders above ₹999' },
          { icon: <RotateCcw size={24} />, title: 'Easy Returns', desc: '30-day return policy' },
          { icon: <Shield size={24} />, title: 'Secure Payment', desc: 'Dodo Payments' },
          { icon: <Headphones size={24} />, title: '24/7 Support', desc: 'Dedicated help center' },
        ].map((feature, i) => (
          <div key={i} className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
            <div className="text-primary-600">{feature.icon}</div>
            <div><p className="font-semibold text-sm text-navy-900">{feature.title}</p><p className="text-xs text-navy-500">{feature.desc}</p></div>
          </div>
        ))}
      </section>

      {/* Categories */}
      <section className="mt-12">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-navy-900">Shop by Category</h2>
          <Link href="/products" className="text-primary-600 text-sm font-medium flex items-center gap-1 hover:text-primary-700">View All <ArrowRight size={14} /></Link>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
          {categories.map((cat) => (
            <Link key={cat.id} href={`/products?category=${cat.slug}`} className="group flex flex-col items-center p-4 bg-gray-50 hover:bg-primary-50 rounded-xl transition">
              <span className="text-4xl mb-2 group-hover:scale-110 transition-transform">{categoryEmojis[cat.slug] || '🛍️'}</span>
              <span className="text-sm font-medium text-navy-700 text-center">{cat.name}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured Products */}
      {featuredProducts.length > 0 && (
        <section className="mt-12">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-navy-900">Featured Products</h2>
            <Link href="/products" className="text-primary-600 text-sm font-medium flex items-center gap-1 hover:text-primary-700">View All <ArrowRight size={14} /></Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {featuredProducts.slice(0, 8).map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onAddToCart={() => {
                  dispatch({ type: 'ADD_TO_CART', product, quantity: 1 });
                  dispatch({ type: 'SET_NOTIFICATION', notification: { type: 'success', message: `${product.name} added to cart!` } });
                }}
              />
            ))}
          </div>
        </section>
      )}

      {/* Sale Banner */}
      {saleProducts.length > 0 && (
        <section className="mt-12 bg-gradient-to-r from-red-50 to-orange-50 rounded-2xl p-6 md:p-8">
          <div className="flex justify-between items-center mb-6">
            <div><h2 className="text-2xl font-bold text-navy-900">🔥 Hot Deals</h2><p className="text-navy-600 text-sm mt-1">Grab these deals before they&apos;re gone!</p></div>
            <Link href="/products?tag=sale" className="text-red-600 text-sm font-medium flex items-center gap-1 hover:text-red-700">View All <ArrowRight size={14} /></Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {saleProducts.slice(0, 4).map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onAddToCart={() => {
                  dispatch({ type: 'ADD_TO_CART', product, quantity: 1 });
                  dispatch({ type: 'SET_NOTIFICATION', notification: { type: 'success', message: 'Added to cart!' } });
                }}
              />
            ))}
          </div>
        </section>
      )}

      {/* New Arrivals */}
      <section className="mt-12">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-navy-900">New Arrivals</h2>
          <Link href="/products?sort=newest" className="text-primary-600 text-sm font-medium flex items-center gap-1 hover:text-primary-700">View All <ArrowRight size={14} /></Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {newArrivals.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onAddToCart={() => {
                dispatch({ type: 'ADD_TO_CART', product, quantity: 1 });
                dispatch({ type: 'SET_NOTIFICATION', notification: { type: 'success', message: 'Added to cart!' } });
              }}
            />
          ))}
        </div>
      </section>

      {/* Newsletter */}
      <NewsletterSection />
    </div>
  );
}

function NewsletterSection() {
  const { dispatch } = useApp();
  const [email, setEmail] = useState('');
  const [subscribing, setSubscribing] = useState(false);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubscribing(true);
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      dispatch({
        type: 'SET_NOTIFICATION',
        notification: res.ok && data.success
          ? { type: 'success', message: 'Subscribed! Exclusive deals coming your way.' }
          : { type: 'error', message: data.error || 'Subscription failed' },
      });
      if (res.ok) setEmail('');
    } catch {
      dispatch({ type: 'SET_NOTIFICATION', notification: { type: 'error', message: 'Subscription failed' } });
    } finally {
      setSubscribing(false);
    }
  };

  return (
    <section className="mt-12 mb-8 bg-gradient-to-r from-primary-600 to-primary-800 rounded-2xl p-8 md:p-12 text-center text-white">
      <h2 className="text-2xl md:text-3xl font-bold mb-2">Join the ShopMitra Family</h2>
      <p className="text-primary-100 mb-6 max-w-md mx-auto">Get exclusive access to new arrivals, special offers, and member-only discounts.</p>
      <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter your email" className="flex-1 px-4 py-3 rounded-xl text-navy-900 placeholder-navy-400 focus:outline-none focus:ring-2 focus:ring-white" />
        <button type="submit" disabled={subscribing} className="px-6 py-3 bg-white text-primary-700 rounded-xl font-semibold hover:bg-gray-100 transition disabled:opacity-50">Subscribe</button>
      </form>
    </section>
  );
}
