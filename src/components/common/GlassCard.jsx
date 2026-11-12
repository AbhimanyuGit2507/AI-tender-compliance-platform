import React from 'react';
import { useTheme } from '../../context/ThemeContext';

/**
 * BidKaro Flagship GlassCard Component
 * 10/10 Premium Glassmorphism container featuring:
 * - Multi-layer frosted backdrop blur with saturation boost
 * - Specular 1px top highlight simulating physical etched glass
 * - Ambient multi-spectral Gemini halo bloom
 * - Seamless automatic adaptation for Obsidian Dark and Alabaster Light modes
 */
export function GlassCard({
  children,
  variant = 'default', // 'default' | 'glow' | 'accent' | 'interactive' | 'subtle' | 'critical' | 'success'
  elevation = 'raised', // 'flat' | 'raised' | 'floating'
  spotlight = false,
  hoverEffect = false,
  padding,
  borderRadius = 18,
  className = '',
  style = {},
  onClick,
  ...props
}) {
  const themeContext = useTheme();
  const isLight = themeContext?.resolvedTheme === 'light';

  // Variant-specific styling tokens for Obsidian Dark & Alabaster Light
  const darkVariants = {
    default: {
      background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.02) 100%), rgba(10, 16, 32, 0.62)',
      border: '1px solid rgba(255, 255, 255, 0.14)',
      boxShadow: `
        inset 0 1px 0 0 rgba(255, 255, 255, 0.22),
        inset 0 0 0 1px rgba(255, 255, 255, 0.04),
        0 20px 48px -12px rgba(0, 0, 0, 0.70),
        0 0 32px -8px rgba(99, 102, 241, 0.15)
      `,
    },
    glow: {
      background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.12) 0%, rgba(56, 189, 248, 0.04) 100%), rgba(10, 16, 34, 0.70)',
      border: '1px solid rgba(99, 102, 241, 0.40)',
      boxShadow: `
        inset 0 1px 0 0 rgba(255, 255, 255, 0.28),
        0 0 55px -10px rgba(99, 102, 241, 0.35),
        0 24px 60px -10px rgba(0, 0, 0, 0.75)
      `,
    },
    accent: {
      background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.14) 0%, rgba(56, 189, 248, 0.06) 100%), rgba(10, 16, 32, 0.65)',
      border: '1px solid rgba(99, 102, 241, 0.40)',
      boxShadow: `
        inset 0 1px 0 0 rgba(255, 255, 255, 0.25),
        0 0 40px -10px rgba(99, 102, 241, 0.28),
        0 20px 50px -10px rgba(0, 0, 0, 0.75)
      `,
    },
    interactive: {
      background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.02) 100%), rgba(11, 18, 36, 0.65)',
      border: '1px solid rgba(255, 255, 255, 0.15)',
      boxShadow: `
        inset 0 1px 0 0 rgba(255, 255, 255, 0.24),
        0 16px 40px -8px rgba(0, 0, 0, 0.65)
      `,
      cursor: 'pointer',
    },
    subtle: {
      background: 'rgba(255, 255, 255, 0.04)',
      border: '1px solid rgba(255, 255, 255, 0.09)',
      boxShadow: 'inset 0 1px 0 0 rgba(255, 255, 255, 0.10), 0 10px 25px -5px rgba(0, 0, 0, 0.5)',
    },
    critical: {
      background: 'linear-gradient(135deg, rgba(244, 63, 94, 0.12) 0%, rgba(244, 63, 94, 0.02) 100%), rgba(24, 8, 14, 0.65)',
      border: '1px solid rgba(244, 63, 94, 0.35)',
      boxShadow: `
        inset 0 1px 0 0 rgba(255, 255, 255, 0.18),
        0 0 35px -8px rgba(244, 63, 94, 0.25),
        0 20px 45px -10px rgba(0, 0, 0, 0.75)
      `,
    },
    success: {
      background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(16, 185, 129, 0.02) 100%), rgba(8, 20, 16, 0.65)',
      border: '1px solid rgba(16, 185, 129, 0.35)',
      boxShadow: `
        inset 0 1px 0 0 rgba(255, 255, 255, 0.20),
        0 0 35px -8px rgba(16, 185, 129, 0.25),
        0 20px 45px -10px rgba(0, 0, 0, 0.75)
      `,
    },
  };

  const lightVariants = {
    default: {
      background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.94) 0%, rgba(248, 250, 252, 0.82) 100%)',
      border: '1px solid rgba(15, 23, 42, 0.09)',
      boxShadow: `
        inset 0 1px 0 0 rgba(255, 255, 255, 1),
        0 12px 32px -6px rgba(15, 23, 42, 0.07),
        0 2px 6px -1px rgba(15, 23, 42, 0.03)
      `,
    },
    glow: {
      background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(240, 245, 255, 0.88) 100%)',
      border: '1px solid rgba(99, 102, 241, 0.30)',
      boxShadow: `
        inset 0 1px 0 0 rgba(255, 255, 255, 1),
        0 0 32px -8px rgba(99, 102, 241, 0.18),
        0 14px 34px -8px rgba(15, 23, 42, 0.08)
      `,
    },
    accent: {
      background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.10) 0%, rgba(240, 245, 255, 0.85) 100%)',
      border: '1px solid rgba(99, 102, 241, 0.30)',
      boxShadow: `
        inset 0 1px 0 0 rgba(255, 255, 255, 1),
        0 0 28px -8px rgba(99, 102, 241, 0.16),
        0 12px 30px -8px rgba(15, 23, 42, 0.07)
      `,
    },
    interactive: {
      background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.96) 0%, rgba(248, 250, 252, 0.88) 100%)',
      border: '1px solid rgba(15, 23, 42, 0.10)',
      boxShadow: `
        inset 0 1px 0 0 rgba(255, 255, 255, 0.95),
        0 8px 24px -4px rgba(15, 23, 42, 0.05)
      `,
      cursor: 'pointer',
    },
    subtle: {
      background: 'rgba(255, 255, 255, 0.72)',
      border: '1px solid rgba(15, 23, 42, 0.06)',
      boxShadow: '0 4px 12px -2px rgba(15, 23, 42, 0.03)',
    },
    critical: {
      background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.06) 0%, rgba(254, 242, 242, 0.85) 100%), #FFFFFF',
      border: '1px solid rgba(239, 68, 68, 0.25)',
      boxShadow: `
        inset 0 1px 0 0 rgba(255, 255, 255, 0.95),
        0 0 28px -8px rgba(239, 68, 68, 0.12),
        0 10px 25px -6px rgba(15, 23, 42, 0.06)
      `,
    },
    success: {
      background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.06) 0%, rgba(236, 253, 245, 0.85) 100%), #FFFFFF',
      border: '1px solid rgba(16, 185, 129, 0.25)',
      boxShadow: `
        inset 0 1px 0 0 rgba(255, 255, 255, 0.95),
        0 0 28px -8px rgba(16, 185, 129, 0.12),
        0 10px 25px -6px rgba(15, 23, 42, 0.06)
      `,
    },
  };

  const variantStyles = isLight ? lightVariants : darkVariants;
  const pad = padding !== undefined ? padding : '24px';
  const currentVariant = variantStyles[variant] || variantStyles.default;
  const isInteractive = hoverEffect || variant === 'interactive' || Boolean(onClick);

  return (
    <div
      className={`glass-card-root ${className}`}
      onClick={onClick}
      style={{
        position: 'relative',
        borderRadius,
        padding: pad,
        backdropFilter: 'blur(24px) saturate(190%)',
        WebkitBackdropFilter: 'blur(24px) saturate(190%)',
        color: 'var(--text-primary)',
        overflow: 'hidden',
        transition: isInteractive ? 'transform 220ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow 220ms ease, border-color 220ms ease' : 'none',
        ...currentVariant,
        ...style,
      }}
      onMouseEnter={(e) => {
        if (isInteractive) {
          e.currentTarget.style.transform = 'translateY(-3px)';
          e.currentTarget.style.borderColor = isLight ? 'rgba(37, 99, 235, 0.45)' : 'rgba(59, 130, 246, 0.45)';
          e.currentTarget.style.boxShadow = isLight
            ? `
              inset 0 1px 0 0 rgba(255, 255, 255, 0.95),
              0 0 32px -6px rgba(37, 99, 235, 0.20),
              0 16px 36px -8px rgba(15, 23, 42, 0.10)
            `
            : `
              inset 0 1px 0 0 rgba(255, 255, 255, 0.28),
              0 0 35px -5px rgba(59, 130, 246, 0.28),
              0 24px 50px -10px rgba(0, 0, 0, 0.8)
            `;
        }
      }}
      onMouseLeave={(e) => {
        if (isInteractive) {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.borderColor = currentVariant.border?.replace('1px solid ', '') || (isLight ? 'rgba(15, 23, 42, 0.08)' : 'rgba(255, 255, 255, 0.12)');
          e.currentTarget.style.boxShadow = currentVariant.boxShadow || '';
        }
      }}
      {...props}
    >
      {/* Subtle Top Spotlight Gradient Cone */}
      {spotlight && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: '20%',
            right: '20%',
            height: '140px',
            background: isLight
              ? 'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(59, 130, 246, 0.08), transparent 80%)'
              : 'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(255, 255, 255, 0.08), transparent 80%)',
            pointerEvents: 'none',
            zIndex: 0,
          }}
        />
      )}

      {/* Content wrapper with relative z-index */}
      <div style={{ position: 'relative', zIndex: 1 }}>{children}</div>
    </div>
  );
}

export default GlassCard;
