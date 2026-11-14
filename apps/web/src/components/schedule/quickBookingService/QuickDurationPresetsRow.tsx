import React from "react";
import { DURATION_PRESETS } from "./quickServicePresets";

export function QuickDurationPresetsRow({
  durationMinutes,
  handleSelectDuration,
}: {
  durationMinutes: number;
  handleSelectDuration: (mins: number) => void;
}) {
  const currentPreset = DURATION_PRESETS.find((p) => p.minutes === durationMinutes);
  const currentHint = currentPreset ? (currentPreset as any).serviceHint || (currentPreset as any).hint : "";

  return (
    <div className="sm:col-span-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-semibold text-[var(--muted)]">
          Длительность: <strong className="text-[var(--ink)]">{durationMinutes} мин</strong>
          {currentHint ? (
            <span className="text-[var(--muted)] font-normal ml-1.5">({currentHint})</span>
          ) : null}
        </span>
      </div>
      <div data-testid="quick-booking-duration-presets" className="mt-1">
        <span className="text-xs font-bold text-[var(--muted)] block mb-1.5">
          Быстрый выбор длительности:
        </span>
        <div
          className="dente-segmented-bar w-full grid grid-cols-3 sm:grid-cols-6 p-1 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] gap-1"
          role="group"
          aria-label="Быстрый выбор длительности"
        >
          {DURATION_PRESETS.map((preset) => {
            const isSelected = durationMinutes === preset.minutes;
            const displayHint = (preset as any).serviceHint || (preset as any).hint || "";
            return (
              <button
                key={preset.minutes}
                type="button"
                onClick={() => handleSelectDuration(preset.minutes)}
                className={`dente-segmented-item w-full min-h-[44px] sm:min-h-[36px] sm:h-9 px-1 rounded-lg text-xs font-medium transition-all inline-flex items-center justify-center cursor-pointer select-none active:scale-95 border ${
                  isSelected
                    ? "active bg-[var(--paper)] text-[var(--ink)] border-[var(--line-strong,var(--line))] shadow-2xs font-bold"
                    : "border-transparent text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper)]/50"
                }`}
                data-testid={`duration-preset-${preset.minutes}`}
                data-active={isSelected}
                aria-pressed={isSelected}
                title={`${preset.minutes} мин${displayHint ? ` (${displayHint})` : ""}`}
              >
                <span className="font-semibold whitespace-nowrap">{preset.minutes} мин</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
