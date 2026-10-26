export function Logo({ className = '', size = 'md' }: { className?: string; size?: 'sm' | 'md' | 'lg' }) {
  const sizes = {
    sm: { width: 120, height: 32, fontSize: 24 },
    md: { width: 160, height: 40, fontSize: 32 },
    lg: { width: 220, height: 56, fontSize: 44 },
  };
  const s = sizes[size];

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      {/* Icon mark */}
      <div className="relative" style={{ width: s.height, height: s.height }}>
        <svg viewBox="0 0 40 40" className="w-full h-full">
          <defs>
            <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#8b5cf6" />
            </linearGradient>
          </defs>
          <circle cx="20" cy="20" r="19" fill="url(#logoGrad)" />
          <path
            d="M14 16 L14 28 L26 28 L26 16 M14 16 L20 12 L26 16 M18 20 C18 20 19 22 20 22 C21 22 22 20 22 20"
            stroke="white"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
      </div>
      {/* Cursive text */}
      <div className="flex flex-col leading-none">
        <span
          className="font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent"
          style={{
            fontFamily: "'Dancing Script', cursive",
            fontSize: s.fontSize,
            lineHeight: 1,
            letterSpacing: '-0.02em',
          }}
        >
          ShopMitra
        </span>
        <span
          className="text-navy-400 tracking-widest uppercase"
          style={{
            fontSize: s.fontSize * 0.28,
            fontFamily: "'Inter', sans-serif",
            letterSpacing: '0.2em',
            marginTop: 2,
          }}
        >
          Your Shopping Friend
        </span>
      </div>
    </div>
  );
}

export function LogoMark({ size = 36 }: { size?: number }) {
  return (
    <svg viewBox="0 0 40 40" style={{ width: size, height: size }}>
      <defs>
        <linearGradient id="logoGradMark" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
      <circle cx="20" cy="20" r="19" fill="url(#logoGradMark)" />
      <path
        d="M14 16 L14 28 L26 28 L26 16 M14 16 L20 12 L26 16 M18 20 C18 20 19 22 20 22 C21 22 22 20 22 20"
        stroke="white"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}
