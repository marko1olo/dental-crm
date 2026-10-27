/**
 * DENTE CRM — Clinical Knowledge Base & Help Assembly Container
 * Authority: Mandate 8b (<= 120 lines), Mandate 8e (Doctor Autonomy), Apple HIG
 */

import React, { useMemo, useState } from "react";
import { CLINICAL_GUIDES, getGuideById } from "./helpArticlesData";
import { ClinicalHelpCardsGrid } from "./ClinicalHelpCardsGrid";
import { ClinicalHelpSearchFilter } from "./ClinicalHelpSearchFilter";
import { ClinicalHelpTopBar } from "./ClinicalHelpTopBar";
import { ClinicalGuideRenderer } from "./ClinicalGuideRenderer";
import { searchClinicalGuides } from "./helpSearchEngine";
import type { ClinicalGuideCategory, ClinicalGuideTab } from "./helpTypes";

export interface ClinicalHelpContainerProps {
	readonly initialTab?: ClinicalGuideTab;
	readonly initialMode?: "catalog" | "detail";
	readonly onLaunchTour?: (trackId?: string) => void;
	readonly onOpenShortcuts?: () => void;
	readonly onNavigateView?: (view: string) => void;
}

export const ClinicalHelpContainer: React.FC<ClinicalHelpContainerProps> = React.memo(({
	initialTab = "schedule",
	initialMode = "catalog",
	onLaunchTour,
	onOpenShortcuts,
	onNavigateView,
}) => {
	const [activeTab, setActiveTab] = useState<ClinicalGuideTab>(initialTab);
	const [viewMode, setViewMode] = useState<"catalog" | "detail">(initialMode);
	const [selectedCategory, setSelectedCategory] = useState<ClinicalGuideCategory | "all">("all");
	const [searchQuery, setSearchQuery] = useState("");

	const filteredGuides = useMemo(() => {
		let list = searchQuery.trim() ? searchClinicalGuides(searchQuery) : CLINICAL_GUIDES;
		if (selectedCategory !== "all") {
			list = list.filter((g) => g.category === selectedCategory);
		}
		return list;
	}, [searchQuery, selectedCategory]);

	const activeGuide = useMemo(() => getGuideById(activeTab), [activeTab]);

	return (
		<div className="flex flex-col h-full overflow-hidden bg-[var(--paper)] text-[var(--ink)]">
			<ClinicalHelpTopBar
				viewMode={viewMode}
				onBackToCatalog={() => setViewMode("catalog")}
				activeTitle={activeGuide?.title}
				activeShortTitle={activeGuide?.shortTitle}
				onLaunchTour={() => onLaunchTour?.(activeGuide?.tourTrack || "solo_doctor")}
				onOpenShortcuts={onOpenShortcuts}
			/>

			<div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-4 min-h-0 overscroll-contain">
				{viewMode === "catalog" ? (
					<>
						<ClinicalHelpSearchFilter
							searchQuery={searchQuery}
							onSearchChange={setSearchQuery}
							selectedCategory={selectedCategory}
							onCategoryChange={setSelectedCategory}
							totalCount={CLINICAL_GUIDES.length}
						/>
						<ClinicalHelpCardsGrid
							guides={filteredGuides}
							activeTab={activeTab}
							onSelectGuide={(id) => {
								setActiveTab(id);
								setViewMode("detail");
							}}
							onLaunchTour={onLaunchTour}
							onNavigateView={onNavigateView}
						/>
					</>
				) : (
					<ClinicalGuideRenderer activeTab={activeTab} onLaunchTour={onLaunchTour} />
				)}
			</div>
		</div>
	);
});

ClinicalHelpContainer.displayName = "ClinicalHelpContainer";
export { ClinicalHelpTopBar } from "./ClinicalHelpTopBar";
export { ClinicalGuideRenderer } from "./ClinicalGuideRenderer";
