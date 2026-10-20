import { Check, FileText, ShieldCheck } from "lucide-react";
import type React from "react";
import type { FiscalReceiptFooterProps } from "./FiscalReceiptFooter.js";
import { formatMoneyRu } from "./fiscalModalRefundLogic.js";

/**
 * Payment tab actions footer for FiscalReceiptFooter.
 * Mandate 8b: <= 120 lines.
 */
export const FiscalFooterPaymentActions: React.FC<FiscalReceiptFooterProps> = ({
	totalSumRub,
	remainingRub,
	allocation,
	isFiscalizing,
	onClose,
	handlePrintSalesSlip,
	handleExecuteFiscalization,
}) => {
	return (
		<>
			<div className="text-xs text-[var(--muted,#64748b)] flex items-center justify-between sm:justify-start gap-2">
				<span>
					К оплате:{" "}
					<strong className="text-sm font-mono text-[var(--ink,#0f172a)] font-bold">
						{formatMoneyRu(totalSumRub)}
					</strong>
				</span>
				<span>·</span>
				<span
					className={
						allocation.isFullyAllocated
							? "text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1"
							: "text-amber-600 dark:text-amber-400 font-bold"
					}
				>
					{allocation.isFullyAllocated ? (
						<>
							<Check size={14} className="shrink-0" />
							<span>Сумма распределена</span>
						</>
					) : (
						`Остаток: ${formatMoneyRu(remainingRub)}`
					)}
				</span>
			</div>
			<div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2 sm:gap-2.5">
				<div className="flex items-center gap-2 w-full sm:w-auto">
					<button
						type="button"
						onClick={handlePrintSalesSlip}
						className="flex-1 sm:flex-none min-h-[44px] sm:min-h-0 h-11 sm:h-9 px-3 rounded-xl font-bold text-xs bg-[var(--paper-strong,var(--paper,#ffffff))] border border-[var(--line)] text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f8fafc)] flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-2xs"
						data-testid="btn-print-sales-slip-modal"
						title="Напечатать товарный чек без отправки в налоговую"
					>
						<FileText size={14} className="text-teal-600" />
						<span>Товарный чек</span>
					</button>
					<button
						type="button"
						onClick={onClose}
						className="flex-1 sm:flex-none min-h-[44px] sm:min-h-0 h-11 sm:h-9 px-4 rounded-xl font-bold text-xs bg-[var(--paper-strong,var(--paper,#ffffff))] border border-[var(--line)] text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] flex items-center justify-center cursor-pointer transition-colors"
					>
						Закрыть
					</button>
				</div>
				<button
					type="button"
					onClick={() => handleExecuteFiscalization()}
					disabled={isFiscalizing}
					data-testid="btn-execute-fiscalization btn-fiscalize-receipt"
					title={isFiscalizing ? "Идет печать чека на кассе..." : undefined}
					className="w-full sm:w-auto min-h-[52px] sm:min-h-0 h-[52px] sm:h-9 px-5 rounded-xl font-bold text-sm sm:text-xs bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,#ffffff)] hover:opacity-90 disabled:opacity-50 shadow-md cursor-pointer transition-all active:scale-[0.99] flex items-center justify-center gap-1.5 shrink-0"
				>
					<ShieldCheck size={16} />
					<span>
						{isFiscalizing
							? "Печать кассового чека..."
							: totalSumRub === 0
								? "Пробить чек 0.00 ₽ (Гарантия)"
								: `Пробить кассовый чек на ${formatMoneyRu(totalSumRub)}`}
					</span>
				</button>
			</div>
		</>
	);
};
