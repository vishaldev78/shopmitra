'use client';

import Link from 'next/link';
import { Heart } from 'lucide-react';
import { useApp } from '@/store/AppContext';
import { ProductCard } from '@/components/shop/ProductCard';

export default function Wishlist() {
  const { state, dispatch } = useApp();
  const wishlistProducts = state.products.filter((p) => state.wishlist.includes(p.id));

  return (
    <div className="shell py-6">
      <h1 className="text-2xl font-bold text-navy-900 mb-6">My Wishlist ({wishlistProducts.length})</h1>
      {wishlistProducts.length === 0 ? (
        <div className="text-center py-12"><Heart size={56} className="text-navy-300 mx-auto mb-4" strokeWidth={1.2} /><h2 className="text-xl font-semibold text-navy-900 mb-2">Your wishlist is empty</h2><Link href="/products" className="px-6 py-3 bg-primary-600 text-white rounded-xl font-medium inline-block">Explore Products</Link></div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {wishlistProducts.map((product) => (
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
  );
}
