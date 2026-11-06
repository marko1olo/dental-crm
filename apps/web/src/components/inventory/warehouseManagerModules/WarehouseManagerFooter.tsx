import { CheckCircle2 } from "lucide-react";
import React from "react";

export interface WarehouseManagerFooterProps {
	readonly writeoffCount: number;
	readonly totalWriteoffCostRub: number;
	readonly isSubmitting: boolean;
	readonly onCancel: () => void;
	readonly onConfirm: () => void;
}

export const WarehouseManagerFooter: React.FC<WarehouseManagerFooterProps> = ({
	writeoffCount,
	totalWriteoffCostRub,
	isSubmitting,
	onCancel,
	onConfirm,
}) => {
	return (
		<footer className="px-5 py-3.5 border-t border-[var(--border,#e2e8f0)] bg-[var(--paper-strong,#f8fafc)] flex items-center justify-between gap-3 shrink-0">
			<div className="text-xs">
				<span className="text-[var(--muted,#64748b)]">Выбрано к списанию:</span>{" "}
				<strong className="text-[var(--ink,#0f172a)]">{writeoffCount} поз.</strong> • Сумма:{" "}
				<strong className="text-teal-700 dark:text-teal-400 font-mono text-sm">
					{totalWriteoffCostRub.toFixed(2)} ₽
				</strong>
			</div>

			<div className="flex items-center gap-2 shrink-0">
				<button
					type="button"
					className="h-11 md:h-9 min-h-[44px] md:min-h-[36px] px-4 text-xs font-semibold rounded-xl border border-[var(--border,#cbd5e1)] bg-[var(--paper)] text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f1f5f9)] transition-colors cursor-pointer flex-1 sm:flex-none justify-center inline-flex items-center whitespace-nowrap"
					onClick={onCancel}
				>
					Отмена
				</button>

				<button
					type="button"
					className="h-11 md:h-9 min-h-[44px] md:min-h-[36px] px-6 text-xs font-bold rounded-xl bg-[#0d9488] hover:bg-[#0f766e] active:scale-95 text-white flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer flex-1 sm:flex-none whitespace-nowrap shrink-0"
					onClick={onConfirm}
					data-testid="confirm-writeoff-btn"
				>
					<CheckCircle2 size={16} className="shrink-0" />
					<span className="whitespace-nowrap">{isSubmitting ? "Списание..." : "Списать материалы"}</span>
				</button>
			</div>
		</footer>
	);
};
