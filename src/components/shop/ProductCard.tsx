'use client';

import Link from 'next/link';
import { Star, Package, ShoppingBag, Heart } from 'lucide-react';
import { useApp } from '@/store/AppContext';
import { formatPrice, getDiscount } from '@/lib/utils';
import type { Product } from '@/lib/types';

export function ProductCard({ product, onAddToCart }: { product: Product; onAddToCart: () => void }) {
  const { state, dispatch } = useApp();
  const discount = getDiscount(product.price, product.compare_price);
  const isWishlisted = state.wishlist.includes(product.id);
  const hasImage = product.images && product.images.length > 0 && product.images[0].startsWith('http');

  return (
    <div className="product-card overflow-hidden rounded-2xl border border-[#eee8df] bg-white group">
      <Link href={`/product/${product.slug}`} className="block relative">
        <div className="aspect-square bg-[#faf7f2] flex items-center justify-center overflow-hidden">
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
          <h3 className="font-semibold text-sm text-[#302b27] line-clamp-2 hover:text-[#b65d36] transition mb-2">{product.name}</h3>
        </Link>
        <div className="flex items-center gap-1 mb-2">
          <div className="flex gap-0.5">{Array.from({ length: 5 }).map((_, i) => <Star key={i} size={12} className={i < Math.floor(product.rating) ? 'fill-amber-400 text-amber-400' : 'text-gray-200'} />)}</div>
          <span className="text-xs text-navy-500">({product.review_count})</span>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="font-bold text-[#302b27]">{formatPrice(product.price)}</span>
          {product.compare_price && product.compare_price > product.price && <span className="text-xs text-navy-400 line-through">{formatPrice(product.compare_price)}</span>}
        </div>
        <div className="flex gap-2 mt-3">
          <button
            onClick={onAddToCart}
            disabled={product.stock < 1}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#b65d36] py-2.5 text-xs font-semibold text-white shadow-sm shadow-[#b65d36]/20 transition hover:bg-[#984a2b] hover:shadow-md disabled:cursor-not-allowed disabled:bg-[#c9c1b9] disabled:shadow-none"
          >
            <ShoppingBag size={14} /> {product.stock < 1 ? 'Sold Out' : 'Add to bag'}
          </button>
          <button
            onClick={() => dispatch({ type: 'TOGGLE_WISHLIST', productId: product.id })}
            aria-label="Toggle wishlist"
            className={`rounded-xl border p-2.5 transition ${isWishlisted ? 'bg-rose-50 border-rose-200 text-rose-600' : 'border-[#eee8df] text-[#8f8378] hover:border-rose-200 hover:text-rose-500'}`}
          >
            <Heart size={14} fill={isWishlisted ? 'currentColor' : 'none'} />
          </button>
        </div>
      </div>
    </div>
  );
}
