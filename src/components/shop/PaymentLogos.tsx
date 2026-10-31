'use client';

/**
 * Payment method brand marks (UPI apps, card networks) drawn as inline SVG.
 * Lightweight look-alike badges — no external image requests, always crisp,
 * and they inherit dark-mode-free fixed brand colors like the big Indian
 * marketplaces show them at checkout.
 */

export function PhonePeMark({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-label="PhonePe" role="img">
      <rect width="40" height="40" rx="9" fill="#5f259f" />
      <text x="20" y="27.5" textAnchor="middle" fontFamily="system-ui, 'Noto Sans Devanagari', sans-serif" fontSize="20" fontWeight="700" fill="#ffffff">पे</text>
    </svg>
  );
}

export function GPayMark({ size = 34 }: { size?: number }) {
  return (
    <svg width={(size * 46) / 34} height={size} viewBox="0 0 46 40" aria-label="Google Pay" role="img">
      <rect width="46" height="40" rx="9" fill="#ffffff" stroke="#e5e7eb" />
      <g transform="translate(8,10)">
        <path fill="#4285F4" d="M10.6 8.1v3.1h7.4c-.3 1.7-2 5-7.4 5-4.5 0-8.1-3.7-8.1-8.2S6.1-.2 10.6-.2c2.6 0 4.3 1.1 5.3 2l2.4-2.3C16.7-2 14.1-3.3 10.6-3.3c-6.4 0-11.8 5.2-11.8 11.6s5.4 11.6 11.8 11.6c6.8 0 11.3-4.8 11.3-11.5 0-.8-.1-1.4-.2-2z" transform="scale(0.62) translate(1,3)" />
      </g>
      <text x="27" y="26" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="13" fontWeight="600" fill="#5f6368">Pay</text>
    </svg>
  );
}

export function PaytmMark({ size = 34 }: { size?: number }) {
  return (
    <svg width={(size * 52) / 34} height={size} viewBox="0 0 52 40" aria-label="Paytm" role="img">
      <rect width="52" height="40" rx="9" fill="#ffffff" stroke="#e5e7eb" />
      <text x="26" y="26.5" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="14" fontWeight="800" letterSpacing="-0.5">
        <tspan fill="#002e6e">pay</tspan>
        <tspan fill="#00b9f1">tm</tspan>
      </text>
    </svg>
  );
}

export function UpiMark({ height = 22 }: { height?: number }) {
  return (
    <svg width={height * 2.1} height={height} viewBox="0 0 46 22" aria-label="UPI" role="img">
      <path d="M6.5 1h9L9 21h-9z" fill="#f97316" transform="scale(0.62)" />
      <path d="M13.5 1h5.5L12.5 21H7z" fill="#16a34a" transform="scale(0.62) translate(6,0)" />
      <text x="22" y="16.5" fontFamily="Arial, sans-serif" fontSize="14" fontWeight="800" fontStyle="italic" fill="#0f3d68">UPI</text>
    </svg>
  );
}

export function VisaMark({ height = 16 }: { height?: number }) {
  return (
    <svg width={height * 2.2} height={height} viewBox="0 0 36 16" aria-label="Visa" role="img">
      <text x="18" y="12.5" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="11" fontWeight="800" fontStyle="italic" letterSpacing="0.5" fill="#1a1f71">VISA</text>
    </svg>
  );
}

export function MastercardMark({ height = 16 }: { height?: number }) {
  return (
    <svg width={height * 1.6} height={height} viewBox="0 0 26 16" aria-label="Mastercard" role="img">
      <circle cx="10" cy="8" r="6.5" fill="#eb001b" />
      <circle cx="16" cy="8" r="6.5" fill="#f79e1b" fillOpacity="0.9" />
    </svg>
  );
}

export function RuPayMark({ height = 16 }: { height?: number }) {
  return (
    <svg width={height * 2.4} height={height} viewBox="0 0 40 16" aria-label="RuPay" role="img">
      <text x="20" y="12.5" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="11" fontWeight="800">
        <tspan fill="#f37021">Ru</tspan>
        <tspan fill="#008746">Pay</tspan>
      </text>
    </svg>
  );
}

/** Row of UPI app badges shown under the UPI payment option. */
export function UpiAppsRow() {
  return (
    <div className="flex items-center gap-2.5 flex-wrap">
      <PhonePeMark />
      <GPayMark />
      <PaytmMark />
      <span className="text-[11px] text-navy-400 font-medium px-0.5">or any UPI app</span>
    </div>
  );
}

/** Card network badges for the cards payment option. */
export function CardNetworksRow() {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <VisaMark />
      <MastercardMark />
      <RuPayMark />
    </div>
  );
}
