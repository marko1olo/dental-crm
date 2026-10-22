import React from "react";
import { Sparkles } from "lucide-react";
import type { CombinedFamilyBillingResult } from "@dental/shared";

interface FamilyCombinedBillingFooterProps {
	readonly billingResult: CombinedFamilyBillingResult;
	readonly useFamilyWallet: boolean;
	readonly isFiscalizing: boolean;
	readonly activeItemsCount: number;
	readonly onClose: () => void;
	readonly onExecuteFiscalization: () => void;
}

export function FamilyCombinedBillingFooter({
	billingResult,
	useFamilyWallet,
	isFiscalizing,
	activeItemsCount,
	onClose,
	onExecuteFiscalization,
}: FamilyCombinedBillingFooterProps) {
	return (
		<div className="p-4 sm:p-5 border-t border-[var(--line,#e2e8f0)] flex items-center justify-between flex-wrap gap-3 bg-[var(--paper,#ffffff)] shrink-0">
			<div className="flex items-center gap-3">
				<div>
					<span className="text-[11px] text-[var(--muted,#64748b)] font-bold uppercase">Итого к оплате:</span>
					<div className="text-xl sm:text-2xl font-black font-mono text-[var(--ink,#0f172a)]">
						{billingResult.totalAmountRub.toLocaleString("ru-RU")} ₽
					</div>
				</div>
				{useFamilyWallet && billingResult.defaultSplit.familyWalletOffsetRub > 0 && (
					<div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
						(Депозит: {billingResult.defaultSplit.familyWalletOffsetRub.toLocaleString("ru-RU")} ₽ + Доплата: {billingResult.defaultSplit.remainingDueRub.toLocaleString("ru-RU")} ₽)
					</div>
				)}
			</div>

			<div className="flex items-center gap-2.5">
				<button
					type="button"
					onClick={onClose}
					className="min-h-[44px] px-5 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f8fafc)] font-semibold text-xs cursor-pointer transition-colors"
				>
					Отмена
				</button>

				<button
					type="button"
					onClick={onExecuteFiscalization}
					disabled={isFiscalizing}
					title={
						activeItemsCount === 0
							? "Выберите хотя бы одну позицию для формирования чека"
							: isFiscalizing
							? "Выполняется фискализация..."
							: `Принять оплату на сумму ${billingResult.totalAmountFormattedRu} и выдать чек`
					}
					className="min-h-[44px] px-6 rounded-xl bg-teal-600 hover:bg-teal-700 active:scale-95 text-white font-bold text-xs inline-flex items-center gap-2 cursor-pointer shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
					data-testid="btn-execute-family-fiscal-checkout"
				>
					<Sparkles size={16} />
					<span>{isFiscalizing ? "Формируем чек..." : "Принять оплату и выдать чек"}</span>
				</button>
			</div>
		</div>
	);
}
