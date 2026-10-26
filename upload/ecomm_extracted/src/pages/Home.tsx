import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Star, Truck, Shield, RotateCcw, Headphones, ChevronLeft, ChevronRight } from 'lucide-react';
import { useApp, formatPrice, getDiscount, type Product } from '../store/AppContext';
import { LocalStorageDB } from '../db/manager';

export default function Home() {
  const { state, dispatch } = useApp();
  const [currentBanner, setCurrentBanner] = useState(0);
  const products = state.products;
  const banners = state.banners;

  useEffect(() => {
    if (banners.length === 0) return;
    const timer = setInterval(() => setCurrentBanner(b => (b + 1) % banners.length), 5000);
    return () => clearInterval(timer);
  }, [banners.length]);

  const categories = LocalStorageDB.getAll<any>('categories').filter((c: any) => c.is_active);
  const featuredProducts = products.filter(p => p.is_featured);
  const bestSellers = products.filter(p => p.tags.includes('bestseller'));
  const newArrivals = [...products].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 4);
  const saleProducts = products.filter(p => getDiscount(p.price, p.compare_price) >= 20);

  const categoryEmojis: Record<string, string> = { electronics: '📱', fashion: '👕', 'home-living': '🏠', beauty: '💄', sports: '⚽', books: '📚' };

  if (!state.dbReady) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-navy-500">Loading ShopMitra...</p>
      </div>
    );
  }

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
              <Link to={banners[currentBanner]?.cta_link || '/products'} className="inline-flex items-center gap-2 bg-white text-navy-900 px-6 py-3 rounded-xl font-semibold hover:bg-gray-100 transition">
                {banners[currentBanner]?.cta_text || 'Shop Now'} <ArrowRight size={18} />
              </Link>
            </div>
            {banners.length > 1 && (
              <>
                <div className="absolute bottom-4 left-8 flex gap-2">
                  {banners.map((_, i) => (
                    <button key={i} onClick={() => setCurrentBanner(i)} className={`w-2.5 h-2.5 rounded-full transition ${i === currentBanner ? 'bg-white' : 'bg-white/40'}`} />
                  ))}
                </div>
                <button onClick={() => setCurrentBanner(b => (b - 1 + banners.length) % banners.length)} className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center"><ChevronLeft size={20} /></button>
                <button onClick={() => setCurrentBanner(b => (b + 1) % banners.length)} className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center"><ChevronRight size={20} /></button>
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
          <Link to="/products" className="text-primary-600 text-sm font-medium flex items-center gap-1 hover:text-primary-700">View All <ArrowRight size={14} /></Link>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
          {categories.map((cat: any) => (
            <Link key={cat.id} to={`/products?category=${cat.slug}`} className="group flex flex-col items-center p-4 bg-gray-50 hover:bg-primary-50 rounded-xl transition">
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
            <Link to="/products" className="text-primary-600 text-sm font-medium flex items-center gap-1 hover:text-primary-700">View All <ArrowRight size={14} /></Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {featuredProducts.slice(0, 8).map(product => (
              <ProductCard key={product.id} product={product} onAddToCart={() => { dispatch({ type: 'ADD_TO_CART', product, quantity: 1 }); dispatch({ type: 'SET_NOTIFICATION', notification: { type: 'success', message: `${product.name} added to cart!` } }); }} />
            ))}
          </div>
        </section>
      )}

      {/* Sale Banner */}
      {saleProducts.length > 0 && (
        <section className="mt-12 bg-gradient-to-r from-red-50 to-orange-50 rounded-2xl p-6 md:p-8">
          <div className="flex justify-between items-center mb-6">
            <div><h2 className="text-2xl font-bold text-navy-900">🔥 Hot Deals</h2><p className="text-navy-600 text-sm mt-1">Grab these deals before they're gone!</p></div>
            <Link to="/products?tag=sale" className="text-red-600 text-sm font-medium flex items-center gap-1 hover:text-red-700">View All <ArrowRight size={14} /></Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {saleProducts.slice(0, 4).map(product => (
              <ProductCard key={product.id} product={product} onAddToCart={() => { dispatch({ type: 'ADD_TO_CART', product, quantity: 1 }); dispatch({ type: 'SET_NOTIFICATION', notification: { type: 'success', message: 'Added to cart!' } }); }} />
            ))}
          </div>
        </section>
      )}

      {/* New Arrivals */}
      <section className="mt-12">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-navy-900">New Arrivals</h2>
          <Link to="/products?sort=newest" className="text-primary-600 text-sm font-medium flex items-center gap-1 hover:text-primary-700">View All <ArrowRight size={14} /></Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {newArrivals.map(product => (
            <ProductCard key={product.id} product={product} onAddToCart={() => { dispatch({ type: 'ADD_TO_CART', product, quantity: 1 }); dispatch({ type: 'SET_NOTIFICATION', notification: { type: 'success', message: 'Added to cart!' } }); }} />
          ))}
        </div>
      </section>

      {/* Newsletter */}
      <section className="mt-12 mb-8 bg-gradient-to-r from-primary-600 to-primary-800 rounded-2xl p-8 md:p-12 text-center text-white">
        <h2 className="text-2xl md:text-3xl font-bold mb-2">Join the ShopMitra Family</h2>
        <p className="text-primary-100 mb-6 max-w-md mx-auto">Get exclusive access to new arrivals, special offers, and member-only discounts.</p>
        <form onSubmit={(e) => e.preventDefault()} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
          <input type="email" placeholder="Enter your email" className="flex-1 px-4 py-3 rounded-xl text-navy-900 placeholder-navy-400 focus:outline-none focus:ring-2 focus:ring-white" />
          <button className="px-6 py-3 bg-white text-primary-700 rounded-xl font-semibold hover:bg-gray-100 transition">Subscribe</button>
        </form>
      </section>
    </div>
  );
}

export function ProductCard({ product, onAddToCart }: { product: Product; onAddToCart: () => void }) {
  const { state, dispatch } = useApp();
  const discount = getDiscount(product.price, product.compare_price);
  const isWishlisted = state.wishlist.includes(product.id);
  const hasImage = product.images && product.images.length > 0 && product.images[0].startsWith('http');

  return (
    <div className="product-card bg-white border border-gray-100 rounded-xl overflow-hidden group">
      <Link to={`/product/${product.slug}`} className="block relative">
        <div className="aspect-square bg-gray-50 flex items-center justify-center overflow-hidden">
          {hasImage ? (
            <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          ) : (
            <span className="text-6xl">{product.images?.[0] || '📦'}</span>
          )}
        </div>
        {discount > 0 && <span className="absolute top-2 left-2 badge-discount text-white text-xs font-bold px-2 py-1 rounded-lg">{discount}% OFF</span>}
        {product.tags.includes('new') && <span className="absolute top-2 right-2 bg-emerald-500 text-white text-xs font-bold px-2 py-1 rounded-lg">NEW</span>}
      </Link>
      <div className="p-3 md:p-4">
        <p className="text-xs text-navy-500 mb-1">{product.brand}</p>
        <Link to={`/product/${product.slug}`}>
          <h3 className="font-medium text-sm text-navy-900 line-clamp-2 hover:text-primary-600 transition mb-2">{product.name}</h3>
        </Link>
        <div className="flex items-center gap-1 mb-2">
          <div className="flex gap-0.5">{Array.from({ length: 5 }).map((_, i) => <Star key={i} size={12} className={i < Math.floor(product.rating) ? 'fill-amber-400 text-amber-400' : 'text-gray-200'} />)}</div>
          <span className="text-xs text-navy-500">({product.review_count})</span>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="font-bold text-navy-900">{formatPrice(product.price)}</span>
          {product.compare_price && product.compare_price > product.price && <span className="text-xs text-navy-400 line-through">{formatPrice(product.compare_price)}</span>}
        </div>
        <div className="flex gap-2 mt-3">
          <button onClick={onAddToCart} className="flex-1 py-2 bg-primary-600 hover:bg-primary-700 text-white text-xs font-medium rounded-lg transition">Add to Cart</button>
          <button onClick={() => dispatch({ type: 'TOGGLE_WISHLIST', productId: product.id })} className={`p-2 border rounded-lg transition ${isWishlisted ? 'bg-red-50 border-red-200 text-red-500' : 'border-gray-200 text-navy-400 hover:text-red-500'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" width={14} height={14} viewBox="0 0 24 24" fill={isWishlisted ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
}
