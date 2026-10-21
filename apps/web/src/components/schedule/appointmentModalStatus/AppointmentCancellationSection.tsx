import { APPOINTMENT_REFUSAL_REASONS_CATALOG } from "@dental/shared";
import { UserX, Zap } from "lucide-react";
import React from "react";

export interface AppointmentCancellationSectionProps {
  comment: string;
  onApplyRefusalReason: (nameRu: string) => void;
  onOpenWaitlistForThisSlot: () => void;
}

export function AppointmentCancellationSection({
  comment,
  onApplyRefusalReason,
  onOpenWaitlistForThisSlot,
}: AppointmentCancellationSectionProps) {
  return (
    <>
      <div
        className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 space-y-1.5 mt-1.5"
        data-testid="appointment-refusal-reasons-block"
      >
        <div className="flex items-center justify-between text-xs font-bold text-rose-800 dark:text-rose-200">
          <span className="flex items-center gap-1.5">
            <UserX size={13} className="text-rose-600 dark:text-rose-400" />
            Причина отмены / неявки:
          </span>
          <span className="text-[10px] text-[var(--muted)] font-normal">
            Фиксируется в комментарии и таймлайне
          </span>
        </div>
        <div className="flex items-center gap-1 flex-wrap">
          {APPOINTMENT_REFUSAL_REASONS_CATALOG.map((refuse) => {
            const isSelected = comment.includes(`[Отмена: ${refuse.nameRu}]`);
            return (
              <button
                key={refuse.id}
                type="button"
                onClick={() => onApplyRefusalReason(refuse.nameRu)}
                className={`h-7 px-2 py-0.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer select-none active:scale-95 shadow-2xs ${
                  isSelected
                    ? "bg-rose-600 text-white border-rose-600 shadow-xs"
                    : "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:border-rose-400 dark:hover:border-rose-500"
                }`}
                title={`${refuse.nameRu} (${refuse.responsibility === "clinic" ? "Клиника" : refuse.responsibility === "patient" ? "Пациент" : "Система"})`}
              >
                {refuse.nameRu}
              </button>
            );
          })}
        </div>
      </div>

      <div
        className="mt-2 pt-2 border-t border-rose-500/20 flex flex-wrap items-center justify-between gap-2"
        data-testid="cancellation-waitlist-banner"
      >
        <div className="text-xs">
          <span className="font-bold text-rose-800 dark:text-rose-200">
            Окно освобождается.
          </span>{" "}
          <span className="text-[var(--muted)]">
            Подобрать замену из листа ожидания?
          </span>
        </div>
        <button
          type="button"
          onClick={onOpenWaitlistForThisSlot}
          className="h-8 px-3 rounded-xl bg-[var(--teal,#0d9488)] hover:brightness-110 active:scale-95 text-[var(--on-teal,#ffffff)] text-xs font-bold inline-flex items-center gap-1.5 transition-all shadow-xs cursor-pointer select-none"
          data-testid="appointment-open-waitlist-btn"
        >
          <Zap size={14} className="fill-current text-amber-300" />
          <span>Подобрать из листа ожидания</span>
        </button>
      </div>
    </>
  );
}
