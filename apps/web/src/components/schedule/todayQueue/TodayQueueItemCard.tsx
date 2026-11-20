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
      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--line)] bg-[var(--paper-strong,var(--paper))] p-3 transition-colors hover:border-[var(--primary)]"
    >
      <div className="flex min-w-[200px] flex-1 items-start gap-2.5">
        <div className="flex flex-col items-center justify-center rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] px-2.5 py-1 text-center shrink-0">
          <span className="text-[11px] font-bold text-[var(--ink)]">{item.timeRange || "Время не указано"}</span>
          <span className="text-[10px] text-[var(--ink-muted)]">{item.chairName}</span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              onClick={() => onOpenAppointment?.(item.id)}
              className="cursor-pointer font-semibold text-xs text-[var(--ink)] hover:text-[var(--primary)] hover:underline truncate"
              title={item.patientName}
            >
              {item.patientName}
            </span>

            <span
              className={`inline-flex items-center rounded-lg px-2 py-0.5 text-[11px] font-medium ${
                statusMeta?.badgeVariant === "warning"
                  ? "bg-[var(--warning-soft)] text-[var(--warning-ink)] border border-[var(--warning-line)]"
                  : statusMeta?.badgeVariant === "info"
                    ? "bg-[var(--primary-soft)] text-[var(--primary)] border border-[var(--line)]"
                    : statusMeta?.badgeVariant === "success"
                      ? "bg-[var(--success-soft)] text-[var(--success-ink)] border border-[var(--success-line)]"
                      : statusMeta?.badgeVariant === "danger"
                        ? "bg-[var(--danger-soft)] text-[var(--danger-ink)] border border-[var(--danger-line)]"
                        : "bg-[var(--paper-soft)] text-[var(--ink-muted)] border border-[var(--line)]"
              }`}
            >
              {statusMeta?.labelRu || item.operationalStatus}
            </span>

            {item.waitFormatted && (
              <span
                className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] font-medium ${
                  item.waitSeverity === "critical"
                    ? "border border-[var(--danger-line)] bg-[var(--danger-soft)] text-[var(--danger-ink)] animate-pulse"
                    : item.waitSeverity === "warning"
                      ? "border border-[var(--warning-line)] bg-[var(--warning-soft)] text-[var(--warning-ink)]"
                      : "bg-[var(--paper-soft)] text-[var(--ink-muted)] border border-[var(--line)]"
                }`}
              >
                <Clock size={11} />
                <span>{item.waitFormatted}</span>
              </span>
            )}

            {item.chairDurationFormatted && (
              <span
                className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] font-medium ${
                  item.chairDurationSeverity === "overtime"
                    ? "border border-[var(--danger-line)] bg-[var(--danger-soft)] text-[var(--danger-ink)]"
                    : item.chairDurationSeverity === "warning"
                      ? "border border-[var(--warning-line)] bg-[var(--warning-soft)] text-[var(--warning-ink)]"
                      : "bg-[var(--primary-soft)] text-[var(--primary)] border border-[var(--line)]"
                }`}
              >
                <Activity size={11} />
                <span>{item.chairDurationFormatted}</span>
              </span>
            )}
          </div>

          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-[var(--ink-muted)]">
            <span className="flex items-center gap-1">
              <User size={11} />
              <span>{item.doctorName}</span>
              {item.doctorSpecialty && <span className="text-[10px] text-[var(--ink-muted)]">({item.doctorSpecialty})</span>}
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
