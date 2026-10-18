import { CalendarCheck } from "lucide-react";
import React from "react";
import { showToast } from "../../GlobalToast";
import { resolveChairDutyDoctor } from "../chairRosterMath";
import { DEFAULT_SOLO_CHAIR, formatDoctorShortName } from "../ScheduleGrid";
import { QuickDoctorSelector } from "./QuickDoctorSelector";
import { QuickAssistantSelector } from "./QuickAssistantSelector";
import type { QuickBookingServiceSectionProps } from "./types";

export type QuickResourceAllocationSectionProps = Pick<
  QuickBookingServiceSectionProps,
  | "chairId"
  | "setChairId"
  | "chairs"
  | "startsAtLocal"
  | "chairDoctorAssignments"
  | "isSoloClinic"
  | "doctors"
  | "doctorUserId"
  | "setDoctorUserId"
  | "dutyDoc"
  | "dutyDoctorHours"
  | "currentChair"
  | "assistantUserId"
  | "setAssistantUserId"
  | "assistants"
>;

export function QuickResourceAllocationSection({
  chairId,
  setChairId,
  chairs,
  startsAtLocal,
  chairDoctorAssignments,
  isSoloClinic,
  doctors,
  doctorUserId,
  setDoctorUserId,
  dutyDoc,
  dutyDoctorHours,
  currentChair,
  assistantUserId,
  setAssistantUserId,
  assistants,
}: QuickResourceAllocationSectionProps) {
  const handleChairChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nextChairId = e.target.value;
    setChairId(nextChairId);
    if (!nextChairId) return;
    const targetChair =
      chairs.find((c) => c.id === nextChairId) ||
      (nextChairId === DEFAULT_SOLO_CHAIR.id ? DEFAULT_SOLO_CHAIR : null);
    const duty = resolveChairDutyDoctor(
      nextChairId,
      startsAtLocal,
      chairDoctorAssignments,
      startsAtLocal ? startsAtLocal.slice(0, 10) : undefined,
      null,
      (targetChair as any)?.defaultDoctorId || (isSoloClinic && doctors[0] ? doctors[0].id : null),
    );
    if (duty.doctorId) {
      setDoctorUserId(duty.doctorId);
      const newDoc = doctors.find((d) => d.id === duty.doctorId);
      if (newDoc) {
        showToast(
          `Дежурный врач: ${formatDoctorShortName(newDoc.fullName)} (${targetChair?.name || "Кресло"}, ${duty.shiftHours})`,
          "info",
          3000,
        );
      }
    }
  };

  return (
    <div className="space-y-3 pt-1">
      <label className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] flex items-center gap-1.5">
        <CalendarCheck size={14} className="text-[var(--teal)]" />
        <span>Кабинет и персонал *</span>
      </label>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <span className="text-xs font-semibold text-[var(--muted)] block mb-1">Кресло / Кабинет</span>
          <select
            value={chairId}
            onChange={handleChairChange}
            className="w-full px-3 py-2 h-11 min-h-[44px] leading-normal rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] text-sm outline-none focus:ring-2 focus:ring-[var(--teal)] cursor-pointer"
            data-testid="select-booking-chair"
          >
            {chairs.length === 0 ? (
              <option value={DEFAULT_SOLO_CHAIR.id}>{DEFAULT_SOLO_CHAIR.name} (Основное)</option>
            ) : (
              chairs.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))
            )}
          </select>
        </div>
        <QuickDoctorSelector
          doctorUserId={doctorUserId}
          setDoctorUserId={setDoctorUserId}
          doctors={doctors}
          dutyDoc={dutyDoc}
          dutyDoctorHours={dutyDoctorHours}
          currentChair={currentChair}
        />
        <QuickAssistantSelector
          isSoloClinic={isSoloClinic}
          assistantUserId={assistantUserId}
          setAssistantUserId={setAssistantUserId}
          assistants={assistants}
        />
      </div>
    </div>
  );
}
