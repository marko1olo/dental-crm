import React from "react";
import {
  appendReasonPreset,
  COMMON_REASONS,
} from "./quickServicePresets";
import { TECHNICAL_BREAK_PRESETS, isTechnicalBreakAppointment } from "../scheduleCatalogData";
import type { QuickPresetChipsBarProps } from "./types";
import { QuickSegmentedStatusHeader } from "./QuickSegmentedStatusHeader";
import { QuickAppointmentTypeSelector } from "./QuickAppointmentTypeSelector";
import { QuickStatusSelector } from "./QuickStatusSelector";

export {
  QuickSegmentedStatusHeader,
  QuickAppointmentTypeSelector,
  QuickStatusSelector,
};

export function QuickPresetChipsBar({
  reason,
  setReason,
  comment,
  setComment,
}: Pick<
  QuickPresetChipsBarProps,
  "reason" | "setReason" | "comment" | "setComment"
>) {
  const isTechBreak = isTechnicalBreakAppointment({ reason, comment });

  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[var(--muted)] block mb-1.5">
          Повод обращения / Услуга
        </label>
        <input
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Например: Осмотр, Кариес, Консультация"
          className="w-full p-2.5 min-h-[44px] rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] text-sm outline-none focus:ring-2 focus:ring-[var(--teal)]"
        />
        <div data-testid="appointment-quick-reasons" className="flex flex-wrap gap-1.5 mt-2">
          {COMMON_REASONS.map((r) => (
            <button
              key={r}
              type="button"
              data-testid={`chip-reason-${r}`}
              onClick={() => setReason(appendReasonPreset(reason, r))}
              className="min-h-[44px] px-3 py-2 rounded-xl text-xs sm:text-sm font-medium border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] cursor-pointer select-none active:scale-95 transition-all inline-flex items-center"
            >
              + {r}
            </button>
          ))}
          <div data-testid="appointment-doctor-blocks" className="contents">
            {TECHNICAL_BREAK_PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                data-testid={`chip-block-${preset.label}`}
                onClick={() => {
                  setReason(preset.reason);
                  if (preset.comment && !comment) {
                    setComment(preset.comment);
                  }
                }}
                className="min-h-[44px] px-3 py-2 rounded-xl text-xs sm:text-sm font-medium border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] cursor-pointer select-none active:scale-95 transition-all inline-flex items-center"
              >
                + {preset.label}
              </button>
            ))}
          </div>
        </div>
        {isTechBreak && (
          <div data-testid="technical-break-patient-free-banner" className="text-xs text-[var(--teal)] bg-[var(--teal)]/10 p-2.5 rounded-xl mt-2 font-medium">
            Служебный перерыв врача: выбор пациента не требуется
          </div>
        )}
      </div>

      <div>
        <label className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[var(--muted)] block mb-1.5">
          Комментарий для врача / регистратуры
        </label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Дополнительные пожелания или примечания…"
          rows={2}
          className="w-full p-2.5 min-h-[44px] rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] text-sm outline-none focus:ring-2 focus:ring-[var(--teal)]"
        />
      </div>
    </div>
  );
}
