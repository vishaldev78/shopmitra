'use client';

import { useApp } from '@/store/AppContext';

export function Notification() {
  const { state } = useApp();
  if (!state.notification) return null;
  const colors = { success: 'bg-green-500', error: 'bg-red-500', info: 'bg-blue-500' };
  return (
    <div
      role="status"
      className={`fixed top-20 right-4 z-50 ${colors[state.notification.type]} text-white px-6 py-3 rounded-lg shadow-lg animate-fade-in`}
    >
      {state.notification.message}
    </div>
  );
}
