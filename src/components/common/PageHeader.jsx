import React from 'react';
import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

/**
 * Standardized PageHeader Component
 * Ensures uniform visual hierarchy, typography, and action layout across all app pages.
 */
export function PageHeader({
  title,
  flourishText,
  subtitle,
  badge,
  breadcrumbs,
  actions,
  style = {},
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        marginBottom: 24,
        gap: 16,
        flexWrap: 'wrap',
        ...style,
      }}
    >
      <div style={{ flex: '1 1 320px', minWidth: 0 }}>
        {/* Optional Breadcrumb Trail */}
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 11.5,
              fontWeight: 500,
              color: 'var(--text-tertiary)',
              marginBottom: 8,
            }}
          >
            {breadcrumbs.map((crumb, idx) => (
              <React.Fragment key={crumb.label}>
                {idx > 0 && <ChevronRight size={12} color="var(--text-tertiary)" />}
                {crumb.to ? (
                  <Link
                    to={crumb.to}
                    style={{
                      color: 'var(--text-secondary)',
                      textDecoration: 'none',
                      transition: 'color 120ms ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent-primary)')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{crumb.label}</span>
                )}
              </React.Fragment>
            ))}
          </nav>
        )}

        {/* Title + Flourish */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <h1
            style={{
              fontSize: 24,
              fontWeight: 600,
              fontFamily: 'var(--font-display)',
              letterSpacing: '-0.02em',
              color: 'var(--text-primary)',
              margin: 0,
              lineHeight: 1.25,
            }}
          >
            {title}{' '}
            {flourishText && (
              <span
                style={{
                  fontFamily: 'var(--font-roman)',
                  fontStyle: 'italic',
                  fontWeight: 400,
                  color: 'var(--accent-primary-light, #c7d2fe)',
                  marginLeft: 4,
                }}
              >
                {flourishText}
              </span>
            )}
          </h1>

          {badge && <div>{badge}</div>}
        </div>

        {/* Subtitle / Description */}
        {subtitle && (
          <p
            style={{
              fontSize: 13.5,
              color: 'var(--text-secondary)',
              fontFamily: 'var(--font-sans)',
              margin: '6px 0 0',
              lineHeight: 1.55,
              maxWidth: 720,
            }}
          >
            {subtitle}
          </p>
        )}
      </div>

      {/* Action Buttons / Telemetry Pills */}
      {actions && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            flexShrink: 0,
            flexWrap: 'wrap',
          }}
        >
          {actions}
        </div>
      )}
    </div>
  );
}

export default PageHeader;
