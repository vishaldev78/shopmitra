'use client';

/**
 * ShopMitra brand mark — bold gradient wordmark + storefront glyph.
 * The warm saffron→rose gradient is the core brand asset: it stays vivid on
 * white (header) and on navy (footer).
 */

const GRADIENT = 'from-orange-500 via-rose-500 to-pink-600';

export function Logo({
  className = '',
  size = 'md',
  tagline = true,
}: {
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  tagline?: boolean;
}) {
  const sizes = {
    xs: { height: 30, fontSize: 26 },
    sm: { height: 34, fontSize: 28 },
    md: { height: 40, fontSize: 34 },
    lg: { height: 56, fontSize: 46 },
  };
  const s = sizes[size];

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      {/* Icon mark */}
      <div className="relative shrink-0" style={{ width: s.height, height: s.height }}>
        <LogoMarkSvg size={s.height} idSuffix={`full-${size}`} />
      </div>
      {/* Wordmark */}
      <div className={`flex flex-col leading-none ${tagline ? '' : 'justify-center'}`}>
        <span
          className={`font-extrabold bg-gradient-to-r ${GRADIENT} bg-clip-text text-transparent drop-shadow-sm`}
          style={{
            fontFamily: "var(--font-dancing), 'Dancing Script', cursive",
            fontSize: s.fontSize,
            fontWeight: 800,
            lineHeight: 1.05,
            letterSpacing: '-0.01em',
          }}
        >
          ShopMitra
        </span>
        {tagline && (
          <span
            className="text-navy-400 uppercase"
            style={{
              fontSize: Math.max(7, s.fontSize * 0.26),
              fontFamily: "var(--font-inter), 'Inter', sans-serif",
              fontWeight: 600,
              letterSpacing: '0.22em',
              marginTop: 2,
            }}
          >
            Your Shopping Friend
          </span>
        )}
      </div>
    </div>
  );
}

export function LogoMark({ size = 36 }: { size?: number }) {
  return <LogoMarkSvg size={size} idSuffix="mark" />;
}

function LogoMarkSvg({ size, idSuffix }: { size: number; idSuffix: string }) {
  const gradId = `logoGrad-${idSuffix}`;
  return (
    <svg viewBox="0 0 40 40" style={{ width: size, height: size }} aria-hidden="true">
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f97316" />
          <stop offset="55%" stopColor="#f43f5e" />
          <stop offset="100%" stopColor="#db2777" />
        </linearGradient>
      </defs>
      <circle cx="20" cy="20" r="19" fill={`url(#${gradId})`} />
      {/* Storefront awning */}
      <path
        d="M12 14 L28 14 L29.5 18.5 C29.5 20.4 27.9 22 26 22 C24.1 22 22.5 20.4 22.5 18.5 C22.5 20.4 20.9 22 19 22 C17.1 22 15.5 20.4 15.5 18.5 C15.5 20.4 13.9 22 12 22 C10.1 22 8.5 20.4 8.5 18.5 Z"
        fill="white"
        opacity="0.95"
      />
      {/* Shop body + door */}
      <path
        d="M11.5 21.5 L11.5 28.5 L28.5 28.5 L28.5 21.5"
        stroke="white"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path d="M17.5 28.5 L17.5 23.5 L22.5 23.5 L22.5 28.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}
