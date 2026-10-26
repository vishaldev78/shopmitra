'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, Mail, Lock } from 'lucide-react';
import { useApp, loginUser } from '@/store/AppContext';

function LoginContent() {
  const { dispatch } = useApp();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Redirect target (e.g., /checkout after login wall)
  const redirectTo = searchParams.get('redirect') || '/';
  const fromCheckout = redirectTo === '/checkout';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { setError('Please fill in all fields'); return; }
    setSubmitting(true);
    const result = await loginUser(email, password);
    if (result.success && result.user) {
      dispatch({ type: 'LOGIN', user: result.user });
      dispatch({ type: 'SET_NOTIFICATION', notification: { type: 'success', message: `Welcome back, ${result.user.name}!` } });
      router.push(redirectTo);
    } else {
      setError(result.error || 'Login failed');
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-navy-900">Welcome back</h1>
          <p className="text-navy-500 mt-1">Sign in to your ShopMitra account</p>
          {fromCheckout && (
            <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
              🔒 Please sign in to complete your order
            </div>
          )}
        </div>
        <form onSubmit={handleLogin} className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
          {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{error}</div>}
          <div>
            <label htmlFor="login-email" className="block text-sm font-medium text-navy-700 mb-1">Email</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-400" />
              <input id="login-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="you@example.com" />
            </div>
          </div>
          <div>
            <label htmlFor="login-password" className="block text-sm font-medium text-navy-700 mb-1">Password</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-400" />
              <input id="login-password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full pl-10 pr-10 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="••••••••" />
              <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label="Toggle password visibility" className="absolute right-3 top-1/2 -translate-y-1/2 text-navy-400">{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button>
            </div>
          </div>
          <button type="submit" disabled={submitting} className="w-full py-3 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700 transition disabled:opacity-50">{submitting ? 'Signing in...' : 'Sign In'}</button>
          <p className="text-center text-sm text-navy-500">Don&apos;t have an account? <Link href="/register" className="text-primary-600 font-medium">Create one</Link></p>
        </form>
        <div className="mt-4 p-3 bg-blue-50 rounded-lg text-xs text-blue-700">
          <p className="font-semibold mb-1">Demo Accounts:</p>
          <p>Admin: admin@shopmitra.in / admin123</p>
          <p>Customer: demo@shopmitra.in / demo123</p>
        </div>
      </div>
    </div>
  );
}

export default function Login() {
  return (
    <Suspense fallback={<div className="min-h-[70vh] flex items-center justify-center"><div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" /></div>}>
      <LoginContent />
    </Suspense>
  );
}
