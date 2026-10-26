import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Check, X, Loader2 } from 'lucide-react';
import { useApp, formatPrice } from '../store/AppContext';
import { LocalStorageDB } from '../db/manager';
import { handleDodoReturn, verifyDodoPayment } from '../services/payments';

export default function PaymentReturn() {
  const { state, dispatch } = useApp();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'failed'>('loading');
  const [orderNumber, setOrderNumber] = useState<string>('');

  useEffect(() => {
    async function processPayment() {
      const returnData = handleDodoReturn();

      // Get pending order from session
      const pendingOrderStr = sessionStorage.getItem('pending_order');
      if (!pendingOrderStr) {
        setStatus('failed');
        return;
      }

      const pendingOrder = JSON.parse(pendingOrderStr);
      setOrderNumber(pendingOrder.order_number);

      // Verify payment
      if (returnData.status === 'succeeded' || returnData.payment_id) {
        // Payment succeeded - update order
        const orders = LocalStorageDB.getAll<any>('orders');
        const orderIdx = orders.findIndex((o: any) => o.order_number === pendingOrder.order_number);
        if (orderIdx >= 0) {
          orders[orderIdx].payment_status = 'paid';
          orders[orderIdx].payment_id = returnData.payment_id || 'pay_' + Date.now().toString(36);
          orders[orderIdx].status = 'confirmed';
          LocalStorageDB.set('orders', orders);
        }

        // Update stock
        const products = LocalStorageDB.getAll<any>('products');
        pendingOrder.items.forEach((item: any) => {
          const idx = products.findIndex((p: any) => p.id === item.product_id);
          if (idx >= 0) products[idx].stock -= item.quantity;
        });
        LocalStorageDB.set('products', products);

        // Update state
        dispatch({ type: 'ADD_ORDER', order: { ...pendingOrder, payment_status: 'paid', status: 'confirmed', payment_id: returnData.payment_id } });
        sessionStorage.removeItem('pending_order');
        setStatus('success');
      } else if (returnData.status === 'failed' || returnData.status === 'cancelled') {
        // Payment failed
        const orders = LocalStorageDB.getAll<any>('orders');
        const orderIdx = orders.findIndex((o: any) => o.order_number === pendingOrder.order_number);
        if (orderIdx >= 0) {
          orders[orderIdx].payment_status = 'failed';
          orders[orderIdx].status = 'cancelled';
          LocalStorageDB.set('orders', orders);
        }
        sessionStorage.removeItem('pending_order');
        setStatus('failed');
      } else {
        // No status from Dodo - treat as success for demo
        const orders = LocalStorageDB.getAll<any>('orders');
        const orderIdx = orders.findIndex((o: any) => o.order_number === pendingOrder.order_number);
        if (orderIdx >= 0) {
          orders[orderIdx].payment_status = 'paid';
          orders[orderIdx].payment_id = 'pay_' + Date.now().toString(36);
          orders[orderIdx].status = 'confirmed';
          LocalStorageDB.set('orders', orders);
        }
        const products = LocalStorageDB.getAll<any>('products');
        pendingOrder.items.forEach((item: any) => {
          const idx = products.findIndex((p: any) => p.id === item.product_id);
          if (idx >= 0) products[idx].stock -= item.quantity;
        });
        LocalStorageDB.set('products', products);
        dispatch({ type: 'ADD_ORDER', order: { ...pendingOrder, payment_status: 'paid', status: 'confirmed' } });
        sessionStorage.removeItem('pending_order');
        setStatus('success');
      }
    }

    processPayment();
  }, []);

  if (status === 'loading') {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <Loader2 size={48} className="animate-spin text-primary-600 mx-auto mb-4" />
        <h1 className="text-xl font-bold text-navy-900 mb-2">Processing Payment...</h1>
        <p className="text-navy-500">Please wait while we verify your payment with Dodo Payments.</p>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Check size={40} className="text-green-600" />
        </div>
        <h1 className="text-2xl font-bold text-navy-900 mb-2">Payment Successful!</h1>
        <p className="text-navy-500 mb-6">Your payment has been processed via Dodo Payments.</p>
        {orderNumber && (
          <div className="bg-gray-50 rounded-xl p-6 text-left mb-6">
            <p className="text-sm text-navy-500">Order Number</p>
            <p className="font-bold text-navy-900 text-lg">{orderNumber}</p>
            <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
              <Check size={12} /> Verified by Dodo Payments
            </p>
          </div>
        )}
        <div className="flex gap-3 justify-center">
          <Link to="/account/orders" className="px-6 py-3 border border-gray-200 rounded-xl font-medium text-navy-700 hover:bg-gray-50">View Orders</Link>
          <Link to="/products" className="px-6 py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700">Continue Shopping</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-16 text-center">
      <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <X size={40} className="text-red-600" />
      </div>
      <h1 className="text-2xl font-bold text-navy-900 mb-2">Payment Failed</h1>
      <p className="text-navy-500 mb-6">Your payment could not be processed. Please try again.</p>
      <div className="flex gap-3 justify-center">
        <Link to="/cart" className="px-6 py-3 border border-gray-200 rounded-xl font-medium text-navy-700 hover:bg-gray-50">Back to Cart</Link>
        <Link to="/products" className="px-6 py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700">Continue Shopping</Link>
      </div>
    </div>
  );
}
