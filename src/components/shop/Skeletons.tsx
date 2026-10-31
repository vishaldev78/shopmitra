'use client';

/**
 * Shimmer skeleton primitives.
 *
 * Each skeleton mirrors the geometry of its real counterpart so the
 * layout never jumps when data arrives. The `.skeleton` utility in
 * globals.css renders the sweeping shimmer wave.
 */

export function SkeletonLine({ className = '' }: { className?: string }) {
  return <div className={`skeleton rounded-md ${className}`} aria-hidden="true" />;
}

/** One product card placeholder — matches ProductCard layout exactly. */
export function ProductCardSkeleton() {
  return (
    <div className="bg-white border border-gray-100 rounded-xl overflow-hidden" aria-hidden="true">
      <div className="aspect-square skeleton rounded-none" />
      <div className="p-3 md:p-4 space-y-2.5">
        <SkeletonLine className="h-3 w-1/3" />
        <SkeletonLine className="h-4 w-4/5" />
        <SkeletonLine className="h-3 w-1/2" />
        <div className="flex items-baseline gap-2 pt-1">
          <SkeletonLine className="h-5 w-16" />
          <SkeletonLine className="h-3 w-10" />
        </div>
        <div className="flex gap-2 pt-1.5">
          <SkeletonLine className="h-8 flex-1 rounded-lg" />
          <SkeletonLine className="h-8 w-9 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

/** Responsive grid of product placeholders. */
export function ProductGridSkeleton({ count = 8, className = '' }: { count?: number; className?: string }) {
  return (
    <div className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 ${className}`} role="status" aria-label="Loading products">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

/** Home page category tile placeholders. */
export function CategoryGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4" role="status" aria-label="Loading categories">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex flex-col items-center p-4 bg-gray-50 rounded-xl gap-2" aria-hidden="true">
          <SkeletonLine className="w-10 h-10 rounded-full" />
          <SkeletonLine className="h-3 w-3/4" />
        </div>
      ))}
    </div>
  );
}

/** Hero banner placeholder. */
export function BannerSkeleton() {
  return (
    <section className="mt-6 rounded-2xl overflow-hidden" role="status" aria-label="Loading banner">
      <div className="skeleton h-64 md:h-80 rounded-2xl" aria-hidden="true" />
    </section>
  );
}

/** Product detail page placeholder. */
export function ProductDetailSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-6" role="status" aria-label="Loading product">
      <SkeletonLine className="h-4 w-48 mb-6" />
      <div className="grid lg:grid-cols-2 gap-8">
        <div className="aspect-square skeleton rounded-2xl" aria-hidden="true" />
        <div className="space-y-5" aria-hidden="true">
          <SkeletonLine className="h-4 w-24" />
          <SkeletonLine className="h-8 w-3/4" />
          <SkeletonLine className="h-4 w-32" />
          <div className="bg-gray-50 rounded-xl p-4 space-y-2">
            <SkeletonLine className="h-9 w-36" />
            <SkeletonLine className="h-3 w-28" />
          </div>
          <SkeletonLine className="h-14 w-full rounded-xl" />
          <div className="flex gap-3">
            <SkeletonLine className="h-12 flex-1 rounded-xl" />
            <SkeletonLine className="h-12 flex-1 rounded-xl" />
          </div>
          <SkeletonLine className="h-20 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}
