/**
 * apps/web/src/components/inventory/writeoff/BatchWriteoffFooterActions.tsx
 *
 * Нижняя панель подтверждения с ровно 1 Primary CTA кнопкой и печатью акта
 * (Мандаты 8e, 8am, 8ze).
 */

import React from "react";
import { PackageCheck, Printer, Zap } from "lucide-react";

export interface BatchWriteoffFooterActionsProps {
	readonly isSubmitting: boolean;
	readonly onPrintAct: () => void;
	readonly onCancel: () => void;
	readonly onConfirm: () => void;
}

export const BatchWriteoffFooterActions: React.FC<BatchWriteoffFooterActionsProps> = ({
	isSubmitting,
	onPrintAct,
	onCancel,
	onConfirm,
}) => {
	return (
		<div className="p-3 sm:p-4 border-t border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3 shrink-0">
			<div className="flex items-center gap-2">
				<button
					type="button"
					onClick={onPrintAct}
					className="secondary-button w-full sm:w-auto px-3.5 py-2 min-h-[44px] text-xs font-medium text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] border border-[var(--line,#e2e8f0)] rounded-lg flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap"
					title="Печать акта списания материалов"
				>
					<Printer size={15} />
					<span>Печать акта</span>
				</button>
			</div>

			<div className="flex items-center gap-2.5 justify-end shrink-0 w-full sm:w-auto">
				<button
					type="button"
					onClick={onCancel}
					disabled={isSubmitting}
					className="secondary-button px-4 py-2 min-h-[44px] text-sm text-[var(--ink,#0f172a)] border border-[var(--line,#e2e8f0)] rounded-lg hover:bg-[var(--paper,#ffffff)] transition-colors shrink-0"
				>
					Отмена
				</button>
				<button
					type="button"
					onClick={onConfirm}
					disabled={isSubmitting}
					className="primary-button btn-confirm-shift-batch-deduction px-5 py-2.5 min-h-[44px] text-sm font-semibold rounded-lg flex-1 sm:flex-none flex items-center justify-center gap-2 shadow-xs whitespace-nowrap"
					style={{ background: "var(--teal, #0d9488)", color: "#ffffff" }}
					data-testid="btn-confirm-shift-batch-deduction"
				>
					{isSubmitting ? (
						<>
							<PackageCheck className="animate-spin shrink-0" size={16} />
							<span>Списание расходников...</span>
						</>
					) : (
						<>
							<Zap size={16} className="shrink-0" />
							<span className="whitespace-nowrap">✓ Списать расходники смены</span>
						</>
					)}
				</button>
			</div>
		</div>
	);
};
