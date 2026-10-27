import type React from "react";
import { Printer, RotateCcw, ShieldCheck } from "lucide-react";
import { formatMoneyRu } from "./fiscalModalRefundLogic.js";
import type { FiscalReceiptFooterProps } from "./FiscalReceiptFooter.js";

/**
 * Refund, Correction, and Thermal Receipt Preview actions footer.
 * Mandate 8b: <= 120 lines.
 */
export const FiscalFooterRefundCorrection: React.FC<FiscalReceiptFooterProps> = (p) => {
	const { activeTab, totalSumRub, isFiscalizing, onClose, handleExecuteFiscalization, refundFiscalData, fiscalReceipt } = p;

	if (activeTab === "refund") {
		return (
			<>
				<div className="text-xs text-[var(--muted,#64748b)]">К возврату: <strong className="text-sm font-mono text-rose-600 dark:text-rose-400 font-bold">{formatMoneyRu(refundFiscalData.totalRub)}</strong></div>
				<div className="flex items-center gap-2.5">
					<button type="button" onClick={onClose} className="dente-btn dente-btn-secondary min-h-[44px] sm:min-h-0 sm:h-9 px-4 text-xs font-bold cursor-pointer">Закрыть</button>
					<button type="button" onClick={() => handleExecuteFiscalization()} disabled={isFiscalizing} data-testid="btn-refund-footer-execute" className="dente-btn dente-btn-danger min-h-[44px] sm:min-h-0 sm:h-9 px-5 text-xs font-bold disabled:opacity-50 cursor-pointer flex items-center gap-1.5">
						<RotateCcw size={15} /><span>{isFiscalizing ? "Печать чека..." : `Пробить чек возврата на ${formatMoneyRu(refundFiscalData.totalRub)}`}</span>
					</button>
				</div>
			</>
		);
	}

	if (activeTab === "correction") {
		return (
			<>
				<div className="text-xs text-[var(--muted,#64748b)]">Сумма коррекции: <strong className="text-sm font-mono text-amber-600 dark:text-amber-400 font-bold">{formatMoneyRu(totalSumRub)}</strong></div>
				<div className="flex items-center gap-2.5">
					<button type="button" onClick={onClose} className="dente-btn dente-btn-secondary min-h-[44px] sm:min-h-0 sm:h-9 px-4 text-xs font-bold cursor-pointer">Закрыть</button>
					<button type="button" onClick={() => handleExecuteFiscalization()} disabled={isFiscalizing} className="dente-btn dente-btn-primary min-h-[44px] sm:min-h-0 sm:h-9 px-5 text-xs font-bold disabled:opacity-50 cursor-pointer flex items-center gap-1.5">
						<ShieldCheck size={15} /><span>{isFiscalizing ? "Печать чека..." : `Пробить чек коррекции на ${formatMoneyRu(totalSumRub)}`}</span>
					</button>
				</div>
			</>
		);
	}

	return (
		<>
			<div className="text-xs text-[var(--muted,#64748b)]">Кассовый чек · <strong className="font-mono text-[var(--ink,#0f172a)]">{fiscalReceipt.receiptNumber}</strong></div>
			<div className="flex items-center gap-2.5">
				<button type="button" onClick={onClose} className="dente-btn dente-btn-secondary min-h-[44px] sm:min-h-0 sm:h-9 px-4 text-xs font-bold cursor-pointer">Закрыть</button>
				<button type="button" onClick={() => window.print()} className="dente-btn dente-btn-primary min-h-[44px] sm:min-h-0 sm:h-9 px-5 text-xs font-bold flex items-center gap-1.5 cursor-pointer">
					<Printer size={15} /><span>Печать чека</span>
				</button>
			</div>
		</>
	);
};