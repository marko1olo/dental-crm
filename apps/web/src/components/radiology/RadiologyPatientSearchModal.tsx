/**
 * RadiologyPatientSearchModal.tsx — Ультра-тонкий фасад модалки поиска снимков пациента.
 * Декомпозирован по Мандату 8b (лимит строго <= 120 строк).
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
	buildVisiographyVisitsList,
	filterVisiographyVisits,
	RadiologyPatientResultsList,
	RadiologySearchFooterActions,
	RadiologySearchHeader,
	RadiologyStudiesGrid,
	type ClinicalVisiographyVisit,
	type RadiologyPatientSearchModalProps,
	type TactileDatePreset,
	type TactileModalityMode,
} from "./radiologyPatientSearch";

export * from "./radiologyPatientSearch";

export const RadiologyPatientSearchModal: React.FC<RadiologyPatientSearchModalProps> = ({
	isOpen,
	onClose,
	initialFilters,
	onApply,
	onReset,
	totalStudiesCount,
	matchedCount,
	studies,
	onSelectStudy,
}) => {
	const [mode, setMode] = useState<TactileModalityMode>(initialFilters?.mode || "all");
	const [datePreset, setDatePreset] = useState<TactileDatePreset>(initialFilters?.datePreset || "today");
	const [customDateFrom, setCustomDateFrom] = useState<string>(initialFilters?.customDateFrom || "");
	const [customDateTo, setCustomDateTo] = useState<string>(initialFilters?.customDateTo || "");
	const [searchQuery, setSearchQuery] = useState<string>(initialFilters?.query || "");

	useEffect(() => {
		if (isOpen) {
			setMode(initialFilters?.mode || "all");
			setDatePreset(initialFilters?.datePreset || "today");
			setCustomDateFrom(initialFilters?.customDateFrom || "");
			setCustomDateTo(initialFilters?.customDateTo || "");
			setSearchQuery(initialFilters?.query || "");
		}
	}, [isOpen, initialFilters]);

	const handleApply = useCallback(() => {
		onApply({ mode, datePreset, customDateFrom, customDateTo, query: searchQuery.trim() });
		onClose();
	}, [mode, datePreset, customDateFrom, customDateTo, searchQuery, onApply, onClose]);

	const handleResetFilters = useCallback(() => {
		setMode("all");
		setDatePreset("all");
		setCustomDateFrom("");
		setCustomDateTo("");
		setSearchQuery("");
		onReset?.();
	}, [onReset]);

	const handleSelectVisit = useCallback((visit: ClinicalVisiographyVisit) => {
		setDatePreset("custom");
		setCustomDateFrom(visit.dateStr);
		setCustomDateTo(visit.dateStr);
		if (visit.teeth.length > 0 && !searchQuery.trim()) setSearchQuery(visit.teeth[0] ?? "");
	}, [searchQuery]);

	const visitsList = useMemo(() => buildVisiographyVisitsList(studies), [studies]);
	const filteredVisits = useMemo(
		() => filterVisiographyVisits(visitsList, searchQuery, datePreset, customDateFrom, customDateTo),
		[visitsList, searchQuery, datePreset, customDateFrom, customDateTo],
	);

	useEffect(() => {
		if (!isOpen) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
			else if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleApply();
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [isOpen, onClose, handleApply]);

	if (!isOpen) return null;

	const modalContent = (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs select-none tactile-search-modal-backdrop"
			data-testid="radiology-search-modal"
			role="dialog"
			aria-modal="true"
			aria-labelledby="tactile-search-title"
			onClick={(e) => e.target === e.currentTarget && onClose()}
		>
			<div
				className="relative flex flex-col w-full max-w-3xl max-h-[90vh] bg-white dark:bg-[#0c1424] text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
				data-testid="tactile-search-modal-dialog"
				onClick={(e) => e.stopPropagation()}
			>
				<RadiologySearchHeader searchQuery={searchQuery} onSearchQueryChange={setSearchQuery} onSearchTrigger={handleApply} onClose={onClose} />
				<div className="p-4 sm:p-5 flex flex-col gap-4 overflow-y-auto">
					<RadiologyStudiesGrid datePreset={datePreset} onSelectDatePreset={setDatePreset} customDateFrom={customDateFrom} customDateTo={customDateTo} onCustomDateFromChange={setCustomDateFrom} onCustomDateToChange={setCustomDateTo} />
					<RadiologyPatientResultsList filteredVisits={filteredVisits} onSelectVisit={handleSelectVisit} onShowAll={() => { setDatePreset("all"); setSearchQuery(""); }} />
				</div>
				<RadiologySearchFooterActions datePreset={datePreset} matchedCount={matchedCount} totalStudiesCount={totalStudiesCount} onResetFilters={handleResetFilters} onClose={onClose} onApply={handleApply} />
			</div>
		</div>
	);

	return typeof document !== "undefined" ? createPortal(modalContent, document.body) : modalContent;
};
