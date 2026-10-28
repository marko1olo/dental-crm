/**
 * WaitlistQuickFillModal.tsx — Канонический фасад обратной совместимости (Мандат 8b: <40 строк).
 * Полная реализация перенесена в SSOT: ./waitlist/WaitlistDrawer.tsx
 */

import React from "react";
import { WaitlistDrawer, type WaitlistDrawerProps } from "./waitlist/WaitlistDrawer";
import type { TargetSlotInfo, WaitlistPatientEntry } from "./waitlist/waitlistTypes";

export * from "./waitlist/waitlistTypes";
export interface WaitlistQuickFillModalProps extends WaitlistDrawerProps {}

export function WaitlistQuickFillModal(props: WaitlistQuickFillModalProps) {
  return <WaitlistDrawer {...props} />;
}

export default WaitlistQuickFillModal;
