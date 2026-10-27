import { Clock } from "lucide-react";
import React from "react";
import { TECHNICAL_BREAK_PRESETS } from "./quickReasonsPresets";

export interface AppointmentTechnicalBreakChipsProps {
  onApplyTechnicalBreakPreset: (preset: (typeof TECHNICAL_BREAK_PRESETS)[number]) => void;
}

export function AppointmentTechnicalBreakChips({
  onApplyTechnicalBreakPreset,
}: AppointmentTechnicalBreakChipsProps) {
  return (
    <>
      <div className="text-[11px] font-bold text-[var(--muted)] pt-1.5 border-t border-[var(--line)]/50">
        <span>Служебные перерывы в расписании (без пациента):</span>
      </div>
      <div
        className="flex items-center gap-1.5 flex-wrap"
        data-testid="appointment-doctor-blocks"
      >
        {TECHNICAL_BREAK_PRESETS.map((preset) => (
          <button
            key={preset.label}
            type="button"
            data-testid={`chip-block-${(preset as any).shortLabel || preset.label}`}
            onClick={() => onApplyTechnicalBreakPreset(preset)}
            className="appointment-modal-break-chip dente-btn-pill inline-flex items-center gap-1.5 text-xs font-semibold cursor-pointer transition-all h-8 min-h-[32px] sm:h-8 sm:min-h-[32px] pointer-coarse:min-h-[44px] px-3 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] hover:bg-[var(--paper)] hover:border-[var(--line-strong)] active:scale-95 shadow-2xs"
            title={preset.comment}
          >
            <Clock size={12} className="text-[var(--teal)] shrink-0" />
            <span>{preset.label}</span>
          </button>
        ))}
      </div>
    </>
  );
}
