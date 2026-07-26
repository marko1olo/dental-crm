import React from 'react';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  children?: React.ReactNode;
  glass?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  children,
  glass = true,
  className = '',
  style,
}: EmptyStateProps) {
  return (
    <div
      className={`dnt-empty-state ${glass ? 'mode-fit-card glass-panel' : ''} ${className}`.trim()}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '36px 24px',
        borderRadius: '16px',
        background: glass ? 'var(--glass-panel, var(--paper-soft))' : 'var(--paper-soft)',
        backdropFilter: glass ? 'var(--glass-blur, blur(12px))' : 'none',
        WebkitBackdropFilter: glass ? 'var(--glass-blur, blur(12px))' : 'none',
        border: '1px solid var(--glass-border, var(--line))',
        boxShadow: 'var(--shadow-1)',
        color: 'var(--ink)',
        width: '100%',
        boxSizing: 'border-box',
        ...style,
      }}
    >
      {icon && (
        <div
          className="dnt-empty-state-icon"
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '16px',
            background: 'var(--teal-surface, rgba(13, 148, 136, 0.08))',
            color: 'var(--teal-dark, #0d9488)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '16px',
            fontSize: '24px',
          }}
        >
          {icon}
        </div>
      )}
      <h3
        className="dnt-empty-state-title"
        style={{
          fontSize: '16px',
          fontWeight: 700,
          margin: '0 0 8px 0',
          color: 'var(--ink)',
        }}
      >
        {title}
      </h3>
      {description && (
        <p
          className="dnt-empty-state-desc"
          style={{
            fontSize: '13px',
            color: 'var(--muted)',
            margin: '0 0 20px 0',
            maxWidth: '420px',
            lineHeight: 1.5,
          }}
        >
          {description}
        </p>
      )}
      {action && <div className="dnt-empty-state-action">{action}</div>}
      {children}
    </div>
  );
}
