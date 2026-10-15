import React from "react";
import { createPortal } from "react-dom";
import { ScheduleViewModals } from "../view/ScheduleViewModals";
import type { ScheduleModalsLayerProps } from "./types";

export function ScheduleModalsLayer(props: ScheduleModalsLayerProps) {
  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <ScheduleViewModals {...(props as any)} />,
    document.body
  );
}
