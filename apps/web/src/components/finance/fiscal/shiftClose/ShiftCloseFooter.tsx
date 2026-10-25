/**
 * ShiftCloseFooter.tsx — Footer with Totals and Exactly One Primary CTA.
 * Mandate 8am: Exactly ONE Primary CTA button per visible context.
 * Mandate 8e: 0 disabled buttons, aria-busy state indicators.
 * Apple HIG: safe-area inset protection.
 */

import React from "react";
import { Lock } from "lucide-react";
import type { Ffd12ShiftCloseZReportSummary } from "../fiscal54fzEngine";

export interface ShiftCloseFooterProps {
	readonly reportSummary: Ffd12ShiftCloseZReportSummary;
	readonly isSubmitting: boolean;
	readonly onClose: () => void;
	readonly onConfirmClose: () => Promise<void>;
}

export const ShiftCloseFooter: React.FC<ShiftCloseFooterProps> = ({
	reportSummary,
	isSubmitting,
	onClose,
	onConfirmClose,
}) => {
	return (
		<div className="p-3 sm:p-5 border-t border-[var(--line)] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[var(--paper-soft)] shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
			<div className="flex items-center justify-between sm:justify-start gap-2 text-xs text-[var(--muted)]">
				<span>Выручка: <strong className="text-[var(--ink)]">{reportSummary.netRevenueRub.toLocaleString("ru-RU")} ₽</strong></span>
				<span>•</span>
				<span>В ящике: <strong className="text-emerald-700 dark:text-emerald-300">{reportSummary.cashInDrawerRub.toLocaleString("ru-RU")} ₽</strong></span>
			</div>

			<div className="flex items-center gap-2.5 w-full sm:w-auto">
				<button
					type="button"
					onClick={onClose}
					className="btn-secondary flex-1 sm:flex-none min-h-[44px] sm:min-h-[36px]"
				>
					Отмена
				</button>
				<button
					type="button"
					onClick={onConfirmClose}
					aria-busy={isSubmitting}
					className="btn-primary flex-2 sm:flex-none min-h-[44px] sm:min-h-[36px]"
					data-testid="btn-confirm-close-shift-zreport"
				>
					<Lock size={16} className="shrink-0" />
					<span className="sm:hidden">{isSubmitting ? "Отправка..." : "Закрыть смену"}</span>
					<span className="hidden sm:inline">{isSubmitting ? "Отправка в ОФД..." : "Закрыть смену и отправить Z-отчет в ОФД"}</span>
				</button>
			</div>
		</div>
	);
};
