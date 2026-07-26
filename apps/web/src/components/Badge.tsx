import React from 'react';

export type BadgeVariant =
  | 'ok'
  | 'success'
  | 'warn'
  | 'warning'
  | 'bad'
  | 'danger'
  | 'error'
  | 'info'
  | 'neutral';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  glass?: boolean;
  pill?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

export function Badge({
  variant = 'neutral',
  glass = false,
  pill = true,
  icon,
  children,
  className = '',
  style,
  ...props
}: BadgeProps) {
  const normalizedVariant =
    variant === 'success'
      ? 'ok'
      : variant === 'warning'
      ? 'warn'
      : variant === 'danger' || variant === 'error'
      ? 'bad'
      : variant;

  const baseClass = `dnt-badge dnt-badge--${normalizedVariant} ${glass ? 'dnt-badge--glass' : ''} ${className}`.trim();

  return (
    <span
      className={baseClass}
      style={{
        borderRadius: pill ? '9999px' : '6px',
        ...style,
      }}
      {...props}
    >
      {icon && (
        <span className="dnt-badge-icon" style={{ display: 'inline-flex', alignItems: 'center' }}>
          {icon}
        </span>
      )}
      <span>{children}</span>
    </span>
  );
}
