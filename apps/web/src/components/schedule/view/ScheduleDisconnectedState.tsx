import React from "react";
import { RefreshCw, WifiOff } from "lucide-react";
import { EmptyState } from "../../EmptyState";

export interface ScheduleDisconnectedStateProps {
  onRetry: () => void;
}

export function ScheduleDisconnectedState({ onRetry }: ScheduleDisconnectedStateProps) {
  return (
    <div
      className="panel schedule-panel min-w-0 max-w-full overflow-hidden"
      id="schedule"
      data-testid="schedule-view-disconnected-state"
    >
      <div className="panel-heading flex flex-wrap items-center justify-between gap-3 min-w-0">
        <h2 className="truncate min-w-0">Расписание приемов</h2>
        <span className="status-pill status-needs_review">нет связи</span>
      </div>
      <div className="p-8 sm:p-12 flex items-center justify-center min-h-[420px]">
        <EmptyState
          icon={
            <WifiOff className="w-8 h-8 text-[var(--bad-fg,var(--danger))]" />
          }
          title="Нет связи с сервером"
          description="Не удалось подключиться к серверу клиники. Расписание приемов временно недоступно. Проверьте подключение к сети и повторите попытку."
          action={
            <button
              type="button"
              onClick={onRetry}
              className="primary-button flex items-center justify-center gap-2 min-h-[44px] px-6 py-2.5 rounded-xl text-sm font-bold shadow-md cursor-pointer transition-all active:scale-95"
              data-testid="btn-retry-schedule-connection"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Повторить подключение</span>
            </button>
          }
        />
      </div>
    </div>
  );
}
