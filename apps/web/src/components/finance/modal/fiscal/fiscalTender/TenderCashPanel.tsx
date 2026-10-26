import React from "react";
import { Banknote } from "lucide-react";
import { kopecksToRub, rubToKopecks } from "@dental/shared";
import { formatMoneyRu } from "../fiscalModalRefundLogic";
import { TenderCashQuickPresets } from "./TenderCashQuickPresets";

export interface TenderCashPanelProps {
	readonly cashAmount: number;
	readonly receivedCashRub: number;
	readonly setReceivedCashRub: React.Dispatch<React.SetStateAction<number>>;
}

export const TenderCashPanel: React.FC<TenderCashPanelProps> = ({
	cashAmount,
	receivedCashRub,
	setReceivedCashRub,
}) => {
	const changeKop = Math.max(0, rubToKopecks(receivedCashRub) - rubToKopecks(cashAmount));
	const shortageKop = Math.max(0, rubToKopecks(cashAmount) - rubToKopecks(receivedCashRub));

	return (
		<div className="p-4 rounded-2xl bg-[var(--paper-soft,#f8fafc)] border border-emerald-500/30 space-y-3" data-testid="panel-cash-focused">
			<div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
				<div className="flex items-center gap-2.5">
					<div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
						<Banknote size={20} />
					</div>
					<div>
						<span className="font-bold text-sm block text-[var(--ink,#0f172a)]">Оплата наличными (Касса)</span>
						<span className="text-xs text-[var(--muted,#64748b)]">Сумма чека: {formatMoneyRu(cashAmount)}</span>
					</div>
				</div>
				<div className="text-center sm:text-right w-full sm:w-auto p-2 sm:p-0 rounded-xl bg-emerald-500/5 sm:bg-transparent">
					<span className="text-xs text-[var(--muted,#64748b)] block font-semibold">К оплате наличными:</span>
					<span className="text-2xl sm:text-lg font-black font-mono text-emerald-700 dark:text-emerald-300">
						{formatMoneyRu(cashAmount)}
					</span>
				</div>
			</div>

			<div className="p-3 rounded-xl bg-[var(--paper-strong,var(--paper,#ffffff))] border border-[var(--border,#cbd5e1)] space-y-2.5">
				<TenderCashQuickPresets
					cashAmount={cashAmount}
					receivedCashRub={receivedCashRub}
					setReceivedCashRub={setReceivedCashRub}
				/>

				<div className="flex items-center gap-3 pt-1">
					<div className="w-40 sm:w-44">
						<label className="text-[10px] uppercase font-bold text-[var(--muted,#64748b)] block mb-0.5">Получено (₽):</label>
						<input
							type="number"
							min={0}
							value={receivedCashRub || ""}
							onChange={(e) => setReceivedCashRub(Math.max(0, Number(e.target.value) || 0))}
							placeholder={cashAmount.toString()}
							className="h-10 w-full px-3 text-base font-mono font-bold rounded-xl border border-[var(--border,#cbd5e1)] bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink,#0f172a)] text-right"
							data-testid="input-cash-received"
						/>
					</div>
					<div className="flex-1 text-right">
						{receivedCashRub >= cashAmount && receivedCashRub > 0 ? (
							<div className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
								<span className="block text-[11px] text-[var(--muted,#64748b)]">Сдача:</span>
								<span className="text-lg font-mono font-black" data-testid="cash-change-amount">
									{formatMoneyRu(kopecksToRub(changeKop))}
								</span>
							</div>
						) : receivedCashRub > 0 ? (
							<div className="text-xs font-bold text-amber-700 dark:text-amber-300">
								<span className="block text-[11px] text-[var(--muted,#64748b)]">К доплате:</span>
								<span className="text-lg font-mono font-black">{formatMoneyRu(kopecksToRub(shortageKop))}</span>
							</div>
						) : (
							<div className="text-xs text-[var(--muted,#64748b)]">Без сдачи</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
};
