import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, User } from 'lucide-react';
import { useApp, loginUser, registerUser, formatPrice, type AuthUser } from '../store/AppContext';

export function Login() {
  const { dispatch } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  // Check if user was redirected from checkout
  const fromCheckout = (location.state as any)?.from === '/checkout';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { setError('Please fill in all fields'); return; }
    const result = await loginUser(email, password);
    if (result.success && result.user) {
      dispatch({ type: 'LOGIN', user: result.user });
      dispatch({ type: 'SET_NOTIFICATION', notification: { type: 'success', message: `Welcome back, ${result.user.name}!` } });
      // Redirect back to checkout if came from there
      if (fromCheckout) {
        navigate('/checkout');
      } else {
        navigate('/');
      }
    } else {
      setError(result.error || 'Login failed');
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
            <label className="block text-sm font-medium text-navy-700 mb-1">Email</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-400" />
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="you@example.com" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-navy-700 mb-1">Password</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-400" />
              <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full pl-10 pr-10 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="••••••••" />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-navy-400">{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button>
            </div>
          </div>
          <button type="submit" className="w-full py-3 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700 transition">Sign In</button>
          <p className="text-center text-sm text-navy-500">Don't have an account? <Link to="/register" className="text-primary-600 font-medium">Create one</Link></p>
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

export function Register() {
  const { dispatch } = useApp();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) { setError('Please fill in all fields'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    const result = await registerUser(email, password, name);
    if (result.success && result.user) {
      dispatch({ type: 'LOGIN', user: result.user });
      dispatch({ type: 'SET_NOTIFICATION', notification: { type: 'success', message: 'Account created successfully!' } });
      navigate('/');
    } else {
      setError(result.error || 'Registration failed');
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8"><h1 className="text-2xl font-bold text-navy-900">Create Account</h1><p className="text-navy-500 mt-1">Join ShopMitra for exclusive deals</p></div>
        <form onSubmit={handleRegister} className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
          {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{error}</div>}
          <div>
            <label className="block text-sm font-medium text-navy-700 mb-1">Full Name</label>
            <div className="relative"><User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-400" /><input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="John Doe" /></div>
          </div>
          <div>
            <label className="block text-sm font-medium text-navy-700 mb-1">Email</label>
            <div className="relative"><Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-400" /><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="you@example.com" /></div>
          </div>
          <div>
            <label className="block text-sm font-medium text-navy-700 mb-1">Password</label>
            <div className="relative"><Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-400" /><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="Min 6 characters" /></div>
          </div>
          <div>
            <label className="block text-sm font-medium text-navy-700 mb-1">Confirm Password</label>
            <div className="relative"><Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-400" /><input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="••••••••" /></div>
          </div>
          <button type="submit" className="w-full py-3 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700 transition">Create Account</button>
          <p className="text-center text-sm text-navy-500">Already have an account? <Link to="/login" className="text-primary-600 font-medium">Sign in</Link></p>
        </form>
      </div>
    </div>
  );
}

export function OrderSuccess() {
  const { state } = useApp();
  const order = state.orders[0];

  return (
    <div className="max-w-lg mx-auto px-4 py-16 text-center">
      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6"><span className="text-4xl text-green-600">✓</span></div>
      <h1 className="text-2xl font-bold text-navy-900 mb-2">Order Placed Successfully!</h1>
      <p className="text-navy-500 mb-6">Thank you for your purchase. Your order has been confirmed.</p>
      {order && (
        <div className="bg-gray-50 rounded-xl p-6 text-left mb-6">
          <p className="text-sm text-navy-500">Order Number</p>
          <p className="font-bold text-navy-900 text-lg">{order.order_number}</p>
          <p className="text-sm text-navy-500 mt-3">Total Amount</p>
          <p className="font-bold text-navy-900">{formatPrice(order.total)}</p>
          <p className="text-sm text-navy-500 mt-3">Payment</p>
          <p className="font-medium text-navy-900 capitalize">{order.payment_method === 'dodo' ? 'Dodo Payments' : order.payment_method === 'cod' ? 'Cash on Delivery' : order.payment_method}</p>
        </div>
      )}
      <div className="flex gap-3 justify-center">
        <Link to="/account/orders" className="px-6 py-3 border border-gray-200 rounded-xl font-medium text-navy-700 hover:bg-gray-50 transition">View Orders</Link>
        <Link to="/products" className="px-6 py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition">Continue Shopping</Link>
      </div>
    </div>
  );
}
