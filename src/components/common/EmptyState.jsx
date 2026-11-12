import React from 'react';
import { Sparkles, Plus } from 'lucide-react';

/**
 * Standardized EmptyState Component
 * Displays a luminous frosted container with high-impact typography,
 * explanatory microcopy, and a clear call-to-action.
 */
export function EmptyState({
  icon: Icon = Sparkles,
  title,
  description,
  stamp,
  actionText,
  actionIcon: ActionIcon = Plus,
  onAction,
  secondaryActionText,
  onSecondaryAction,
  style = {},
}) {
  return (
    <div
      className="glass-pod animate-in"
      style={{
        padding: '56px 28px',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        border: '1px dashed var(--border-strong)',
        background: 'radial-gradient(ellipse at top, rgba(59, 130, 246, 0.05) 0%, rgba(18, 20, 28, 0.4) 100%)',
        ...style,
      }}
    >
      {/* Radiant Icon Capsule */}
      <div
        style={{
          width: 58,
          height: 58,
          borderRadius: '50%',
          background: 'var(--accent-subtle)',
          border: '1px solid var(--accent-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 18,
          color: 'var(--accent-primary)',
          boxShadow: '0 4px 20px var(--accent-glow)',
        }}
      >
        <Icon size={26} />
      </div>

      {/* Heading */}
      <h3
        style={{
          fontSize: 18,
          fontWeight: 800,
          fontFamily: 'var(--font-display)',
          letterSpacing: '-0.025em',
          color: 'var(--text-primary)',
          margin: '0 0 8px',
        }}
      >
        {title}
      </h3>

      {/* Description */}
      {description && (
        <p
          style={{
            fontSize: 13,
            color: 'var(--text-secondary)',
            maxWidth: 480,
            lineHeight: 1.6,
            margin: '0 auto 18px',
          }}
        >
          {description}
        </p>
      )}

      {/* Optional Trust / Guarantee Stamp */}
      {stamp && (
        <div className="signature-stamp" style={{ marginBottom: 22 }}>
          {stamp}
        </div>
      )}

      {/* CTA Buttons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
        {actionText && onAction && (
          <button
            type="button"
            onClick={onAction}
            className="btn-agent btn-agent-primary"
            style={{ padding: '10px 20px', fontSize: 13.5 }}
          >
            {ActionIcon && <ActionIcon size={16} />}
            <span>{actionText}</span>
          </button>
        )}

        {secondaryActionText && onSecondaryAction && (
          <button
            type="button"
            onClick={onSecondaryAction}
            className="btn-agent btn-agent-ghost"
            style={{ padding: '10px 18px', fontSize: 13 }}
          >
            <span>{secondaryActionText}</span>
          </button>
        )}
      </div>
    </div>
  );
}

export default EmptyState;
