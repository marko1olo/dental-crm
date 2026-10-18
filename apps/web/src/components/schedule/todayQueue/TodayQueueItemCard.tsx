import React from "react";
import { Activity, Clock, Phone, User } from "lucide-react";
import { OPERATIONAL_STATUS_META } from "@dental/shared";
import { TodayQueueItemActionButtons } from "./TodayQueueItemActionButtons";
import type { TodayQueueItemCardProps } from "./todayQueueTypes";

export type { TodayQueueItemCardProps };

export function TodayQueueItemCard({
  item,
  inFlightActionId,
  onOpenAppointment,
  onOpenVisit,
  onOpenPayment,
  handleActionClick,
}: TodayQueueItemCardProps) {
  const statusMeta = OPERATIONAL_STATUS_META[item.operationalStatus];

  return (
    <article
      data-testid={`queue-item-${item.id}`}
      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--line)] bg-[var(--paper-strong,var(--paper))] p-3 transition-colors hover:border-[var(--teal,var(--brand-primary))]/40"
    >
      <div className="flex min-w-[200px] flex-1 items-start gap-2.5">
        <div className="flex flex-col items-center justify-center rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] px-2.5 py-1 text-center shrink-0">
          <span className="text-[11px] font-bold text-[var(--ink)]">{item.timeRange || "Время не указано"}</span>
          <span className="text-[9px] uppercase tracking-wide text-[var(--muted)]">{item.chairName}</span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              onClick={() => onOpenAppointment?.(item.id)}
              className="cursor-pointer font-semibold text-xs text-[var(--ink)] hover:text-[var(--teal,var(--brand-primary))] hover:underline truncate"
              title={item.patientName}
            >
              {item.patientName}
            </span>

            <span
              className={`inline-flex items-center rounded-lg px-2 py-0.5 text-[11px] font-bold ${
                statusMeta?.badgeVariant === "warning"
                  ? "bg-amber-500/15 text-amber-800 dark:text-amber-200"
                  : statusMeta?.badgeVariant === "info"
                    ? "bg-[var(--teal)]/15 text-[var(--teal-dark,var(--teal))] dark:text-teal-200"
                    : statusMeta?.badgeVariant === "success"
                      ? "bg-green-500/15 text-green-800 dark:text-green-200"
                      : statusMeta?.badgeVariant === "danger"
                        ? "bg-red-500/15 text-red-800 dark:text-red-200"
                        : "bg-[var(--line)] text-[var(--muted)]"
              }`}
            >
              {statusMeta?.labelRu || item.operationalStatus}
            </span>

            {item.waitFormatted && (
              <span
                className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] font-bold ${
                  item.waitSeverity === "critical"
                    ? "border border-red-500/40 bg-red-500/20 text-red-800 dark:text-red-200 animate-pulse"
                    : item.waitSeverity === "warning"
                      ? "border border-amber-500/40 bg-amber-500/20 text-amber-800 dark:text-amber-200"
                      : "bg-[var(--paper-soft)] text-[var(--muted)]"
                }`}
              >
                <Clock size={11} />
                <span>{item.waitFormatted}</span>
              </span>
            )}

            {item.chairDurationFormatted && (
              <span
                className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] font-bold ${
                  item.chairDurationSeverity === "overtime"
                    ? "border border-red-500/40 bg-red-500/20 text-red-800 dark:text-red-200"
                    : item.chairDurationSeverity === "warning"
                      ? "border border-amber-500/40 bg-amber-500/20 text-amber-800 dark:text-amber-200"
                      : "bg-[var(--teal)]/15 text-[var(--teal-dark,var(--teal))] dark:text-teal-200"
                }`}
              >
                <Activity size={11} />
                <span>{item.chairDurationFormatted}</span>
              </span>
            )}
          </div>

          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-[var(--muted)]">
            <span className="flex items-center gap-1">
              <User size={11} />
              <span>{item.doctorName}</span>
              {item.doctorSpecialty && <span className="text-[10px] text-[var(--muted)]">({item.doctorSpecialty})</span>}
            </span>
            <span>·</span>
            <span className="truncate max-w-[200px]" title={item.reason}>{item.reason}</span>
            {item.patientPhone && (
              <>
                <span>·</span>
                <span className="flex items-center gap-0.5"><Phone size={10} /><span>{item.patientPhone}</span></span>
              </>
            )}
          </div>
        </div>
      </div>

      <TodayQueueItemActionButtons
        item={item}
        inFlightActionId={inFlightActionId}
        onOpenVisit={onOpenVisit}
        onOpenPayment={onOpenPayment}
        handleActionClick={handleActionClick}
      />
    </article>
  );
}
