/**
 * apps/web/src/components/schedule/DayConfirmationsPanel.tsx
 * Morning call & confirmations panel for DENTE Dental CRM.
 * Refactored to <= 120 lines.
 */

import React from "react";
import {
  dayConfirmationsRequestPath,
  dayConfirmationsShownDay,
} from "./dayConfirmationsTypes";
import { DayConfirmationsMetrics } from "./DayConfirmationsMetrics";
import { DayConfirmationsTable } from "./DayConfirmationsTable";
import { useDayConfirmationsState } from "./useDayConfirmationsState";

export { dayConfirmationsRequestPath, dayConfirmationsShownDay } from "./dayConfirmationsTypes";

export function DayConfirmationsPanel() {
  const {
    requestedDate,
    setRequestedDate,
    data,
    error,
    loading,
    showAll,
    setShowAll,
    handled,
    statusUpdatingId,
    liveRegion,
    load,
    visibleRows,
    callProgress,
    handleStatusChange,
    toggleHandled,
  } = useDayConfirmationsState();

  return (
    <section className="panel ops-panel" data-testid="day-confirmations-panel">
      <div className="panel-heading">
        <h2>Обзвон и подтверждения</h2>
        {data && (data.summary?.needsCall ?? 0) > 0 ? (
          <span className="status-pill status-arrived">обзвонено {callProgress.done} из {callProgress.total}</span>
        ) : null}
      </div>

      <div className="ops-toolbar">
        <span className="ops-field">
          <label htmlFor="confirmations-date">День</label>
          <input id="confirmations-date" type="date" value={dayConfirmationsShownDay(requestedDate, data)} onChange={(e) => setRequestedDate(e.target.value)} />
        </span>
        <button className="secondary-button" type="button" onClick={() => void load()} disabled={loading}>
          {loading ? "Обновляю…" : "Обновить"}
        </button>
      </div>

      {error ? <p className="ops-notice ops-notice--error" role="alert">Список не построен: {error}</p> : null}
      {loading && data === null ? <div className="ops-skeleton" aria-hidden="true"><span className="ops-skeleton__line" /><span className="ops-skeleton__line" /></div> : null}
      <p className="sr-only" role="status" aria-live="polite" ref={liveRegion} />

      {data && (data.isEmpty ? <p className="ops-empty">На этот день приёмов нет.</p> : (
        <>
          <DayConfirmationsMetrics data={data} showAll={showAll} onToggleShowAll={setShowAll} />
          {visibleRows.length === 0 ? (
            <p className="ops-empty ops-empty--good">Звонить никому не нужно: все либо подтвердили, либо получили напоминание.</p>
          ) : (
            <DayConfirmationsTable
              data={data}
              visibleRows={visibleRows}
              handled={handled}
              statusUpdatingId={statusUpdatingId}
              onStatusChange={handleStatusChange}
              onToggleHandled={toggleHandled}
            />
          )}
          <p className="ops-hint">Звонок нужен тому, кто не подтвердил и до кого напоминание не дошло.</p>
        </>
      ))}
    </section>
  );
}

export default DayConfirmationsPanel;
