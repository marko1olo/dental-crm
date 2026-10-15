import { useCallback, useMemo } from "react";
import { safeLocalStorageSetJson, safeLocalStorageRemoveItem } from "../../lib/safeLocalStorage";
import { showToast } from "../GlobalToast";
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
  comment, reason, initialSlot, patientSearch, appointmentType,
  doctorUserId, assistantUserId, chairId, startsAtLocal, durationMinutes, onClose,
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

  const handleSaveDraftAndClose = useCallback(() => {
    try {
      const draftData = {
        appointmentType, patientId: patientSearch.patientId, selectedPatient: patientSearch.selectedPatient,
        doctorUserId, assistantUserId, chairId, startsAtLocal, durationMinutes, reason, comment, savedAt: new Date().toISOString(),
      };
      safeLocalStorageSetJson("dente_quick_booking_draft", draftData, true);
      showToast("Черновик записи сохранен", "info");
    } catch {}
    onClose();
  }, [appointmentType, patientSearch.patientId, patientSearch.selectedPatient, doctorUserId, assistantUserId, chairId, startsAtLocal, durationMinutes, reason, comment, onClose]);

  const handleDiscardDraftAndClose = useCallback(() => {
    safeLocalStorageRemoveItem("dente_quick_booking_draft");
    onClose();
  }, [onClose]);

  const handleRequestClose = useCallback(() => {
    if (isDirty) handleSaveDraftAndClose();
    else onClose();
  }, [isDirty, handleSaveDraftAndClose, onClose]);

  return { isDirty, handleSaveDraftAndClose, handleDiscardDraftAndClose, handleRequestClose };
}
