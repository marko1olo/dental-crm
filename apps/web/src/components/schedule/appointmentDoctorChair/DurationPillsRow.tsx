import React from "react";

export function DurationPillsRow({
  currentDurationMinutes,
  applyDuration,
}: {
  currentDurationMinutes: number;
  applyDuration: (minutes: number) => void;
}) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap" data-testid="appointment-quick-durations">
      {[15, 30, 45, 60, 90, 120].map((mins) => {
        const isSelected = currentDurationMinutes === mins;
        const label = mins === 60 ? "1 час (60 мин)" : `${mins} мин`;
        return (
          <button
            key={mins}
            type="button"
            onClick={() => applyDuration(mins)}
            data-testid={`appointment-duration-pill-${mins}`}
            className={`appointment-modal-duration-chip ${isSelected ? "active" : ""} h-8 sm:h-8.5 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer select-none active:scale-95 flex items-center justify-center ${
              isSelected
                ? "!bg-[var(--teal)] !text-white !border-[var(--teal)] shadow-sm ring-2 ring-[var(--teal)]/25 font-bold"
                : "bg-[var(--paper-soft)] border-[var(--line-strong)] text-[var(--ink)] hover:bg-[var(--paper-subtle)]"
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
