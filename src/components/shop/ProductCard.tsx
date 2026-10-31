'use client';

import Link from 'next/link';
import { Star, Package } from 'lucide-react';
import { useApp } from '@/store/AppContext';
import { formatPrice, getDiscount } from '@/lib/utils';
import type { Product } from '@/lib/types';

export function ProductCard({ product, onAddToCart }: { product: Product; onAddToCart: () => void }) {
  const { state, dispatch } = useApp();
  const discount = getDiscount(product.price, product.compare_price);
  const isWishlisted = state.wishlist.includes(product.id);
  const hasImage = product.images && product.images.length > 0 && product.images[0].startsWith('http');

  return (
    <div className="product-card bg-white border border-gray-100 rounded-xl overflow-hidden group">
      <Link href={`/product/${product.slug}`} className="block relative">
        <div className="aspect-square bg-gray-50 flex items-center justify-center overflow-hidden">
          {hasImage ? (
            <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          ) : (
            <Package size={48} className="text-navy-300" strokeWidth={1.2} />
          )}
        </div>
        {discount > 0 && <span className="absolute top-2 left-2 badge-discount text-white text-xs font-bold px-2 py-1 rounded-lg">{discount}% OFF</span>}
        {product.tags.includes('new') && <span className="absolute top-2 right-2 bg-emerald-500 text-white text-xs font-bold px-2 py-1 rounded-lg">NEW</span>}
      </Link>
      <div className="p-3 md:p-4">
        <p className="text-xs text-navy-500 mb-1">{product.brand}</p>
        <Link href={`/product/${product.slug}`}>
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
          <button
            onClick={() => dispatch({ type: 'TOGGLE_WISHLIST', productId: product.id })}
            aria-label="Toggle wishlist"
            className={`p-2 border rounded-lg transition ${isWishlisted ? 'bg-red-50 border-red-200 text-red-500' : 'border-gray-200 text-navy-400 hover:text-red-500'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width={14} height={14} viewBox="0 0 24 24" fill={isWishlisted ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
}
