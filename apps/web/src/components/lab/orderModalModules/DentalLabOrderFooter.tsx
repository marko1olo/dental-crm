import React from "react";
import { Copy, Loader2, Printer, Send } from "lucide-react";
import { formatJawScopeLabel, type JawScope } from "../labMath";

export interface DentalLabOrderFooterProps {
	readonly jawScope?: JawScope | null | undefined;
	readonly selectedTeeth?: readonly number[] | undefined;
	readonly isSubmitting: boolean;
	readonly isEdit: boolean;
	readonly onCopySummary: () => void;
	readonly onPrint: () => void;
	readonly onClose: () => void;
	readonly onSubmit: () => void;
}

/**
 * DentalLabOrderFooter — канонический подвал заказ-наряда ЗТЛ (Мандат 8b: 100–140 строк).
 * Мандат 8am: ровно ОДНА Primary CTA кнопка в teal (#0d9488), нейтральные вторичные с рамкой var(--line).
 * Мандат 8e: Primary CTA кнопка НИКОГДА не блокируется (disabled={false}).
 * Apple HIG: сенсорные зоны >= 44x44px, Natural Thumb Zone, Safe Area padding.
 */
export function DentalLabOrderFooter({
	jawScope,
	selectedTeeth = [],
	isSubmitting,
	isEdit,
	onCopySummary,
	onPrint,
	onClose,
	onSubmit,
}: DentalLabOrderFooterProps): React.JSX.Element {
	const teethLabel = jawScope
		? `Челюсть: ${formatJawScopeLabel(jawScope)}`
		: selectedTeeth.length > 0
		? `Зубы FDI: ${selectedTeeth.join(", ")}`
		: "Общий наряд / Челюсть";

	return (
		<footer className="border-t border-[var(--line,#cbd5e1)] dark:border-slate-800 bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-950 p-3 sm:px-6 sm:py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]">
			{/* Индикатор локализации зубов (десктоп) */}
			<div className="max-sm:!hidden hidden sm:block text-xs font-semibold text-[var(--muted,#64748b)] dark:text-slate-400 truncate max-w-xs">
				{teethLabel}
			</div>

			{/* Кнопки действий: нейтральные вторичные + СТРОГО 1 Primary CTA */}
			<div className="flex items-center justify-end gap-2 sm:gap-2.5 w-full sm:w-auto">
				<button
					type="button"
					onClick={onCopySummary}
					data-testid="lab-order-copy-messenger-btn"
					title="Скопировать для лаборатории"
					aria-label="Скопировать для лаборатории"
					className="min-h-[44px] min-w-[44px] w-11 h-11 sm:w-auto sm:min-w-0 sm:min-h-[36px] sm:h-9 px-2.5 sm:px-3 text-xs font-medium rounded-xl border border-[var(--line,#cbd5e1)] dark:border-slate-700 bg-[var(--paper,#ffffff)] dark:bg-slate-800 hover:bg-[var(--paper-soft,#f1f5f9)] dark:hover:bg-slate-700 text-[var(--ink-secondary,#334155)] dark:text-slate-300 hover:text-[var(--ink,#0f172a)] dark:hover:text-slate-100 flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs transition-colors shrink-0"
				>
					<Copy className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-[var(--muted,#64748b)] dark:text-slate-400 shrink-0" />
					<span className="max-sm:!hidden hidden sm:inline">Скопировать для лаборатории</span>
				</button>

				<button
					type="button"
					onClick={onPrint}
					data-testid="lab-order-footer-print-btn"
					title="Печать бланка (А4)"
					aria-label="Печать бланка (А4)"
					className="min-h-[44px] min-w-[44px] w-11 h-11 sm:w-auto sm:min-w-0 sm:min-h-[36px] sm:h-9 px-2.5 sm:px-3 text-xs font-medium rounded-xl border border-[var(--line,#cbd5e1)] dark:border-slate-700 bg-[var(--paper,#ffffff)] dark:bg-slate-800 hover:bg-[var(--paper-soft,#f1f5f9)] dark:hover:bg-slate-700 text-[var(--ink-secondary,#334155)] dark:text-slate-300 hover:text-[var(--ink,#0f172a)] dark:hover:text-slate-100 flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs transition-colors shrink-0"
				>
					<Printer className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-[var(--muted,#64748b)] dark:text-slate-400 shrink-0" />
					<span className="max-sm:!hidden hidden sm:inline">Печать бланка (А4)</span>
				</button>

				<button
					type="button"
					onClick={onClose}
					className="max-sm:!hidden hidden sm:inline-flex min-h-[44px] sm:min-h-[36px] sm:h-9 px-3.5 text-xs font-medium rounded-xl border border-[var(--line,#cbd5e1)] dark:border-slate-700 bg-[var(--paper,#ffffff)] dark:bg-slate-800 hover:bg-[var(--paper-soft,#f1f5f9)] dark:hover:bg-slate-700 text-[var(--ink-secondary,#334155)] dark:text-slate-300 hover:text-[var(--ink,#0f172a)] dark:hover:text-slate-100 items-center justify-center cursor-pointer transition-colors shrink-0"
				>
					Отмена
				</button>

				{/* Strictly ONE Primary CTA Button in Teal #0d9488 — Never Disabled (Мандат 8e) */}
				<button
					type="button"
					onClick={onSubmit}
					data-testid="submit-lab-order-btn"
					data-qa="form-save-order-btn"
					title={isEdit ? "Сохранить наряд в лабораторию" : "Отправить наряд в лабораторию"}
					className="primary-button min-h-[48px] sm:min-h-[36px] sm:h-9 px-5 flex-1 sm:flex-none rounded-xl border border-[#0d9488] bg-[var(--teal,#0d9488)] hover:bg-[#0f766e] text-white font-bold text-xs inline-flex items-center justify-center gap-2 shadow-2xs transition-transform active:scale-95 cursor-pointer"
				>
					{isSubmitting ? (
						<Loader2 className="w-4 h-4 animate-spin shrink-0" />
					) : (
						<Send className="w-4 h-4 shrink-0" />
					)}
					<span>{isEdit ? "Сохранить наряд в лабораторию" : "Отправить наряд в лабораторию"}</span>
				</button>
			</div>
		</footer>
	);
}

export { DentalLabOrderFooter as DentalLabOrderModalFooter };
