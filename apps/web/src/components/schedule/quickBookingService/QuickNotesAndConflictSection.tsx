import { AlertTriangle } from "lucide-react";
import React from "react";
import { showToast } from "../../GlobalToast";
import { SlotConflictModal } from "../SlotConflictModal";
import { QuickPresetChipsBar } from "./QuickPresetChipsBar";
import { QuickStatusSelector } from "./QuickStatusSelector";
import type { QuickBookingServiceSectionProps } from "./types";

export type QuickNotesAndConflictSectionProps = Pick<
  QuickBookingServiceSectionProps,
  | "status"
  | "setStatus"
  | "reason"
  | "setReason"
  | "comment"
  | "setComment"
  | "submitError"
  | "slotConflict"
  | "setSlotConflict"
  | "handleSubmitBooking"
  | "selectedPatientName"
  | "doctors"
  | "doctorUserId"
  | "chairs"
  | "chairId"
  | "setChairId"
  | "startsAtLocal"
  | "setStartsAtLocal"
>;

export function QuickNotesAndConflictSection({
  status,
  setStatus,
  reason,
  setReason,
  comment,
  setComment,
  submitError,
  slotConflict,
  setSlotConflict,
  handleSubmitBooking,
  selectedPatientName,
  doctors,
  doctorUserId,
  chairs,
  chairId,
  setChairId,
  startsAtLocal,
  setStartsAtLocal,
}: QuickNotesAndConflictSectionProps) {
  const handleShiftMinutes = (minutes: number) => {
    if (startsAtLocal) {
      const [datePart, timePart] = startsAtLocal.split("T");
      if (datePart && timePart) {
        const [hStr, mStr] = timePart.split(":");
        const totalMins = (Number(hStr) || 0) * 60 + (Number(mStr) || 0) + minutes;
        const newH = Math.floor(totalMins / 60) % 24;
        const newM = totalMins % 60;
        const newTimeStr = `${String(newH).padStart(2, "0")}:${String(newM).padStart(2, "0")}`;
        const newStart = `${datePart}T${newTimeStr}`;
        setStartsAtLocal(newStart);
        showToast(`Время сдвинуто на +${minutes} мин (${newTimeStr}). Нажмите «Записать на прием».`, "success");
      }
    }
    setSlotConflict(null);
  };

  return (
    <>
      <QuickStatusSelector status={status} setStatus={setStatus} />
      <QuickPresetChipsBar reason={reason} setReason={setReason} comment={comment} setComment={setComment} />

      {submitError && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-1.5" role="alert">
          <AlertTriangle size={14} className="shrink-0" />
          <span>{submitError}</span>
        </div>
      )}

      <SlotConflictModal
        isOpen={Boolean(slotConflict)}
        inline={true}
        onClose={() => setSlotConflict(null)}
        conflictMessage={slotConflict?.message}
        suggestedSlots={slotConflict?.suggestedSlots ?? []}
        patientName={selectedPatientName}
        doctorName={doctors.find((d) => d.id === doctorUserId)?.fullName}
        currentChairName={chairs.find((c) => c.id === chairId)?.name}
        alternativeChairs={chairs.filter((c) => c.id !== chairId).map((c) => ({ id: c.id, name: c.name }))}
        onMoveToChair={(newChairId) => {
          setChairId(newChairId);
          const chName = chairs.find((c) => c.id === newChairId)?.name || newChairId;
          showToast(`Кресло изменено на «${chName}». Нажмите «Записать на прием».`, "success");
          setSlotConflict(null);
        }}
        onShiftMinutes={handleShiftMinutes}
        onOverbook={() => void handleSubmitBooking(undefined, { overbookOverride: true })}
        onSelectSlot={(slotTime) => {
          if (startsAtLocal) {
            const datePrefix = startsAtLocal.slice(0, 11);
            setStartsAtLocal(`${datePrefix}${slotTime}`);
            showToast(`Время изменено на ${slotTime}. Нажмите «Записать на прием» для подтверждения.`, "success");
          }
          setSlotConflict(null);
        }}
      />
    </>
  );
}
