import React from "react";
import { FilterBarSearchInput } from "./filterBarModules/FilterBarSearchInput";
import { FilterBarDropdowns } from "./filterBarModules/FilterBarDropdowns";
import { FilterBarSegmentedChips } from "./filterBarModules/FilterBarSegmentedChips";

export interface DentalLabOrdersFilterBarProps {
	searchQuery: string;
	setSearchQuery: (q: string) => void;
	selectedLab: string;
	setSelectedLab: (lab: string) => void;
	selectedWorkType: string;
	setSelectedWorkType: (wt: string) => void;
	selectedStage: string;
	setSelectedStage: (stage: string) => void;
	selectedDateRange: "ALL" | "today" | "week";
	setSelectedDateRange: (range: "ALL" | "today" | "week") => void;
	onlyDelayedFilter: boolean;
	setOnlyDelayedFilter: React.Dispatch<React.SetStateAction<boolean>>;
	delayedCount: number;
	sampleLabs: readonly string[];
}

export const DentalLabOrdersFilterBar: React.FC<DentalLabOrdersFilterBarProps> = ({
	searchQuery,
	setSearchQuery,
	selectedLab,
	setSelectedLab,
	selectedWorkType,
	setSelectedWorkType,
	selectedStage,
	setSelectedStage,
	selectedDateRange,
	setSelectedDateRange,
	onlyDelayedFilter,
	setOnlyDelayedFilter,
	delayedCount,
	sampleLabs,
}) => {
	const hasActiveFilters = Boolean(
		searchQuery ||
		selectedLab !== "ALL" ||
		selectedWorkType !== "ALL" ||
		selectedStage !== "ALL" ||
		selectedDateRange !== "ALL" ||
		onlyDelayedFilter,
	);

	const handleReset = () => {
		setSearchQuery("");
		setSelectedLab("ALL");
		setSelectedWorkType("ALL");
		setSelectedStage("ALL");
		setSelectedDateRange("ALL");
		setOnlyDelayedFilter(false);
	};

	return (
		<section className="ztl-filter-bar" aria-label="Фильтры наряд-заказов">
			<FilterBarSearchInput searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
			<FilterBarDropdowns
				selectedLab={selectedLab} setSelectedLab={setSelectedLab}
				selectedWorkType={selectedWorkType} setSelectedWorkType={setSelectedWorkType}
				selectedStage={selectedStage} setSelectedStage={setSelectedStage}
				selectedDateRange={selectedDateRange} setSelectedDateRange={setSelectedDateRange}
				sampleLabs={sampleLabs}
			/>
			<FilterBarSegmentedChips
				selectedStage={selectedStage} setSelectedStage={setSelectedStage}
				onlyDelayedFilter={onlyDelayedFilter} setOnlyDelayedFilter={setOnlyDelayedFilter}
				delayedCount={delayedCount} hasActiveFilters={hasActiveFilters} handleReset={handleReset}
			/>
		</section>
	);
};
