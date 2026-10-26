import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { DENTAL_ICD10_MAP, type DentalIcd10Item } from "../../icd10DentalCatalog";
import { Icd10MatchingEngine, type Icd10SearchResult, type Icd10SearchOptions } from "../../icd10MatchingEngine";
import { useIcd10KeyboardNav } from "./useIcd10KeyboardNav";
import type { UseIcd10SelectorStateProps } from "./useIcd10SelectorTypes";

export * from "./useIcd10SelectorTypes";

export function useIcd10SelectorState({
	selectedCode,
	selectedTooth,
	onSelect,
	onClear,
	filterSpecialty,
	initialRubric = "ALL",
}: UseIcd10SelectorStateProps) {
	const [searchQuery, setSearchQuery] = useState("");
	const [activeRubricTab, setActiveRubricTab] = useState<string>(initialRubric);
	const [copied, setCopied] = useState(false);

	const [localTooth, setLocalTooth] = useState<number | null>(() => {
		if (selectedTooth == null) return null;
		const num = Number(selectedTooth);
		return Icd10MatchingEngine.isValidFdiTooth(num) ? num : null;
	});

	const searchInputRef = useRef<HTMLInputElement>(null);
	const parsedQuery = useMemo(() => Icd10MatchingEngine.parseQuery(searchQuery), [searchQuery]);

	useEffect(() => {
		if (parsedQuery.extractedToothNumber !== null) setLocalTooth(parsedQuery.extractedToothNumber);
	}, [parsedQuery.extractedToothNumber]);

	const searchResults: Icd10SearchResult[] = useMemo(() => {
		const searchOpts: Icd10SearchOptions = {
			specialty: filterSpecialty,
			rubric: activeRubricTab === "ALL" ? undefined : activeRubricTab,
			selectedToothNumber: localTooth,
			limit: 30,
		};
		return Icd10MatchingEngine.search(searchQuery, searchOpts);
	}, [searchQuery, activeRubricTab, filterSpecialty, localTooth]);

	const currentSelectedItem = useMemo(() => {
		if (!selectedCode) return null;
		return DENTAL_ICD10_MAP.get(Icd10MatchingEngine.normalizeCode(selectedCode)) ?? null;
	}, [selectedCode]);

	const handleSelectDiagnosis = useCallback(
		(item: DentalIcd10Item) => onSelect(item, item.requiresTooth ? localTooth : null),
		[localTooth, onSelect],
	);

	const handleSelectTooth = useCallback(
		(tooth: number) => {
			const nextTooth = localTooth === tooth ? null : tooth;
			setLocalTooth(nextTooth);
			if (currentSelectedItem) onSelect(currentSelectedItem, nextTooth);
		},
		[localTooth, currentSelectedItem, onSelect],
	);

	const handleClearSearch = useCallback(() => {
		setSearchQuery("");
		searchInputRef.current?.focus();
	}, []);

	const { focusedIndex, setFocusedIndex, resultsListRef, handleKeyDown } = useIcd10KeyboardNav({
		searchResults,
		onSelectDiagnosis: handleSelectDiagnosis,
		onClearSearch: handleClearSearch,
	});

	const handleResetAll = useCallback(() => {
		setSearchQuery("");
		setLocalTooth(null);
		setFocusedIndex(-1);
		onClear?.();
	}, [onClear, setFocusedIndex]);

	const handleCopyCode = useCallback(async (code: string) => {
		try {
			await navigator.clipboard.writeText(code);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		} catch { /* fallback */ }
	}, []);

	return {
		searchQuery,
		setSearchQuery,
		activeRubricTab,
		setActiveRubricTab,
		focusedIndex,
		setFocusedIndex,
		copied,
		localTooth,
		searchInputRef,
		resultsListRef,
		parsedQuery,
		searchResults,
		currentSelectedItem,
		handleSelectDiagnosis,
		handleSelectTooth,
		handleClearSearch,
		handleResetAll,
		handleCopyCode,
		handleKeyDown,
	};
}
