/**
 * Order transactional email templates (Resend-ready inline-styled HTML).
 *
 * Every template is self-contained (tables + inline CSS) so it renders
 * correctly in Gmail, Outlook, Apple Mail and mobile clients.
 */

export type OrderEmailKind = 'placed' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';

interface OrderLike {
  orderNumber: string;
  total: number;
  subtotal: number;
  discount: number;
  shipping: number;
  tax: number;
  paymentMethod: string;
  paymentStatus: string;
  couponCode?: string | null;
}

interface ItemLike {
  productName: string;
  quantity: number;
  totalPrice: number;
}

const BRAND = { navy: '#0f172a', ink: '#1e293b', muted: '#64748b', accent: '#e11d48', soft: '#fdf2f8', line: '#e2e8f0', bg: '#f8fafc' };

const fmt = (n: number) => `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

const PAY_LABEL: Record<string, string> = { cod: 'Cash on Delivery', dodo: 'Online payment (UPI / Card)' };
const STATUS_LABEL: Record<string, string> = { pending: 'Pending payment', confirmed: 'Confirmed', shipped: 'Shipped', delivered: 'Delivered', cancelled: 'Cancelled' };

const HEADINGS: Record<OrderEmailKind, { title: string; sub: string }> = {
  placed: { title: 'Order placed successfully 🎉', sub: 'Thanks for shopping with ShopMitra! Your order is confirmed and we are getting it ready.' },
  confirmed: { title: 'Payment received — order confirmed ✓', sub: 'We have received your payment. Your order is confirmed and will ship soon.' },
  shipped: { title: 'Your order is on the way 🚚', sub: 'Good news! Your order has been shipped and is heading to your delivery address.' },
  delivered: { title: 'Delivered! Enjoy your order 🎁', sub: 'Your order has been delivered. We hope you love it! Tell us how it went — your feedback keeps ShopMitra better.' },
  cancelled: { title: 'Order cancelled', sub: 'Your order has been cancelled. If this was not you or you have any questions, reply to this email and we will help right away.' },
};

function row(label: string, value: string, strong = false) {
  return `<tr>
    <td style="padding:6px 0;color:${BRAND.muted};font-size:14px;">${label}</td>
    <td style="padding:6px 0;text-align:right;color:${BRAND.ink};font-size:14px;${strong ? 'font-weight:700;' : ''}">${value}</td>
  </tr>`;
}

export function renderOrderEmail(order: OrderLike, items: ItemLike[], kind: OrderEmailKind, baseUrl: string) {
  const { title, sub } = HEADINGS[kind];
  const trackUrl = `${baseUrl}/track-order?order=${encodeURIComponent(order.orderNumber)}`;
  const itemsHtml = items
    .map(
      (i) => `<tr>
      <td style="padding:8px 0;border-bottom:1px solid ${BRAND.line};color:${BRAND.ink};font-size:14px;">${i.productName} <span style="color:${BRAND.muted}">× ${i.quantity}</span></td>
      <td style="padding:8px 0;border-bottom:1px solid ${BRAND.line};text-align:right;color:${BRAND.ink};font-size:14px;font-weight:600;">${fmt(i.totalPrice)}</td>
    </tr>`
    )
    .join('');

  return {
    subject: `${title.replace(/[🎁🚚🎉]/g, '').trim()} — ${order.orderNumber}`,
    html: `<div style="margin:0;padding:0;background:${BRAND.bg};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.bg};padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
        <tr><td style="background:${BRAND.navy};padding:20px 32px;">
          <span style="color:#ffffff;font-size:22px;font-weight:800;letter-spacing:-0.5px;">Shop<span style="color:#fb923c;">Mitra</span></span>
          <span style="color:#94a3b8;font-size:11px;padding-left:10px;text-transform:uppercase;letter-spacing:2px;">Your Shopping Friend</span>
        </td></tr>
        <tr><td style="padding:32px;">
          <h1 style="margin:0 0 8px;font-size:20px;color:${BRAND.navy};">${title}</h1>
          <p style="margin:0 0 24px;color:${BRAND.muted};font-size:14px;line-height:1.6;">${sub}</p>

          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.soft};border-radius:12px;padding:16px 20px;margin-bottom:24px;">
            <tr><td style="color:${BRAND.muted};font-size:12px;text-transform:uppercase;letter-spacing:1px;">Order number</td>
                <td style="text-align:right;color:${BRAND.accent};font-size:15px;font-weight:800;">${order.orderNumber}</td></tr>
            <tr><td style="color:${BRAND.muted};font-size:12px;text-transform:uppercase;letter-spacing:1px;padding-top:6px;">Payment</td>
                <td style="text-align:right;color:${BRAND.ink};font-size:13px;padding-top:6px;">${PAY_LABEL[order.paymentMethod] ?? order.paymentMethod} · ${order.paymentStatus === 'paid' ? 'Paid' : order.paymentStatus === 'pending' ? 'Due' : order.paymentStatus}</td></tr>
            <tr><td style="color:${BRAND.muted};font-size:12px;text-transform:uppercase;letter-spacing:1px;padding-top:6px;">Current status</td>
                <td style="text-align:right;color:${BRAND.ink};font-size:13px;padding-top:6px;">${STATUS_LABEL[kind] ?? kind}</td></tr>
          </table>

          <h2 style="margin:0 0 8px;font-size:15px;color:${BRAND.navy};">Order summary</h2>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${itemsHtml}</table>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px;">
            ${row('Subtotal', fmt(order.subtotal))}
            ${order.discount > 0 ? row(`Discount${order.couponCode ? ` (${order.couponCode})` : ''}`, `− ${fmt(order.discount)}`) : ''}
            ${row('Shipping', order.shipping > 0 ? fmt(order.shipping) : 'FREE')}
            ${order.tax > 0 ? row('GST', fmt(order.tax)) : ''}
            ${row('Total', fmt(order.total), true)}
          </table>

          <div style="text-align:center;margin:28px 0 8px;">
            <a href="${trackUrl}" style="display:inline-block;background:${BRAND.accent};color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:13px 36px;border-radius:999px;">Track your order</a>
          </div>
          <p style="margin:16px 0 0;color:${BRAND.muted};font-size:12px;text-align:center;">or visit shopmitra.in → Track Order and enter ${order.orderNumber}</p>
        </td></tr>
        <tr><td style="border-top:1px solid ${BRAND.line};padding:18px 32px;background:#ffffff;">
          <p style="margin:0;color:${BRAND.muted};font-size:12px;line-height:1.6;">Need help? Reply to this email or write to <a href="mailto:support@shopmitra.in" style="color:${BRAND.accent};text-decoration:none;">support@shopmitra.in</a> — we reply within 24 hours.<br>© ${new Date().getFullYear()} ShopMitra · Free shipping above ₹999 · Easy 30-day returns</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</div>`,
  };
}
