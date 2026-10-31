'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, Lock, User, ShoppingBag, Store, Sparkles, ArrowRight } from 'lucide-react';
import { useApp, registerUser } from '@/store/AppContext';

export default function Register() {
  const { dispatch } = useApp();
  const router = useRouter();
  const [accountType, setAccountType] = useState<'customer' | 'seller'>('customer');
  const [shopName, setShopName] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) { setError('Please fill in all fields'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    if (accountType === 'seller' && shopName.trim().length < 2) { setError('Please enter your shop name'); return; }
    setSubmitting(true);
    const result = await registerUser(email, password, name, accountType, accountType === 'seller' ? shopName.trim() : undefined);
    if (result.success && result.user) {
      dispatch({ type: 'LOGIN', user: result.user });
      dispatch({ type: 'SET_NOTIFICATION', notification: { type: 'success', message: accountType === 'seller' ? 'Shop account created — welcome to ShopMitra!' : 'Account created successfully!' } });
      router.push(accountType === 'seller' ? '/admin' : '/');
    } else {
      setError(result.error || 'Registration failed');
      setSubmitting(false);
    }
  };

  const inputCls = "w-full rounded-xl border border-[#e9e1d7] bg-[#fdfbf8] py-3 pl-11 pr-4 text-sm outline-none transition placeholder:text-[#b4a99e] focus:border-[#c77a55] focus:ring-4 focus:ring-[#b65d36]/10";

  return (
    <div className="min-h-[75vh] flex items-center justify-center bg-[radial-gradient(ellipse_at_top,_#f8ead9_0%,_#fbf8f3_42%,_#fff_78%)] px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="mb-7 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#b65d36] text-white shadow-lg shadow-[#b65d36]/20"><Sparkles size={21} /></div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-[#b65d36]">A better kind of marketplace</p>
          <h1 className="text-3xl font-bold tracking-tight text-[#302b27]">Make yourself at home</h1>
          <p className="mt-2 text-sm text-[#81766d]">One account, lovely finds—or your very own shop.</p>
        </div>
        <form onSubmit={handleRegister} className="space-y-4 rounded-3xl border border-[#eee8df] bg-white p-6 shadow-[0_24px_70px_-35px_rgba(70,48,30,0.3)] sm:p-8">
          {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{error}</div>}

          {/* Account type */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setAccountType('customer')}
              aria-pressed={accountType === 'customer'}
              className={`flex flex-col items-center gap-1.5 rounded-2xl border-2 p-4 transition ${accountType === 'customer' ? 'border-[#b65d36] bg-[#fff7ef] shadow-sm' : 'border-[#eee8df] bg-[#fdfbf8] hover:border-[#d7c7b8]'}`}
            >
              <ShoppingBag size={22} className={accountType === 'customer' ? 'text-[#b65d36]' : 'text-[#a49587]'} />
              <span className={`text-sm font-semibold ${accountType === 'customer' ? 'text-[#8f4529]' : 'text-[#51463e]'}`}>I’m here to shop</span>
              <span className="text-[11px] text-[#93867a] text-center leading-tight">Discover finds & track orders</span>
            </button>
            <button
              type="button"
              onClick={() => setAccountType('seller')}
              aria-pressed={accountType === 'seller'}
              className={`flex flex-col items-center gap-1.5 rounded-2xl border-2 p-4 transition ${accountType === 'seller' ? 'border-[#b65d36] bg-[#fff7ef] shadow-sm' : 'border-[#eee8df] bg-[#fdfbf8] hover:border-[#d7c7b8]'}`}
            >
              <Store size={22} className={accountType === 'seller' ? 'text-[#b65d36]' : 'text-[#a49587]'} />
              <span className={`text-sm font-semibold ${accountType === 'seller' ? 'text-[#8f4529]' : 'text-[#51463e]'}`}>I want to sell</span>
              <span className="text-[11px] text-[#93867a] text-center leading-tight">Open a shop of your own</span>
            </button>
          </div>

          {accountType === 'seller' && (
            <div>
              <label htmlFor="reg-shop" className="mb-1.5 block text-sm font-semibold text-[#51463e]">What’s your shop called?</label>
              <div className="relative"><Store size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#a49587]" /><input id="reg-shop" type="text" value={shopName} onChange={(e) => setShopName(e.target.value)} className={inputCls} placeholder="e.g. Mitra Electronics" maxLength={60} /></div>
              <p className="mt-1 text-xs text-[#93867a]">Buyers will see your shop name on your products.</p>
            </div>
          )}

          <div>
            <label htmlFor="reg-name" className="mb-1.5 block text-sm font-semibold text-[#51463e]">Your name</label>
            <div className="relative"><User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#a49587]" /><input id="reg-name" type="text" autoComplete="name" required value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="How should we call you?" /></div>
          </div>
          <div>
            <label htmlFor="reg-email" className="mb-1.5 block text-sm font-semibold text-[#51463e]">Email address</label>
            <div className="relative"><Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#a49587]" /><input id="reg-email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} placeholder="you@example.com" /></div>
          </div>
          <div>
            <label htmlFor="reg-password" className="mb-1.5 block text-sm font-semibold text-[#51463e]">Create a password</label>
            <div className="relative"><Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#a49587]" /><input id="reg-password" type="password" autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} placeholder="At least 6 characters" /></div>
          </div>
          <div>
            <label htmlFor="reg-confirm" className="mb-1.5 block text-sm font-semibold text-[#51463e]">Confirm your password</label>
            <div className="relative"><Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#a49587]" /><input id="reg-confirm" type="password" autoComplete="new-password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={inputCls} placeholder="Type it once more" /></div>
          </div>
          <button type="submit" disabled={submitting} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#b65d36] py-3.5 font-semibold text-white shadow-lg shadow-[#b65d36]/20 transition hover:-translate-y-0.5 hover:bg-[#984a2b] hover:shadow-xl disabled:opacity-50">{submitting ? 'Getting things ready…' : accountType === 'seller' ? 'Open my shop' : 'Create my account'} <ArrowRight size={17} /></button>
          <p className="pt-1 text-center text-sm text-[#81766d]">Already part of the family? <Link href="/login" className="font-semibold text-[#a64f2e] hover:text-[#803c24]">Sign in</Link></p>
        </form>
      </div>
    </div>
  );
}
