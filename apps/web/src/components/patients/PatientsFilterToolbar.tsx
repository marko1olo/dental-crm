import React from "react";
import type { PatientsFilterToolbarProps } from "./filterToolbar/types";
import { PatientsSearchInput } from "./filterToolbar/PatientsSearchInput";
import { PatientsCategorySegmentedBar } from "./filterToolbar/PatientsCategorySegmentedBar";
import { PatientsToolbarActions } from "./filterToolbar/PatientsToolbarActions";

export * from "./filterToolbar/types";
export * from "./filterToolbar/PatientsSearchInput";
export * from "./filterToolbar/PatientsCategorySegmentedBar";
export * from "./filterToolbar/PatientsToolbarActions";

export function PatientsFilterToolbar({
	query,
	onQueryChange,
	onClearQuery,
	searchInputRef,
	onOpenRecallsHub,
	onOpenTactileSearch,
	showLostPatientsOnly,
	onToggleLostPatients,
	isLoadingLost,
	onOpenCreatePatient,
	categoryFilter,
	onCategoryFilterChange,
	counts,
}: PatientsFilterToolbarProps) {
	return (
		<header className="patients-header max-md:!hidden md:flex items-center justify-between gap-2.5 flex-nowrap h-12 min-h-[48px] max-h-[52px] px-3 border border-[var(--line)] bg-[var(--paper)] rounded-xl shadow-xs box-border overflow-hidden select-none">
			<PatientsSearchInput
				query={query}
				onQueryChange={onQueryChange}
				onClearQuery={onClearQuery}
				searchInputRef={searchInputRef}
			/>

			<PatientsCategorySegmentedBar
				categoryFilter={categoryFilter}
				onCategoryFilterChange={onCategoryFilterChange}
				counts={counts}
			/>

			<PatientsToolbarActions
				onOpenRecallsHub={onOpenRecallsHub}
				onOpenTactileSearch={onOpenTactileSearch}
				showLostPatientsOnly={showLostPatientsOnly}
				onToggleLostPatients={onToggleLostPatients}
				isLoadingLost={isLoadingLost}
				onOpenCreatePatient={onOpenCreatePatient}
			/>
		</header>
	);
}
