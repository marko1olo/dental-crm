import React from "react";
import { AlertTriangle, Clock, Zap } from "lucide-react";
import { showToast } from "../../GlobalToast";
import type { ResourceCollisionResult } from "../../../utils/scheduleCollisionUtils";

export function CollisionAlerts({
  collision,
  safeToDateTimeLocalValue,
  timezone,
  setStartsAtLocal,
  setEndsAtLocal,
}: {
  collision: ResourceCollisionResult;
  safeToDateTimeLocalValue: (iso: string | null | undefined, tz?: string | null) => string;
  timezone: string;
  setStartsAtLocal: (val: string) => void;
  setEndsAtLocal: (val: string) => void;
}) {
  return (
    <>
      {collision.isCitoOverbooking && (
        <div
          className="p-2.5 sm:p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-800 dark:text-rose-200 text-xs font-semibold flex items-center gap-2"
          role="alert"
          data-testid="modal-cito-overbooking-alert"
        >
          <Zap size={15} className="shrink-0 text-rose-600 dark:text-rose-400" />
          <span>
            {collision.message ||
              "Запись по острой боли (наложение слота допустимо): наложение на занятый слот разрешено."}
          </span>
        </div>
      )}

      {collision.hasCollision && (
        <div
          className="p-2.5 sm:p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-200 text-xs font-semibold flex items-center justify-between gap-2.5 flex-wrap"
          role="alert"
          data-testid="appointment-collision-alert"
        >
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <AlertTriangle size={15} className="shrink-0 text-amber-600 dark:text-amber-400" />
            <span>
              {collision.message}. Разрешена экстренная запись (острая боль / совмещение допустимо).
            </span>
          </div>
          {collision.suggestedSlot && (
            <button
              type="button"
              onClick={() => {
                const newStart = safeToDateTimeLocalValue(collision.suggestedSlot!.startsAt, timezone);
                const newEnd = safeToDateTimeLocalValue(collision.suggestedSlot!.endsAt, timezone);
                setStartsAtLocal(newStart);
                setEndsAtLocal(newEnd);
                showToast(`Время перенесено на ${collision.suggestedSlot!.timeDisplay}`, "success");
              }}
              className="px-2.5 py-1.5 rounded-lg bg-[var(--teal-dark)] hover:brightness-110 active:brightness-95 text-[var(--on-teal)] font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer shrink-0"
              title="Выбрать ближайшее свободное окно"
              data-testid="appointment-apply-suggested-slot-btn"
            >
              <Clock size={13} className="shrink-0" />
              <span>{collision.suggestedSlot.label}</span>
            </button>
          )}
        </div>
      )}
    </>
  );
}
