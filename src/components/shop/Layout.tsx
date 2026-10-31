'use client';

import { useApp } from '@/store/AppContext';
import { Header } from './Header';
import { Footer } from './Footer';
import { Notification } from './Notification';
import { BannerSkeleton, CategoryGridSkeleton, ProductGridSkeleton, SkeletonLine } from './Skeletons';

export function Layout({ children }: { children: React.ReactNode }) {
  const { state } = useApp();

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 page-transition">
        {state.loading ? (
          // Boot state — shimmer skeletons mirror the home layout so the
          // first paint already feels like the finished page.
          <div className="shell" role="status" aria-label="Loading ShopMitra">
            <BannerSkeleton />
            <section className="mt-12">
              <SkeletonLine className="h-7 w-48 mb-6" />
              <CategoryGridSkeleton />
            </section>
            <section className="mt-12">
              <SkeletonLine className="h-7 w-52 mb-6" />
              <ProductGridSkeleton count={8} />
            </section>
            <div className="h-8" />
          </div>
        ) : (
          children
        )}
      </main>
      <Footer />
      <Notification />
    </div>
  );
}
