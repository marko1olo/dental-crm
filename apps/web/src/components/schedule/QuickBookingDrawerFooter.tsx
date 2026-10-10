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
    <div className="p-4 sm:p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] border-t border-[var(--line)] bg-[var(--paper-soft)] flex flex-col gap-2.5 shrink-0">
      <button
        type="button"
        disabled={false}
        onClick={onSubmit}
        aria-busy={isSubmitting}
        data-testid="quick-drawer-save-btn"
        className={`btn-primary w-full !h-11 !min-h-[44px] !max-h-[44px] px-4 font-medium !rounded-[14px] text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer select-none active:scale-[0.99] ${
          hasCollision
            ? "!bg-amber-600 hover:!bg-amber-700 !text-white shadow-amber-500/20 !border-amber-600"
            : "!bg-[var(--teal-dark)] hover:brightness-110 active:brightness-95 !text-white shadow-teal-500/20"
        }`}
      >
        <Plus size={16} className="shrink-0" />
        <span className="whitespace-nowrap">
          {isSubmitting
            ? "Сохраняю запись…"
            : hasCollision
              ? "Записать на это время (острая боль)"
              : "Создать запись (Ctrl+Enter)"}
        </span>
      </button>

      <div className="flex items-center justify-between gap-2 w-full">
        <button
          type="button"
          onClick={onRequestClose}
          aria-busy={isSubmitting}
          data-testid="quick-booking-cancel-btn"
          className="h-11 min-h-[44px] px-3.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] text-xs font-medium transition-colors cursor-pointer flex items-center justify-center select-none"
        >
          Отмена (Esc)
        </button>
        <div className="flex items-center gap-2">
          {isDirty && (
            <button
              type="button"
              onClick={onDiscardDraft}
              aria-busy={isSubmitting}
              className="h-11 min-h-[44px] px-3 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 hover:bg-rose-100/50 dark:hover:bg-rose-900/40 text-xs font-medium transition-colors cursor-pointer select-none"
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
            className="h-11 min-h-[44px] px-3.5 py-1.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] text-xs font-medium transition-colors cursor-pointer flex items-center justify-center gap-1.5 select-none"
            title="Скопировать детали записи для отправки пациенту в WhatsApp/Telegram"
          >
            <Copy size={14} className="text-[var(--teal,#0d9488)] shrink-0" />
            <span>Скопировать для пациента</span>
          </button>
        </div>
      </div>
    </div>
  );
}
