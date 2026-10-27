import React from "react";
import { Wallet } from "lucide-react";
import type { CombinedFamilyBillingResult } from "@dental/shared";

export interface FamilyBillingWalletOffsetSectionProps {
	readonly useFamilyWallet: boolean;
	readonly setUseFamilyWallet: (val: boolean) => void;
	readonly availableFamilyWalletRub: number;
	readonly billingResult: CombinedFamilyBillingResult;
}

export const FamilyBillingWalletOffsetSection: React.FC<FamilyBillingWalletOffsetSectionProps> = ({
	useFamilyWallet,
	setUseFamilyWallet,
	availableFamilyWalletRub,
	billingResult,
}) => {
	return (
		<div className="p-4 rounded-xl bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] space-y-3">
			<div className="flex items-center justify-between">
				<label className="flex items-center gap-2.5 cursor-pointer font-extrabold text-sm text-[var(--ink,#0f172a)]">
					<input
						type="checkbox"
						checked={useFamilyWallet}
						onChange={(e) => setUseFamilyWallet(e.target.checked)}
						className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 cursor-pointer"
					/>
					<span className="flex items-center gap-1.5">
						<Wallet size={16} className="text-emerald-500" />
						Зачесть семейный аванс (безналичный расчет)
					</span>
				</label>
				<div className="flex items-center gap-2 flex-wrap">
					<span className="font-mono text-xs font-bold text-emerald-600 bg-emerald-500/10 px-2.5 py-1 rounded-lg">
						Доступно для списания: {availableFamilyWalletRub.toLocaleString("ru-RU")} ₽
					</span>
					<span className="text-[11px] font-semibold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-[var(--line,#e2e8f0)]">
						Овердрафт: Запрещен (баланс ≥ 0 ₽)
					</span>
				</div>
			</div>

			{useFamilyWallet && (
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[var(--line,#e2e8f0)]">
					<div>
						<span className="text-xs text-[var(--muted,#64748b)]">Сумма списания с депозита:</span>
						<div className="text-lg font-mono font-bold text-emerald-600 mt-0.5">
							−{billingResult.defaultSplit.familyWalletOffsetRub.toLocaleString("ru-RU")} ₽
						</div>
					</div>
					<div>
						<span className="text-xs text-[var(--muted,#64748b)]">Остаток к доплате:</span>
						<div className="text-xl font-mono font-black text-rose-600 dark:text-rose-400 mt-0.5">
							{billingResult.defaultSplit.remainingDueRub.toLocaleString("ru-RU")} ₽
						</div>
					</div>
				</div>
			)}
		</div>
	);
};
