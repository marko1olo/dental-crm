import React from "react";
import { CheckCircle2, ShieldCheck } from "lucide-react";
import { parseChestnyZnakDataMatrix } from "@dental/shared";
import type { mapTreatmentItemsToFiscalReceipt } from "../../../fiscalReceiptEngine";
import { formatMoneyRu } from "../fiscalModalRefundLogic";

export interface PaymentMdlpMarkingSectionProps {
	readonly fiscalData: ReturnType<typeof mapTreatmentItemsToFiscalReceipt>;
	readonly mdlpCodes: Record<string, string>;
	readonly handleUpdateMdlpCode: (itemId: string, code: string) => void;
}

export const PaymentMdlpMarkingSection: React.FC<PaymentMdlpMarkingSectionProps> = ({
	fiscalData,
	mdlpCodes,
	handleUpdateMdlpCode,
}) => {
	const markedItems = fiscalData.items.filter((i) => i.isMarkedItem);
	if (markedItems.length === 0) return null;

	return (
		<div className="p-3.5 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-700/60 space-y-2">
			<div className="flex items-center justify-between text-xs">
				<span className="font-extrabold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
					<ShieldCheck size={16} className="text-amber-600" />
					Маркированные препараты (Честный ЗНАК)
				</span>
				<span className="px-2.5 py-1 rounded text-xs font-mono font-bold bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-amber-100">
					Маркировка
				</span>
			</div>
			<p className="text-xs text-amber-800 dark:text-amber-300">
				В счете присутствуют лекарственные препараты / имплантаты, подлежащие списанию при продаже.
			</p>
			<div className="space-y-2 pt-1">
				{markedItems.map((markedItem) => {
					const currentCode = mdlpCodes[markedItem.id] || "";
					const parseResult = currentCode ? parseChestnyZnakDataMatrix(currentCode) : null;
					return (
						<div
							key={markedItem.id}
							className="p-3 rounded-xl bg-[var(--paper-strong,var(--paper,#ffffff))] border border-amber-200 dark:border-amber-800/60 space-y-2"
						>
							<div className="flex items-center justify-between text-xs">
								<span className="font-bold text-[var(--ink,#0f172a)] truncate max-w-[280px]">
									{markedItem.name}
								</span>
								<span className="text-xs font-mono text-[var(--muted,#64748b)]">
									{formatMoneyRu(markedItem.amountRub)}
								</span>
							</div>
							<div className="flex items-center gap-2">
								<input
									type="text"
									value={currentCode}
									onChange={(e) => handleUpdateMdlpCode(markedItem.id, e.target.value)}
									placeholder="Отсканируйте GS1 DataMatrix (01)...(21)..."
									className="min-h-[44px] flex-1 px-3.5 py-2 text-xs font-mono rounded-xl border border-[var(--border,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)]"
								/>
								{parseResult?.isValid ? (
									<span className="shrink-0 min-h-[44px] px-3 py-2 rounded-xl bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center gap-1">
										<CheckCircle2 size={16} /> [М] ОК
									</span>
								) : currentCode ? (
									<span className="shrink-0 min-h-[44px] px-3 py-2 rounded-xl bg-rose-100 dark:bg-rose-900 text-rose-800 dark:text-rose-200 text-xs font-bold flex items-center">
										Ошибка GS1
									</span>
								) : null}
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
};
