import React from "react";
import { BookOpen, Crown, RotateCcw, ShieldCheck, Sparkles, Wallet } from "lucide-react";
import { money } from "../../../AppHelpers";
import {
	formatAvailableForDebitLabel,
	formatFamilyBalanceLabel,
	type FamilyWalletBalanceCardProps,
} from "./types";

export const FamilyWalletBalanceCard: React.FC<FamilyWalletBalanceCardProps> = ({
	family,
	headFullName,
	balanceVal,
	animatedBalance,
	onOpenCombinedBilling,
	onToggleLedger,
	isLedgerOpen,
	ledgerCount,
	onOpenRefundModal,
}) => {
	return (
		<div className="family-wallet-header">
			<div>
				<div className="flex items-center gap-2 flex-wrap">
					<h3 className="family-wallet-title-row">
						<Wallet size={20} />
						Семейный Кошелек: {family.name?.trim() || "без названия"}
					</h3>
					<span
						className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-500/15 text-teal-800 dark:text-teal-200 border border-teal-500/30"
						data-testid="badge-family-balance-head"
					>
						<Crown size={12} className="text-amber-500" />
						{formatFamilyBalanceLabel(balanceVal, headFullName)}
					</span>
				</div>

				<p className="family-wallet-subtitle flex items-center gap-2 flex-wrap">
					<span>Единый счет для семьи ({(family.members ?? []).length} чел.)</span>
					<span>·</span>
					<span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
						<ShieldCheck size={13} className="text-emerald-500" />
						Защита от овердрафта: баланс ≥ 0 ₽
					</span>
				</p>
			</div>

			<div className="flex items-center gap-2.5 flex-wrap">
				<div className="family-wallet-balance-container">
					<div className="family-wallet-balance">{money(animatedBalance)}</div>
					<p
						className="family-wallet-balance-label"
						title="Сумма, доступная для списания за лечение любого члена семьи"
						data-testid="badge-available-for-debit"
					>
						<ShieldCheck size={12} />
						{formatAvailableForDebitLabel(balanceVal)}
					</p>
				</div>

				{/* Кнопка семейного расчета */}
				<button
					type="button"
					onClick={onOpenCombinedBilling}
					className="min-h-[44px] px-3.5 py-2 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white text-xs font-bold shadow-md flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
					title="Объединить счета членов семьи и принять оплату со сплитом"
					data-testid="btn-open-family-combined-billing"
				>
					<Sparkles size={15} className="animate-pulse" />
					<span>Семейная оплата</span>
				</button>

				{/* Кнопка Гроссбуха (история операций) */}
				<button
					type="button"
					onClick={onToggleLedger}
					className={`min-h-[44px] px-3 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
						isLedgerOpen
							? "bg-teal-600 text-white border-teal-600"
							: "border-[var(--line,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] hover:bg-[var(--line,#e2e8f0)] text-[var(--ink,#0f172a)]"
					}`}
					title="Открыть общий семейный гроссбух: история списаний, пополнений и возвратов"
					data-testid="btn-toggle-family-ledger"
				>
					<BookOpen size={14} />
					<span>Гроссбух ({ledgerCount})</span>
				</button>

				{/* Кнопка возврата средств на депозит */}
				<button
					type="button"
					onClick={onOpenRefundModal}
					className="min-h-[44px] px-3 py-2 rounded-xl text-xs font-bold border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-800 dark:text-rose-300 transition-all flex items-center gap-1.5 cursor-pointer"
					title="Оформить возврат средств за отмененный визит обратно на семейный депозит"
					data-testid="btn-open-family-refund-modal"
				>
					<RotateCcw size={14} />
					<span>Возврат на депозит</span>
				</button>
			</div>
		</div>
	);
};
