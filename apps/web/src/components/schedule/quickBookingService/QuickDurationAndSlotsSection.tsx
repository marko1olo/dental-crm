import { Clock, Search } from "lucide-react";
import React from "react";
import { resolveChairDutyDoctor } from "../chairRosterMath";
import { QuickFreeSlotsPanel } from "./QuickFreeSlotsPanel";
import { QuickDurationPresetsRow } from "./QuickDurationPresetsRow";
import type { SelectedServicesSummaryCardProps } from "./types";

export function QuickDurationAndSlotsSection({
  startsAtLocal,
  setStartsAtLocal,
  durationMinutes,
  handleSelectDuration,
  chairId,
  setChairId,
  doctorUserId,
  setDoctorUserId,
  chairDoctorAssignments,
  isSearchingSlots,
  setIsSearchingSlots,
  freeSlotsList,
  handleFindFreeSlots,
}: Omit<SelectedServicesSummaryCardProps, "initialSlot">) {
  return (
    <div className="space-y-3 pt-1">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold uppercase tracking-wider text-[var(--muted)] flex items-center gap-1.5">
          <Clock size={14} className="text-[var(--teal)]" />
          <span>Время и длительность *</span>
        </label>
        <button
          type="button"
          onClick={handleFindFreeSlots}
          className="text-xs font-bold text-[var(--teal)] hover:text-[var(--teal-dark)] flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[var(--teal)]/30 bg-[var(--teal)]/10 hover:bg-[var(--teal)]/20 transition-all cursor-pointer"
          data-testid="quick-booking-find-slots-btn"
          title="Интеллектуальный поиск свободных окон"
        >
          <Search size={12} className="shrink-0" />
          <span>Найти варианты</span>
        </button>
      </div>

      {isSearchingSlots && (
        <QuickFreeSlotsPanel
          durationMinutes={durationMinutes}
          freeSlotsList={freeSlotsList}
          setIsSearchingSlots={setIsSearchingSlots}
          setStartsAtLocal={setStartsAtLocal}
          setChairId={setChairId}
          setDoctorUserId={setDoctorUserId}
          doctorUserId={doctorUserId}
        />
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <span className="text-xs font-semibold text-[var(--muted)] block mb-1">
            Начало
          </span>
          <input
            type="datetime-local"
            data-testid="quick-booking-starts-at-input"
            value={startsAtLocal}
            onChange={(e) => {
              const nextVal = e.target.value;
              setStartsAtLocal(nextVal);
              if (chairId && nextVal) {
                const newDuty = resolveChairDutyDoctor(
                  chairId,
                  nextVal,
                  chairDoctorAssignments,
                  nextVal.slice(0, 10),
                );
                if (newDuty.doctorId) {
                  setDoctorUserId(newDuty.doctorId);
                }
              }
            }}
            className="w-full p-2.5 min-h-[44px] rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] text-sm outline-none focus:ring-2 focus:ring-[var(--teal)]"
          />
        </div>

        <QuickDurationPresetsRow
          durationMinutes={durationMinutes}
          handleSelectDuration={handleSelectDuration}
        />
      </div>
    </div>
  );
}
