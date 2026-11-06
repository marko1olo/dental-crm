/**
 * apps/web/src/components/analytics/studio/ExecutiveAnalyticsKpiGrid.tsx
 *
 * Сетка ключевых показателей эффективности клиники (KPI)
 * (Мандат 8n: Малая клиника 1–3 кресла, честная касса, загрузка кресел, Recall >= 70%).
 * (Мандат 8e: Автономия врача, отсутствие искусственных ограничений).
 */

import React from "react";
import type { ClinicAnalyticsSSOT } from "../analyticsCatalogData";

export interface ExecutiveAnalyticsKpiGridProps {
	readonly data: ClinicAnalyticsSSOT;
}

export const ExecutiveAnalyticsKpiGrid: React.FC<ExecutiveAnalyticsKpiGridProps> = ({ data }) => {
	const chairBadgeClass =
		data.chairOccupancyStatus === "optimal"
			? "studio-badge-norm-optimal"
			: data.chairOccupancyStatus === "high"
				? "studio-badge-norm-overload"
				: "studio-badge-norm-reserve";

	const chairBadgeLabel =
		data.chairOccupancyStatus === "optimal"
			? "Норма 65–85%"
			: data.chairOccupancyStatus === "high"
				? "Высокая"
				: "Резерв";

	const rebookingBadgeClass =
		data.rebookingStatus === "healthy"
			? "studio-badge-norm-optimal"
			: data.rebookingStatus === "warning"
				? "studio-badge-norm-reserve"
				: "studio-badge-norm-overload";

	return (
		<section
			className="grid grid-cols-1 md:grid-cols-3 gap-3"
			aria-label="Ключевые показатели эффективности"
		>
			{/* KPI 1: Выручка клиники (36px bold, крупная сумма, касса) */}
			<article className="studio-kpi-card" data-testid="kpi-card-revenue">
				<div>
					<div className="flex items-center justify-between gap-2 mb-1.5">
						<span className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">
							Выручка кассы
						</span>
						<span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-[var(--teal)]/10 text-[var(--teal)]">
							{data.periodLabel}
						</span>
					</div>
					<div className="studio-kpi-value mb-2">
						{data.revenueFormatted}
					</div>
				</div>
				<div className="pt-2 border-t border-[var(--line)] flex items-center justify-between text-xs text-[var(--muted)]">
					<span>Карт: {data.paymentBreakdown.methods[0]?.formatted ?? "0 ₽"}</span>
					<span>Нал: {data.paymentBreakdown.methods[2]?.formatted ?? "0 ₽"}</span>
				</div>
			</article>

			{/* KPI 2: Загрузка кресел (стоматологическая норма 65–85%) */}
			<article className="studio-kpi-card" data-testid="kpi-card-chairs">
				<div>
					<div className="flex items-center justify-between gap-2 mb-1.5">
						<span className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">
							Загрузка кресел ({data.totalChairsCount} шт)
						</span>
						<span className={chairBadgeClass}>
							{chairBadgeLabel}
						</span>
					</div>
					<div className="studio-kpi-value mb-2">
						{data.chairOccupancyPercent}%
					</div>
				</div>
				<div>
					<div className="w-full h-2 rounded-full bg-[var(--line)] overflow-hidden">
						<div
							className="h-full rounded-full bg-[var(--teal)] transition-all duration-300"
							style={{ width: `${Math.min(100, data.chairOccupancyPercent)}%` }}
						/>
					</div>
					<div className="flex justify-between items-center text-[11px] text-[var(--muted)] mt-1.5">
						<span>Занято: {Math.round(data.occupiedMinutes / 60)} ч</span>
						<span>Смена: {Math.round(data.availableMinutes / 60)} ч</span>
					</div>
				</div>
			</article>

			{/* KPI 3: Средний чек и Повторная явка (Recall >= 70%) */}
			<article className="studio-kpi-card" data-testid="kpi-card-average-check">
				<div>
					<div className="flex items-center justify-between gap-2 mb-1.5">
						<span className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">
							Средний чек и Recall
						</span>
						<span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${rebookingBadgeClass}`}>
							{data.rebookingStatus === "healthy"
								? `✓ Recall ${data.rebookingRatePercent}%`
								: `Recall ${data.rebookingRatePercent}%`}
						</span>
					</div>
					<div className="studio-kpi-value mb-2">
						{data.averageCheckFormatted}
					</div>
				</div>
				<div className="pt-2 border-t border-[var(--line)] flex items-center justify-between text-xs text-[var(--muted)]">
					<span>Приёмов: {data.completedVisitsCount}</span>
					<span>Неявки: {data.noShowVisitsCount}</span>
				</div>
			</article>
		</section>
	);
};
