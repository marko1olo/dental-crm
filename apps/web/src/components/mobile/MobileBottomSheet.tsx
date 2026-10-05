/**
 * DENTE Dental CRM — Native iOS Bottom Sheet Drawer (Apple HIG §2.2)
 * Invariants:
 * 1. Rounded top corners: 24px
 * 2. Tactile drag handle: 36x5px centered
 * 3. Natural swipe-down / backdrop tap to dismiss
 * 4. Touch targets >= 44x44px for close button and actions
 * 5. Safe Area Inset bottom padding for sticky CTA footer
 */

import React, { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { triggerHaptic } from "../../native/mobileBridge";
import "./mobileHigPrimitives.css";

export interface MobileBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string | undefined;
  children: React.ReactNode;
  footer?: React.ReactNode | undefined;
  testId?: string | undefined;
}

export const MobileBottomSheet: React.FC<MobileBottomSheetProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  testId = "mobile-bottom-sheet",
}) => {
  const startYRef = useRef<number | null>(null);
  const currentYRef = useRef<number>(0);
  const surfaceRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      triggerHaptic("selection");
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Touch drag-down gesture handling for tactile dismissal
  const handleTouchStart = (e: React.TouchEvent) => {
    startYRef.current = e.touches[0]?.clientY ?? null;
    currentYRef.current = 0;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (startYRef.current === null || !surfaceRef.current) return;
    const currentY = e.touches[0]?.clientY ?? 0;
    const deltaY = currentY - startYRef.current;
    if (deltaY > 0) {
      currentYRef.current = deltaY;
      surfaceRef.current.style.transform = `translateY(${deltaY}px)`;
    }
  };

  const handleTouchEnd = () => {
    if (surfaceRef.current) {
      if (currentYRef.current > 100) {
        triggerHaptic("light");
        onClose();
      } else {
        surfaceRef.current.style.transform = "translateY(0px)";
        surfaceRef.current.style.transition = "transform 0.2s cubic-bezier(0.2, 0.9, 0.3, 1)";
        setTimeout(() => {
          if (surfaceRef.current) surfaceRef.current.style.transition = "";
        }, 200);
      }
    }
    startYRef.current = null;
    currentYRef.current = 0;
  };

  if (!isOpen) return null;

  return (
    <div
      className="mobile-bottom-sheet-backdrop"
      onClick={onClose}
      role="presentation"
      data-testid={testId}
    >
      <div
        ref={surfaceRef}
        className="mobile-bottom-sheet-surface"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mobile-sheet-title"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Tactile Drag Handle */}
        <div
          className="mobile-drag-handle-wrap"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          aria-hidden="true"
        >
          <div className="mobile-drag-handle" />
        </div>

        {/* 1-Row Header */}
        <div className="mobile-bottom-sheet-header">
          <div className="min-w-0 flex-1 pr-2">
            <h3 id="mobile-sheet-title" className="mobile-bottom-sheet-title">
              {title}
            </h3>
            {subtitle && (
              <p className="text-xs text-[var(--muted,#64748b)] truncate mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
          <button
            type="button"
            className="mobile-bottom-sheet-close"
            onClick={() => {
              triggerHaptic("light");
              onClose();
            }}
            aria-label="Закрыть"
            data-testid={`${testId}-close-btn`}
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="mobile-bottom-sheet-body">
          {children}
        </div>

        {/* Sticky Action Footer */}
        {footer && (
          <div className="mobile-bottom-sheet-footer">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
