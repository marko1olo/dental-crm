import { Clock, Layers } from "lucide-react";
import React from "react";
import {
  extractStageBookingServices,
  hasTreatmentPlanStageContext,
} from "./quickServicePresets";
import type { QuickBookingSlotInfo } from "./types";
import { QuickDurationAndSlotsSection } from "./QuickDurationAndSlotsSection";

export { QuickDurationAndSlotsSection };

export function SelectedServicesSummaryCard({
  initialSlot,
}: {
  initialSlot?: QuickBookingSlotInfo | null | undefined;
}) {
  if (!hasTreatmentPlanStageContext(initialSlot)) {
    return null;
  }

  const stageItems = extractStageBookingServices(initialSlot);

  return (
    <div
      className="p-3.5 rounded-2xl bg-teal-500/10 dark:bg-teal-500/15 border border-teal-500/30 text-[var(--ink)] space-y-2.5 transition-all shadow-sm"
      data-testid="stage-booking-banner"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-[var(--teal)] text-white shrink-0 shadow-sm">
            <Layers size={15} />
          </span>
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--teal)] block">
              Привязка к плану лечения
            </span>
            <h4
              className="text-sm font-bold leading-snug"
              data-testid="stage-booking-title"
            >
              {initialSlot?.stageNumber
                ? `Этап ${initialSlot.stageNumber}: `
                : ""}
              {initialSlot?.stageTitle || "Лечебный этап"}
            </h4>
          </div>
        </div>
        {initialSlot?.estimatedDurationMinutes ? (
          <span
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-[var(--teal)]/15 text-[var(--teal-dark,var(--teal))] border border-[var(--teal)]/25 shrink-0"
            data-testid="stage-booking-duration-badge"
          >
            <Clock size={12} />
            <span>{initialSlot.estimatedDurationMinutes} мин</span>
          </span>
        ) : null}
      </div>

      {/* List of procedures / services in this stage */}
      {stageItems.length > 0 && (
        <div
          className="pt-1 border-t border-[var(--line)]/50 space-y-1.5"
          data-testid="stage-booking-services-list"
        >
          <div className="text-[11px] font-semibold text-[var(--muted)]">
            Назначенные процедуры этапа ({stageItems.length}):
          </div>
          <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
            {stageItems.map((svc, idx) => {
              const svcName =
                svc.title ||
                svc.name ||
                svc.medicalTitleRu ||
                svc.patientFriendlyTitleRu ||
                "Стоматологическая процедура";
              const tooth = svc.toothNumber ?? svc.toothCode ?? svc.toothFdi;
              const price = svc.priceRub ?? svc.unitPriceRub ?? svc.price;
              const duration =
                (svc as { durationMinutes?: number; duration?: number; estimatedDurationMinutes?: number })
                  .durationMinutes ??
                (svc as { duration?: number }).duration ??
                (svc as { estimatedDurationMinutes?: number }).estimatedDurationMinutes;
              return (
                <div
                  key={svc.id || idx}
                  className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)]/40 gap-2"
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="truncate font-medium">{svcName}</span>
                    {tooth && (
                      <span className="shrink-0 text-[11px] text-[var(--teal)] font-semibold">
                        (зуб {tooth})
                      </span>
                    )}
                    {duration ? (
                      <span className="shrink-0 text-[11px] text-[var(--muted)] font-medium">
                        · {duration} мин
                      </span>
                    ) : null}
                  </div>
                  {price !== undefined && price !== null && (
                    <span className="shrink-0 font-semibold text-[var(--ink)] whitespace-nowrap">
                      {Number(price).toLocaleString("ru-RU")} ₽
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
