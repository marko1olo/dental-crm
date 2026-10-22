import React from "react";
import { Copy, Loader2, Printer, Send } from "lucide-react";
import { formatJawScopeLabel, type JawScope } from "../labMath";

export interface DentalLabOrderModalFooterProps {
	jawScope?: JawScope | null;
	selectedTeeth: number[];
	isSubmitting: boolean;
	isEdit: boolean;
	onCopySummary: () => void;
	onPrint: () => void;
	onClose: () => void;
	onSubmit: () => void;
}

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
			{/* Desktop (Studio Mac HIG: 36px regular controls, exactly 1 Primary CTA) */}
			<div className="hidden sm:flex items-center justify-between gap-3 px-6 py-3">
				<div className="text-xs text-[var(--muted)] font-semibold">{teethLabel}</div>
				<div className="flex items-center gap-2">
					<button type="button" onClick={onCopySummary} data-testid="lab-order-copy-messenger-btn" className="secondary-button min-h-[44px] sm:min-h-[36px] sm:h-9 px-3 text-xs font-semibold rounded-lg border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors">
						<Copy className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" /><span>Скопировать для ЗТЛ</span>
					</button>
					<button type="button" onClick={onPrint} data-testid="lab-order-footer-print-btn" className="secondary-button min-h-[44px] sm:min-h-[36px] sm:h-9 px-3 text-xs font-semibold rounded-lg border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors">
						<Printer className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" /><span>Печать (А4)</span>
					</button>
					<button type="button" onClick={onClose} disabled={isSubmitting} className="min-h-[44px] sm:min-h-[36px] sm:h-9 px-3.5 text-xs font-semibold rounded-lg border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer transition-colors">
						Отмена
					</button>
					<button type="button" onClick={onSubmit} disabled={isSubmitting} className="min-h-[44px] sm:min-h-[36px] sm:h-9 px-4 text-xs font-bold rounded-lg bg-[var(--teal,#0d9488)] hover:bg-teal-700 text-white shadow-2xs flex items-center gap-1.5 cursor-pointer transition-all active:scale-[0.98]" data-testid="submit-lab-order-btn">
						{isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
						<span>{isEdit ? "Сохранить изменения" : "Сохранить и отправить наряд"}</span>
					</button>
				</div>
			</div>

			{/* Mobile (Apple HIG: 44-48px touch targets, Natural Thumb Zone, Safe Area) */}
			<div className="flex sm:hidden flex-col gap-2.5 p-3 pb-[max(14px,env(safe-area-inset-bottom))]">
				<div className="text-xs font-semibold text-[var(--muted)] truncate">{teethLabel}</div>
				<div className="grid grid-cols-3 gap-2">
					<button type="button" onClick={onCopySummary} className="min-h-[44px] h-11 px-2 text-xs font-semibold rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] flex items-center justify-center cursor-pointer shadow-2xs active:scale-[0.98]">Копия ЗТЛ</button>
					<button type="button" onClick={onPrint} className="min-h-[44px] h-11 px-2 text-xs font-semibold rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] flex items-center justify-center cursor-pointer shadow-2xs active:scale-[0.98]">Печать А4</button>
					<button type="button" onClick={onClose} className="min-h-[44px] h-11 px-2 text-xs font-semibold rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--muted)] flex items-center justify-center cursor-pointer active:scale-[0.98]">Отмена</button>
				</div>
				<button type="button" onClick={onSubmit} disabled={isSubmitting} className="w-full min-h-[48px] h-12 rounded-xl bg-[var(--teal,#0d9488)] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-xs cursor-pointer active:scale-[0.98] transition-transform" data-testid="submit-lab-order-btn">
					{isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
					<span>{isEdit ? "Сохранить изменения" : "Сохранить и отправить наряд"}</span>
				</button>
			</div>
		</div>
	);
}
