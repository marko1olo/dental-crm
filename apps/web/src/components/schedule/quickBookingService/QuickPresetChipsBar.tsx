import React from "react";
import {
  appendReasonPreset,
  COMMON_REASONS,
} from "./quickServicePresets";
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
        <div className="dente-filter-chips gap-1.5 mt-2">
          {COMMON_REASONS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setReason(appendReasonPreset(reason, r))}
              className="dente-filter-chip"
            >
              + {r}
            </button>
          ))}
        </div>
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
