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
    <div className="sticky bottom-0 z-20 p-4 sm:p-5 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] border-t border-[var(--line)] bg-[var(--paper-soft)]/95 backdrop-blur-md flex flex-col gap-2 shrink-0 shadow-lg">
      <button
        type="button"
        disabled={false}
        onClick={onSubmit}
        aria-busy={isSubmitting}
        data-testid="quick-drawer-save-btn"
        className={`primary-button w-full min-h-[44px] font-semibold text-sm transition-all cursor-pointer select-none active:scale-[0.99] ${
          hasCollision
            ? "!bg-amber-600 hover:!bg-amber-700 !border-amber-600"
            : "!bg-[var(--teal-dark)] text-white hover:brightness-110"
        }`}
      >
        <Plus size={16} className="shrink-0" />
        <span className="whitespace-nowrap">
          {isSubmitting ? (
            "Сохраняю запись…"
          ) : hasCollision ? (
            "Записать на это время (острая боль)"
          ) : (
            <>
              Записать на приём
              <span className="hidden sm:inline"> (Создать запись Ctrl+Enter)</span>
            </>
          )}
        </span>
      </button>

      <div className="flex items-center justify-between gap-1.5 sm:gap-2 w-full">
        <button
          type="button"
          onClick={onRequestClose}
          aria-busy={isSubmitting}
          data-testid="quick-booking-cancel-btn"
          className="secondary-button min-h-[44px] px-2.5 sm:px-3 bg-[var(--paper)] text-[var(--ink)] text-xs sm:text-sm shrink-0"
        >
          Отмена (Esc)
        </button>
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {isDirty && (
            <button
              type="button"
              onClick={onDiscardDraft}
              aria-busy={isSubmitting}
              className="danger-button min-h-[44px] px-2.5 sm:px-3 text-xs shrink-0"
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
            className="secondary-button min-h-[44px] px-2.5 sm:px-3 inline-flex items-center gap-1.5 text-xs shrink-0"
            title="Скопировать детали записи для отправки пациенту в WhatsApp/Telegram"
          >
            <Copy size={14} className="text-[var(--teal)] shrink-0" />
            <span>Скопировать<span className="hidden sm:inline"> для пациента</span></span>
          </button>
        </div>
      </div>
    </div>
  );
}
