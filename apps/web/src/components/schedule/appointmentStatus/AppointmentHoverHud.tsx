import React from "react";
import type { AppointmentStatusPopupProps } from "./types";
import { AppointmentHoverHudDetails } from "./AppointmentHoverHudDetails";
import { AppointmentHoverHudStatusActions } from "./AppointmentHoverHudStatusActions";

export function AppointmentHoverHud(props: AppointmentStatusPopupProps) {
  const { onKeepHover, onCloseHover, isNearRightEdge, isNearBottom } = props;
  const hudRef = React.useRef<HTMLDivElement>(null);
  const [alignRight, setAlignRight] = React.useState(Boolean(isNearRightEdge));
  const [flipUp, setFlipUp] = React.useState(Boolean(isNearBottom));

  React.useEffect(() => {
    if (hudRef.current && typeof window !== "undefined") {
      const rect = hudRef.current.getBoundingClientRect();
      if (!isNearRightEdge && rect.right > window.innerWidth - 16) {
        setAlignRight(true);
      }
      if (!isNearBottom && rect.bottom > window.innerHeight - 16 && rect.top > 320) {
        setFlipUp(true);
      }
    }
  }, [isNearRightEdge, isNearBottom]);

  const rightClass = (isNearRightEdge || alignRight) ? "right-0 left-auto" : "left-0";
  const verticalClass = (isNearBottom || flipUp) ? "bottom-full mb-1.5 top-auto" : "top-full mt-1.5";

  return (
    <div
      ref={hudRef}
      className={`appointment-patient-hover-preview absolute ${verticalClass} ${rightClass} w-[340px] max-w-[calc(100vw-32px)] p-4 rounded-2xl backdrop-blur-md bg-[var(--paper-strong)]/95 border border-[var(--line)] shadow-2xl space-y-3 animate-in fade-in zoom-in-95 duration-150 text-xs text-[var(--ink)] z-[100] pointer-events-auto select-none`}
      style={{ contain: "layout style" }}
      data-testid="timeline-appointment-hover-preview"
      onMouseEnter={onKeepHover}
      onMouseLeave={onCloseHover}
    >
      <AppointmentHoverHudDetails {...props} />
      <AppointmentHoverHudStatusActions {...props} />
    </div>
  );
}
