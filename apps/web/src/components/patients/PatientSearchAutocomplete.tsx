/**
 * PatientSearchAutocomplete.tsx — Быстрый поиск и автокомплит пациентов с регистрацией за 5 сек.
 * Decomposed facade strictly <= 80 lines following Mandate 8b.
 * Indication: Депозит: / Долг: (balance > 0). Zero cartoon emojis.
 */

import React from "react";
import type { PatientSearchAutocompleteProps } from "./patientSearchAutocomplete/types";
import { usePatientSearchAutocomplete } from "./patientSearchAutocomplete/usePatientSearchAutocomplete";
import { PatientSearchInput } from "./patientSearchAutocomplete/PatientSearchInput";
import { PatientSearchDropdown } from "./patientSearchAutocomplete/PatientSearchDropdown";
import { getSomaticBadge } from "./patientSearchAutocomplete/somaticBadgeHelper";

export type { PatientSearchAutocompleteProps } from "./patientSearchAutocomplete/types";

export function PatientSearchAutocomplete(props: PatientSearchAutocompleteProps) {
	const {
		placeholder = "Поиск по ФИО, телефону или карте...",
		autoFocus = false,
		disabled = false,
		className = "",
	} = props;

	const state = usePatientSearchAutocomplete(props);

	return (
		<div
			ref={state.containerRef}
			className={`patient-search-autocomplete relative w-full ${className}`}
			data-testid="patient-search-autocomplete"
		>
			<PatientSearchInput
				inputRef={state.inputRef}
				query={state.query}
				placeholder={placeholder}
				autoFocus={autoFocus}
				disabled={disabled}
				onChangeQuery={(val) => {
					state.setQuery(val);
					state.setIsOpen(true);
					state.setHighlightedIndex(-1);
				}}
				onFocus={() => {
					if (state.query.trim()) state.setIsOpen(true);
				}}
				onClear={() => {
					state.setQuery("");
					state.setDebouncedQuery("");
					state.setIsOpen(false);
					state.inputRef.current?.focus();
				}}
				onKeyDown={state.handleKeyDown}
			/>

			{state.isOpen && state.query.trim().length > 0 && (
				<PatientSearchDropdown
					listRef={state.listRef}
					searchResults={state.searchResults}
					highlightedIndex={state.highlightedIndex}
					canQuickCreate={state.canQuickCreate}
					quickPrefill={state.quickPrefill}
					potentialDuplicate={state.potentialDuplicateForCreate}
					getSomaticBadge={getSomaticBadge}
					onSelect={state.handleSelect}
					onHighlight={state.setHighlightedIndex}
					onTriggerQuickCreate={state.handleTriggerQuickCreate}
				/>
			)}
		</div>
	);
}

export default PatientSearchAutocomplete;
