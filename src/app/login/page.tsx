'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, Mail, Lock, LockKeyhole, Sparkles, ArrowRight } from 'lucide-react';
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
    <div className="min-h-[75vh] flex items-center justify-center bg-[radial-gradient(ellipse_at_top,_#f8ead9_0%,_#fbf8f3_42%,_#fff_78%)] px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-7 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#b65d36] text-white shadow-lg shadow-[#b65d36]/20"><Sparkles size={21} /></div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-[#b65d36]">Your ShopMitra, your way</p>
          <h1 className="text-3xl font-bold tracking-tight text-[#302b27]">Lovely to see you again</h1>
          <p className="mt-2 text-sm text-[#81766d]">Sign in and pick up right where you left off.</p>
          {fromCheckout && (
            <div className="mt-4 flex items-center justify-center gap-1.5 rounded-xl border border-[#f0d7b6] bg-[#fff5e7] p-3 text-xs text-[#8b5a24]">
              <LockKeyhole size={13} /> Please sign in to complete your order
            </div>
          )}
        </div>
        <form onSubmit={handleLogin} className="space-y-5 rounded-3xl border border-[#eee8df] bg-white p-7 shadow-[0_24px_70px_-35px_rgba(70,48,30,0.3)] sm:p-8">
          {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{error}</div>}
          <div>
            <label htmlFor="login-email" className="mb-1.5 block text-sm font-semibold text-[#51463e]">Email address</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#a49587]" />
              <input id="login-email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-xl border border-[#e9e1d7] bg-[#fdfbf8] py-3 pl-11 pr-4 text-sm outline-none transition placeholder:text-[#b4a99e] focus:border-[#c77a55] focus:ring-4 focus:ring-[#b65d36]/10" placeholder="you@example.com" />
            </div>
          </div>
          <div>
            <label htmlFor="login-password" className="mb-1.5 block text-sm font-semibold text-[#51463e]">Password</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#a49587]" />
              <input id="login-password" autoComplete="current-password" type={showPassword ? 'text' : 'password'} required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-xl border border-[#e9e1d7] bg-[#fdfbf8] py-3 pl-11 pr-11 text-sm outline-none transition placeholder:text-[#b4a99e] focus:border-[#c77a55] focus:ring-4 focus:ring-[#b65d36]/10" placeholder="Enter your password" />
              <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label="Toggle password visibility" className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#a49587] hover:text-[#b65d36]">{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button>
            </div>
          </div>
          <button type="submit" disabled={submitting} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#b65d36] py-3.5 font-semibold text-white shadow-lg shadow-[#b65d36]/20 transition hover:-translate-y-0.5 hover:bg-[#984a2b] hover:shadow-xl disabled:opacity-50">{submitting ? 'Signing you in…' : <>Continue to your account <ArrowRight size={17} /></>}</button>
          <p className="pt-1 text-center text-sm text-[#81766d]">New to ShopMitra? <Link href="/register" className="font-semibold text-[#a64f2e] hover:text-[#803c24]">Create your account</Link></p>
        </form>
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
