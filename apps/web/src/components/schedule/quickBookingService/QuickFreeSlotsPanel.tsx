import { CalendarDays, X } from "lucide-react";
import React from "react";
import { showToast } from "../../GlobalToast";
import type { DayFreeSlots } from "../doctorFreeSlotsEngine";

export interface QuickFreeSlotsPanelProps {
  durationMinutes: number;
  freeSlotsList: DayFreeSlots[];
  setIsSearchingSlots: (open: boolean) => void;
  setStartsAtLocal: (dt: string) => void;
  setChairId: (id: string) => void;
  setDoctorUserId: (id: string) => void;
  doctorUserId: string;
}

export function QuickFreeSlotsPanel({
  durationMinutes,
  freeSlotsList,
  setIsSearchingSlots,
  setStartsAtLocal,
  setChairId,
  setDoctorUserId,
  doctorUserId,
}: QuickFreeSlotsPanelProps) {
  return (
    <div
      className="p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--teal)]/40 shadow-xs space-y-2 animate-in fade-in"
      data-testid="quick-booking-free-slots-panel"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-[var(--ink)] flex items-center gap-1.5">
          <CalendarDays size={13} className="text-[var(--teal)]" />
          <span>Свободные окна ({durationMinutes} мин, 7 дней)</span>
        </span>
        <button
          type="button"
          onClick={() => setIsSearchingSlots(false)}
          className="p-1 rounded-md text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer"
          title="Скрыть варианты"
          aria-label="Скрыть свободные окна"
        >
          <X size={14} />
        </button>
      </div>

      {freeSlotsList.length === 0 ||
      freeSlotsList.every((d) => d.slots.length === 0) ? (
        <p className="text-xs text-[var(--muted)] py-2">
          Свободных окон на длительность {durationMinutes} мин не найдено.
          Попробуйте выбрать меньшую длительность или другого врача.
        </p>
      ) : (
        <div className="max-h-[160px] overflow-y-auto space-y-2 pr-1 [scrollbar-width:thin]">
          {freeSlotsList
            .filter((day) => day.slots.length > 0)
            .map((day) => (
              <div key={day.date} className="space-y-1">
                <div className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider">
                  {day.dateFormatted}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {day.slots.map((slot) => (
                    <button
                      key={`${slot.date}-${slot.startTime}-${slot.chairId}`}
                      type="button"
                      onClick={() => {
                        setStartsAtLocal(slot.startsAtIso.slice(0, 16));
                        if (slot.chairId) {
                          setChairId(slot.chairId);
                        }
                        if (slot.doctorId && !doctorUserId) {
                          setDoctorUserId(slot.doctorId);
                        }
                        setIsSearchingSlots(false);
                        showToast(
                          `Выбрано окно: ${day.dateFormatted}, ${slot.startTime} (${slot.chairName})`,
                          "success",
                        );
                      }}
                      className="h-8 px-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] hover:border-[var(--teal)] hover:bg-[var(--teal-soft)] text-[var(--ink)] text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                      title={`Выбрать окно ${slot.timeDisplay} (${slot.chairName})`}
                      data-testid={`quick-slot-candidate-${slot.date}-${slot.startTime}`}
                    >
                      <span>{slot.startTime}</span>
                      <span className="text-[10px] text-[var(--muted)] font-normal">
                        ({slot.chairName})
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
