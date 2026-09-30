import { Copy, Plus } from "lucide-react";
import React from "react";

export interface QuickBookingDrawerFooterProps {
  isSubmitting: boolean;
  hasCollision: boolean;
  isDirty: boolean;
  onSubmit: () => void;
  onRequestClose: () => void;
  onDiscardDraft: () => void;
  onCopyConfirmation: () => void;
}

export function QuickBookingDrawerFooter({
  isSubmitting,
  hasCollision,
  isDirty,
  onSubmit,
  onRequestClose,
  onDiscardDraft,
  onCopyConfirmation,
}: QuickBookingDrawerFooterProps) {
  return (
    <div className="p-4 sm:p-5 pb-6 sm:pb-5 border-t border-[var(--line)] bg-[var(--paper-soft)] flex flex-col gap-2.5 shrink-0">
      <button
        type="button"
        disabled={false}
        onClick={onSubmit}
        aria-busy={isSubmitting}
        data-testid="quick-drawer-save-btn"
        className={`w-full min-h-[44px] px-4 font-bold rounded-xl text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer ${
          hasCollision
            ? "bg-amber-600 hover:bg-amber-700 text-white"
            : "bg-[var(--teal-dark)] hover:brightness-110 active:brightness-95 text-[var(--on-teal)]"
        }`}
      >
        <Plus size={16} className="shrink-0" />
        <span className="whitespace-nowrap">
          {isSubmitting
            ? "Сохраняю запись…"
            : hasCollision
              ? "Записать с овербукингом (острая боль)"
              : "Создать запись (Ctrl+Enter)"}
        </span>
      </button>

      <div className="flex items-center justify-between gap-2 w-full">
        <button
          type="button"
          onClick={onRequestClose}
          aria-busy={isSubmitting}
          data-testid="quick-booking-cancel-btn"
          className="min-h-[44px] px-3.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] text-xs font-semibold transition-colors cursor-pointer flex items-center justify-center"
        >
          Отмена (Esc)
        </button>
        <div className="flex items-center gap-2">
          {isDirty && (
            <button
              type="button"
              onClick={onDiscardDraft}
              aria-busy={isSubmitting}
              className="min-h-[40px] px-3 rounded-xl border border-[var(--line)] text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 text-xs font-semibold transition-colors cursor-pointer"
              title="Сбросить все введенные данные без сохранения черновика"
              data-testid="quick-booking-discard-draft-btn"
            >
              Сбросить
            </button>
          )}
          <button
            type="button"
            onClick={onCopyConfirmation}
            data-testid="quick-booking-copy-confirmation-btn"
            className="min-h-[44px] px-3.5 py-1.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            title="Скопировать детали записи для отправки пациенту в WhatsApp/Telegram"
          >
            <Copy size={14} className="text-[var(--teal)] shrink-0" />
            <span>Скопировать для пациента</span>
          </button>
        </div>
      </div>
    </div>
  );
}
