/**
 * DENTE Dental CRM — iOS Sovereign Mobile Top Bar (Apple HIG §1.2)
 * Invariants:
 * 1. Strictly 1-row layout: no multi-tier button landfills
 * 2. Safe Area Inset top protection (iPhone Dynamic Island / Notch)
 * 3. 44x44px touch-target action buttons
 * 4. Center-aligned truncated title
 */

import React from "react";
import { ChevronLeft } from "lucide-react";
import { triggerHaptic } from "../../native/mobileBridge";
import "./mobileHigPrimitives.css";

export interface MobileTopBarProps {
  title: string;
  subtitle?: string | undefined;
  onBack?: (() => void) | undefined;
  backAriaLabel?: string | undefined;
  trailingAction?: React.ReactNode | undefined;
  leadingAction?: React.ReactNode | undefined;
  className?: string | undefined;
  testId?: string | undefined;
}

export const MobileTopBar: React.FC<MobileTopBarProps> = ({
  title,
  subtitle,
  onBack,
  backAriaLabel = "Назад",
  trailingAction,
  leadingAction,
  className = "",
  testId = "mobile-top-bar",
}) => {
  const handleBack = () => {
    if (onBack) {
      triggerHaptic("light");
      onBack();
    }
  };

  return (
    <header className={`mobile-top-bar ${className}`} data-testid={testId}>
      {/* Leading Slot: Back Button or Custom Action */}
      <div className="flex items-center min-w-[44px]">
        {leadingAction ? (
          leadingAction
        ) : onBack ? (
          <button
            type="button"
            className="mobile-top-bar-action"
            onClick={handleBack}
            aria-label={backAriaLabel}
            data-testid={`${testId}-back-btn`}
          >
            <ChevronLeft size={24} />
          </button>
        ) : (
          <div className="w-[44px]" />
        )}
      </div>

      {/* Center Slot: Title & Subtitle */}
      <div className="min-w-0 flex-1 text-center px-1">
        <h1 className="mobile-top-bar-title">{title}</h1>
        {subtitle && (
          <div className="text-[12px] text-[var(--muted,#64748b)] truncate leading-tight">
            {subtitle}
          </div>
        )}
      </div>

      {/* Trailing Slot */}
      <div className="flex items-center justify-end min-w-[44px]">
        {trailingAction || <div className="w-[44px]" />}
      </div>
    </header>
  );
};
