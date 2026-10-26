'use client';

import { Suspense } from 'react';
import { PaymentReturnContent } from '@/components/shop/PaymentReturnContent';

export default function PaymentCancel() {
  return (
    <Suspense fallback={<div className="max-w-lg mx-auto px-4 py-20 text-center"><div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto" /></div>}>
      <PaymentReturnContent cancelled />
    </Suspense>
  );
}
