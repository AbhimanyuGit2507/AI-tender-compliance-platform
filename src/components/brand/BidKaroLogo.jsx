import React from 'react';

/**
 * BidKaro Official Vector Logo Suite
 * Provides 4 distinct 10/10 options:
 * - 'gavel' (Concept 1 - Electric Saffron 'B' Monogram with Embedded Tender Gavel)
 * - 'contract' (Concept 2 - Folded Tender Document & Emerald/Orange Victory Checkmark)
 * - 'shield' (Concept 3 - Isometric Hexagonal Cyber-Shield Interlocking 'B' & 'K')
 * - 'spark' (Concept 4 - Aerodynamic High-Velocity 'BK' Falcon with Lightning Bolt)
 */
export function BidKaroLogo({
  variant = 'gavel', // 'gavel' | 'contract' | 'shield' | 'spark'
  size = 36,
  showText = false,
  subtitle = 'Tender Intelligence',
  className = '',
  style = {},
}) {
  const renderMark = () => {
    switch (variant) {
      // ─────────────────────────────────────────────────────────────
      // Concept 1: The Gavel 'B' Monogram
      // ─────────────────────────────────────────────────────────────
      case 'gavel':
      default:
        return (
          <svg
            width={size}
            height={size}
            viewBox="0 0 48 48"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{ flexShrink: 0 }}
          >
            <defs>
              <linearGradient id="bgGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#121622" />
                <stop offset="100%" stopColor="#080a0f" />
              </linearGradient>
              <linearGradient id="gavelOrange" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ff7b1c" />
                <stop offset="50%" stopColor="#f97316" />
                <stop offset="100%" stopColor="#ea580c" />
              </linearGradient>
              <filter id="glow1" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="2" stdDeviation="3.5" floodColor="#f97316" floodOpacity="0.45" />
              </filter>
            </defs>
            {/* Squircle Badge Background */}
            <rect width="48" height="48" rx="12" fill="url(#bgGrad1)" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
            
            {/* Bold B Outer Silhouette */}
            <path
              d="M12 10H27C32.5 10 37 14 37 19C37 22.3 35.2 25.1 32.5 26.5C36 28 38 31.3 38 35.5C38 41 33.5 45 28 45H12V10Z"
              fill="url(#gavelOrange)"
              filter="url(#glow1)"
            />
            {/* Negative Space Cutout for Gavel Head & Handle */}
            {/* Gavel Handle */}
            <line x1="8" y1="36" x2="24" y2="20" stroke="#0c0f17" strokeWidth="4.5" strokeLinecap="round" />
            {/* Gavel Head (Cylinder) */}
            <rect
              x="18"
              y="13"
              width="14"
              height="7"
              rx="2.5"
              transform="rotate(45 18 13)"
              fill="#0c0f17"
            />
          </svg>
        );

      // ─────────────────────────────────────────────────────────────
      // Concept 2: The Victory Contract & Checkmark
      // ─────────────────────────────────────────────────────────────
      case 'contract':
        return (
          <svg
            width={size}
            height={size}
            viewBox="0 0 48 48"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{ flexShrink: 0 }}
          >
            <defs>
              <linearGradient id="docGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#ff8a29" />
                <stop offset="100%" stopColor="#ea580c" />
              </linearGradient>
              <linearGradient id="checkGrad" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#f97316" />
                <stop offset="50%" stopColor="#10b981" />
                <stop offset="100%" stopColor="#34d399" />
              </linearGradient>
              <filter id="checkGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#10b981" floodOpacity="0.35" />
              </filter>
            </defs>
            {/* Squircle Badge Background */}
            <rect width="48" height="48" rx="12" fill="#0d111a" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />

            {/* Document Outline with Folded Flap */}
            <path
              d="M12 9C12 7.34 13.34 6 15 6H29L37 14V39C37 40.66 35.66 42 34 42H15C13.34 42 12 40.66 12 39V9Z"
              fill="none"
              stroke="url(#docGrad)"
              strokeWidth="3.2"
              strokeLinejoin="round"
            />
            {/* Top Fold Flap */}
            <path d="M29 6V14H37" fill="none" stroke="url(#docGrad)" strokeWidth="3.2" strokeLinejoin="round" />

            {/* Document Clause Lines */}
            <line x1="17" y1="17" x2="25" y2="17" stroke="#ffffff" strokeOpacity="0.4" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="17" y1="23" x2="22" y2="23" stroke="#ffffff" strokeOpacity="0.4" strokeWidth="2.5" strokeLinecap="round" />

            {/* Prominent Victory Checkmark Overlaid */}
            <path
              d="M16 29L24 37L42 13"
              stroke="url(#checkGrad)"
              strokeWidth="4.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#checkGlow)"
            />
          </svg>
        );

      // ─────────────────────────────────────────────────────────────
      // Concept 3: Hexagonal Cyber-Shield ('BK' Geometry)
      // ─────────────────────────────────────────────────────────────
      case 'shield':
        return (
          <svg
            width={size}
            height={size}
            viewBox="0 0 48 48"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{ flexShrink: 0 }}
          >
            <defs>
              <linearGradient id="shieldBlue" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#1d4ed8" />
              </linearGradient>
              <linearGradient id="shieldOrange" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#fb923c" />
                <stop offset="100%" stopColor="#ea580c" />
              </linearGradient>
              <filter id="shieldDrop" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#f97316" floodOpacity="0.3" />
              </filter>
            </defs>
            {/* Squircle Badge Background */}
            <rect width="48" height="48" rx="12" fill="#0b0f19" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />

            {/* Left Blue Half ('B') */}
            <path
              d="M24 6L10 14V34L24 42V6Z"
              fill="none"
              stroke="url(#shieldBlue)"
              strokeWidth="3.4"
              strokeLinejoin="round"
            />
            {/* Stylized 'B' inner bars */}
            <path
              d="M15 17H21C22.66 17 24 18.34 24 20C24 21.66 22.66 23 21 23H15V17Z"
              fill="url(#shieldBlue)"
              fillOpacity="0.9"
            />
            <path
              d="M15 25H22C23.66 25 25 26.34 25 28C25 29.66 23.66 31 22 31H15V25Z"
              fill="url(#shieldBlue)"
              fillOpacity="0.9"
            />

            {/* Right Orange Half ('K') */}
            <path
              d="M24 6L38 14V34L24 42"
              fill="none"
              stroke="url(#shieldOrange)"
              strokeWidth="3.4"
              strokeLinejoin="round"
              filter="url(#shieldDrop)"
            />
            {/* Stylized 'K' inner angled wings */}
            <path
              d="M27 24L35 15M27 24L35 33"
              stroke="url(#shieldOrange)"
              strokeWidth="3.8"
              strokeLinecap="round"
            />
          </svg>
        );

      // ─────────────────────────────────────────────────────────────
      // Concept 4: The Speed Falcon Monogram ('BK' Lightning Spark)
      // ─────────────────────────────────────────────────────────────
      case 'spark':
        return (
          <svg
            width={size}
            height={size}
            viewBox="0 0 48 48"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{ flexShrink: 0 }}
          >
            <defs>
              <linearGradient id="speedOrange" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ff852e" />
                <stop offset="100%" stopColor="#ea580c" />
              </linearGradient>
              <linearGradient id="sparkGold" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#fde047" />
                <stop offset="100%" stopColor="#f59e0b" />
              </linearGradient>
              <filter id="sparkGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="1" stdDeviation="3" floodColor="#f59e0b" floodOpacity="0.5" />
              </filter>
            </defs>
            {/* Squircle Badge Background */}
            <rect width="48" height="48" rx="12" fill="#090d14" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />

            {/* Dynamic Angled 'B' Wings */}
            <path
              d="M8 12L15 12C20 12 23 14.5 22 19C21 22.5 18 24 15 24H9L8 12Z"
              fill="url(#speedOrange)"
            />
            <path
              d="M9 24L16 24C21 24 24 26.5 23 31.5C22 36 18 38 12 38H5L9 24Z"
              fill="url(#speedOrange)"
            />

            {/* Dynamic Interlocking 'K' Wings */}
            <path
              d="M26 23L38 12H31L23 23"
              fill="url(#speedOrange)"
            />
            <path
              d="M25 24L37 38H30L21 27"
              fill="url(#speedOrange)"
            />

            {/* High-Voltage Lightning Bolt at Junction */}
            <path
              d="M25 8L20 22H27L22 34L32 18H25L28 8H25Z"
              fill="url(#sparkGold)"
              filter="url(#sparkGlow)"
            />
          </svg>
        );
    }
  };

  if (!showText) {
    return <span className={`inline-flex items-center ${className}`} style={style}>{renderMark()}</span>;
  }

  return (
    <div
      className={`inline-flex items-center gap-2.5 ${className}`}
      style={{ userSelect: 'none', cursor: 'pointer', ...style }}
    >
      {renderMark()}
      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: size * 0.48,
              fontWeight: 800,
              letterSpacing: '-0.035em',
              color: 'var(--text-primary)',
            }}
          >
            BidKaro
          </span>
          <span
            style={{
              width: 5,
              height: 5,
              borderRadius: '50%',
              background: 'var(--accent-cta)',
              display: 'inline-block',
              marginLeft: 1,
            }}
          />
        </div>
        {subtitle && (
          <span
            style={{
              fontSize: Math.max(9, size * 0.27),
              fontWeight: 600,
              color: 'var(--accent-cta)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginTop: 2,
            }}
          >
            {subtitle}
          </span>
        )}
      </div>
    </div>
  );
}

export default BidKaroLogo;
