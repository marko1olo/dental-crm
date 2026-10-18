import React from "react";
import { Sparkles } from "lucide-react";
import type { DoctorFreeSlot } from "../doctorFreeSlotsEngine";
import type { useDoctorFreeSlotsController } from "./useDoctorFreeSlotsController";

export interface DoctorFreeSlotsResultsProps {
  ctrl: ReturnType<typeof useDoctorFreeSlotsController>;
  onSelectSlot: (slot: DoctorFreeSlot) => void;
  onClose: () => void;
}

export function DoctorFreeSlotsResults({
  ctrl,
  onSelectSlot,
  onClose,
}: DoctorFreeSlotsResultsProps) {
  const { totalSlotsCount, freeSlotsByDay, staffDoctors, selectedDoctorId, selectedDoctor } = ctrl;

  if (totalSlotsCount === 0) {
    return (
      <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-3.5 [scrollbar-width:thin]">
        <div className="py-12 text-center text-[var(--muted,#64748b)] space-y-2">
          <Sparkles className="w-8 h-8 mx-auto text-slate-400 opacity-60" />
          <p className="text-sm font-medium">Нет свободных окон по заданным критериям.</p>
          <p className="text-xs">Попробуйте уменьшить длительность приёма или выбрать другой диапазон дат.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-3.5 [scrollbar-width:thin]">
      {freeSlotsByDay.map((day) => (
        <div
          key={day.date}
          className={`p-3.5 rounded-2xl border space-y-2.5 ${
            day.isDayOff
              ? "bg-[var(--paper-soft,#f8fafc)]/60 border-[var(--line,#e2e8f0)] opacity-75"
              : "bg-[var(--paper-soft,#f8fafc)] border-[var(--line,#e2e8f0)]"
          }`}
        >
          <div className="flex items-center justify-between border-b border-[var(--line,#e2e8f0)] pb-1.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[var(--ink,#0f172a)]">
                {day.dateFormatted}
              </span>
              {day.isDayOff && (
                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                  {day.dayOffReason || "Выходной"}
                </span>
              )}
            </div>
            <span className="text-[11px] font-semibold text-[var(--teal-dark,var(--teal))]">
              {day.isDayOff ? "—" : `Свободно окон: ${day.slots.length}`}
            </span>
          </div>

          {day.isDayOff ? (
            <div className="py-1.5 text-xs text-[var(--muted,#64748b)] italic">
              Приём не ведётся в этот день
            </div>
          ) : day.slots.length === 0 ? (
            <div className="py-1.5 text-xs text-[var(--muted,#64748b)] italic">
              Все окна на этот день заняты
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2">
              {day.slots.map((slot, sIdx) => {
                const slotDoc = staffDoctors.find((d) => d.id === slot.doctorId);
                return (
                  <button
                    key={`${slot.date}-${slot.startTime}-${slot.chairId}-${sIdx}`}
                    type="button"
                    onClick={() => {
                      onSelectSlot(slot);
                      onClose();
                    }}
                    className="p-2 rounded-xl border border-[var(--teal,var(--brand-primary))]/30 bg-[var(--paper,#ffffff)] hover:bg-[var(--teal-soft,var(--paper-soft))] hover:border-[var(--teal,var(--brand-primary))] text-[var(--teal-dark,var(--teal))] text-xs font-bold flex flex-col items-center justify-center transition-all cursor-pointer shadow-2xs group"
                    title={`Записать на ${slot.timeDisplay} • ${slotDoc?.fullName || "Врач клиники"} (${slot.chairName})`}
                    data-testid={`free-slot-card-${slot.date}-${slot.startTime}`}
                  >
                    <span className="font-mono text-xs group-hover:scale-105 transition-transform text-[var(--ink)]">
                      {slot.timeDisplay}
                    </span>
                    <span className="text-[10px] text-[var(--muted,#64748b)] font-normal truncate max-w-full mt-0.5">
                      {slot.chairName}
                    </span>
                    {(!selectedDoctorId || !selectedDoctor) && slotDoc && (
                      <span className="text-[9px] text-[var(--teal)] font-medium truncate max-w-full">
                        {slotDoc.fullName.split(" ")[0]}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
