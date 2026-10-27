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

			<div className="flex items-center gap-2">
				<button
					type="button"
					className="h-9 px-4 text-xs font-semibold rounded-xl border border-[var(--border,#cbd5e1)] bg-[var(--paper)] text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f1f5f9)] transition-colors cursor-pointer"
					onClick={onCancel}
				>
					Отмена
				</button>

				<button
					type="button"
					className="h-9 px-5 text-xs font-bold rounded-xl bg-[var(--primary,#0d9488)] hover:brightness-110 active:scale-95 text-white flex items-center gap-2 shadow-xs transition-all cursor-pointer disabled:opacity-50"
					onClick={onConfirm}
					disabled={isSubmitting}
					data-testid="confirm-writeoff-btn"
				>
					<CheckCircle2 size={16} />
					{isSubmitting ? "Списание..." : "Подтвердить списание"}
				</button>
			</div>
		</footer>
	);
};
