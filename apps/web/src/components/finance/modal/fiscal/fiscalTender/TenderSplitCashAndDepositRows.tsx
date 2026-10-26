import React from "react";
import { Banknote, Coins } from "lucide-react";
import { formatMoneyRu } from "../fiscalModalRefundLogic";

export interface TenderSplitCashAndDepositRowsProps {
	readonly totalSumRub: number;
	readonly patientDepositRub: number;
	readonly cashAmount: number;
	readonly setCashAmount: (v: number) => void;
	readonly receivedCashRub: number;
	readonly setReceivedCashRub: (v: number) => void;
	readonly depositAmount: number;
	readonly setDepositAmount: (v: number) => void;
	readonly remainingRub: number;
	readonly handleFillRemaining: (t: "card" | "cash" | "sbp" | "certificate" | "insurance") => void;
}

export const TenderSplitCashAndDepositRows: React.FC<TenderSplitCashAndDepositRowsProps> = ({
	totalSumRub,
	patientDepositRub,
	cashAmount,
	setCashAmount,
	receivedCashRub,
	setReceivedCashRub,
	depositAmount,
	setDepositAmount,
	remainingRub,
	handleFillRemaining,
}) => {
	return (
		<>
			<div className="p-3 rounded-xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--border,#cbd5e1)] flex items-center justify-between gap-3">
				<div className="flex items-center gap-2.5">
					<Banknote size={16} className="text-emerald-600 shrink-0" />
					<span className="text-xs font-bold text-[var(--ink,#0f172a)]">Наличные</span>
				</div>
				<div className="flex items-center gap-1.5">
					<input
						type="number"
						min={0}
						max={totalSumRub}
						value={cashAmount || ""}
						onChange={(e) => {
							const val = Math.max(0, Number(e.target.value) || 0);
							setCashAmount(val);
							if (receivedCashRub < val) setReceivedCashRub(val);
						}}
						placeholder="0"
						className="h-8 w-28 px-2.5 text-xs font-mono font-bold rounded-lg border border-[var(--border,#cbd5e1)] bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink,#0f172a)] text-right"
					/>
					{remainingRub > 0 && (
						<button
							type="button"
							onClick={() => handleFillRemaining("cash")}
							className="h-8 px-2.5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer transition-all active:scale-95"
							data-testid="btn-fill-remaining-cash"
						>
							+Остаток
						</button>
					)}
				</div>
			</div>

			<div className="p-3 rounded-xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--border,#cbd5e1)] flex items-center justify-between gap-3">
				<div className="flex items-center gap-2.5">
					<Coins size={16} className="text-amber-600 shrink-0" />
					<div>
						<span className="text-xs font-bold block text-[var(--ink,#0f172a)]">Зачет аванса</span>
						<span className="text-[11px] text-[var(--muted,#64748b)]">Доступно: {formatMoneyRu(patientDepositRub)}</span>
					</div>
				</div>
				<div className="flex items-center gap-1.5">
					<input
						type="number"
						min={0}
						max={patientDepositRub}
						value={depositAmount || ""}
						onChange={(e) => setDepositAmount(Math.max(0, Math.min(patientDepositRub, Number(e.target.value) || 0)))}
						placeholder="0"
						className="h-8 w-28 px-2.5 text-xs font-mono font-bold rounded-lg border border-[var(--border,#cbd5e1)] bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink,#0f172a)] text-right"
					/>
				</div>
			</div>
		</>
	);
};
