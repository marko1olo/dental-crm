/**
 * apps/web/src/components/schedule/DayConfirmationsMetrics.tsx
 * Top metrics bar for DayConfirmationsPanel.
 */

import React from "react";
import type { DayConfirmations } from "./dayConfirmationsTypes";

export interface DayConfirmationsMetricsProps {
  data: DayConfirmations;
  showAll: boolean;
  onToggleShowAll: (showAll: boolean) => void;
}

export const DayConfirmationsMetrics: React.FC<DayConfirmationsMetricsProps> = ({
  data,
  showAll,
  onToggleShowAll,
}) => (
  <>
    <ul className="ops-metrics">
      <li className={`ops-metric ${(data.summary?.needsCall ?? 0) > 0 ? "ops-metric--primary" : ""}`}>
        <span className="ops-metric__value">{data.summary?.needsCall ?? 0}</span>
        <span className="ops-metric__label">нужен звонок</span>
      </li>
      <li className="ops-metric">
        <span className="ops-metric__value">{data.summary?.confirmed ?? 0}</span>
        <span className="ops-metric__label">подтвердили сами</span>
      </li>
      <li className="ops-metric">
        <span className="ops-metric__value">{data.summary?.awaiting ?? 0}</span>
        <span className="ops-metric__label">ждут подтверждения</span>
      </li>
      <li className="ops-metric">
        <span className="ops-metric__value">{data.summary?.total ?? 0}</span>
        <span className="ops-metric__label">всего приёмов</span>
      </li>
      {(data.summary?.withoutPhone ?? 0) > 0 ? (
        <li className="ops-metric ops-metric--danger">
          <span className="ops-metric__value">{data.summary?.withoutPhone ?? 0}</span>
          <span className="ops-metric__label">без телефона</span>
        </li>
      ) : null}
    </ul>

    <fieldset className="quick-chips-row p-0 m-0 border-0" aria-label="Что показывать в списке">
      <legend className="sr-only">Что показывать в списке</legend>
      <button
        type="button"
        className={`quick-chip ${showAll ? "" : "selected"}`}
        aria-pressed={!showAll}
        onClick={() => onToggleShowAll(false)}
      >
        Только нужные звонки
      </button>
      <button
        type="button"
        className={`quick-chip ${showAll ? "selected" : ""}`}
        aria-pressed={showAll}
        onClick={() => onToggleShowAll(true)}
      >
        Все приёмы дня
      </button>
    </fieldset>
  </>
);
