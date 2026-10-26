import { HashRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './store/AppContext';
import { Layout } from './components/Layout';
import Home from './pages/Home';
import Products from './pages/Products';
import ProductDetail from './pages/ProductDetail';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import { Login, Register, OrderSuccess } from './pages/Auth';
import { AccountDashboard, AccountOrders, Wishlist, TrackOrder } from './pages/Account';
import AdminDashboard from './pages/Admin';
import { About, Contact, FAQ, ShippingPolicy, ReturnPolicy, PrivacyPolicy, Terms, NotFound } from './pages/StaticPages';
import PaymentReturn from './pages/PaymentReturn';

function App() {
  return (
    <HashRouter>
      <AppProvider>
        <Layout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/products" element={<Products />} />
            <Route path="/product/:slug" element={<ProductDetail />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/order-success/:orderNumber" element={<OrderSuccess />} />
            <Route path="/account" element={<AccountDashboard />} />
            <Route path="/account/orders" element={<AccountOrders />} />
            <Route path="/account/addresses" element={<AccountDashboard />} />
            <Route path="/account/settings" element={<AccountDashboard />} />
            <Route path="/wishlist" element={<Wishlist />} />
            <Route path="/track-order" element={<TrackOrder />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/faq" element={<FAQ />} />
            <Route path="/shipping-policy" element={<ShippingPolicy />} />
            <Route path="/return-policy" element={<ReturnPolicy />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/payment-return" element={<PaymentReturn />} />
            <Route path="/payment-cancel" element={<PaymentReturn />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Layout>
      </AppProvider>
    </HashRouter>
  );
}

export default App;
