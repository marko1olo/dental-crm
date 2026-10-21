import type { ExecutiveKpisSummary } from "@dental/shared";
import { Activity } from "lucide-react";
import type { ExecutivePeriodComputedMetrics } from "./executiveAnalyticsTypes";

export interface MobileOccupancyTileProps {
	readonly periodMetrics: ExecutivePeriodComputedMetrics;
	readonly kpis?: ExecutiveKpisSummary | null | undefined;
	readonly onNavigateToSection?: ((sectionKey: string) => void) | undefined;
}

export function MobileOccupancyTile({
	periodMetrics,
	kpis,
	onNavigateToSection,
}: MobileOccupancyTileProps) {
	const totalChairsCount = kpis?.totalChairsCount ?? 1;

	if (onNavigateToSection) {
		return (
			<button
				type="button"
				className="exec-tile-card text-left cursor-pointer"
				data-testid="tile-occupancy"
				onClick={() => onNavigateToSection("freed_slots")}
			>
				<div className="exec-tile-top">
					<span className="exec-tile-label">Загрузка кресел</span>
					<div className="exec-tile-icon icon-indigo">
						<Activity size={15} aria-hidden="true" />
					</div>
				</div>
				<div className="exec-tile-val font-mono">
					{periodMetrics.occupancyPercent}%
				</div>
				<div className="exec-tile-footer">
					<span className="exec-pill-neutral">
						{totalChairsCount} {totalChairsCount === 1 ? "кресло" : "кресла"}
					</span>
					<span className="exec-tile-sub">
						Час: {periodMetrics.chairHourlyCostFormatted}
					</span>
				</div>
			</button>
		);
	}

	return (
		<div className="exec-tile-card" data-testid="tile-occupancy">
			<div className="exec-tile-top">
				<span className="exec-tile-label">Загрузка кресел</span>
				<div className="exec-tile-icon icon-indigo">
					<Activity size={15} aria-hidden="true" />
				</div>
			</div>
			<div className="exec-tile-val font-mono">
				{periodMetrics.occupancyPercent}%
			</div>
			<div className="exec-tile-footer">
				<span className="exec-pill-neutral">
					{totalChairsCount} {totalChairsCount === 1 ? "кресло" : "кресла"}
				</span>
				<span className="exec-tile-sub">
					Час: {periodMetrics.chairHourlyCostFormatted}
				</span>
			</div>
		</div>
	);
}
