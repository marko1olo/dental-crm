import type { Patient } from "@dental/shared";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	findPotentialDuplicates,
	searchPatientsQuick,
	type PatientSearchResultItem,
	type PotentialDuplicateItem,
} from "../patientSearchFuzzy";
import { parseSearchQueryForQuickPatient } from "../../schedule/patientSearchEngine";
import type { PatientSearchAutocompleteProps } from "./types";

export function usePatientSearchAutocomplete({
	patients,
	onSelectPatient,
	onCreatePatientQuick,
	disabled = false,
	initialQuery = "",
	clearOnSelect = false,
	allowQuickCreate = true,
	maxResults = 15,
}: PatientSearchAutocompleteProps) {
	const [query, setQuery] = useState(initialQuery);
	const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
	const [isOpen, setIsOpen] = useState(false);
	const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);

	const containerRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);
	const listRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const timer = setTimeout(() => setDebouncedQuery(query), 150);
		return () => clearTimeout(timer);
	}, [query]);

	useEffect(() => {
		const handleMouseDown = (e: MouseEvent) => {
			if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
				setIsOpen(false);
			}
		};
		document.addEventListener("mousedown", handleMouseDown);
		return () => document.removeEventListener("mousedown", handleMouseDown);
	}, []);

	const searchResults: PatientSearchResultItem[] = useMemo(() => {
		if (!debouncedQuery.trim()) return [];
		return searchPatientsQuick(patients, debouncedQuery, maxResults);
	}, [patients, debouncedQuery, maxResults]);

	const quickPrefill = useMemo(() => parseSearchQueryForQuickPatient(query), [query]);
	const canQuickCreate = allowQuickCreate && query.trim().length > 0;

	const potentialDuplicateForCreate: PotentialDuplicateItem | null = useMemo(() => {
		if (!canQuickCreate) return null;
		const name = quickPrefill.fullName.trim();
		const phone = quickPrefill.phone.trim();
		if (name.length < 3 && phone.replace(/\D/g, "").length < 4) return null;
		const dups = findPotentialDuplicates(patients, { fullName: name, phone, thresholdScore: 70, limit: 1 });
		return dups[0] ?? null;
	}, [patients, canQuickCreate, quickPrefill]);

	const totalNavigableCount = searchResults.length + (canQuickCreate ? 1 : 0);

	const handleSelect = useCallback(
		(patient: Patient) => {
			onSelectPatient(patient);
			setQuery(clearOnSelect ? "" : (patient.fullName || ""));
			setDebouncedQuery(clearOnSelect ? "" : (patient.fullName || ""));
			setIsOpen(false);
			setHighlightedIndex(-1);
		},
		[onSelectPatient, clearOnSelect],
	);

	const handleTriggerQuickCreate = useCallback(() => {
		onCreatePatientQuick?.(quickPrefill);
		setIsOpen(false);
		setHighlightedIndex(-1);
	}, [onCreatePatientQuick, quickPrefill]);

	const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
		if (disabled) return;
		if (e.key === "ArrowDown") {
			e.preventDefault();
			if (!isOpen) { setIsOpen(true); setHighlightedIndex(0); return; }
			setHighlightedIndex((prev) => (prev < totalNavigableCount - 1 ? prev + 1 : 0));
		} else if (e.key === "ArrowUp") {
			e.preventDefault();
			if (!isOpen) { setIsOpen(true); setHighlightedIndex(totalNavigableCount - 1); return; }
			setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : totalNavigableCount - 1));
		} else if (e.key === "Enter" && isOpen && highlightedIndex >= 0) {
			e.preventDefault();
			if (highlightedIndex < searchResults.length) {
				const item = searchResults[highlightedIndex];
				if (item) handleSelect(item.patient);
			} else if (canQuickCreate) {
				handleTriggerQuickCreate();
			}
		} else if (e.key === "Escape") {
			setIsOpen(false);
			setHighlightedIndex(-1);
		}
	}, [disabled, isOpen, highlightedIndex, totalNavigableCount, searchResults, canQuickCreate, handleSelect, handleTriggerQuickCreate]);

	useEffect(() => {
		if (highlightedIndex >= 0 && listRef.current) {
			const activeEl = listRef.current.children[highlightedIndex] as HTMLElement;
			activeEl?.scrollIntoView?.({ block: "nearest" });
		}
	}, [highlightedIndex]);

	return {
		query, setQuery, setDebouncedQuery, isOpen, setIsOpen, highlightedIndex, setHighlightedIndex,
		containerRef, inputRef, listRef, searchResults, quickPrefill, canQuickCreate,
		potentialDuplicateForCreate, totalNavigableCount, handleSelect, handleTriggerQuickCreate, handleKeyDown,
	};
}
