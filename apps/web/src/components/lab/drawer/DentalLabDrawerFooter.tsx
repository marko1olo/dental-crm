import React from "react";
import { Check } from "lucide-react";

export interface DentalLabDrawerFooterProps {
	readonly onClose: () => void;
	readonly onSubmit: () => void;
	readonly isEditing: boolean;
}

export function DentalLabDrawerFooter({
	onClose,
	onSubmit,
	isEditing,
}: DentalLabDrawerFooterProps): React.JSX.Element {
	return (
		<div className="p-3 border-t border-[var(--line)] bg-[var(--paper)]/95 backdrop-blur-md flex items-center justify-end gap-2.5 shrink-0 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]">
			<button
				type="button"
				onClick={onClose}
				className="secondary-button min-h-[44px] sm:min-h-[36px] sm:h-9 px-4 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:border-[var(--teal)] font-bold text-xs shadow-2xs transition-colors cursor-pointer active:scale-95"
			>
				Отмена
			</button>
			<button
				type="button"
				onClick={onSubmit}
				className="primary-button min-h-[44px] sm:min-h-[36px] sm:h-9 px-5 rounded-xl border border-[var(--teal)] bg-[var(--teal)] hover:bg-[var(--teal-dark,#0d736b)] text-white font-bold text-xs inline-flex items-center gap-2 shadow-2xs transition-transform active:scale-95 cursor-pointer"
				data-testid="form-save-order-btn"
			>
				<Check className="w-4 h-4" />
				<span>{isEditing ? "Сохранить наряд в ЗТЛ" : "Сформировать наряд в ЗТЛ"}</span>
			</button>
		</div>
	);
}
