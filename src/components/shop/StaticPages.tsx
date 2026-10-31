'use client';

import { useState } from 'react';
import { Mail, Phone, MapPin, Send, ChevronDown, ChevronUp, CheckCircle2 } from 'lucide-react';

export function About() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-navy-900 mb-6">About ShopMitra</h1>
      <div className="prose prose-navy max-w-none space-y-6">
        <div className="bg-gradient-to-r from-primary-50 to-indigo-50 rounded-2xl p-8 text-center">
          <h2 className="text-2xl font-bold text-navy-900 mb-2">Our Mission</h2>
          <p className="text-navy-600 text-lg">To make premium quality products accessible to everyone, everywhere.</p>
        </div>
        <p className="text-navy-600 leading-relaxed">ShopMitra was founded in 2023 with a simple vision: to create an online shopping experience that combines the convenience of e-commerce with the trust and quality of premium retail. We believe everyone deserves access to great products at fair prices.</p>
        <p className="text-navy-600 leading-relaxed">Today, we serve over 1 million customers across India, offering a curated selection of electronics, fashion, home goods, beauty products, and more. Our team of dedicated professionals works tirelessly to ensure every order meets our high standards.</p>
        <div className="grid sm:grid-cols-3 gap-6 mt-8">
          {[
            { number: '1M+', label: 'Happy Customers' },
            { number: '50K+', label: 'Products' },
            { number: '99.5%', label: 'Satisfaction Rate' },
          ].map((stat, i) => (
            <div key={i} className="text-center p-6 bg-gray-50 rounded-xl">
              <p className="text-3xl font-bold text-primary-600">{stat.number}</p>
              <p className="text-sm text-navy-500 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
        <h2 className="text-xl font-bold text-navy-900 mt-8">Our Values</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {[
            { title: 'Quality First', desc: 'Every product is vetted for quality before it reaches our shelves.' },
            { title: 'Customer Obsession', desc: 'Your satisfaction is our top priority. We go above and beyond.' },
            { title: 'Transparency', desc: 'No hidden fees, no surprises. What you see is what you get.' },
            { title: 'Sustainability', desc: 'We prioritize eco-friendly packaging and sustainable practices.' },
          ].map((value, i) => (
            <div key={i} className="p-4 border border-gray-200 rounded-xl">
              <h3 className="font-semibold text-navy-900">{value.title}</h3>
              <p className="text-sm text-navy-600 mt-1">{value.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function Contact() {
  const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' });
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setError('');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSubmitted(true);
      } else {
        setError(data.error || 'Failed to send message');
      }
    } catch {
      setError('Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-navy-900 mb-2">Contact Us</h1>
      <p className="text-navy-500 mb-8">We&apos;d love to hear from you. Reach out to us anytime.</p>

      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-1 space-y-6">
          {[
            { icon: <Mail size={20} />, title: 'Email', value: 'support@shopmitra.in', sub: 'We reply within 24 hours' },
            { icon: <Phone size={20} />, title: 'Phone', value: '1800-123-4567', sub: 'Mon-Sat, 9am-6pm IST' },
            { icon: <MapPin size={20} />, title: 'Address', value: 'ShopMitra HQ, Mumbai', sub: 'Maharashtra, India 400001' },
          ].map((item, i) => (
            <div key={i} className="flex gap-4 p-4 bg-gray-50 rounded-xl">
              <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center text-primary-600">{item.icon}</div>
              <div>
                <p className="font-medium text-navy-900">{item.title}</p>
                <p className="text-sm text-navy-700">{item.value}</p>
                <p className="text-xs text-navy-500">{item.sub}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="md:col-span-2">
          {submitted ? (
            <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center">
              <CheckCircle2 size={40} className="text-green-600 mx-auto mb-3" />
              <h2 className="text-xl font-bold text-green-800 mb-2">Message Sent!</h2>
              <p className="text-green-600">Thank you for reaching out. We&apos;ll get back to you within 24 hours.</p>
              <button onClick={() => setSubmitted(false)} className="mt-4 text-sm text-green-700 underline">Send another message</button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
              {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{error}</div>}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-navy-700 mb-1">Name</label>
                  <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-navy-700 mb-1">Email</label>
                  <input type="email" required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-navy-700 mb-1">Subject</label>
                <input type="text" required value={formData.subject} onChange={(e) => setFormData({ ...formData, subject: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-navy-700 mb-1">Message</label>
                <textarea required rows={5} value={formData.message} onChange={(e) => setFormData({ ...formData, message: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none" />
              </div>
              <button type="submit" disabled={sending} className="flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700 transition disabled:opacity-50">
                <Send size={16} /> {sending ? 'Sending...' : 'Send Message'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const faqs = [
    { q: 'How do I place an order?', a: 'Browse products, add items to your cart, proceed to checkout, enter your shipping details, choose a payment method, and confirm your order. It\'s that simple!' },
    { q: 'What payment methods do you accept?', a: 'We accept Cash on Delivery (COD), UPI (PhonePe, Google Pay, Paytm and other UPI apps), credit/debit cards, net banking and wallets.' },
    { q: 'How long does delivery take?', a: 'Standard delivery takes 3-5 business days. Express delivery (1-2 days) is available for select pin codes at an additional charge.' },
    { q: 'What is your return policy?', a: 'We offer a 30-day easy return policy for most products. Items must be unused, in original packaging, with tags intact. Refunds are processed within 5-7 business days.' },
    { q: 'How can I track my order?', a: 'Go to "Track Order" in the header or your account dashboard. Enter your order number to see real-time status updates.' },
    { q: 'Is my payment information secure?', a: 'Absolutely. We use 256-bit SSL encryption and partner with certified payment gateways. We never store your card details on our servers.' },
    { q: 'Do you offer free shipping?', a: 'Yes! All orders above ₹999 qualify for free standard shipping across India.' },
    { q: 'How do I contact customer support?', a: 'You can reach us via email at support@shopmitra.in, call our toll-free number 1800-123-4567, or use the contact form on our website.' },
  ];

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-navy-900 mb-2 text-center">Frequently Asked Questions</h1>
      <p className="text-navy-500 text-center mb-8">Find answers to common questions about shopping with us.</p>
      <div className="space-y-3">
        {faqs.map((faq, i) => (
          <div key={i} className="border border-gray-200 rounded-xl overflow-hidden">
            <button onClick={() => setOpenIndex(openIndex === i ? null : i)} className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition">
              <span className="font-medium text-navy-900">{faq.q}</span>
              {openIndex === i ? <ChevronUp size={18} className="text-navy-400" /> : <ChevronDown size={18} className="text-navy-400" />}
            </button>
            {openIndex === i && (
              <div className="px-4 pb-4 text-sm text-navy-600 leading-relaxed animate-fade-in">{faq.a}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function ShippingPolicy() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-navy-900 mb-6">Shipping Policy</h1>
      <div className="space-y-6 text-navy-600">
        <section>
          <h2 className="text-xl font-bold text-navy-900 mb-2">Delivery Times</h2>
          <p>Standard delivery: 3-5 business days. Express delivery: 1-2 business days (select areas only).</p>
        </section>
        <section>
          <h2 className="text-xl font-bold text-navy-900 mb-2">Shipping Charges</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Orders above ₹999: FREE shipping</li>
            <li>Orders below ₹999: ₹99 flat rate</li>
            <li>Express delivery: Additional ₹149</li>
          </ul>
        </section>
        <section>
          <h2 className="text-xl font-bold text-navy-900 mb-2">Serviceable Areas</h2>
          <p>We deliver across India. Enter your pincode on the product page to check availability for your area.</p>
        </section>
        <section>
          <h2 className="text-xl font-bold text-navy-900 mb-2">Order Tracking</h2>
          <p>Once your order is shipped, you&apos;ll receive a tracking number via email and SMS. Track your order anytime from your account dashboard.</p>
        </section>
      </div>
    </div>
  );
}

export function ReturnPolicy() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-navy-900 mb-6">Return & Refund Policy</h1>
      <div className="space-y-6 text-navy-600">
        <section>
          <h2 className="text-xl font-bold text-navy-900 mb-2">30-Day Easy Returns</h2>
          <p>Not satisfied with your purchase? Return it within 30 days for a full refund or exchange. Items must be unused, in original packaging with all tags intact.</p>
        </section>
        <section>
          <h2 className="text-xl font-bold text-navy-900 mb-2">How to Initiate a Return</h2>
          <ol className="list-decimal pl-5 space-y-1">
            <li>Go to &quot;My Orders&quot; in your account</li>
            <li>Select the order and click &quot;Return&quot;</li>
            <li>Choose your reason for return</li>
            <li>Schedule a pickup or drop off at a nearby center</li>
          </ol>
        </section>
        <section>
          <h2 className="text-xl font-bold text-navy-900 mb-2">Refund Timeline</h2>
          <p>Refunds are processed within 5-7 business days after we receive and inspect the returned item. Refunds are credited to the original payment method.</p>
        </section>
        <section>
          <h2 className="text-xl font-bold text-navy-900 mb-2">Non-Returnable Items</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Innerwear and swimwear (for hygiene reasons)</li>
            <li>Customized or personalized products</li>
            <li>Digital products and gift cards</li>
            <li>Items damaged due to customer misuse</li>
          </ul>
        </section>
      </div>
    </div>
  );
}

export function PrivacyPolicy() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-navy-900 mb-6">Privacy Policy</h1>
      <div className="space-y-6 text-navy-600">
        <p className="text-sm text-navy-400">Last updated: March 2024</p>
        <section>
          <h2 className="text-xl font-bold text-navy-900 mb-2">Information We Collect</h2>
          <p>We collect information you provide directly (name, email, address, payment details) and automatically (browser type, device info, browsing patterns).</p>
        </section>
        <section>
          <h2 className="text-xl font-bold text-navy-900 mb-2">How We Use Your Information</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Process and fulfill your orders</li>
            <li>Send order confirmations and updates</li>
            <li>Provide customer support</li>
            <li>Personalize your shopping experience</li>
            <li>Send promotional communications (with consent)</li>
          </ul>
        </section>
        <section>
          <h2 className="text-xl font-bold text-navy-900 mb-2">Data Security</h2>
          <p>We use industry-standard encryption (256-bit SSL) and secure infrastructure to protect your data. Payment information is processed through certified payment gateways and never stored on our servers.</p>
        </section>
        <section>
          <h2 className="text-xl font-bold text-navy-900 mb-2">Your Rights</h2>
          <p>You have the right to access, correct, or delete your personal data. Contact us at privacy@shopmitra.in for any data-related requests.</p>
        </section>
      </div>
    </div>
  );
}

export function Terms() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-navy-900 mb-6">Terms & Conditions</h1>
      <div className="space-y-6 text-navy-600">
        <p className="text-sm text-navy-400">Last updated: March 2024</p>
        <section>
          <h2 className="text-xl font-bold text-navy-900 mb-2">Acceptance of Terms</h2>
          <p>By accessing and using ShopMitra, you agree to be bound by these Terms & Conditions. If you disagree with any part, please do not use our service.</p>
        </section>
        <section>
          <h2 className="text-xl font-bold text-navy-900 mb-2">Account Responsibility</h2>
          <p>You are responsible for maintaining the confidentiality of your account credentials and for all activities under your account. Notify us immediately of any unauthorized access.</p>
        </section>
        <section>
          <h2 className="text-xl font-bold text-navy-900 mb-2">Product Information</h2>
          <p>We strive for accuracy in product descriptions and pricing. However, we do not warrant that product descriptions are error-free. We reserve the right to correct errors and update information.</p>
        </section>
        <section>
          <h2 className="text-xl font-bold text-navy-900 mb-2">Limitation of Liability</h2>
          <p>ShopMitra shall not be liable for any indirect, incidental, or consequential damages arising from the use of our services. Our total liability shall not exceed the amount paid by you for the specific order in question.</p>
        </section>
        <section>
          <h2 className="text-xl font-bold text-navy-900 mb-2">Governing Law</h2>
          <p>These terms are governed by the laws of India. Any disputes shall be subject to the exclusive jurisdiction of courts in Mumbai, Maharashtra.</p>
        </section>
      </div>
    </div>
  );
}

export function NotFound() {
  return (
    <div className="max-w-lg mx-auto px-4 py-20 text-center">
      <div className="text-8xl mb-4">404</div>
      <h1 className="text-2xl font-bold text-navy-900 mb-2">Page Not Found</h1>
      <p className="text-navy-500 mb-6">The page you&apos;re looking for doesn&apos;t exist or has been moved.</p>
      <a href="/" className="px-6 py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition inline-block">Go Home</a>
    </div>
  );
}
