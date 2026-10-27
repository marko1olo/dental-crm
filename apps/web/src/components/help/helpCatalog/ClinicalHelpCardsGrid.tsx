/**
 * DENTE CRM — Adaptive Clinical Help Cards Grid & Grouped List (Apple HIG)
 * Authority: Mandate 8b (<= 120 lines), Mandate 8e (Doctor Autonomy & Zero Mocks)
 */

import React from "react";
import { useAppStore } from "../../../store/appStore";
import { ClinicalHelpCardItem } from "./ClinicalHelpCardItem";
import type { ClinicalGuideMeta, ClinicalGuideTab } from "./helpTypes";

export interface ClinicalHelpCardsGridProps {
	readonly guides: readonly ClinicalGuideMeta[];
	readonly activeTab?: ClinicalGuideTab;
	readonly onSelectGuide: (id: ClinicalGuideTab) => void;
	readonly onLaunchTour?: (trackId?: string) => void;
	readonly onNavigateView?: (view: string) => void;
}

export const ClinicalHelpCardsGrid: React.FC<ClinicalHelpCardsGridProps> = React.memo(({
	guides,
	activeTab,
	onSelectGuide,
	onLaunchTour,
	onNavigateView,
}) => {
	const handleNavigate = (guide: ClinicalGuideMeta, e: React.MouseEvent) => {
		e.stopPropagation();
		if (!guide.targetView) return;
		if (onNavigateView) {
			onNavigateView(guide.targetView);
		} else {
			useAppStore.getState().setCurrentView(guide.targetView as any);
		}
	};

	const handleTour = (guide: ClinicalGuideMeta, e: React.MouseEvent) => {
		e.stopPropagation();
		if (onLaunchTour) {
			onLaunchTour(guide.tourTrack || "solo_doctor");
		} else {
			window.dispatchEvent(
				new CustomEvent("dente:start-doctor-tour", {
					detail: { trackId: guide.tourTrack || "solo_doctor" },
				}),
			);
		}
	};

	if (guides.length === 0) {
		return (
			<div className="py-12 text-center text-[var(--muted)] space-y-1">
				<p className="text-sm font-semibold text-[var(--ink)]">Ничего не найдено</p>
				<p className="text-xs">Попробуйте ввести другой клинический термин</p>
			</div>
		);
	}

	return (
		<div className="space-y-3">
			{/* Mobile Grouped Inset List View (Apple HIG) */}
			<div className="sm:hidden rounded-[16px] bg-[var(--paper)] border border-[var(--line)] overflow-hidden divide-y divide-[var(--line-subtle)] shadow-xs">
				{guides.map((guide) => (
					<ClinicalHelpCardItem
						key={guide.id}
						guide={guide}
						isMobile={true}
						onSelect={() => onSelectGuide(guide.id)}
						onNavigate={(e) => handleNavigate(guide, e)}
						onTour={(e) => handleTour(guide, e)}
					/>
				))}
			</div>

			{/* Desktop / Tablet Responsive Cards Grid */}
			<div className="hidden sm:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
				{guides.map((guide) => (
					<ClinicalHelpCardItem
						key={guide.id}
						guide={guide}
						isActive={activeTab === guide.id}
						onSelect={() => onSelectGuide(guide.id)}
						onNavigate={(e) => handleNavigate(guide, e)}
						onTour={(e) => handleTour(guide, e)}
					/>
				))}
			</div>
		</div>
	);
});

ClinicalHelpCardsGrid.displayName = "ClinicalHelpCardsGrid";
export { ClinicalHelpCardItem } from "./ClinicalHelpCardItem";
