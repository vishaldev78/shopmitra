'use client';

import { Suspense, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { SlidersHorizontal, X, SearchX } from 'lucide-react';
import { useApp } from '@/store/AppContext';
import { ProductCard } from '@/components/shop/ProductCard';
import { ProductGridSkeleton } from '@/components/shop/Skeletons';

function ProductsContent() {
  const { state, dispatch } = useApp();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [showFilters, setShowFilters] = useState(false);

  const category = searchParams.get('category') || '';
  const search = searchParams.get('search') || '';
  const tag = searchParams.get('tag') || '';
  const sort = searchParams.get('sort') || 'popularity';
  const minPrice = searchParams.get('minPrice') || '';
  const maxPrice = searchParams.get('maxPrice') || '';

  const categories = state.categories;
  const brands = [...new Set(state.products.map((p) => p.brand).filter(Boolean))];

  const filteredProducts = useMemo(() => {
    let result = [...state.products];
    if (category) {
      const cat = categories.find((c) => c.slug === category);
      if (cat) result = result.filter((p) => p.category_id === cat.id);
    }
    if (tag) result = result.filter((p) => p.tags.includes(tag));
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) => p.name.toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q) || (p.brand || '').toLowerCase().includes(q)
      );
    }
    if (minPrice) result = result.filter((p) => p.price >= Number(minPrice));
    if (maxPrice) result = result.filter((p) => p.price <= Number(maxPrice));
    switch (sort) {
      case 'price-low': result.sort((a, b) => a.price - b.price); break;
      case 'price-high': result.sort((a, b) => b.price - a.price); break;
      case 'rating': result.sort((a, b) => b.rating - a.rating); break;
      case 'newest': result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()); break;
      default: result.sort((a, b) => b.review_count - a.review_count);
    }
    return result;
  }, [state.products, categories, category, search, tag, sort, minPrice, maxPrice]);

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value) params.set(key, value); else params.delete(key);
    router.push(`/products?${params.toString()}`);
  };

  const activeCategory = categories.find((c) => c.slug === category);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <nav className="flex items-center gap-2 text-sm text-navy-500 mb-6">
        <Link href="/" className="hover:text-primary-600">Home</Link><span>/</span>
        <span className="text-navy-900 font-medium">{search ? `Search: "${search}"` : activeCategory?.name || 'All Products'}</span>
      </nav>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">{search ? `Results for "${search}"` : activeCategory?.name || 'All Products'}</h1>
          <p className="text-sm text-navy-500 mt-1">{filteredProducts.length} products found {brands.length > 0 && `• ${brands.length} brands`}</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowFilters(!showFilters)} className="lg:hidden flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50"><SlidersHorizontal size={16} /> Filters</button>
          <select value={sort} onChange={(e) => updateFilter('sort', e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500">
            <option value="popularity">Popularity</option><option value="price-low">Price: Low to High</option><option value="price-high">Price: High to Low</option><option value="rating">Top Rated</option><option value="newest">Newest First</option>
          </select>
        </div>
      </div>

      <div className="flex gap-6">
        <aside className={`${showFilters ? 'fixed inset-0 z-50 bg-white p-6 overflow-auto' : 'hidden'} lg:block lg:static lg:w-64 shrink-0`}>
          <div className="flex justify-between items-center mb-4 lg:hidden"><h2 className="text-lg font-bold">Filters</h2><button onClick={() => setShowFilters(false)}><X size={24} /></button></div>
          <div className="mb-6">
            <h3 className="font-semibold text-sm text-navy-900 mb-3">Categories</h3>
            <div className="space-y-2">
              <button onClick={() => updateFilter('category', '')} className={`block text-sm w-full text-left px-2 py-1.5 rounded ${!category ? 'bg-primary-50 text-primary-700 font-medium' : 'text-navy-600 hover:bg-gray-50'}`}>All Categories</button>
              {categories.map((cat) => (
                <button key={cat.id} onClick={() => updateFilter('category', cat.slug)} className={`block text-sm w-full text-left px-2 py-1.5 rounded ${category === cat.slug ? 'bg-primary-50 text-primary-700 font-medium' : 'text-navy-600 hover:bg-gray-50'}`}>{cat.name}</button>
              ))}
            </div>
          </div>
          <div className="mb-6">
            <h3 className="font-semibold text-sm text-navy-900 mb-3">Price Range</h3>
            <div className="flex gap-2">
              <input type="number" placeholder="Min" value={minPrice} onChange={(e) => updateFilter('minPrice', e.target.value)} className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-primary-500" />
              <input type="number" placeholder="Max" value={maxPrice} onChange={(e) => updateFilter('maxPrice', e.target.value)} className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-primary-500" />
            </div>
          </div>
          {(category || search || tag || minPrice || maxPrice) && (
            <button onClick={() => router.push('/products')} className="w-full py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition">Clear All Filters</button>
          )}
          <button onClick={() => setShowFilters(false)} className="lg:hidden w-full mt-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium">Apply Filters</button>
        </aside>

        <div className="flex-1">
          {state.loading ? (
            <ProductGridSkeleton count={9} />
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-16">
              <SearchX size={56} className="text-navy-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-navy-900 mb-2">No products found</h3>
              <p className="text-sm text-navy-500 mb-6">Try adjusting your filters or search for something else.</p>
              <button onClick={() => router.push('/products')} className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium">Clear Filters</button>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
              {filteredProducts.map((product) => (
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
          )}
        </div>
      </div>
    </div>
  );
}

export default function Products() {
  return (
    <Suspense fallback={<div className="max-w-7xl mx-auto px-4 py-20 text-center"><div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-4" /><p className="text-navy-500">Loading products...</p></div>}>
      <ProductsContent />
    </Suspense>
  );
}
