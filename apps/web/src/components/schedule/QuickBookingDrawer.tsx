import React from "react";
import { createPortal } from "react-dom";
import { resolveChairDutyDoctor } from "./chairRosterMath";
import type {
  QuickBookingDrawerProps,
  QuickBookingSlotInfo,
} from "./QuickBookingDrawerTypes";
import { useQuickBookingDrawerState } from "./useQuickBookingDrawerState";
import { useUiSurfaceStore } from "../../store/uiSurfaceStore";
import { useIsMobile } from "../../hooks/useIsMobile";
import { QuickBookingDrawerSurface } from "./quickBookingDrawer/QuickBookingDrawerSurface";

export { resolveChairDutyDoctor };
export type { QuickBookingDrawerProps, QuickBookingSlotInfo };

export function QuickBookingDrawer(props: QuickBookingDrawerProps) {
  const { isOpen, initialSlot } = props;
  const isMobile = useIsMobile();
  const state = useQuickBookingDrawerState(props);

  const isEmergencyMode =
    state.appointmentType === "emergency" ||
    Boolean(
      initialSlot?.isCitoEmergency ||
        initialSlot?.reason?.includes("CITO") ||
        initialSlot?.reason?.includes("Острая боль"),
    );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      state.handleRequestClose();
    } else if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      void state.handleSubmitBooking();
    }
  };

  const isFullScreenStudioActive = useUiSurfaceStore(
    (s) => s.isFullScreenStudioActive,
  );
  if (!isOpen || isFullScreenStudioActive) return null;

  const drawerElement = (
    <QuickBookingDrawerSurface
      props={props}
      state={state}
      isMobile={isMobile}
      isEmergencyMode={isEmergencyMode}
      onKeyDown={handleKeyDown}
    />
  );

  return typeof document !== "undefined" && document.body
    ? createPortal(drawerElement, document.body)
    : drawerElement;
}
