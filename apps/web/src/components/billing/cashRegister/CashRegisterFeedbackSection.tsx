/**
 * CashRegisterFeedbackSection.tsx — Error Retry Banner & Fiscal Success Card.
 * Mandate 8b: <= 70 lines. Mandate 8e: Doctor & Cashier Autonomy.
 */

import React from "react";
import { Check, AlertCircle } from "lucide-react";

export interface CashRegisterFeedbackSectionProps {
	readonly errorMessage: string | null;
	readonly onRetry: () => void;
	readonly receiptSuccess: any | null;
	readonly clinicLegalName: string;
}

export const CashRegisterFeedbackSection: React.FC<CashRegisterFeedbackSectionProps> = ({
	errorMessage,
	onRetry,
	receiptSuccess,
	clinicLegalName,
}) => {
	return (
		<>
			{errorMessage && (
				<div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300 flex items-start gap-2.5 text-xs">
					<AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
					<div className="flex-1">
						<p className="font-semibold">Сбой операции</p>
						<p className="mt-0.5">{errorMessage}</p>
					</div>
					<button
						type="button"
						onClick={onRetry}
						className="min-h-[36px] px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-[11px] font-semibold shrink-0"
					>
						Повторить
					</button>
				</div>
			)}

			{receiptSuccess && (
				<div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 flex items-center gap-2.5 text-xs animate-in zoom-in-95">
					<Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
					<div>
						<span className="font-bold">Оплата успешно проведена!</span>
						<p className="text-[11px] text-emerald-700 dark:text-emerald-400">
							Кассовый чек {receiptSuccess.fiscalReceiptNumber || "сформирован"} • {clinicLegalName}
						</p>
					</div>
				</div>
			)}
		</>
	);
};

export default CashRegisterFeedbackSection;
