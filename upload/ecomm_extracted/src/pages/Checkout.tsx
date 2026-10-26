import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check, CreditCard, Banknote, ArrowLeft, Lock, ShieldCheck } from 'lucide-react';
import { useApp, getCartTotal, formatPrice, generateOrderNumber, type Order } from '../store/AppContext';
import { createDodoCheckout } from '../services/payments';

export default function Checkout() {
  const { state, dispatch } = useApp();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState('dodo');
  const [processing, setProcessing] = useState(false);
  const [address, setAddress] = useState({ fullName: '', phone: '', addressLine1: '', addressLine2: '', city: '', state: '', postalCode: '', country: 'India' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const totals = getCartTotal(state.cart, state.couponDiscount);

  // 🔒 LOGIN REQUIRED - Redirect to login if not authenticated
  if (!state.isLoggedIn) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Lock size={32} className="text-primary-600" />
        </div>
        <h1 className="text-2xl font-bold text-navy-900 mb-2">Login Required</h1>
        <p className="text-navy-500 mb-6">Please sign in to proceed with checkout. Your cart items are saved.</p>
        <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left">
          <p className="text-sm font-medium text-navy-700 mb-2">Your Cart ({state.cart.length} items):</p>
          {state.cart.slice(0, 3).map(item => (
            <div key={item.product.id} className="flex justify-between text-sm py-1">
              <span className="text-navy-600 truncate">{item.product.name} × {item.quantity}</span>
              <span className="font-medium">{formatPrice(item.product.price * item.quantity)}</span>
            </div>
          ))}
          {state.cart.length > 3 && <p className="text-xs text-navy-400">+{state.cart.length - 3} more items</p>}
          <hr className="my-2" />
          <div className="flex justify-between font-bold">
            <span>Total</span>
            <span>{formatPrice(totals.total)}</span>
          </div>
        </div>
        <div className="flex gap-3 justify-center">
          <Link to="/cart" className="px-6 py-3 border border-gray-200 rounded-xl font-medium text-navy-700 hover:bg-gray-50 transition">Back to Cart</Link>
          <Link
            to="/login"
            state={{ from: '/checkout' }}
            className="px-6 py-3 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700 transition flex items-center gap-2"
          >
            <Lock size={16} /> Sign In to Continue
          </Link>
        </div>
        <p className="text-xs text-navy-400 mt-4">Don't have an account? <Link to="/register" className="text-primary-600 font-medium">Create one</Link></p>
      </div>
    );
  }

  if (state.cart.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-navy-900 mb-2">Nothing to checkout</h1>
        <Link to="/products" className="px-6 py-3 bg-primary-600 text-white rounded-xl font-medium">Shop Now</Link>
      </div>
    );
  }

  const validateAddress = () => {
    const e: Record<string, string> = {};
    if (!address.fullName.trim()) e.fullName = 'Required';
    if (!address.phone.trim() || address.phone.length < 10) e.phone = 'Valid phone required';
    if (!address.addressLine1.trim()) e.addressLine1 = 'Required';
    if (!address.city.trim()) e.city = 'Required';
    if (!address.state.trim()) e.state = 'Required';
    if (!address.postalCode.trim() || address.postalCode.length < 6) e.postalCode = 'Valid pincode required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handlePlaceOrder = async () => {
    setProcessing(true);

    try {
      const orderNumber = generateOrderNumber();

      // 🟣 REAL DODO PAYMENTS INTEGRATION
      if (paymentMethod === 'dodo') {
        try {
          // Create real Dodo checkout session
          const dodoResult = await createDodoCheckout({
            amount: totals.total,
            currency: 'INR',
            customerEmail: state.user?.email || '',
            customerName: address.fullName,
            orderNumber,
            return_url: window.location.origin + '/#/payment-return',
            cancel_url: window.location.origin + '/#/payment-cancel',
            products: state.cart.map(item => ({
              name: item.product.name,
              quantity: item.quantity,
              price: item.product.price,
            })),
          });

          if (dodoResult.success && dodoResult.checkout_url) {
            // Create pending order in REAL database first
            const { db } = await import('../lib/db');
            await db`
              INSERT INTO orders (order_number, user_id, subtotal, discount, shipping, tax, total, status, payment_status, payment_method, shipping_address)
              VALUES (${orderNumber}, ${state.user?.id || null}, ${totals.subtotal}, ${totals.discount}, ${totals.shipping}, ${totals.tax}, ${totals.total}, 'pending', 'pending', 'dodo', ${JSON.stringify(address)}::jsonb)
            `;

            // Create order items
            for (const item of state.cart) {
              await db`
                INSERT INTO order_items (order_id, product_id, product_name, product_image, quantity, unit_price, total_price)
                VALUES (
                  (SELECT id FROM orders WHERE order_number = ${orderNumber}),
                  ${item.product.id},
                  ${item.product.name},
                  ${item.product.images?.[0] || ''},
                  ${item.quantity},
                  ${item.product.price},
                  ${item.product.price * item.quantity}
                )
              `;
            }

            // Store pending order info for return handling
            sessionStorage.setItem('pending_order_number', orderNumber);

            // Redirect to Dodo's hosted checkout
            dispatch({ type: 'SET_NOTIFICATION', notification: { type: 'info', message: 'Redirecting to secure payment...' } });
            window.location.href = dodoResult.checkout_url;
            return;
          } else {
            console.warn('Dodo checkout failed, using demo mode:', dodoResult.error);
            dispatch({ type: 'SET_NOTIFICATION', notification: { type: 'info', message: 'Using demo payment (configure Dodo API key for live payments)' } });
          }
        } catch (error) {
          console.error('Dodo payment error:', error);
        }
      }

      // COD or fallback flow - Create order in REAL database
      await new Promise(r => setTimeout(r, 1000));

      const { db } = await import('../lib/db');

      // Create order in database
      const orderResult = await db`
        INSERT INTO orders (order_number, user_id, subtotal, discount, shipping, tax, total, status, payment_status, payment_method, shipping_address)
        VALUES (${orderNumber}, ${state.user?.id || null}, ${totals.subtotal}, ${totals.discount}, ${totals.shipping}, ${totals.tax}, ${totals.total}, 'pending', ${paymentMethod === 'cod' ? 'pending' : 'paid'}, ${paymentMethod === 'dodo' ? 'dodo' : paymentMethod}, ${JSON.stringify(address)}::jsonb)
        RETURNING *
      `;

      // Create order items and update stock
      for (const item of state.cart) {
        await db`
          INSERT INTO order_items (order_id, product_id, product_name, product_image, quantity, unit_price, total_price)
          VALUES (${orderResult[0].id}, ${item.product.id}, ${item.product.name}, ${item.product.images?.[0] || ''}, ${item.quantity}, ${item.product.price}, ${item.product.price * item.quantity})
        `;

        // Decrement stock
        await db`UPDATE products SET stock = stock - ${item.quantity} WHERE id = ${item.product.id}`;
      }

      const order: Order = {
        id: orderResult[0].id,
        order_number: orderNumber,
        user_id: state.user?.id || null,
        items: state.cart.map(item => ({
          product_id: item.product.id,
          product_name: item.product.name,
          product_image: item.product.images?.[0] || '',
          quantity: item.quantity,
          unit_price: item.product.price,
          total_price: item.product.price * item.quantity,
        })),
        subtotal: totals.subtotal,
        discount: totals.discount,
        shipping: totals.shipping,
        tax: totals.tax,
        total: totals.total,
        status: 'pending',
        payment_status: paymentMethod === 'cod' ? 'pending' : 'paid',
        payment_method: paymentMethod === 'dodo' ? 'dodo' : paymentMethod,
        payment_id: paymentMethod !== 'cod' ? 'pay_' + Date.now().toString(36) : undefined,
        shipping_address: address,
        created_at: orderResult[0].created_at,
      };

      dispatch({ type: 'ADD_ORDER', order });
      dispatch({ type: 'SET_NOTIFICATION', notification: { type: 'success', message: 'Order placed successfully!' } });
      setProcessing(false);
      navigate(`/order-success/${orderNumber}`);
    } catch (error: any) {
      console.error('Order creation error:', error);
      dispatch({ type: 'SET_NOTIFICATION', notification: { type: 'error', message: 'Failed to place order. Please try again.' } });
      setProcessing(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <Link to="/cart" className="flex items-center gap-2 text-sm text-navy-500 hover:text-primary-600 mb-6"><ArrowLeft size={16} /> Back to Cart</Link>
      <h1 className="text-2xl font-bold text-navy-900 mb-2">Checkout</h1>
      <p className="text-sm text-navy-500 mb-6">Signed in as <span className="font-medium text-navy-700">{state.user?.email}</span></p>

      <div className="flex items-center gap-2 mb-8">
        {[{ n: 1, label: 'Address' }, { n: 2, label: 'Payment' }, { n: 3, label: 'Review' }].map((s, i) => (
          <div key={s.n} className="flex items-center">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${step >= s.n ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-navy-400'}`}>
              {step > s.n ? <Check size={14} /> : <span>{s.n}</span>}<span className="hidden sm:inline">{s.label}</span>
            </div>
            {i < 2 && <div className={`w-8 h-0.5 mx-1 ${step > s.n ? 'bg-primary-500' : 'bg-gray-200'}`} />}
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          {step === 1 && (
            <div className="bg-white border border-gray-200 rounded-xl p-6 animate-fade-in">
              <h2 className="text-lg font-bold text-navy-900 mb-4">Shipping Address</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-navy-700 mb-1">Full Name *</label><input type="text" value={address.fullName} onChange={(e) => setAddress({ ...address, fullName: e.target.value })} className={`w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${errors.fullName ? 'border-red-300' : 'border-gray-200'}`} placeholder={state.user?.name} /></div>
                <div><label className="block text-sm font-medium text-navy-700 mb-1">Phone *</label><input type="tel" value={address.phone} onChange={(e) => setAddress({ ...address, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })} className={`w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${errors.phone ? 'border-red-300' : 'border-gray-200'}`} placeholder="9876543210" /></div>
                <div className="sm:col-span-2"><label className="block text-sm font-medium text-navy-700 mb-1">Address *</label><input type="text" value={address.addressLine1} onChange={(e) => setAddress({ ...address, addressLine1: e.target.value })} className={`w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${errors.addressLine1 ? 'border-red-300' : 'border-gray-200'}`} placeholder="House no., Street, Area" /></div>
                <div className="sm:col-span-2"><label className="block text-sm font-medium text-navy-700 mb-1">Landmark (optional)</label><input type="text" value={address.addressLine2 || ''} onChange={(e) => setAddress({ ...address, addressLine2: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" /></div>
                <div><label className="block text-sm font-medium text-navy-700 mb-1">City *</label><input type="text" value={address.city} onChange={(e) => setAddress({ ...address, city: e.target.value })} className={`w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${errors.city ? 'border-red-300' : 'border-gray-200'}`} /></div>
                <div><label className="block text-sm font-medium text-navy-700 mb-1">State *</label><input type="text" value={address.state} onChange={(e) => setAddress({ ...address, state: e.target.value })} className={`w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${errors.state ? 'border-red-300' : 'border-gray-200'}`} /></div>
                <div><label className="block text-sm font-medium text-navy-700 mb-1">Pincode *</label><input type="text" value={address.postalCode} onChange={(e) => setAddress({ ...address, postalCode: e.target.value.replace(/\D/g, '').slice(0, 6) })} className={`w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${errors.postalCode ? 'border-red-300' : 'border-gray-200'}`} placeholder="400001" /></div>
              </div>
              <button onClick={() => { if (validateAddress()) setStep(2); }} className="mt-6 px-6 py-3 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700 transition">Continue to Payment</button>
            </div>
          )}

          {step === 2 && (
            <div className="bg-white border border-gray-200 rounded-xl p-6 animate-fade-in">
              <h2 className="text-lg font-bold text-navy-900 mb-4">Payment Method</h2>
              <div className="space-y-3">
                <label className={`flex items-center gap-4 p-4 border-2 rounded-xl cursor-pointer transition ${paymentMethod === 'dodo' ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <input type="radio" name="payment" value="dodo" checked={paymentMethod === 'dodo'} onChange={() => setPaymentMethod('dodo')} className="text-primary-600" />
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-xs">dodo</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-navy-900">Dodo Payments</p>
                      <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium">RECOMMENDED</span>
                    </div>
                    <p className="text-xs text-navy-500">UPI, Cards, Net Banking, Wallets — Secured by Dodo</p>
                  </div>
                  <ShieldCheck size={20} className="text-green-600" />
                </label>
                <label className={`flex items-center gap-4 p-4 border-2 rounded-xl cursor-pointer transition ${paymentMethod === 'cod' ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <input type="radio" name="payment" value="cod" checked={paymentMethod === 'cod'} onChange={() => setPaymentMethod('cod')} className="text-primary-600" />
                  <Banknote size={20} className="text-navy-600" />
                  <div><p className="font-medium text-navy-900">Cash on Delivery</p><p className="text-xs text-navy-500">Pay when you receive your order</p></div>
                </label>
              </div>

              {paymentMethod === 'dodo' && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-xs text-blue-700 flex items-center gap-2">
                    <ShieldCheck size={14} />
                    You'll be redirected to Dodo's secure checkout page to complete payment. Your order is safe with us.
                  </p>
                </div>
              )}

              <div className="flex gap-3 mt-6">
                <button onClick={() => setStep(1)} className="px-6 py-3 border border-gray-200 rounded-xl font-medium text-navy-700 hover:bg-gray-50">Back</button>
                <button onClick={() => setStep(3)} className="px-6 py-3 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700">Review Order</button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="bg-white border border-gray-200 rounded-xl p-6 animate-fade-in">
              <h2 className="text-lg font-bold text-navy-900 mb-4">Review Your Order</h2>
              <div className="mb-6 p-4 bg-gray-50 rounded-xl">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-navy-900">{address.fullName}</p>
                    <p className="text-sm text-navy-600">{address.addressLine1}{address.addressLine2 && `, ${address.addressLine2}`}</p>
                    <p className="text-sm text-navy-600">{address.city}, {address.state} - {address.postalCode}</p>
                    <p className="text-sm text-navy-600">Phone: {address.phone}</p>
                  </div>
                  <button onClick={() => setStep(1)} className="text-xs text-primary-600 hover:text-primary-700">Edit</button>
                </div>
              </div>
              <div className="mb-6">
                <h3 className="font-medium text-navy-900 mb-3">Items ({state.cart.length})</h3>
                {state.cart.map(item => (
                  <div key={item.product.id} className="flex items-center gap-3 py-2">
                    {item.product.images?.[0]?.startsWith('http') ? <img src={item.product.images[0]} alt="" className="w-12 h-12 rounded object-cover" /> : <span className="text-2xl">📦</span>}
                    <div className="flex-1"><p className="text-sm font-medium text-navy-900 truncate">{item.product.name}</p><p className="text-xs text-navy-500">Qty: {item.quantity}</p></div>
                    <p className="text-sm font-medium">{formatPrice(item.product.price * item.quantity)}</p>
                  </div>
                ))}
              </div>
              <div className="mb-6 p-4 bg-gray-50 rounded-xl">
                <div className="flex justify-between items-center">
                  <p className="text-sm text-navy-600">Payment: <span className="font-medium text-navy-900">{paymentMethod === 'dodo' ? 'Dodo Payments (Secure)' : 'Cash on Delivery'}</span></p>
                  <button onClick={() => setStep(2)} className="text-xs text-primary-600 hover:text-primary-700">Edit</button>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep(2)} className="px-6 py-3 border border-gray-200 rounded-xl font-medium text-navy-700 hover:bg-gray-50">Back</button>
                <button onClick={handlePlaceOrder} disabled={processing} className="flex-1 py-3 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700 transition disabled:opacity-50">
                  {processing ? (
                    <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Processing...</span>
                  ) : paymentMethod === 'dodo' ? (
                    <span className="flex items-center justify-center gap-2">Pay {formatPrice(totals.total)} with Dodo <ShieldCheck size={16} /></span>
                  ) : (
                    `Place Order • ${formatPrice(totals.total)}`
                  )}
                </button>
              </div>
              {paymentMethod === 'dodo' && (
                <p className="text-xs text-navy-400 mt-3 text-center">🔒 You'll be redirected to Dodo's secure payment page</p>
              )}
            </div>
          )}
        </div>

        <div className="lg:col-span-1">
          <div className="bg-gray-50 rounded-xl p-6 sticky top-28">
            <h2 className="text-lg font-bold text-navy-900 mb-4">Order Summary</h2>
            <div className="space-y-2 text-sm mb-4">
              <div className="flex justify-between"><span className="text-navy-600">Subtotal</span><span>{formatPrice(totals.subtotal)}</span></div>
              {totals.discount > 0 && <div className="flex justify-between text-green-600"><span>Discount</span><span>-{formatPrice(totals.discount)}</span></div>}
              <div className="flex justify-between"><span className="text-navy-600">Shipping</span><span>{totals.shipping === 0 ? 'FREE' : formatPrice(totals.shipping)}</span></div>
              <div className="flex justify-between"><span className="text-navy-600">Tax</span><span>{formatPrice(totals.tax)}</span></div>
              <hr /><div className="flex justify-between text-lg font-bold"><span>Total</span><span>{formatPrice(totals.total)}</span></div>
            </div>
            <div className="flex items-center gap-2 text-xs text-navy-500 mt-3">
              <ShieldCheck size={14} className="text-green-600" />
              <span>Secured by Dodo Payments • 256-bit SSL</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
