import { Printer, Receipt } from "lucide-react";
import type React from "react";
import { rub } from "../treatmentEstimatorTypes";
import type { EstimatorBottomBarProps } from "./estimatorUiTypes";

export const TreatmentEstimatorBottomBar: React.FC<EstimatorBottomBarProps> = ({
	onDirectPrint,
	onOpenCashier,
	payableKopecks,
	pricedRows,
	incompleteRows,
}) => {
	return (
		<div className="flex flex-wrap justify-between items-center gap-x-4 gap-y-3 px-4 py-3 border-t border-zinc-200/50 dark:border-zinc-800/50 bg-zinc-100/30 dark:bg-zinc-900/30">
			<div className="flex items-center gap-2 flex-wrap">
				<button
					type="button"
					onClick={onDirectPrint}
					className="min-h-[44px] sm:min-h-[32px] sm:min-h-[34px] sm:h-[34px] px-3.5 py-1.5 inline-flex items-center gap-1.5 text-xs font-bold rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-colors cursor-pointer"
				>
					<Printer size={14} />
					<span>Печать сметы</span>
				</button>
				<button
					type="button"
					onClick={onOpenCashier}
					disabled={false}
					className="min-h-[44px] sm:min-h-[32px] sm:min-h-[34px] sm:h-[34px] px-3.5 py-1.5 inline-flex items-center gap-1.5 text-xs font-bold rounded-lg bg-teal-600 hover:bg-teal-500 text-white shadow-md shadow-teal-600/20 transition-all cursor-pointer"
				>
					<Receipt size={14} />
					<span>В кассу</span>
				</button>
			</div>

			<div className="flex flex-col items-end min-w-0">
				<div className="text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
					{incompleteRows > 0 ? "Итого, без непосчитанного:" : "Итого по плану:"}
				</div>
				{pricedRows === 0 && incompleteRows > 0 ? (
					<div className="text-xl font-bold text-amber-700 dark:text-amber-300">
						Считать пока нечего
					</div>
				) : (
					<div className="text-xl font-bold text-slate-900 dark:text-zinc-100 flex items-baseline gap-1 font-mono">
						{rub(payableKopecks)}
					</div>
				)}
				{incompleteRows > 0 && (
					<div className="text-xs font-semibold text-amber-700 dark:text-amber-300 text-right break-words">
						{pricedRows === 0
							? "Ни у одной строки плана нет цены из вашего прайса"
							: "Итог неполный: в плане есть лечение без цены из прайса"}
					</div>
				)}
			</div>
		</div>
	);
};
