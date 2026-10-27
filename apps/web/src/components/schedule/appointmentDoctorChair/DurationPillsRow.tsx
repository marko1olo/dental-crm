import React from "react";

export function DurationPillsRow({
  currentDurationMinutes,
  applyDuration,
}: {
  currentDurationMinutes: number;
  applyDuration: (minutes: number) => void;
}) {
  return (
    <div
      className="dente-segmented-bar w-full flex items-center p-1 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] overflow-x-auto"
      data-testid="appointment-quick-durations"
      role="group"
      aria-label="Выбор длительности приёма"
    >
      {[15, 30, 45, 60, 90, 120].map((mins) => {
        const isSelected = currentDurationMinutes === mins;
        const label = mins === 60 ? "1 час (60 мин)" : `${mins} мин`;
        return (
          <button
            key={mins}
            type="button"
            onClick={() => applyDuration(mins)}
            data-testid={`appointment-duration-pill-${mins}`}
            data-active={isSelected}
            aria-pressed={isSelected}
            className={`dente-segmented-item appointment-modal-duration-chip ${isSelected ? "active" : ""} flex-1 min-w-0 !h-9 sm:!h-9 !min-h-[36px] px-2 rounded-lg text-xs font-bold transition-all cursor-pointer select-none active:scale-95 flex items-center justify-center ${
              isSelected
                ? "!bg-[var(--paper)] !text-[var(--teal)] !border-[var(--teal)] shadow-xs font-bold"
                : "!text-[var(--muted)] hover:!text-[var(--ink)]"
            }`}
          >
            <span className="whitespace-nowrap">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
