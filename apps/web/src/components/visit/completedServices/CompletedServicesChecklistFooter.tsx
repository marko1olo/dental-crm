import { Receipt } from "lucide-react";
import React from "react";
import { money } from "../../../AppHelpers";
import { countLabel } from "../../../lib/russianPlural";
import type { CompletedServicesSummary } from "../completedServicesPlan";

export interface CompletedServicesChecklistFooterProps {
	readonly summary: CompletedServicesSummary;
	readonly onPushAllToInvoice: () => void;
}

export const CompletedServicesChecklistFooter: React.FC<
	CompletedServicesChecklistFooterProps
> = ({ summary, onPushAllToInvoice }) => {
	return (
		<div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
			<div className="text-xs text-slate-700 dark:text-slate-300">
				{summary.count === 0 ? (
					<span>Пока ничего не отмечено и не выполнено.</span>
				) : (
					<span>
						Выполнено:{" "}
						<strong>
							{countLabel(summary.count, "услуга", "услуги", "услуг")}
						</strong>
						. К оплате:{" "}
						<strong className="text-sm font-mono text-emerald-600 dark:text-emerald-400">
							{money(summary.totalRub)}
						</strong>
						.
					</span>
				)}
				{summary.unpricedCount > 0 && (
					<span className="text-amber-700 dark:text-amber-400 block mt-0.5">
						В сумму НЕ вошли{" "}
						{countLabel(
							summary.unpricedCount,
							"позиция",
							"позиции",
							"позиций",
						)}{" "}
						без цены — уточните в прейскуранте.
					</span>
				)}
			</div>
			<button
				type="button"
				onClick={onPushAllToInvoice}
				data-testid="push-all-to-invoice-btn"
				className="w-full sm:w-auto min-h-[44px] px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors shrink-0"
				title="Передать все выполненные услуги визита в кассовый счёт для оплаты"
			>
				<Receipt className="w-4 h-4" />
				Внести всё в кассовый счёт{" "}
				{summary.totalRub > 0 ? `(${money(summary.totalRub)})` : ""}
			</button>
		</div>
	);
};
