import React from "react";
import { AlertTriangle, CheckCircle2, Sparkles } from "lucide-react";
import { formatMoneyRu } from "../fiscalModalRefundLogic";
import type { TenderSummaryBadgeProps } from "./types";

export const TenderSummaryBadge: React.FC<TenderSummaryBadgeProps> = ({
	allocation,
	remainingRub,
	totalSumRub,
	handleAutoDistributeRemaining,
	handleAutoBalanceOverallocation,
}) => {
	return (
		<div
			className={`p-4 rounded-2xl border-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs sm:text-sm font-bold ${
				allocation.isFullyAllocated
					? "bg-emerald-500/10 border-emerald-500/40 text-emerald-700 dark:text-emerald-300"
					: allocation.isOverallocated
						? "bg-rose-500/10 border-rose-500/40 text-rose-700 dark:text-rose-300"
						: "bg-amber-500/10 border-amber-500/40 text-amber-700 dark:text-amber-300"
			}`}
		>
			<div className="flex items-center gap-2">
				{allocation.isFullyAllocated ? (
					<CheckCircle2
						size={20}
						className="text-emerald-600 dark:text-emerald-400 shrink-0"
					/>
				) : (
					<AlertTriangle
						size={20}
						className="text-amber-600 dark:text-amber-400 shrink-0"
					/>
				)}
				<span>
					{allocation.isFullyAllocated
						? "Сумма чека полностью распределена"
						: allocation.isOverallocated
							? `Превышение суммы на ${formatMoneyRu(Math.abs(remainingRub))}`
							: `Не распределено: ${formatMoneyRu(remainingRub)}`}
				</span>
			</div>

			<div className="flex items-center gap-3 justify-between sm:justify-end flex-wrap">
				{remainingRub > 0 && (
					<button
						type="button"
						onClick={handleAutoDistributeRemaining}
						className="min-h-[48px] px-4 py-2.5 text-xs sm:text-sm font-bold rounded-xl bg-teal-600 text-white hover:bg-teal-500 shadow-md shadow-teal-600/20 cursor-pointer active:scale-95 transition-all flex items-center gap-1.5"
						title={`Автоматически добавить остаток ${formatMoneyRu(remainingRub)} к способу оплаты`}
						data-testid="btn-auto-distribute-remaining"
					>
						<Sparkles size={16} />
						<span>Распределить остаток (+{formatMoneyRu(remainingRub)})</span>
					</button>
				)}
				{allocation.isOverallocated && (
					<button
						type="button"
						onClick={handleAutoBalanceOverallocation}
						className="min-h-[48px] px-4 py-2.5 text-xs sm:text-sm font-bold rounded-xl bg-amber-600 text-white hover:bg-amber-500 shadow-md shadow-amber-600/20 cursor-pointer active:scale-95 transition-all flex items-center gap-1.5"
						title="Уменьшить суммы до точного совпадения со стоимостью услуг"
						data-testid="btn-auto-balance-overallocated"
					>
						<Sparkles size={16} />
						<span>Сбалансировать сумму (−{formatMoneyRu(Math.abs(remainingRub))})</span>
					</button>
				)}
				<span className="font-mono text-sm sm:text-base font-black">
					{(allocation.allocatedKopecks / 100).toLocaleString("ru-RU", {
						minimumFractionDigits: allocation.allocatedKopecks % 100 !== 0 ? 2 : 0,
						maximumFractionDigits: 2,
					})}{" "}
					/ {formatMoneyRu(totalSumRub)}
				</span>
			</div>
		</div>
	);
};
