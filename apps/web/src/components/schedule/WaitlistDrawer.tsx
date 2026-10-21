import React from "react";
import { createPortal } from "react-dom";
import { useOptionalAppLogicContext } from "../../contexts/AppLogicContext";
import {
  type TargetSlotInfo,
  type WaitlistCandidateItem,
  type WaitlistUrgency,
  detectWaitlistUrgency,
  extractPatientPoliteName,
  generateWaitlistOfferMessage,
  openWhatsAppChat,
  openTelegramChat,
} from "./waitlistCancellationEngine";
import { WaitlistQuickAddForm } from "./WaitlistQuickAddForm";
import { WaitlistToolbar } from "./WaitlistToolbar";
import { WaitlistCandidateCard } from "./WaitlistCandidateCard";
import {
  useWaitlistDrawerOperations,
  WAITLIST_SUBJECT,
  waitlistWriteHeaders,
  writeFailureText,
} from "./useWaitlistDrawerOperations";
import { useWaitlistDrawerController } from "./waitlistDrawer/useWaitlistDrawerController";
import { WaitlistDrawerMinimizedCapsule } from "./waitlistDrawer/WaitlistDrawerMinimizedCapsule";
import { WaitlistDrawerSurface } from "./waitlistDrawer/WaitlistDrawerSurface";

export type { TargetSlotInfo, WaitlistCandidateItem, WaitlistUrgency };
export {
  generateWaitlistOfferMessage,
  detectWaitlistUrgency,
  extractPatientPoliteName,
  openWhatsAppChat,
  openTelegramChat,
  WaitlistQuickAddForm,
  WaitlistToolbar,
  WaitlistCandidateCard,
  useWaitlistDrawerOperations,
  waitlistWriteHeaders,
  writeFailureText,
};

export interface WaitlistDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  targetSlot?: TargetSlotInfo | null | undefined;
  onBookSlot?: ((patient: WaitlistCandidateItem, slot: TargetSlotInfo) => Promise<void> | void) | undefined;
  updateNewAppointmentDraft?: ((key: any, value: any) => void) | undefined;
  focusNewAppointmentEditor?: (() => void) | undefined;
  onAppointmentCreated?: (() => void) | undefined;
  dashboard?: any;
  auth?: any;
}

export function WaitlistDrawer(props: WaitlistDrawerProps) {
  const {
    isOpen, onClose, targetSlot, onBookSlot, updateNewAppointmentDraft,
    focusNewAppointmentEditor, onAppointmentCreated, dashboard: propDashboard, auth: propAuth,
  } = props;

  const ctx = useOptionalAppLogicContext();
  const dashboard = propDashboard || ctx?.dashboard;
  const auth = propAuth || ctx?.auth;

  const ops = useWaitlistDrawerOperations({
    isOpen, targetSlot, onBookSlot, updateNewAppointmentDraft,
    focusNewAppointmentEditor, onAppointmentCreated, onClose, dashboard, auth,
  });

  const ctrl = useWaitlistDrawerController({ isOpen, onClose, targetSlot, ops, dashboard });

  if (!isOpen) return null;

  if (ctrl.isMinimized) {
    return (
      <WaitlistDrawerMinimizedCapsule
        itemsCount={ops.items.length}
        targetSlot={targetSlot}
        onExpand={() => ctrl.setIsMinimized(false)}
      />
    );
  }

  const drawerElement = (
    <WaitlistDrawerSurface
      targetSlot={targetSlot}
      ops={ops}
      ctrl={ctrl}
      onClose={onClose}
      updateNewAppointmentDraft={updateNewAppointmentDraft}
      focusNewAppointmentEditor={focusNewAppointmentEditor}
    />
  );

  return typeof document !== "undefined" ? createPortal(drawerElement, document.body) : drawerElement;
}

export default WaitlistDrawer;
