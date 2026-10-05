/**
 * DENTE Dental CRM — Natural Thumb Zone Floating Bottom Bar (Apple HIG §2.1)
 * Invariants:
 * 1. Sticky to screen bottom with backdrop blur 20px
 * 2. Strict Safe Area Inset bottom padding
 * 3. 52px Primary CTA button across bottom width
 * 4. Optional secondary action button (52x52px)
 * 5. Haptic feedback on press
 */

import React from "react";
import { triggerHaptic } from "../../native/mobileBridge";
import "./mobileHigPrimitives.css";

export interface MobileFloatingBottomBarProps {
  primaryLabel: string;
  onPrimaryClick: () => void;
  primaryIcon?: React.ReactNode | undefined;
  primaryDisabled?: boolean | undefined;
  secondaryAction?: React.ReactNode | undefined;
  extraContent?: React.ReactNode | undefined;
  className?: string | undefined;
  testId?: string | undefined;
}

export const MobileFloatingBottomBar: React.FC<MobileFloatingBottomBarProps> = ({
  primaryLabel,
  onPrimaryClick,
  primaryIcon,
  primaryDisabled = false,
  secondaryAction,
  extraContent,
  className = "",
  testId = "mobile-floating-bottom-bar",
}) => {
  const handlePrimaryPress = () => {
    if (!primaryDisabled) {
      triggerHaptic("medium");
      onPrimaryClick();
    }
  };

  return (
    <div className={`mobile-floating-bottom-bar ${className}`} data-testid={testId}>
      {secondaryAction}

      <button
        type="button"
        className="mobile-primary-cta"
        onClick={handlePrimaryPress}
        disabled={primaryDisabled}
        data-testid={`${testId}-primary-cta`}
      >
        {primaryIcon}
        <span>{primaryLabel}</span>
      </button>

      {extraContent}
    </div>
  );
};
