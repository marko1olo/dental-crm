import React from "react";
import { QUICK_APPOINTMENT_REASONS } from "./quickReasonsPresets";

export interface AppointmentReasonChipsProps {
  onApplyReasonPreset: (preset: (typeof QUICK_APPOINTMENT_REASONS)[number]) => void;
}

export function AppointmentReasonChips({
  onApplyReasonPreset,
}: AppointmentReasonChipsProps) {
  return (
    <>
      <div className="text-[11px] font-bold text-[var(--muted)]">
        <span>Причины визита:</span>
      </div>
      <div className="flex items-center gap-1.5 flex-wrap">
        {QUICK_APPOINTMENT_REASONS.map((preset) => {
          const isEmergency = preset.tone === "emergency";
          return (
            <button
              key={preset.label}
              type="button"
              data-testid={`chip-reason-${(preset as any).shortLabel || preset.label}`}
              onClick={() => onApplyReasonPreset(preset)}
              className={`appointment-modal-reason-chip inline-flex items-center gap-1.5 text-xs font-semibold cursor-pointer transition-all h-8 min-h-[32px] px-3 rounded-xl border active:scale-95 shadow-2xs ${
                isEmergency
                  ? "border-rose-500/45 bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20"
                  : "border-[var(--line-strong)] bg-[var(--paper-soft)] text-[var(--ink)] hover:bg-[var(--paper)] hover:border-[var(--teal)]"
              }`}
              title={preset.reason}
            >
              <span>{preset.label}</span>
              {isEmergency && (
                <span className="px-1.5 py-0.5 rounded-md bg-rose-600 text-white text-[9px] font-black uppercase tracking-wider">
                  СРОЧНО
                </span>
              )}
            </button>
          );
        })}
      </div>
    </>
  );
}
