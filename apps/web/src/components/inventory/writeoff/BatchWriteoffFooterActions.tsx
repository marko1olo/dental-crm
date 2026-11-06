/**
 * apps/web/src/components/inventory/writeoff/BatchWriteoffFooterActions.tsx
 *
 * Нижняя панель подтверждения с ровно 1 Primary CTA кнопкой и печатью акта
 * (Мандаты 8e, 8am, 8ze).
 */

import React from "react";
import { Loader2, Printer, Zap } from "lucide-react";

export interface BatchWriteoffFooterActionsProps {
	readonly isSubmitting: boolean;
	readonly onPrintAct: () => void;
	readonly onCancel: () => void;
	readonly onConfirm: () => void;
	readonly confirmTestId?: string | undefined;
	readonly confirmLabel?: string | undefined;
}

export const BatchWriteoffFooterActions: React.FC<BatchWriteoffFooterActionsProps> = ({
	isSubmitting,
	onPrintAct,
	onCancel,
	onConfirm,
	confirmTestId,
	confirmLabel,
}) => {
	return (
		<div className="p-3 sm:p-4 border-t border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3 shrink-0">
			<div className="flex items-center gap-2">
				<button
					type="button"
					onClick={onPrintAct}
					className="secondary-button w-full sm:w-auto px-3.5 py-2 h-11 sm:h-9 min-h-[44px] sm:min-h-[36px] text-xs font-medium text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] rounded-xl flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap"
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
					className="secondary-button px-4 py-2 h-11 sm:h-9 min-h-[44px] sm:min-h-[36px] text-xs sm:text-sm text-[var(--ink,#0f172a)] border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] rounded-xl hover:bg-[var(--paper-soft,#f8fafc)] transition-colors shrink-0"
				>
					Отмена
				</button>
				<button
					type="button"
					onClick={() => {
						if (!isSubmitting) {
							onConfirm();
						}
					}}
					aria-busy={isSubmitting}
					className="primary-button btn-confirm-shift-batch-deduction btn-confirm-deduction px-5 h-11 sm:h-9 min-h-[44px] sm:min-h-[36px] text-sm font-semibold rounded-xl flex-1 sm:flex-none flex items-center justify-center gap-2 shadow-xs whitespace-nowrap cursor-pointer transition-opacity hover:opacity-95 text-white"
					style={{ background: "var(--teal, #0d9488)", color: "#ffffff" }}
					data-testid={confirmTestId || "btn-confirm-shift-batch-deduction"}
					data-cy="btn-confirm-deduction"
				>
					{isSubmitting ? (
						<>
							<Loader2 className="animate-spin shrink-0" size={16} />
							<span>Списание расходников...</span>
						</>
					) : (
						<>
							<Zap size={16} className="shrink-0" />
							<span className="whitespace-nowrap">{confirmLabel || "✓ Списать расходники смены"}</span>
						</>
					)}
				</button>
			</div>
		</div>
	);
};
