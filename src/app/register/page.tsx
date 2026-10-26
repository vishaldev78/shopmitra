'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, Lock, User } from 'lucide-react';
import { useApp, registerUser } from '@/store/AppContext';

export default function Register() {
  const { dispatch } = useApp();
  const router = useRouter();
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
    setSubmitting(true);
    const result = await registerUser(email, password, name);
    if (result.success && result.user) {
      dispatch({ type: 'LOGIN', user: result.user });
      dispatch({ type: 'SET_NOTIFICATION', notification: { type: 'success', message: 'Account created successfully!' } });
      router.push('/');
    } else {
      setError(result.error || 'Registration failed');
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8"><h1 className="text-2xl font-bold text-navy-900">Create Account</h1><p className="text-navy-500 mt-1">Join ShopMitra for exclusive deals</p></div>
        <form onSubmit={handleRegister} className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
          {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{error}</div>}
          <div>
            <label htmlFor="reg-name" className="block text-sm font-medium text-navy-700 mb-1">Full Name</label>
            <div className="relative"><User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-400" /><input id="reg-name" type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="John Doe" /></div>
          </div>
          <div>
            <label htmlFor="reg-email" className="block text-sm font-medium text-navy-700 mb-1">Email</label>
            <div className="relative"><Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-400" /><input id="reg-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="you@example.com" /></div>
          </div>
          <div>
            <label htmlFor="reg-password" className="block text-sm font-medium text-navy-700 mb-1">Password</label>
            <div className="relative"><Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-400" /><input id="reg-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="Min 6 characters" /></div>
          </div>
          <div>
            <label htmlFor="reg-confirm" className="block text-sm font-medium text-navy-700 mb-1">Confirm Password</label>
            <div className="relative"><Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-400" /><input id="reg-confirm" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="••••••••" /></div>
          </div>
          <button type="submit" disabled={submitting} className="w-full py-3 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700 transition disabled:opacity-50">{submitting ? 'Creating account...' : 'Create Account'}</button>
          <p className="text-center text-sm text-navy-500">Already have an account? <Link href="/login" className="text-primary-600 font-medium">Sign in</Link></p>
        </form>
      </div>
    </div>
  );
}
