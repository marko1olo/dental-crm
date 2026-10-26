import React, { useState, useCallback, useEffect, useRef } from "react";
import type { DentalIcd10Item } from "../../icd10DentalCatalog";
import type { Icd10SearchResult } from "../../icd10MatchingEngine";

interface UseIcd10KeyboardNavProps {
	searchResults: readonly Icd10SearchResult[];
	onSelectDiagnosis: (item: DentalIcd10Item) => void;
	onClearSearch: () => void;
}

export function useIcd10KeyboardNav({
	searchResults,
	onSelectDiagnosis,
	onClearSearch,
}: UseIcd10KeyboardNavProps) {
	const [focusedIndex, setFocusedIndex] = useState<number>(-1);
	const resultsListRef = useRef<HTMLDivElement>(null);

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent<HTMLInputElement>) => {
			if (searchResults.length === 0) return;
			if (e.key === "ArrowDown") {
				e.preventDefault();
				setFocusedIndex((prev) => (prev < searchResults.length - 1 ? prev + 1 : 0));
			} else if (e.key === "ArrowUp") {
				e.preventDefault();
				setFocusedIndex((prev) => (prev > 0 ? prev - 1 : searchResults.length - 1));
			} else if (e.key === "Enter") {
				e.preventDefault();
				if (focusedIndex >= 0 && focusedIndex < searchResults.length) {
					const target = searchResults[focusedIndex];
					if (target) onSelectDiagnosis(target.item);
				} else if (searchResults.length > 0) {
					const first = searchResults[0];
					if (first) onSelectDiagnosis(first.item);
				}
			} else if (e.key === "Escape") {
				e.preventDefault();
				onClearSearch();
			}
		},
		[searchResults, focusedIndex, onSelectDiagnosis, onClearSearch],
	);

	useEffect(() => {
		if (focusedIndex >= 0 && resultsListRef.current) {
			const container = resultsListRef.current;
			const targetChild = container.children[focusedIndex] as HTMLElement | undefined;
			targetChild?.scrollIntoView({ block: "nearest" });
		}
	}, [focusedIndex]);

	return {
		focusedIndex,
		setFocusedIndex,
		resultsListRef,
		handleKeyDown,
	};
}
