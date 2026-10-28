import React from "react";
import { Copy, Loader2, Printer, Send } from "lucide-react";
import { formatJawScopeLabel, type JawScope } from "../labMath";

export interface DentalLabOrderModalFooterProps {
	readonly jawScope?: JawScope | null;
	readonly selectedTeeth: readonly number[];
	readonly isSubmitting: boolean;
	readonly isEdit: boolean;
	readonly onCopySummary: () => void;
	readonly onPrint: () => void;
	readonly onClose: () => void;
	readonly onSubmit: () => void;
}

/**
 * Нижний бар действий наряд-заказа — строго ОДНА Primary CTA кнопка и нейтральные вторичные (Мандаты 8b, 8am: <= 120 строк).
 */
export function DentalLabOrderModalFooter({
	jawScope,
	selectedTeeth,
	isSubmitting,
	isEdit,
	onCopySummary,
	onPrint,
	onClose,
	onSubmit,
}: DentalLabOrderModalFooterProps) {
	const teethLabel = jawScope
		? `Челюсть: ${formatJawScopeLabel(jawScope)}`
		: selectedTeeth.length > 0
		? `Зубы FDI: ${selectedTeeth.join(", ")}`
		: "Общий наряд / Челюсть";

	return (
		<div className="border-t border-[var(--line)] bg-[var(--paper-soft)] shrink-0">
			{/* Desktop (Studio Mac HIG: 36px controls, exactly 1 Primary CTA teal) */}
			<div className="hidden sm:flex items-center justify-between gap-3 px-6 py-3">
				<div className="text-xs text-[var(--muted)] font-medium">{teethLabel}</div>
				<div className="flex items-center gap-2">
					<button
						type="button" onClick={onCopySummary} data-testid="lab-order-copy-messenger-btn"
						className="min-h-[44px] sm:min-h-[36px] sm:h-9 px-3 text-xs font-medium rounded-lg border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] hover:border-[var(--line-strong)] text-[var(--ink-secondary)] hover:text-[var(--ink)] flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors whitespace-nowrap shrink-0"
					>
						<Copy className="w-3.5 h-3.5 text-[var(--muted)]" />
						<span>Копия наряда</span>
					</button>
					<button
						type="button" onClick={onPrint} data-testid="lab-order-footer-print-btn"
						className="min-h-[44px] sm:min-h-[36px] sm:h-9 px-3 text-xs font-medium rounded-lg border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] hover:border-[var(--line-strong)] text-[var(--ink-secondary)] hover:text-[var(--ink)] flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors whitespace-nowrap shrink-0"
					>
						<Printer className="w-3.5 h-3.5 text-[var(--muted)]" />
						<span>Печать бланка (А4)</span>
					</button>
					<button
						type="button" onClick={onClose} aria-busy={isSubmitting}
						className="min-h-[44px] sm:min-h-[36px] sm:h-9 px-3.5 text-xs font-medium rounded-lg border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] hover:border-[var(--line-strong)] text-[var(--ink-secondary)] hover:text-[var(--ink)] cursor-pointer transition-colors whitespace-nowrap shrink-0"
					>
						Отмена
					</button>
					<button
						type="button" onClick={onSubmit} aria-busy={isSubmitting} data-testid="submit-lab-order-btn"
						className="min-h-[44px] sm:min-h-[36px] sm:h-9 px-4 text-xs font-bold rounded-lg bg-[var(--teal,#0d9488)] hover:bg-teal-700 text-white shadow-2xs flex items-center gap-1.5 cursor-pointer transition-all active:scale-[0.98] whitespace-nowrap shrink-0"
					>
						{isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
						<span>{isEdit ? "✓ Сохранить наряд" : "✓ Отправить наряд в ЗТЛ"}</span>
					</button>
				</div>
			</div>

			{/* Mobile (Apple HIG: 44-52px touch targets, Natural Thumb Zone, Safe Area) */}
			<div className="flex sm:hidden flex-col gap-2.5 p-3 pb-[max(14px,env(safe-area-inset-bottom))]">
				<div className="text-xs font-medium text-[var(--muted)] truncate">{teethLabel}</div>
				<div className="grid grid-cols-3 gap-2">
					<button
						type="button"
						onClick={onCopySummary}
						className="min-h-[44px] h-11 px-2 text-xs font-medium rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink-secondary)] flex items-center justify-center cursor-pointer shadow-2xs active:scale-[0.98]"
					>
						Копия наряда
					</button>
					<button
						type="button"
						onClick={onPrint}
						className="min-h-[44px] h-11 px-2 text-xs font-medium rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink-secondary)] flex items-center justify-center cursor-pointer shadow-2xs active:scale-[0.98]"
					>
						Печать бланка
					</button>
					<button
						type="button"
						onClick={onClose}
						aria-busy={isSubmitting}
						className="min-h-[44px] h-11 px-2 text-xs font-medium rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink-secondary)] flex items-center justify-center cursor-pointer active:scale-[0.98]"
					>
						Отмена
					</button>
				</div>
				<button
					type="button"
					onClick={onSubmit}
					aria-busy={isSubmitting}
					className="w-full min-h-[52px] h-[52px] rounded-xl bg-[var(--teal,#0d9488)] hover:bg-teal-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-xs cursor-pointer active:scale-[0.98] transition-transform"
					data-testid="submit-lab-order-btn"
				>
					{isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
					<span>{isEdit ? "✓ Сохранить наряд в лабораторию (ЗТЛ)" : "✓ Отправить наряд в лабораторию (ЗТЛ)"}</span>
				</button>
			</div>
		</div>
	);
}
