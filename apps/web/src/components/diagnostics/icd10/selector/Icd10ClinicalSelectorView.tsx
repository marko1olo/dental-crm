import React from "react";
import type { DentalIcd10Item, DentalSpecialty } from "../../icd10DentalCatalog";
import { useIcd10SelectorState } from "./useIcd10SelectorState";
import { Icd10SearchBar } from "./Icd10SearchBar";
import { Icd10RubricTabs } from "./Icd10RubricTabs";
import { Icd10QuickPresets } from "./Icd10QuickPresets";
import { Icd10ResultsList } from "./Icd10ResultsList";
import { Icd10SelectedPreview } from "./Icd10SelectedPreview";

export interface Icd10ClinicalSelectorProps {
	readonly selectedCode?: string | null | undefined;
	readonly selectedTooth?: number | string | null | undefined;
	readonly onSelect: (item: DentalIcd10Item, toothNumber?: number | null) => void;
	readonly onClear?: (() => void) | undefined;
	readonly filterSpecialty?: DentalSpecialty | undefined;
	readonly initialRubric?: string | undefined;
	readonly className?: string | undefined;
	readonly autoFocus?: boolean | undefined;
}

export const Icd10ClinicalSelectorView: React.FC<Icd10ClinicalSelectorProps> = ({
	selectedCode,
	selectedTooth,
	onSelect,
	onClear,
	filterSpecialty,
	initialRubric = "ALL",
	className = "",
	autoFocus = false,
}) => {
	const state = useIcd10SelectorState({
		selectedCode,
		selectedTooth,
		onSelect,
		onClear,
		filterSpecialty,
		initialRubric,
	});

	return (
		<div className={`icd10-selector-container ${className}`} role="region" aria-label="Классификатор диагнозов МКБ-10">
			<Icd10SearchBar
				searchQuery={state.searchQuery}
				onSearchChange={(val) => {
					state.setSearchQuery(val);
					state.setFocusedIndex(-1);
				}}
				onKeyDown={state.handleKeyDown}
				onClear={state.handleClearSearch}
				extractedToothNumber={state.parsedQuery.extractedToothNumber}
				autoFocus={autoFocus}
				inputRef={state.searchInputRef}
			/>

			<Icd10RubricTabs
				activeRubricTab={state.activeRubricTab}
				onSelectTab={(tabId) => {
					state.setActiveRubricTab(tabId);
					state.setFocusedIndex(-1);
				}}
			/>

			{!state.searchQuery && state.activeRubricTab === "ALL" && (
				<Icd10QuickPresets
					selectedCode={selectedCode}
					onSelectDiagnosis={state.handleSelectDiagnosis}
				/>
			)}

			<Icd10ResultsList
				searchResults={state.searchResults}
				selectedCode={selectedCode}
				focusedIndex={state.focusedIndex}
				searchQuery={state.searchQuery}
				onSelectDiagnosis={state.handleSelectDiagnosis}
				onHoverIndex={state.setFocusedIndex}
				resultsListRef={state.resultsListRef}
			/>

			{state.currentSelectedItem && (
				<Icd10SelectedPreview
					currentSelectedItem={state.currentSelectedItem}
					localTooth={state.localTooth}
					copied={state.copied}
					onCopyCode={state.handleCopyCode}
					onSelectTooth={state.handleSelectTooth}
					onClear={onClear}
					onResetAll={state.handleResetAll}
				/>
			)}
		</div>
	);
};
