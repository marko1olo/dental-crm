/**
 * ShiftHudMetricsGrid.tsx — Сетка 4-шаговых метрик сдельной оплаты за смену.
 * Mandate 8b: строго <= 120 строк на файл.
 */

import React from "react";
import type { ChairsideShiftEarningsSummary } from "../doctorShiftEarnings.js";

export interface ShiftHudMetricsGridProps {
	readonly summary: ChairsideShiftEarningsSummary;
}

export const ShiftHudMetricsGrid: React.FC<ShiftHudMetricsGridProps> = ({ summary }) => {
	return (
		<div className="doctor-shift-hud-grid-metrics" data-testid="hud-metrics-grid">
			<div className="doctor-shift-hud-metric-card">
				<span className="text-[10px] font-bold text-[var(--muted)] uppercase">
					Выполнено услуг (Gross)
				</span>
				<span className="text-xs font-bold font-mono text-[var(--ink)]">
					{summary.formattedGross}
				</span>
			</div>

			<div className="doctor-shift-hud-metric-card">
				<span className="text-[10px] font-bold text-[var(--muted)] uppercase">
					Вычет ЗТЛ (Лаборатория)
				</span>
				<span className="text-xs font-bold font-mono text-rose-600 dark:text-rose-400">
					−{summary.formattedLab}
				</span>
			</div>

			<div className="doctor-shift-hud-metric-card">
				<span className="text-[10px] font-bold text-[var(--muted)] uppercase">
					Вычет прямых материалов
				</span>
				<span className="text-xs font-bold font-mono text-rose-600 dark:text-rose-400">
					−{summary.formattedMaterials}
				</span>
			</div>

			<div className="doctor-shift-hud-metric-card">
				<span className="text-[10px] font-bold text-[var(--muted)] uppercase">
					Чистая база (Net Base)
				</span>
				<span className="text-xs font-bold font-mono text-teal-700 dark:text-teal-400">
					{summary.formattedNetBase}
				</span>
			</div>
		</div>
	);
};
