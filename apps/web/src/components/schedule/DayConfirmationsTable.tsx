/**
 * apps/web/src/components/schedule/DayConfirmationsTable.tsx
 * Table view for day confirmations call sheet.
 */

import React from "react";
import {
  type ConfirmationRow,
  type DayConfirmations,
  appointmentStatusLabels,
  formatTime,
  reminderPresentation,
} from "./dayConfirmationsTypes";

export interface DayConfirmationsTableProps {
  data: DayConfirmations;
  visibleRows: ConfirmationRow[];
  handled: Set<string>;
  statusUpdatingId: string | null;
  onStatusChange: (row: ConfirmationRow, newStatus: "confirmed" | "cancelled") => void;
  onToggleHandled: (row: ConfirmationRow) => void;
}

export const DayConfirmationsTable: React.FC<DayConfirmationsTableProps> = ({
  data,
  visibleRows,
  handled,
  statusUpdatingId,
  onStatusChange,
  onToggleHandled,
}) => (
  <div className="ops-table-wrap">
    <table className="ops-table">
      <caption className="sr-only">Приёмы на {data.date}. Отмечены те, кому нужен звонок.</caption>
      <thead>
        <tr>
          <th scope="col">Время</th>
          <th scope="col">Пациент</th>
          <th scope="col">Телефон</th>
          <th scope="col">Врач</th>
          <th scope="col">Запись</th>
          <th scope="col">Напоминание</th>
          <th scope="col">Обзвон</th>
        </tr>
      </thead>
      <tbody>
        {visibleRows.map((row) => {
          const isHandled = handled.has(row.appointmentId);
          const reminder = reminderPresentation[row?.reminder?.state] ?? { label: "неизвестно", tone: "muted" };
          return (
            <tr key={row.appointmentId} className={`${row.needsCall && !isHandled ? "ops-row--action" : ""} ${isHandled ? "ops-row--done" : ""}`}>
              <td className="ops-time" data-label="Время">{formatTime(row.startsAt, data.timeZone)}</td>
              <td className="ops-strong" data-label="Пациент">{row.patientName}</td>
              <td data-label="Телефон">
                {row.phone ? (
                  <a href={`tel:${(row.phone ?? "").replace(/[^\d+]/g, "")}`}>{row.phone}</a>
                ) : (
                  <span className="ops-state ops-state--bad">телефона нет</span>
                )}
              </td>
              <td data-label="Врач" data-compact="">{row.doctorName ?? "—"}</td>
              <td data-label="Запись" data-compact="">
                <span className={`status-pill status-${row.status}`}>{appointmentStatusLabels[row.status] ?? row.status}</span>
                {row.patientClickedAt ? <span className="ops-note">ответил сам</span> : null}
              </td>
              <td data-label="Напоминание" data-compact="">
                <span className={`ops-state ops-state--${reminder.tone}`}>{reminder.label}</span>
                {row.reminder.detail ? <span className="ops-note">{row.reminder.detail}</span> : null}
              </td>
              <td data-label="Обзвон">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {row.status !== "confirmed" && row.status !== "completed" ? (
                    <button
                      type="button"
                      aria-busy={statusUpdatingId === row.appointmentId || undefined}
                      className="px-2 py-1 rounded-lg text-xs font-semibold bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25 transition-all cursor-pointer inline-flex items-center gap-1 shrink-0 pointer-coarse:min-h-[44px]"
                      title="1-клик: подтвердить явку пациента на приём"
                      aria-label={`Подтвердить приём ${row.patientName}`}
                      data-testid={`btn-confirm-appt-${row.appointmentId}`}
                      onClick={() => {
                        if (statusUpdatingId === row.appointmentId) return;
                        onStatusChange(row, "confirmed");
                      }}
                    >
                      {statusUpdatingId === row.appointmentId ? (
                        <span className="w-3 h-3 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin shrink-0" />
                      ) : null}
                      <span>✓ Подтверждён</span>
                    </button>
                  ) : null}
                  {row.status !== "cancelled" ? (
                    <button
                      type="button"
                      aria-busy={statusUpdatingId === row.appointmentId || undefined}
                      className="px-2 py-1 rounded-lg text-xs font-semibold bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/30 hover:bg-rose-500/20 transition-all cursor-pointer inline-flex items-center gap-1 shrink-0 pointer-coarse:min-h-[44px]"
                      title="Отменить приём и сразу открыть лист ожидания для заполнения окна"
                      aria-label={`Отменить приём ${row.patientName} и освободить слот`}
                      data-testid={`btn-cancel-appt-${row.appointmentId}`}
                      onClick={() => {
                        if (statusUpdatingId === row.appointmentId) return;
                        onStatusChange(row, "cancelled");
                      }}
                    >
                      {statusUpdatingId === row.appointmentId ? (
                        <span className="w-3 h-3 border-2 border-rose-600 border-t-transparent rounded-full animate-spin shrink-0" />
                      ) : null}
                      <span>✕ В лист ожидания</span>
                    </button>
                  ) : null}
                  {row.needsCall ? (
                    <button
                      className={isHandled ? "secondary-button text-xs py-1 px-2" : "primary-button text-xs py-1 px-2"}
                      type="button"
                      aria-pressed={isHandled}
                      onClick={() => onToggleHandled(row)}
                    >
                      {isHandled ? "Вернуть" : "Позвонил"}
                    </button>
                  ) : (
                    <span className="ops-note">не требуется</span>
                  )}
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
);
