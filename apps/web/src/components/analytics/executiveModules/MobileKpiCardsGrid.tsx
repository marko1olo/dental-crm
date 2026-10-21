import type { ExecutiveKpisSummary } from "@dental/shared";
import { CreditCard, DollarSign, TrendingUp, Users } from "lucide-react";
import type { ExecutivePeriodComputedMetrics } from "./executiveAnalyticsTypes";
import { MobileOccupancyTile } from "./MobileOccupancyTile";

export interface MobileKpiCardsGridProps {
	readonly periodMetrics: ExecutivePeriodComputedMetrics;
	readonly kpis?: ExecutiveKpisSummary | null | undefined;
	readonly onNavigateToSection?: ((sectionKey: string) => void) | undefined;
}

export function MobileKpiCardsGrid({
	periodMetrics,
	kpis,
	onNavigateToSection,
}: MobileKpiCardsGridProps) {
	const planPercent = Number.isFinite(periodMetrics.revenuePercent)
		? Math.round(periodMetrics.revenuePercent)
		: 0;

	return (
		<div
			className="mobile-exec-tiles-grid"
			data-testid="mobile-executive-kpis-grid"
		>
			<div className="exec-tile-card" data-testid="tile-revenue">
				<div className="exec-tile-top">
					<span className="exec-tile-label">Выручка факт</span>
					<div className="exec-tile-icon icon-teal">
						<DollarSign size={15} aria-hidden="true" />
					</div>
				</div>
				<div className="exec-tile-val font-mono">
					{periodMetrics.revenueFormatted}
				</div>
				<div className="exec-tile-footer">
					<span
						className={
							planPercent >= 100 ? "exec-pill-success" : "exec-pill-neutral"
						}
					>
						{planPercent}% плана
					</span>
					<span className="exec-tile-sub">
						План: {periodMetrics.revenuePlanFormatted}
					</span>
				</div>
			</div>

			<MobileOccupancyTile
				periodMetrics={periodMetrics}
				kpis={kpis}
				onNavigateToSection={onNavigateToSection}
			/>

			<div className="exec-tile-card" data-testid="tile-avg-check">
				<div className="exec-tile-top">
					<span className="exec-tile-label">Средний чек</span>
					<div className="exec-tile-icon icon-amber">
						<CreditCard size={15} aria-hidden="true" />
					</div>
				</div>
				<div className="exec-tile-val font-mono">
					{periodMetrics.averageCheck}
				</div>
				<div className="exec-tile-footer">
					<span className="exec-tile-sub">
						{periodMetrics.averageCheckDelta}
					</span>
				</div>
			</div>

			<div className="exec-tile-card" data-testid="tile-net-profit">
				<div className="exec-tile-top">
					<span className="exec-tile-label">Чистая прибыль</span>
					<div className="exec-tile-icon icon-emerald">
						<TrendingUp size={15} aria-hidden="true" />
					</div>
				</div>
				<div className="exec-tile-val font-mono">{periodMetrics.netProfit}</div>
				<div className="exec-tile-footer">
					<span className="exec-pill-success">
						{periodMetrics.netMarginPercent}% маржа
					</span>
					<span className="exec-tile-sub">LTV: {periodMetrics.ltv}</span>
				</div>
			</div>

			<div className="exec-tile-card" data-testid="tile-primary-patients">
				<div className="exec-tile-top">
					<span className="exec-tile-label">Первичные</span>
					<div className="exec-tile-icon icon-teal">
						<Users size={15} aria-hidden="true" />
					</div>
				</div>
				<div className="exec-tile-val font-mono">
					{periodMetrics.primaryPatients}
				</div>
				<div className="exec-tile-footer">
					<span className="exec-pill-neutral">Новые обращения</span>
				</div>
			</div>

			<div className="exec-tile-card" data-testid="tile-repeat-patients">
				<div className="exec-tile-top">
					<span className="exec-tile-label">Повторные</span>
					<div className="exec-tile-icon icon-indigo">
						<Users size={15} aria-hidden="true" />
					</div>
				</div>
				<div className="exec-tile-val font-mono">
					{periodMetrics.repeatPatients}
				</div>
				<div className="exec-tile-footer">
					<span className="exec-pill-success">Лояльная база</span>
				</div>
			</div>
		</div>
	);
}
