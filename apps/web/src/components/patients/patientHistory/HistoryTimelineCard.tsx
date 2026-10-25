import React from "react";
import type { ClinicalVisitItem } from "./types";
import { HistoryTimelineDesktopRow } from "./HistoryTimelineDesktopRow";
import { HistoryTimelineMobileHeader } from "./HistoryTimelineMobileHeader";
import { HistoryTimelineExpandedPane } from "./HistoryTimelineExpandedPane";

export interface HistoryTimelineCardProps {
	visit: ClinicalVisitItem;
	isExpanded: boolean;
	onToggle: () => void;
	onExtract043: (visit: ClinicalVisitItem) => void;
	onAddToTreatmentPlan: (visit: ClinicalVisitItem) => void;
	onNavigateToVisit?: ((visitId: string) => void) | undefined;
	onOpenDetailDrawer?: ((visit: ClinicalVisitItem) => void) | undefined;
}

export const HistoryTimelineCard: React.FC<HistoryTimelineCardProps> = React.memo(
	function HistoryTimelineCard({
		visit,
		isExpanded,
		onToggle,
		onExtract043,
		onAddToTreatmentPlan,
		onNavigateToVisit,
		onOpenDetailDrawer,
	}) {
		const formattedDateStr = (() => {
			try {
				const d = new Date(visit.date);
				if (!Number.isNaN(d.getTime())) {
					return `${d.toLocaleDateString("ru-RU")}${visit.time ? ` ${visit.time}` : ""}`;
				}
			} catch {}
			return visit.date;
		})();

		return (
			<div
				className={`clinical-visit-accordion ${isExpanded ? "expanded" : ""}`}
				data-testid={`timeline-visit-card-${visit.id}`}
			>
				<HistoryTimelineDesktopRow
					visit={visit}
					isExpanded={isExpanded}
					formattedDateStr={formattedDateStr}
					onToggle={onToggle}
				/>

				<HistoryTimelineMobileHeader
					visit={visit}
					isExpanded={isExpanded}
					formattedDateStr={formattedDateStr}
					onToggle={onToggle}
				/>

				{isExpanded && (
					<HistoryTimelineExpandedPane
						visit={visit}
						onExtract043={onExtract043}
						onAddToTreatmentPlan={onAddToTreatmentPlan}
						onNavigateToVisit={onNavigateToVisit}
						onOpenDetailDrawer={onOpenDetailDrawer}
					/>
				)}
			</div>
		);
	},
);

HistoryTimelineCard.displayName = "HistoryTimelineCard";
export default HistoryTimelineCard;
