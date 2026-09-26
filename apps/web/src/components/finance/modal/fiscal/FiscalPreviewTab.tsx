import React from "react";
import { Printer } from "lucide-react";
import { Order804nFiscalReceiptPrint } from "../../Order804nFiscalReceiptPrint";
import type { FiscalReceipt54FzResult } from "../../order804nFiscalEngine";

export interface FiscalPreviewTabProps {
	fiscalReceipt: FiscalReceipt54FzResult;
}

export const FiscalPreviewTab: React.FC<FiscalPreviewTabProps> = ({ fiscalReceipt }) => {
	return (
		<div className="space-y-4">
			<div className="flex justify-end gap-2">
				<button
					type="button"
					onClick={() => window.print()}
					className="min-h-[44px] flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-[var(--paper-soft,#f8fafc)] border border-[var(--border,#cbd5e1)] hover:bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink,#0f172a)] cursor-pointer transition-colors"
				>
					<Printer size={16} />
					<span>Печать чека</span>
				</button>
			</div>

			<Order804nFiscalReceiptPrint receipt={fiscalReceipt} />
		</div>
	);
};
