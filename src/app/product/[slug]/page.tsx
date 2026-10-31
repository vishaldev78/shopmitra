'use client';

import { use } from 'react';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Star, ShoppingCart, Truck, Shield, RotateCcw, Minus, Plus, ChevronRight, Package, PackageSearch } from 'lucide-react';
import { useApp } from '@/store/AppContext';
import { formatPrice, getDiscount } from '@/lib/utils';
import { ProductDetailSkeleton } from '@/components/shop/Skeletons';

export default function ProductDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router = useRouter();
  const { state, dispatch } = useApp();
  const [quantity, setQuantity] = useState(1);
  const [pincode, setPincode] = useState('');
  const [pincodeResult, setPincodeResult] = useState<string | null>(null);

  const product = state.products.find((p) => p.slug === slug);

  // Catalog still streaming in — shimmer placeholder instead of a false 404.
  if (state.loading) {
    return <ProductDetailSkeleton />;
  }

  if (!product) {
    return (
      <div className="shell py-16 text-center">
        <PackageSearch size={56} className="text-navy-300 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-navy-900 mb-2">Product Not Found</h1>
        <p className="text-sm text-navy-500 mb-6">It may have been removed, or the link is incorrect.</p>
        <Link href="/products" className="px-6 py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition inline-block">Browse Products</Link>
      </div>
    );
  }

  const discount = getDiscount(product.price, product.compare_price);
  const isWishlisted = state.wishlist.includes(product.id);
  const hasImage = product.images?.[0]?.startsWith('http');
  const relatedProducts = state.products.filter((p) => p.category_id === product.category_id && p.id !== product.id).slice(0, 4);

  const handleAddToCart = () => {
    dispatch({ type: 'ADD_TO_CART', product, quantity });
    dispatch({ type: 'SET_NOTIFICATION', notification: { type: 'success', message: `${product.name} added to cart!` } });
  };

  const checkPincode = () => {
    if (pincode.length === 6) setPincodeResult(`Delivery available to ${pincode}. Estimated: 3-5 business days.`);
    else setPincodeResult('Please enter a valid 6-digit pincode.');
  };

  return (
    <div className="shell py-6">
      <nav className="flex items-center gap-2 text-sm text-navy-500 mb-6 flex-wrap">
        <Link href="/" className="hover:text-primary-600">Home</Link><ChevronRight size={14} />
        <Link href="/products" className="hover:text-primary-600">Products</Link><ChevronRight size={14} />
        <span className="text-navy-900 font-medium truncate max-w-[200px]">{product.name}</span>
      </nav>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Image */}
        <div className="aspect-square bg-gray-50 rounded-2xl flex items-center justify-center border border-gray-100 overflow-hidden">
          {hasImage ? (
            <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
          ) : (
            <Package size={96} className="text-navy-300" strokeWidth={1.2} />
          )}
        </div>

        {/* Info */}
        <div className="space-y-5">
          <div>
            <p className="text-sm text-primary-600 font-medium mb-1">{product.brand}</p>
            <h1 className="text-2xl md:text-3xl font-bold text-navy-900">{product.name}</h1>
            <p className="text-sm text-navy-500 mt-1">SKU: {product.sku}</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-green-50 px-2.5 py-1 rounded-lg">
              <span className="font-bold text-sm text-green-700">{product.rating}</span>
              <Star size={14} className="fill-green-600 text-green-600" />
            </div>
            <span className="text-sm text-navy-500">{product.review_count} ratings</span>
          </div>

          <div className="bg-gray-50 rounded-xl p-4">
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-bold text-navy-900">{formatPrice(product.price)}</span>
              {product.compare_price && product.compare_price > product.price && (
                <>
                  <span className="text-lg text-navy-400 line-through">{formatPrice(product.compare_price)}</span>
                  <span className="text-sm font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded">{discount}% off</span>
                </>
              )}
            </div>
            <p className="text-xs text-navy-500 mt-1">Inclusive of all taxes</p>
          </div>

          <div className="flex items-center gap-4">
            <p className="font-medium text-sm text-navy-900">Quantity:</p>
            <div className="flex items-center border border-gray-200 rounded-lg">
              <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="p-2 hover:bg-gray-50"><Minus size={16} /></button>
              <span className="px-4 py-2 text-sm font-medium border-x border-gray-200">{quantity}</span>
              <button onClick={() => setQuantity(Math.min(product.stock, quantity + 1))} className="p-2 hover:bg-gray-50"><Plus size={16} /></button>
            </div>
            <span className={`text-sm ${product.stock < 10 ? 'text-amber-600' : 'text-green-600'}`}>{product.stock < 10 ? `Only ${product.stock} left!` : 'In Stock'}</span>
          </div>

          <div className="flex gap-3">
            <button onClick={handleAddToCart} className="flex-1 flex items-center justify-center gap-2 py-3 border-2 border-primary-600 text-primary-600 rounded-xl font-semibold hover:bg-primary-50 transition"><ShoppingCart size={18} /> Add to Cart</button>
            <button onClick={() => { handleAddToCart(); router.push('/cart'); }} className="flex-1 py-3 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700 transition">Buy Now</button>
            <button
              onClick={() => dispatch({ type: 'TOGGLE_WISHLIST', productId: product.id })}
              aria-label="Toggle wishlist"
              className={`p-3 border rounded-xl transition ${isWishlisted ? 'bg-red-50 border-red-200 text-red-500' : 'border-gray-200 text-navy-400 hover:text-red-500'}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width={20} height={20} viewBox="0 0 24 24" fill={isWishlisted ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" /></svg>
            </button>
          </div>

          <div className="border border-gray-200 rounded-xl p-4">
            <p className="font-medium text-sm text-navy-900 mb-2">Check Delivery</p>
            <div className="flex gap-2">
              <input type="text" maxLength={6} value={pincode} onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))} placeholder="Enter pincode" className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
              <button onClick={checkPincode} className="px-4 py-2 bg-navy-900 text-white text-sm rounded-lg hover:bg-navy-800">Check</button>
            </div>
            {pincodeResult && <p className={`text-sm mt-2 ${pincodeResult.includes('valid') ? 'text-red-500' : 'text-green-600'}`}>{pincodeResult}</p>}
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[{ icon: <Truck size={18} />, text: 'Free Delivery' }, { icon: <RotateCcw size={18} />, text: '30-Day Returns' }, { icon: <Shield size={18} />, text: '1 Year Warranty' }].map((f, i) => (
              <div key={i} className="flex flex-col items-center gap-1 p-3 bg-gray-50 rounded-lg text-center"><span className="text-primary-600">{f.icon}</span><span className="text-xs text-navy-700 font-medium">{f.text}</span></div>
            ))}
          </div>
        </div>
      </div>

      {/* Description & Specs */}
      <div className="mt-12 space-y-8">
        <div>
          <h2 className="text-xl font-bold text-navy-900 mb-4">Product Description</h2>
          <p className="text-navy-600 leading-relaxed">{product.description}</p>
        </div>

        {product.specifications && Object.keys(product.specifications).length > 0 && (
          <div>
            <h2 className="text-xl font-bold text-navy-900 mb-4">Specifications</h2>
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              {Object.entries(product.specifications).map(([key, value], i) => (
                <div key={key} className={`flex ${i % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}>
                  <span className="w-1/3 px-4 py-3 text-sm font-medium text-navy-700 border-r border-gray-200">{key.replace(/_/g, ' ')}</span>
                  <span className="flex-1 px-4 py-3 text-sm text-navy-600">{value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <div className="mt-12">
          <h2 className="text-xl font-bold text-navy-900 mb-6">Related Products</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {relatedProducts.map((p) => (
              <Link key={p.id} href={`/product/${p.slug}`} className="product-card bg-white border border-gray-100 rounded-xl overflow-hidden">
                <div className="aspect-square bg-gray-50 flex items-center justify-center overflow-hidden">
                  {p.images?.[0]?.startsWith('http') ? <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" /> : <Package size={36} className="text-navy-300" strokeWidth={1.2} />}
                </div>
                <div className="p-3"><p className="text-xs text-navy-500">{p.brand}</p><h3 className="font-medium text-sm text-navy-900 line-clamp-1 mt-1">{p.name}</h3><p className="font-bold text-navy-900 mt-2">{formatPrice(p.price)}</p></div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
