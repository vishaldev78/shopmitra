'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Phone, Mail, ShieldCheck, Lock, BadgeCheck, Facebook, Twitter, Instagram, Youtube } from 'lucide-react';
import { useApp } from '@/store/AppContext';
import { Logo } from './Logo';

export function Footer() {
  const { dispatch } = useApp();
  const [email, setEmail] = useState('');
  const [subscribing, setSubscribing] = useState(false);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubscribing(true);
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      dispatch({
        type: 'SET_NOTIFICATION',
        notification: res.ok && data.success
          ? { type: 'success', message: 'Subscribed! Welcome to the family.' }
          : { type: 'error', message: data.error || 'Subscription failed' },
      });
      if (res.ok) setEmail('');
    } catch {
      dispatch({ type: 'SET_NOTIFICATION', notification: { type: 'error', message: 'Subscription failed' } });
    } finally {
      setSubscribing(false);
    }
  };

  return (
    <footer className="bg-navy-900 text-white mt-12">
      <div className="shell py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <div className="mb-4">
              <Logo size="md" />
            </div>
            <p className="text-navy-300 text-sm leading-relaxed">Your shopping friend — premium products at unbeatable prices with exceptional service and secure online payments.</p>
            <div className="flex gap-3 mt-4">
              {[
                { name: 'Facebook', Icon: Facebook },
                { name: 'Twitter', Icon: Twitter },
                { name: 'Instagram', Icon: Instagram },
                { name: 'YouTube', Icon: Youtube },
              ].map(({ name, Icon }) => (
                <a key={name} href="#" aria-label={name} title={name} className="w-9 h-9 bg-navy-800 rounded-lg flex items-center justify-center hover:bg-primary-600 transition">
                  <Icon size={16} aria-hidden="true" />
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2.5 text-sm text-navy-300">
              <li><Link href="/about" className="hover:text-white transition">About Us</Link></li>
              <li><Link href="/contact" className="hover:text-white transition">Contact Us</Link></li>
              <li><Link href="/faq" className="hover:text-white transition">FAQ</Link></li>
              <li><Link href="/track-order" className="hover:text-white transition">Track Order</Link></li>
              <li><Link href="/admin" className="hover:text-white transition">Admin Dashboard</Link></li>
            </ul>
          </div>

          {/* Customer Service */}
          <div>
            <h3 className="font-semibold mb-4">Customer Service</h3>
            <ul className="space-y-2.5 text-sm text-navy-300">
              <li><Link href="/shipping-policy" className="hover:text-white transition">Shipping Policy</Link></li>
              <li><Link href="/return-policy" className="hover:text-white transition">Return & Refund</Link></li>
              <li><Link href="/privacy-policy" className="hover:text-white transition">Privacy Policy</Link></li>
              <li><Link href="/terms" className="hover:text-white transition">Terms & Conditions</Link></li>
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h3 className="font-semibold mb-4">Stay Updated</h3>
            <p className="text-navy-300 text-sm mb-3">Subscribe for exclusive deals and new arrivals.</p>
            <form onSubmit={handleSubscribe} className="flex gap-2">
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Your email" className="flex-1 px-3 py-2 bg-navy-800 border border-navy-700 rounded-lg text-sm text-white placeholder-navy-400 focus:outline-none focus:ring-2 focus:ring-primary-500" />
              <button type="submit" disabled={subscribing} className="px-4 py-2 bg-primary-600 hover:bg-primary-700 rounded-lg text-sm font-medium transition disabled:opacity-50">Join</button>
            </form>
            <div className="mt-4 flex items-center gap-2 text-sm text-navy-300">
              <Phone size={14} className="text-navy-400" /> 1800-123-4567
            </div>
            <div className="flex items-center gap-2 text-sm text-navy-300 mt-1">
              <Mail size={14} className="text-navy-400" /> support@shopmitra.in
            </div>
          </div>
        </div>

        <div className="border-t border-navy-800 mt-10 pt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-navy-400 text-sm">© 2024 ShopMitra. All rights reserved.</p>
          <div className="flex gap-4 text-sm text-navy-400">
            <span className="flex items-center gap-1.5"><ShieldCheck size={14} /> Secure Payments</span>
            <span className="flex items-center gap-1.5"><Lock size={14} /> SSL Encrypted</span>
            <span className="hidden sm:flex items-center gap-1.5"><BadgeCheck size={14} /> Verified Seller</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
