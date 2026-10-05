/**
 * DENTE Dental CRM — iOS Segmented Control (Apple HIG §4.1)
 * Invariants:
 * 1. Single background track with rounded corners
 * 2. Active pill indicator with subtle elevation
 * 3. Min-height >= 40-44px for reliable thumb tapping
 * 4. Haptic feedback on change
 */

import React from "react";
import { triggerHaptic } from "../../native/mobileBridge";
import "./mobileHigPrimitives.css";

export interface MobileSegmentOption<T extends string = string> {
  id: T;
  label: string;
  icon?: React.ReactNode | undefined;
  badge?: number | string | undefined;
}

export interface MobileSegmentedControlProps<T extends string = string> {
  options: MobileSegmentOption<T>[];
  activeId: T;
  onChange: (id: T) => void;
  className?: string | undefined;
  testId?: string | undefined;
}

export function MobileSegmentedControl<T extends string = string>({
  options,
  activeId,
  onChange,
  className = "",
  testId = "mobile-segmented-control",
}: MobileSegmentedControlProps<T>): React.JSX.Element {
  const handleSelect = (id: T) => {
    if (id !== activeId) {
      triggerHaptic("selection");
      onChange(id);
    }
  };

  return (
    <div
      className={`mobile-segmented-control ${className}`}
      role="tablist"
      aria-label="Переключатель разделов"
      data-testid={testId}
    >
      {options.map((option) => {
        const isActive = option.id === activeId;
        return (
          <button
            key={option.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={`mobile-segmented-button ${isActive ? "is-active" : ""}`}
            onClick={() => handleSelect(option.id)}
            data-testid={`${testId}-opt-${option.id}`}
          >
            {option.icon}
            <span>{option.label}</span>
            {option.badge !== undefined && (
              <span
                className={`ml-1 text-[11px] px-1.5 py-0.5 rounded-full ${
                  isActive
                    ? "bg-[var(--teal,#0d9488)] text-white"
                    : "bg-[var(--line,#e2e8f0)] text-[var(--muted,#64748b)]"
                }`}
              >
                {option.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
