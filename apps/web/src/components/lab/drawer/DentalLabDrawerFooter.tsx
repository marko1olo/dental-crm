import React from "react";
import { Check, X } from "lucide-react";

export interface DentalLabDrawerFooterProps {
	readonly onClose: () => void;
	readonly onSubmit: () => void;
	readonly isEditing: boolean;
}

/**
 * Нижний бар шторки наряд-заказа ЗТЛ (Мандаты 8b, 8am, 8ze <= 120 строк).
 * Компактная вторичная кнопка отмены и яркая Primary CTA для отправки в ЗТЛ в 1 клик.
 */
export function DentalLabDrawerFooter({
	onClose,
	onSubmit,
	isEditing,
}: DentalLabDrawerFooterProps): React.JSX.Element {
	return (
		<div className="p-3 border-t border-[var(--line)] bg-[var(--paper)]/95 backdrop-blur-md flex items-center justify-between sm:justify-end gap-2.5 shrink-0 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]">
			<button
				type="button"
				onClick={onClose}
				className="secondary-button min-h-[44px] sm:min-h-[36px] sm:h-9 px-3 sm:px-4 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink-secondary)] hover:text-[var(--ink)] hover:border-[var(--teal)] font-medium text-xs shadow-2xs inline-flex items-center gap-1.5 transition-colors cursor-pointer active:scale-95 shrink-0"
				title="Отменить и закрыть шторку"
			>
				<X className="w-3.5 h-3.5" />
				<span>Отмена</span>
			</button>
			<button
				type="button"
				onClick={onSubmit}
				className="primary-button min-h-[44px] sm:min-h-[36px] sm:h-9 px-4 sm:px-5 flex-1 sm:flex-none rounded-xl border border-[#0d9488] bg-[#0d9488] hover:bg-[#0f766e] text-white font-bold text-xs inline-flex items-center justify-center gap-2 shadow-2xs transition-transform active:scale-95 cursor-pointer"
				data-testid="form-save-order-btn"
				title={isEditing ? "Сохранить наряд в лабораторию" : "Сформировать наряд в лабораторию"}
			>
				<Check className="w-4 h-4 shrink-0" />
				<span>{isEditing ? "Сохранить" : "Создать наряд"}</span>
			</button>
		</div>
	);
}
