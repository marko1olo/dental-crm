/**
 * apps/web/src/components/schedule/DayConfirmationsTable.tsx
 * Table view for day confirmations call sheet.
 */

import React from "react";
import { type ConfirmationRow, type DayConfirmations } from "./dayConfirmationsTypes";
import { DayConfirmationRowItem } from "./DayConfirmationRowItem";

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
        {visibleRows.map((row) => (
          <DayConfirmationRowItem
            key={row.appointmentId}
            row={row}
            data={data}
            isHandled={handled.has(row.appointmentId)}
            statusUpdatingId={statusUpdatingId}
            onStatusChange={onStatusChange}
            onToggleHandled={onToggleHandled}
          />
        ))}
      </tbody>
    </table>
  </div>
);
