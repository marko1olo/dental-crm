import React from "react";
import { Calendar, Minus, UserPlus, X } from "lucide-react";
import type { TargetSlotInfo } from "../waitlistCancellationEngine";

export interface WaitlistDrawerHeaderProps {
  targetSlot?: TargetSlotInfo | null;
  itemsCount: number;
  isAddFormOpen: boolean;
  onToggleAddForm: () => void;
  onMinimize: () => void;
  onClose: () => void;
}

function formatWaitlistCount(count: number): string {
  const rem10 = count % 10;
  const rem100 = count % 100;
  if (rem100 >= 11 && rem100 <= 14) return `${count} пациентов`;
  if (rem10 === 1) return `${count} пациент`;
  if (rem10 >= 2 && rem10 <= 4) return `${count} пациента`;
  return `${count} пациентов`;
}

export function WaitlistDrawerHeader({
  targetSlot,
  itemsCount,
  isAddFormOpen,
  onToggleAddForm,
  onMinimize,
  onClose,
}: WaitlistDrawerHeaderProps) {
  return (
    <div className="p-3.5 sm:p-4 border-b border-[var(--line)] bg-[var(--paper-soft)] flex items-center justify-between gap-2 shrink-0">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="p-1.5 rounded-lg bg-[var(--teal)]/15 text-[var(--teal)] shrink-0">
          <Calendar className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm sm:text-base font-bold text-[var(--ink)] whitespace-nowrap m-0">
            Лист ожидания
          </h3>
          <p className="text-[11px] text-[var(--muted)] whitespace-nowrap truncate m-0">
            {targetSlot
              ? "Подбор на свободное окно"
              : `В очереди: ${formatWaitlistCount(itemsCount)}`}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={onToggleAddForm}
          className={`h-8 w-8 sm:w-auto px-0 sm:px-2.5 rounded-lg text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-all cursor-pointer border ${
            isAddFormOpen
              ? "bg-[var(--teal)] text-[var(--on-teal)] border-[var(--teal)]"
              : "bg-[var(--paper)] hover:bg-[var(--paper-soft)] border-[var(--line)] text-[var(--ink)]"
          }`}
          title="Быстро добавить пациента в лист ожидания со стойки за 5 секунд"
          aria-label="Добавить пациента в лист ожидания"
          data-testid="waitlist-quick-add-toggle-btn"
        >
          <UserPlus className="w-3.5 h-3.5 shrink-0" />
          <span className="hidden sm:inline">+ В очередь</span>
        </button>

        <button
          type="button"
          onClick={onMinimize}
          className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)] transition-colors cursor-pointer"
          title="Свернуть шторку"
          aria-label="Свернуть"
        >
          <Minus className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={onClose}
          className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)] transition-colors cursor-pointer"
          aria-label="Закрыть"
          data-testid="waitlist-drawer-close-btn"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
