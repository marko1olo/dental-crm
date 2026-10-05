/**
 * DENTE Dental CRM — iOS Grouped Inset List (Apple Health / Settings HIG §2.3)
 * Invariants:
 * 1. Single card container with 16px radius, var(--paper) background and 1px var(--line)
 * 2. Min-height >= 52px for each item
 * 3. 32x32px leading icon in rounded box, 15px semibold title, 13px muted subtitle
 * 4. Trailing badge/amount + ChevronRight
 * 5. Touch targets >= 44x44px with triggerHaptic
 */

import React from "react";
import { ChevronRight } from "lucide-react";
import { triggerHaptic } from "../../native/mobileBridge";
import "./mobileHigPrimitives.css";

export interface MobileGroupedListProps {
  label?: string | undefined;
  children: React.ReactNode;
  className?: string | undefined;
  testId?: string | undefined;
}

export const MobileGroupedList: React.FC<MobileGroupedListProps> = ({
  label,
  children,
  className = "",
  testId = "mobile-grouped-list",
}) => {
  return (
    <div className={`mobile-grouped-list-section ${className}`} data-testid={testId}>
      {label && <div className="mobile-grouped-list-label">{label}</div>}
      <div className="mobile-grouped-list-card">
        {children}
      </div>
    </div>
  );
};

export interface MobileGroupedListItemProps {
  title: string;
  subtitle?: string | undefined;
  icon?: React.ReactNode | undefined;
  trailing?: React.ReactNode | undefined;
  showChevron?: boolean | undefined;
  onClick?: (() => void) | undefined;
  testId?: string | undefined;
}

export const MobileGroupedListItem: React.FC<MobileGroupedListItemProps> = ({
  title,
  subtitle,
  icon,
  trailing,
  showChevron = true,
  onClick,
  testId,
}) => {
  const isClickable = Boolean(onClick);

  const handleClick = () => {
    if (onClick) {
      triggerHaptic("selection");
      onClick();
    }
  };

  return (
    <div
      className={`mobile-grouped-list-item ${isClickable ? "is-clickable" : ""}`}
      onClick={handleClick}
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={
        isClickable
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleClick();
              }
            }
          : undefined
      }
      data-testid={testId}
    >
      {icon && <div className="mobile-item-leading-icon">{icon}</div>}

      <div className="mobile-item-content">
        <div className="mobile-item-title">{title}</div>
        {subtitle && <div className="mobile-item-subtitle">{subtitle}</div>}
      </div>

      <div className="mobile-item-trailing">
        {trailing}
        {isClickable && showChevron && (
          <ChevronRight size={18} className="text-[var(--muted,#64748b)] shrink-0" />
        )}
      </div>
    </div>
  );
};
