/**
 * apps/web/src/components/billing/paymentPaneModules/PaymentPaneDepositTender.tsx
 *
 * Family deposit offset cockpit (Mandate 8e & 8n: 1-click offset).
 * Strictly <= 120 lines per Mandate 8b.
 */

import React from "react";
import { Wallet, CheckCircle2, Layers } from "lucide-react";
import { showToast } from "../../GlobalToast.js";

interface PaymentPaneDepositTenderProps {
	readonly amountRub: number;
	readonly patientDepositRub: number;
	readonly patientFamilyBalanceRub: number;
	readonly totalAvailableDepositRub: number;
	readonly isSubmitting: boolean;
	readonly finalizeReceipt: (method: any, sum: number) => Promise<void>;
	readonly setSplitDepositRub: (val: number) => void;
	readonly setSplitSbpRub: (val: number) => void;
	readonly setSplitCashRub: (val: number) => void;
	readonly setSplitCardRub: (val: number) => void;
	readonly setActiveMethod: (method: any) => void;
}

export const PaymentPaneDepositTender: React.FC<PaymentPaneDepositTenderProps> = ({
	amountRub,
	patientDepositRub,
	patientFamilyBalanceRub,
	totalAvailableDepositRub,
	isSubmitting,
	finalizeReceipt,
	setSplitDepositRub,
	setSplitSbpRub,
	setSplitCashRub,
	setSplitCardRub,
	setActiveMethod,
}) => {
	const handleDeductFullDeposit = () => {
		showToast(`Списано с депозита: ${amountRub.toLocaleString("ru-RU")} ₽`, "success");
		finalizeReceipt("card", amountRub);
	};

	const handleSplitWithDeposit = () => {
		setSplitDepositRub(totalAvailableDepositRub);
		setSplitSbpRub(amountRub - totalAvailableDepositRub);
		setSplitCashRub(0);
		setSplitCardRub(0);
		setActiveMethod("split");
		showToast("Депозит учтен! Остаток переведен в СБП QR", "info");
	};

	return (
		<div
			className="p-4 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper-strong,var(--paper,#ffffff))] space-y-3 shadow-xs"
			data-testid="pane-tender-deposit"
		>
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<Wallet size={18} className="text-indigo-600" />
					<span className="text-xs font-bold text-[var(--ink,#0f172a)]">
						Личный / Семейный депозит
					</span>
				</div>
				<span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">
					Доступно: {totalAvailableDepositRub.toLocaleString("ru-RU")} ₽
				</span>
			</div>

			<div className="grid grid-cols-2 gap-2 text-xs">
				<div className="p-2.5 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)]">
					<span className="text-[11px] text-[var(--muted,#64748b)] block">Личный аванс</span>
					<strong className="font-mono text-sm text-[var(--ink,#0f172a)]">
						{patientDepositRub.toLocaleString("ru-RU")} ₽
					</strong>
				</div>
				<div className="p-2.5 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)]">
					<span className="text-[11px] text-[var(--muted,#64748b)] block">Семейный кошелек</span>
					<strong className="font-mono text-sm text-[var(--ink,#0f172a)]">
						{patientFamilyBalanceRub.toLocaleString("ru-RU")} ₽
					</strong>
				</div>
			</div>

			{totalAvailableDepositRub >= amountRub ? (
				<button
					type="button"
					onClick={handleDeductFullDeposit}
					className="w-full min-h-[44px] sm:min-h-[36px] sm:h-9 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-95 transition-all"
					data-testid="btn-confirm-deposit-tender"
				>
					<CheckCircle2 size={16} />
					<span>{isSubmitting ? "Списание..." : `Списать с депозита (${amountRub.toLocaleString("ru-RU")} ₽)`}</span>
				</button>
			) : (
				<div className="space-y-2">
					<p className="text-xs text-amber-600 dark:text-amber-400 m-0">
						Депозита ({totalAvailableDepositRub.toLocaleString("ru-RU")} ₽) не хватает на полную сумму счета ({amountRub.toLocaleString("ru-RU")} ₽).
					</p>
					<button
						type="button"
						onClick={handleSplitWithDeposit}
						className="w-full min-h-[44px] sm:min-h-[36px] sm:h-9 rounded-xl bg-indigo-600/15 hover:bg-indigo-600/25 border border-indigo-500/30 text-indigo-700 dark:text-indigo-300 text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer"
						data-testid="btn-split-with-deposit"
					>
						<Layers size={15} />
						<span>Списать {totalAvailableDepositRub.toLocaleString("ru-RU")} ₽ + остаток через Сплит</span>
					</button>
				</div>
			)}
		</div>
	);
};
