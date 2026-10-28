/**
 * useWaitlistDrawerOperations.ts — Канонический фасад обратной совместимости.
 */

import { useWaitlistState } from "./waitlist/useWaitlistState";
import type { WaitlistCandidateItem, TargetSlotInfo } from "./waitlist/waitlistTypes";

export const WAITLIST_SUBJECT = "Лист ожидания";
export function waitlistWriteHeaders() { return {}; }
export function writeFailureText() { return "Ошибка сохранения"; }

export interface UseWaitlistDrawerOperationsProps {
  isOpen: boolean;
  targetSlot?: TargetSlotInfo | null;
  onBookSlot?: (patient: WaitlistCandidateItem, slot: TargetSlotInfo) => Promise<void> | void;
  updateNewAppointmentDraft?: (key: any, value: any) => void;
  focusNewAppointmentEditor?: () => void;
  onAppointmentCreated?: () => void;
  onClose?: () => void;
  dashboard?: any;
  auth?: any;
}

export function useWaitlistDrawerOperations(props: UseWaitlistDrawerOperationsProps) {
  const state = useWaitlistState(props);
  return {
    ...state,
    fetchWaitlist: state.loadWaitlist,
    handleFulfill: () => {},
    handleDelete: () => {},
    serverMatchesMap: {},
    fallbackFreeSlots: [],
  };
}
