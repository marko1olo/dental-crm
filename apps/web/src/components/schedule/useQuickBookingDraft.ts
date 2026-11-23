import { useCallback, useMemo } from "react";
import { safeLocalStorageRemoveItem } from "../../lib/safeLocalStorage";
import type { QuickBookingAppointmentType } from "./patientReliabilityScore";
import type { QuickBookingSlotInfo } from "./QuickBookingDrawerTypes";
import type { useQuickBookingPatientSearch } from "./useQuickBookingPatientSearch";

export interface UseQuickBookingDraftParams {
  comment: string;
  reason: string;
  initialSlot: QuickBookingSlotInfo | null | undefined;
  patientSearch: ReturnType<typeof useQuickBookingPatientSearch>;
  appointmentType: QuickBookingAppointmentType;
  doctorUserId: string;
  assistantUserId: string | null;
  chairId: string;
  startsAtLocal: string;
  durationMinutes: number;
  onClose: () => void;
}

export function useQuickBookingDraft({
  comment, reason, initialSlot, patientSearch,
  onClose,
}: UseQuickBookingDraftParams) {
  const isDirty = useMemo(() => {
    if (comment.trim().length > 0) return true;
    if (patientSearch.newPatientFullName.trim().length > 0 || patientSearch.newPatientPhone.trim().length > 0) return true;
    if (patientSearch.patientId && patientSearch.patientId !== (initialSlot?.patientId || "")) return true;
    if (patientSearch.searchQuery.trim().length > 0 && patientSearch.searchQuery.trim() !== (initialSlot?.patientName || initialSlot?.patientPhone || "")) return true;
    if (initialSlot?.patientPhone && patientSearch.newPatientPhone.trim().length > 0) return true;
    const initialReason = initialSlot?.reason || (initialSlot?.isCitoEmergency ? "Срочно! Острая боль" : "Первичный осмотр");
    return reason.trim() !== initialReason.trim();
  }, [comment, patientSearch.newPatientFullName, patientSearch.newPatientPhone, patientSearch.patientId, patientSearch.searchQuery, initialSlot, reason]);

  // Mandate 8bn / 8zq (Zero-Leak Draft & Stale Draft Purge):
  // При закрытии шторки по Escape/Отмена/Backdrop — обязательный сброс локального черновика,
  // предотвращающий утечку данных прошлого пациента следующему.
  const purgeDraftState = useCallback(() => {
    safeLocalStorageRemoveItem("dente_quick_booking_draft");
    try {
      if (typeof globalThis !== "undefined" && globalThis.localStorage) {
        globalThis.localStorage.removeItem("dente_quick_booking_draft");
      }
    } catch (err: unknown) {
      console.warn("[useQuickBookingDraft] Failed to purge storage draft:", err);
    }
    patientSearch.setSelectedPatient(null);
    patientSearch.setPatientId("");
    patientSearch.setSearchQuery("");
    patientSearch.setShowInlineNewPatient(false);
    patientSearch.setNewPatientFullName("");
    patientSearch.setNewPatientPhone("");
    patientSearch.setNewPatientBirthDate("");
  }, [patientSearch]);

  const handleDiscardDraftAndClose = useCallback(() => {
    purgeDraftState();
    onClose();
  }, [purgeDraftState, onClose]);

  const handleSaveDraftAndClose = useCallback(() => {
    purgeDraftState();
    onClose();
  }, [purgeDraftState, onClose]);

  const handleRequestClose = useCallback(() => {
    purgeDraftState();
    onClose();
  }, [purgeDraftState, onClose]);

  return { isDirty, handleSaveDraftAndClose, handleDiscardDraftAndClose, handleRequestClose };
}
