'use client';

import { useApp } from '@/store/AppContext';
import { Header } from './Header';
import { Footer } from './Footer';
import { Notification } from './Notification';

export function Layout({ children }: { children: React.ReactNode }) {
  const { state } = useApp();

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 page-transition">
        {state.loading ? (
          <div className="max-w-7xl mx-auto px-4 py-20 text-center">
            <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-navy-500">Loading ShopMitra...</p>
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
