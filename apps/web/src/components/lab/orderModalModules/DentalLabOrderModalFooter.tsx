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
			{/* Desktop */}
			<div className="hidden sm:flex items-center justify-between gap-3 px-6 py-3.5">
				<div className="text-xs text-[var(--muted)] font-bold">{teethLabel}</div>
				<div className="flex items-center gap-2">
					<button type="button" onClick={onCopySummary} data-testid="lab-order-copy-messenger-btn" className="secondary-button min-h-[44px] h-11 px-3.5 text-xs font-bold rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] flex items-center gap-1.5 cursor-pointer shadow-2xs">
						<Copy className="w-3.5 h-3.5 text-teal-600" /><span>Скопировать для ЗТЛ</span>
					</button>
					<button type="button" onClick={onPrint} data-testid="lab-order-footer-print-btn" className="secondary-button min-h-[44px] h-11 px-3.5 text-xs font-bold rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] flex items-center gap-1.5 cursor-pointer shadow-2xs">
						<Printer className="w-3.5 h-3.5 text-teal-600" /><span>Печать (А4)</span>
					</button>
					<button type="button" onClick={onClose} disabled={isSubmitting} className="h-9 min-h-[36px] px-4 text-xs font-bold rounded-xl border border-[var(--line)] hover:bg-[var(--paper-soft)] cursor-pointer">
						Отмена
					</button>
					<button type="button" onClick={onSubmit} disabled={isSubmitting} className="h-9 min-h-[36px] px-5 text-xs font-bold rounded-xl bg-[var(--teal,#0d9488)] text-white shadow-xs hover:opacity-90 flex items-center gap-1.5 cursor-pointer" data-testid="submit-lab-order-btn">
						{isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
						<span>{isEdit ? "Сохранить изменения" : "Создать наряд"}</span>
					</button>
				</div>
			</div>

			{/* Mobile (Apple HIG) */}
			<div className="flex sm:hidden flex-col gap-2 p-3 pb-[max(12px,env(safe-area-inset-bottom))]">
				<div className="flex items-center justify-between text-xs font-bold text-[var(--muted)]">
					<span className="truncate">{teethLabel}</span>
					<div className="flex gap-1">
						<button type="button" onClick={onCopySummary} className="px-2.5 py-1 text-xs font-bold rounded-lg border border-[var(--line)] bg-[var(--paper)]">Копия</button>
						<button type="button" onClick={onPrint} className="px-2.5 py-1 text-xs font-bold rounded-lg border border-[var(--line)] bg-[var(--paper)]">А4</button>
						<button type="button" onClick={onClose} className="px-2.5 py-1 text-xs font-bold rounded-lg border border-[var(--line)]">Отмена</button>
					</div>
				</div>
				<button type="button" onClick={onSubmit} disabled={isSubmitting} className="w-full h-11 rounded-xl bg-[var(--teal,#0d9488)] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-xs cursor-pointer" data-testid="submit-lab-order-btn">
					{isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
					<span>{isEdit ? "Сохранить изменения" : "Создать наряд"}</span>
				</button>
			</div>
		</div>
	);
}
