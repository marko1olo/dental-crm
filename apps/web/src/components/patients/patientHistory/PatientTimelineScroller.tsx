import { Calendar } from "lucide-react";
import React, { useMemo } from "react";
import { VirtualizedTimeline } from "../../common/VirtualizedTimeline";
import { HistoryTimelineCard } from "./HistoryTimelineCard";
import type { ClinicalVisitItem, HistoryTimelineGroup } from "./types";

export type VirtualTimelineEntry =
	| { readonly type: "month-header"; readonly id: string; readonly group: HistoryTimelineGroup }
	| { readonly type: "visit-card"; readonly id: string; readonly visit: ClinicalVisitItem };

interface PatientTimelineScrollerProps {
	readonly groupedByMonth: readonly HistoryTimelineGroup[];
	readonly expandedVisitIds: ReadonlySet<string>;
	readonly onToggleAccordion: (id: string) => void;
	readonly onExtract043: (v: ClinicalVisitItem) => void;
	readonly onAddToTreatmentPlan: (v: ClinicalVisitItem) => void;
	readonly onNavigateToVisit?: ((visitId: string) => void) | undefined;
	readonly onOpenDetailDrawer: (v: ClinicalVisitItem) => void;
}

export function PatientTimelineScroller({
	groupedByMonth,
	expandedVisitIds,
	onToggleAccordion,
	onExtract043,
	onAddToTreatmentPlan,
	onNavigateToVisit,
	onOpenDetailDrawer,
}: PatientTimelineScrollerProps) {
	const timelineEntries = useMemo<VirtualTimelineEntry[]>(() => {
		const entries: VirtualTimelineEntry[] = [];
		for (const group of groupedByMonth) {
			entries.push({ type: "month-header", id: `month-hdr-${group.monthKey}`, group });
			for (const visit of group.items) {
				entries.push({ type: "visit-card", id: visit.id, visit });
			}
		}
		return entries;
	}, [groupedByMonth]);

	return (
		<VirtualizedTimeline<VirtualTimelineEntry>
			items={timelineEntries}
			estimateHeight={110}
			overscan={2}
			threshold={8}
			getItemKey={(entry) => entry.id}
			dataTestId="timeline-virtualized-scroller"
			renderItem={(entry) => {
				if (entry.type === "month-header") {
					const count = entry.group.items.length;
					const badge = count === 1 ? "визит" : count < 5 ? "визита" : "визитов";
					return (
						<div className="clinical-month-group mb-1.5" data-testid={`timeline-month-group-${entry.group.monthKey}`}>
							<div className="clinical-month-header">
								<div className="clinical-month-title">
									<Calendar className="w-3.5 h-3.5 text-[var(--teal)]" />
									<span>{entry.group.monthNameRu}</span>
									<span className="clinical-month-badge">{count} {badge}</span>
								</div>
								<div className="text-[11px] font-mono font-bold text-[var(--ink)]">
									{entry.group.totalAmountRub.toLocaleString("ru-RU")} ₽
								</div>
							</div>
						</div>
					);
				}

				return (
					<div className="mb-2">
						<HistoryTimelineCard
							visit={entry.visit}
							isExpanded={expandedVisitIds.has(entry.visit.id)}
							onToggle={() => onToggleAccordion(entry.visit.id)}
							onExtract043={onExtract043}
							onAddToTreatmentPlan={onAddToTreatmentPlan}
							onNavigateToVisit={onNavigateToVisit}
							onOpenDetailDrawer={onOpenDetailDrawer}
						/>
					</div>
				);
			}}
		/>
	);
}
