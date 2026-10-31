'use client';

import { use } from 'react';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Star, ShoppingCart, Truck, Shield, RotateCcw, Minus, Plus, ChevronRight, Package, PackageSearch, MessageSquareText } from 'lucide-react';
import { useApp } from '@/store/AppContext';
import { formatPrice, getDiscount } from '@/lib/utils';
import { ProductDetailSkeleton } from '@/components/shop/Skeletons';

interface ProductReview {
  id: string;
  rating: number;
  comment: string;
  reviewer_name: string;
  created_at: string;
}

export default function ProductDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router = useRouter();
  const { state, dispatch } = useApp();
  const product = state.products.find((p) => p.slug === slug);
  const [quantity, setQuantity] = useState(1);
  const [pincode, setPincode] = useState('');
  const [pincodeResult, setPincodeResult] = useState<string | null>(null);
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [ownReview, setOwnReview] = useState<{ rating: number; comment: string } | null>(null);
  const [eligibleToReview, setEligibleToReview] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewsForProduct, setReviewsForProduct] = useState<string | null>(null);
  const [reviewSaving, setReviewSaving] = useState(false);
  const [reviewError, setReviewError] = useState('');
  const reviewRequestId = product?.id || encodeURIComponent(slug);
  const reviewLoading = reviewsForProduct !== reviewRequestId;

  useEffect(() => {
    let active = true;
    const requestId = product?.id || encodeURIComponent(slug);
    fetch(`/api/products/${requestId}/reviews`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Could not load reviews');
        if (!active) return;
        setReviews(data.reviews || []);
        setOwnReview(data.own_review || null);
        setReviewRating(data.own_review?.rating || 0);
        setReviewComment(data.own_review?.comment || '');
        setEligibleToReview(Boolean(data.eligible_to_review));
      })
      .catch((error) => {
        if (active) setReviewError((error as Error).message);
      })
      .finally(() => {
        if (active) setReviewsForProduct(requestId);
      });
    return () => { active = false; };
  }, [product?.id, slug, state.user?.id]);

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

  const submitReview = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!reviewRating) {
      setReviewError('Please choose a star rating.');
      return;
    }
    setReviewSaving(true);
    setReviewError('');
    try {
      const response = await fetch(`/api/products/${product.id}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: reviewRating, comment: reviewComment }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not save your review');
      setOwnReview(data.own_review);
      setReviews((current) => [data.review, ...current.filter((review) => review.id !== data.review.id)]);
      dispatch({
        type: 'UPDATE_PRODUCT',
        product: { ...product, rating: data.rating, review_count: data.reviewCount },
      });
      dispatch({ type: 'SET_NOTIFICATION', notification: { type: 'success', message: 'Thanks for sharing your review!' } });
    } catch (error) {
      setReviewError((error as Error).message);
    } finally {
      setReviewSaving(false);
    }
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
            {product.seller && (
              <p className="text-sm text-navy-600 mt-2">
                Sold by{' '}
                <span className="font-semibold text-navy-900 bg-primary-50 border border-primary-100 px-2 py-0.5 rounded">
                  {product.seller.shopName || product.seller.name}
                </span>
              </p>
            )}
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

      <section className="mt-12 border-t border-gray-100 pt-8" aria-labelledby="reviews-heading">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <p className="mb-1 flex items-center gap-2 text-sm font-medium text-[#b65d36]"><MessageSquareText size={16} /> Customer feedback</p>
            <h2 id="reviews-heading" className="text-xl font-bold text-navy-900">Ratings & Reviews</h2>
          </div>
          <p className="text-sm text-navy-500">{product.review_count} {product.review_count === 1 ? 'rating' : 'ratings'}</p>
        </div>

        {state.isLoggedIn && state.user?.role === 'customer' && eligibleToReview && (
          <form onSubmit={submitReview} className="mb-6 rounded-2xl border border-[#eee8df] bg-[#fdfbf8] p-5">
            <h3 className="font-semibold text-[#302b27]">{ownReview ? 'Update your review' : 'Share your experience'}</h3>
            <div className="my-3 flex items-center gap-1" role="group" aria-label="Choose a rating from 1 to 5 stars">
              {Array.from({ length: 5 }, (_, index) => {
                const value = index + 1;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setReviewRating(value)}
                    aria-label={`${value} star${value === 1 ? '' : 's'}`}
                    aria-pressed={reviewRating === value}
                    className="rounded p-1 transition hover:scale-110 focus:outline-none focus:ring-2 focus:ring-[#b65d36]"
                  >
                    <Star size={25} className={value <= reviewRating ? 'fill-amber-400 text-amber-500' : 'text-gray-300'} />
                  </button>
                );
              })}
            </div>
            <label htmlFor="product-review" className="mb-1 block text-sm font-medium text-navy-700">Review (optional)</label>
            <textarea
              id="product-review"
              maxLength={1000}
              rows={3}
              value={reviewComment}
              onChange={(event) => setReviewComment(event.target.value)}
              placeholder="What did you think of this product?"
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#b65d36]/30"
            />
            {reviewError && <p role="alert" className="mt-2 text-sm text-red-600">{reviewError}</p>}
            <button type="submit" disabled={reviewSaving} className="mt-3 rounded-xl bg-[#b65d36] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#984a2b] disabled:opacity-50">
              {reviewSaving ? 'Saving…' : ownReview ? 'Update review' : 'Submit review'}
            </button>
            <p className="mt-2 text-xs text-navy-400">Only verified customers with a delivered order can review this product.</p>
          </form>
        )}

        {!state.isLoggedIn && (
          <p className="mb-5 text-sm text-navy-500"><Link href={`/login?redirect=${encodeURIComponent(`/product/${slug}`)}`} className="font-medium text-[#a64f2e] hover:underline">Sign in</Link> to share a review after your order is delivered.</p>
        )}
        {state.isLoggedIn && state.user?.role === 'customer' && !eligibleToReview && !ownReview && (
          <p className="mb-5 text-sm text-navy-500">Purchased this item? You can leave a review once your order is delivered.</p>
        )}
        {reviewError && !eligibleToReview && <p role="alert" className="mb-4 text-sm text-red-600">{reviewError}</p>}
        {reviewLoading ? (
          <p className="text-sm text-navy-400">Loading reviews…</p>
        ) : reviews.length > 0 ? (
          <div className="space-y-3">
            {reviews.map((review) => (
              <article key={review.id} className="rounded-xl border border-gray-100 bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-navy-900">{review.reviewer_name}</p>
                    <div className="mt-1 flex gap-0.5" aria-label={`${review.rating} out of 5 stars`}>
                      {Array.from({ length: 5 }, (_, index) => <Star key={index} size={14} className={index < review.rating ? 'fill-amber-400 text-amber-500' : 'text-gray-200'} />)}
                    </div>
                  </div>
                  <time className="text-xs text-navy-400" dateTime={review.created_at}>{new Date(review.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</time>
                </div>
                {review.comment && <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-navy-600">{review.comment}</p>}
              </article>
            ))}
          </div>
        ) : (
          <p className="rounded-xl bg-gray-50 p-4 text-sm text-navy-500">No customer reviews yet. Be the first to share your experience.</p>
        )}
      </section>

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
