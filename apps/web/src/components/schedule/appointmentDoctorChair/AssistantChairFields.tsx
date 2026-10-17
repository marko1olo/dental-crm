import React from "react";
import { DEFAULT_SOLO_CHAIR } from "../ScheduleGrid";
import { resolveChairDutyDoctor } from "../QuickBookingDrawer";
import type { ChairDoctorShiftAssignment } from "../ScheduleGrid";

export function AssistantChairFields({
  hideAssistant,
  isSoloDoctor,
  assistantUserId,
  setAssistantUserId,
  assistants,
  chairId,
  setChairId,
  chairs,
  startsAtLocal,
  chairDoctorAssignments,
  doctorUserId,
  dutyDoctorId,
  setDoctorUserId,
}: {
  hideAssistant: boolean;
  isSoloDoctor: boolean;
  assistantUserId: string | null;
  setAssistantUserId: (id: string | null) => void;
  assistants: Array<{ id: string; fullName: string }>;
  chairId: string;
  setChairId: (id: string) => void;
  chairs: Array<{ id: string; name: string; specialization?: string | null | undefined }>;
  startsAtLocal: string;
  chairDoctorAssignments?: Record<string, ChairDoctorShiftAssignment> | undefined;
  doctorUserId: string;
  dutyDoctorId: string | null;
  setDoctorUserId: (id: string) => void;
}) {
  return (
    <>
      {!hideAssistant && !isSoloDoctor && (
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] flex items-center justify-between mb-1">
            <span>Ассистент</span>
            <span className="text-[10px] text-[var(--muted)] font-normal">Опционально</span>
          </label>
          <select
            value={assistantUserId || ""}
            onChange={(e) => setAssistantUserId(e.target.value || null)}
            className="w-full px-3 h-9 rounded-xl border border-[var(--line-strong)] bg-[var(--paper-soft)] text-[var(--ink)] text-xs sm:text-sm outline-none focus:ring-2 focus:ring-[var(--teal)] cursor-pointer"
            data-testid="select-appointment-assistant"
          >
            <option value="">-- Без ассистента (соло-приём) --</option>
            {assistants.map((a) => (
              <option key={a.id} value={a.id}>
                {a.fullName}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="sm:col-span-2">
        <label className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] block mb-1">
          Кресло / Кабинет {chairs.length <= 1 ? "(авто)" : "*"}
        </label>
        <select
          value={chairId}
          onChange={(e) => {
            const nextChairId = e.target.value;
            setChairId(nextChairId);
            if (nextChairId && startsAtLocal) {
              const duty = resolveChairDutyDoctor(
                nextChairId,
                startsAtLocal,
                chairDoctorAssignments,
                startsAtLocal.slice(0, 10),
              );
              if (duty.doctorId && (!doctorUserId || doctorUserId === dutyDoctorId)) {
                setDoctorUserId(duty.doctorId);
              }
            }
          }}
          className="w-full px-3 h-9 rounded-xl border border-[var(--line-strong)] bg-[var(--paper-soft)] text-[var(--ink)] text-xs sm:text-sm outline-none focus:ring-2 focus:ring-[var(--teal)] cursor-pointer"
          data-testid="select-appointment-chair"
        >
          {chairs.length === 0 ? (
            <option value={DEFAULT_SOLO_CHAIR.id}>
              {DEFAULT_SOLO_CHAIR.name} (Основное)
            </option>
          ) : (
            chairs.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))
          )}
        </select>
      </div>
    </>
  );
}
