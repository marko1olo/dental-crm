/**
 * PerioHygieneIndicesPanel.tsx — Панель детализации пародонтальных индексов и BOP
 * Отображает процент кровоточивости при зондировании, количество глубоких карманов и PSR.
 */

import React from "react";
import { Info, X } from "lucide-react";

export interface PerioHygieneIndicesPanelProps {
	readonly fmbsPercent: number;
	readonly deepPocketsCount: number;
	readonly psrFormula: string;
	readonly onClose: () => void;
}

export const PerioHygieneIndicesPanel: React.FC<PerioHygieneIndicesPanelProps> = React.memo(({
	fmbsPercent,
	deepPocketsCount,
	psrFormula,
	onClose,
}) => {
	return (
		<div className="p-3 rounded-xl bg-teal-500/10 border border-teal-500/30 flex flex-wrap items-center justify-between gap-3 text-xs">
			<div className="flex items-center gap-2">
				<div className="w-6 h-6 rounded-lg bg-teal-500/20 flex items-center justify-center shrink-0">
					<Info className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
				</div>
				<div>
					<span className="font-bold text-[var(--ink)]">Сводные индексы пародонта:</span>{" "}
					<span className="text-rose-600 dark:text-rose-400 font-bold">
						BOP: {fmbsPercent}%
					</span>{" "}
					(кровоточащих точек),{" "}
					<span className="text-amber-600 dark:text-amber-400 font-bold">
						{"Карманы \u2265 4 мм: "}{deepPocketsCount}
					</span>,{" "}
					<span className="text-[var(--ink)] font-semibold">
						PSR: {psrFormula}
					</span>
				</div>
			</div>
			<button
				type="button"
				onClick={onClose}
				className="min-h-[44px] min-w-[44px] px-2 rounded-lg text-[var(--muted)] hover:text-[var(--ink)] font-semibold flex items-center gap-1 cursor-pointer"
				title="Скрыть панель индексов"
			>
				<X className="w-3.5 h-3.5" /> Скрыть
			</button>
		</div>
	);
});

PerioHygieneIndicesPanel.displayName = "PerioHygieneIndicesPanel";
