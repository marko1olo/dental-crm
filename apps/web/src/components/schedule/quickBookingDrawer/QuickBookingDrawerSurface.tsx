import React from "react";
import { QuickBookingDrawerHeader } from "../QuickBookingDrawerHeader";
import { QuickBookingDrawerFooter } from "../QuickBookingDrawerFooter";
import { QuickBookingDrawerBody } from "./QuickBookingDrawerBody";
import type { QuickBookingDrawerProps } from "../QuickBookingDrawerTypes";
import type { QuickBookingDrawerState } from "../useQuickBookingDrawerState";

export interface QuickBookingDrawerSurfaceProps {
  props: QuickBookingDrawerProps;
  state: QuickBookingDrawerState;
  isMobile: boolean;
  isEmergencyMode: boolean;
  onKeyDown: (e: React.KeyboardEvent) => void;
}

export function QuickBookingDrawerSurface({
  props,
  state,
  isMobile,
  isEmergencyMode,
  onKeyDown,
}: QuickBookingDrawerSurfaceProps) {
  const { initialSlot } = props;
  const {
    currentChair,
    startsAtLocal,
    durationMinutes,
    isSubmitting,
    collision,
    isDirty,
    handleDiscardDraftAndClose,
    handleRequestClose,
    handleSubmitBooking,
    handleCopyBookingConfirmation,
  } = state;

  return (
    <div
      className={`fixed inset-0 z-[10005] flex ${isMobile ? "flex-col justify-end" : "justify-end"} bg-black/25 transition-opacity quick-booking-drawer-overlay`}
      data-testid="quick-booking-drawer"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.25)" }}
      onKeyDown={onKeyDown}
      role="dialog"
      aria-modal="true"
      aria-label="Быстрая запись на прием"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        onClick={handleRequestClose}
        aria-label="Закрыть быструю запись"
      />

      <div
        className={`relative w-full bg-[var(--paper)] flex flex-col z-10 text-[var(--ink)] overflow-hidden ${
          isMobile
            ? "max-h-[92dvh] rounded-t-[24px] border-t border-[var(--line)] shadow-[0_-12px_40px_rgba(0,0,0,0.25)] animate-slide-up"
            : "sm:w-[450px] sm:max-w-[450px] h-full border-l border-[var(--line)] shadow-2xl animate-slide-in"
        }`}
      >
        {isMobile && (
          <div
            className="w-full flex items-center justify-center pt-3 pb-1 shrink-0 bg-[var(--paper-soft)] cursor-grab active:cursor-grabbing border-b border-[var(--line-subtle,#e2e8f0)]/30"
            aria-hidden="true"
          >
            <div className="w-10 h-1.5 rounded-full bg-[var(--muted)]/40 hover:bg-[var(--muted)]/60 transition-colors" />
          </div>
        )}

        <QuickBookingDrawerHeader
          isEmergencyMode={isEmergencyMode}
          isEditing={state.isEditing}
          startsAtLocal={startsAtLocal}
          durationMinutes={durationMinutes}
          chairName={currentChair?.name || initialSlot?.chairName}
          onClose={handleRequestClose}
        />

        <QuickBookingDrawerBody state={state} props={props} />

        <QuickBookingDrawerFooter
          isSubmitting={isSubmitting}
          hasCollision={collision.hasCollision}
          isDirty={isDirty}
          onSubmit={() => void handleSubmitBooking(undefined, collision.hasCollision ? { overbookOverride: true } : undefined)}
          onRequestClose={handleRequestClose}
          onDiscardDraft={handleDiscardDraftAndClose}
          onCopyConfirmation={handleCopyBookingConfirmation}
        />
      </div>
    </div>
  );
}
