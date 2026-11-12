import React from 'react';

import { useTheme } from '../../context/ThemeContext';

/**
 * BidKaro GlassBadge Component
 * Premium luminous pill badge with frosted blur, micro-glow, and crisp typography.
 */
export function GlassBadge({
  children,
  variant = 'default', // 'default' | 'accent' | 'success' | 'warn' | 'warning' | 'fail' | 'subtle'
  icon: Icon,
  dot = false,
  size = 'md', // 'sm' | 'md' | 'lg'
  className = '',
  style = {},
  ...props
}) {
  const themeContext = useTheme();
  const isLight = themeContext?.resolvedTheme === 'light';

  const sizeStyles = {
    sm: { padding: '2px 8px', fontSize: 10.5, gap: 5 },
    md: { padding: '4px 12px', fontSize: 11.5, gap: 6 },
    lg: { padding: '6px 16px', fontSize: 13, gap: 8 },
  };

  const darkVariantStyles = {
    default: {
      background: 'rgba(255, 255, 255, 0.05)',
      border: '1px solid rgba(255, 255, 255, 0.12)',
      color: '#E2E8F0',
      boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.1)',
    },
    subtle: {
      background: 'rgba(255, 255, 255, 0.04)',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      color: '#94A3B8',
      boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.08)',
    },
    accent: {
      background: 'rgba(59, 130, 246, 0.12)',
      border: '1px solid rgba(59, 130, 246, 0.32)',
      color: '#93C5FD',
      boxShadow: '0 0 15px rgba(59, 130, 246, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.15)',
    },
    success: {
      background: 'rgba(16, 185, 129, 0.12)',
      border: '1px solid rgba(16, 185, 129, 0.32)',
      color: '#34D399',
      boxShadow: '0 0 15px rgba(16, 185, 129, 0.18), inset 0 1px 0 rgba(255, 255, 255, 0.15)',
    },
    warn: {
      background: 'rgba(245, 158, 11, 0.12)',
      border: '1px solid rgba(245, 158, 11, 0.32)',
      color: '#FBBF24',
      boxShadow: '0 0 15px rgba(245, 158, 11, 0.18), inset 0 1px 0 rgba(255, 255, 255, 0.15)',
    },
    warning: {
      background: 'rgba(245, 158, 11, 0.12)',
      border: '1px solid rgba(245, 158, 11, 0.32)',
      color: '#FBBF24',
      boxShadow: '0 0 15px rgba(245, 158, 11, 0.18), inset 0 1px 0 rgba(255, 255, 255, 0.15)',
    },
    fail: {
      background: 'rgba(239, 68, 68, 0.12)',
      border: '1px solid rgba(239, 68, 68, 0.32)',
      color: '#F87171',
      boxShadow: '0 0 15px rgba(239, 68, 68, 0.18), inset 0 1px 0 rgba(255, 255, 255, 0.15)',
    },
  };

  const lightVariantStyles = {
    default: {
      background: 'rgba(15, 23, 42, 0.05)',
      border: '1px solid rgba(15, 23, 42, 0.12)',
      color: '#1E293B',
      boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.8)',
    },
    subtle: {
      background: 'rgba(15, 23, 42, 0.04)',
      border: '1px solid rgba(15, 23, 42, 0.08)',
      color: '#475569',
      boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.6)',
    },
    accent: {
      background: 'rgba(37, 99, 235, 0.09)',
      border: '1px solid rgba(37, 99, 235, 0.28)',
      color: '#1D4ED8',
      boxShadow: '0 1px 3px rgba(37, 99, 235, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
    },
    success: {
      background: 'rgba(16, 185, 129, 0.10)',
      border: '1px solid rgba(16, 185, 129, 0.28)',
      color: '#047857',
      boxShadow: '0 1px 3px rgba(16, 185, 129, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
    },
    warn: {
      background: 'rgba(245, 158, 11, 0.10)',
      border: '1px solid rgba(245, 158, 11, 0.28)',
      color: '#B45309',
      boxShadow: '0 1px 3px rgba(245, 158, 11, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
    },
    warning: {
      background: 'rgba(245, 158, 11, 0.10)',
      border: '1px solid rgba(245, 158, 11, 0.28)',
      color: '#B45309',
      boxShadow: '0 1px 3px rgba(245, 158, 11, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
    },
    fail: {
      background: 'rgba(239, 68, 68, 0.10)',
      border: '1px solid rgba(239, 68, 68, 0.28)',
      color: '#B91C1C',
      boxShadow: '0 1px 3px rgba(239, 68, 68, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
    },
  };

  const currentSize = sizeStyles[size] || sizeStyles.md;
  const variantStyles = isLight ? lightVariantStyles : darkVariantStyles;
  const currentVariant = variantStyles[variant] || variantStyles.default;

  return (
    <span
      className={`glass-badge ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        borderRadius: 999,
        fontWeight: 600,
        fontFamily: 'var(--font-heading)',
        letterSpacing: '0.02em',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        lineHeight: 1.2,
        ...currentSize,
        ...currentVariant,
        ...style,
      }}
      {...props}
    >
      {dot && (
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: 'currentColor',
            boxShadow: '0 0 8px currentColor',
            display: 'inline-block',
            flexShrink: 0,
          }}
        />
      )}
      {Icon && <Icon size={size === 'sm' ? 11 : size === 'lg' ? 14 : 12} />}
      <span>{children}</span>
    </span>
  );
}

export default GlassBadge;
