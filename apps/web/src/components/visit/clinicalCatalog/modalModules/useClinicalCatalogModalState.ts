import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import {
	type ClinicalChunk1142,
	type GroupedClinicalProcedure,
	type SpecialtyCategoryKey,
	type VisitNoteFieldsPatch,
	searchClinicalChunks,
	searchGroupedProcedures,
	buildProcedureVisitNotePatch,
	buildChunkVisitNotePatch,
} from "../clinicalProtocolsCatalog";

export interface UseClinicalCatalogModalStateProps {
	isOpen: boolean;
	onClose: () => void;
	activeTooth?: number | null;
	onApplyPatch: (patch: VisitNoteFieldsPatch, successMessage: string) => void;
	currentNoteForm?: Record<string, any>;
	initialSpecialty?: SpecialtyCategoryKey;
}

export function useClinicalCatalogModalState({
	isOpen,
	onClose,
	activeTooth = null,
	onApplyPatch,
	currentNoteForm = {},
	initialSpecialty = "all",
}: UseClinicalCatalogModalStateProps) {
	const [searchQuery, setSearchQuery] = useState<string>("");
	const [activeCategory, setActiveCategory] = useState<SpecialtyCategoryKey>(initialSpecialty);
	const [viewMode, setViewMode] = useState<"procedures" | "chunks" | "diagnoses">("procedures");
	const [expandedProcedureId, setExpandedProcedureId] = useState<string | null>(null);
	const [page, setPage] = useState<number>(1);
	const PAGE_SIZE = 30;

	const tabsRef = useRef<HTMLDivElement>(null);
	const [canScrollLeft, setCanScrollLeft] = useState<boolean>(false);
	const [canScrollRight, setCanScrollRight] = useState<boolean>(false);

	useEffect(() => { setPage(1); }, [searchQuery, activeCategory, viewMode]);

	const checkTabScroll = useCallback(() => {
		const el = tabsRef.current;
		if (!el) return;
		setCanScrollLeft(el.scrollLeft > 4);
		setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
	}, []);

	useEffect(() => {
		if (!isOpen) return;
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") { e.preventDefault(); onClose(); }
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, onClose]);

	useEffect(() => {
		checkTabScroll();
		const el = tabsRef.current;
		if (!el) return;
		el.addEventListener("scroll", checkTabScroll, { passive: true });
		window.addEventListener("resize", checkTabScroll);
		return () => {
			el.removeEventListener("scroll", checkTabScroll);
			window.removeEventListener("resize", checkTabScroll);
		};
	}, [checkTabScroll, viewMode]);

	const scrollTabs = useCallback((direction: "left" | "right") => {
		tabsRef.current?.scrollBy({ left: direction === "left" ? -220 : 220, behavior: "smooth" });
	}, []);

	const filteredProcedures = useMemo(() => searchGroupedProcedures(searchQuery, activeCategory), [searchQuery, activeCategory]);
	const filteredChunks = useMemo(() => searchClinicalChunks(searchQuery, activeCategory), [searchQuery, activeCategory]);
	const filteredDiagnoses = useMemo(() => searchClinicalChunks(searchQuery, "icd10"), [searchQuery]);

	const paginatedProcedures = useMemo(() => filteredProcedures.slice(0, page * PAGE_SIZE), [filteredProcedures, page]);
	const paginatedChunks = useMemo(() => filteredChunks.slice(0, page * PAGE_SIZE), [filteredChunks, page]);
	const paginatedDiagnoses = useMemo(() => filteredDiagnoses.slice(0, page * PAGE_SIZE), [filteredDiagnoses, page]);

	const handleApplyFullProcedure = useCallback((proc: GroupedClinicalProcedure) => {
		const patch = buildProcedureVisitNotePatch(proc, currentNoteForm, activeTooth);
		const toothLabel = activeTooth ? ` (зуб ${activeTooth})` : "";
		onApplyPatch(patch, `Применён протокол: «${proc.procedureName}»${toothLabel}`);
		onClose();
	}, [currentNoteForm, activeTooth, onApplyPatch, onClose]);

	const handleApplySingleChunk = useCallback((chunk: ClinicalChunk1142) => {
		const patch = buildChunkVisitNotePatch(chunk, currentNoteForm, activeTooth);
		const toothLabel = activeTooth ? ` (зуб ${activeTooth})` : "";
		onApplyPatch(patch, `Добавлен раздел: «${chunk.name}»${toothLabel}`);
	}, [currentNoteForm, activeTooth, onApplyPatch]);

	const handleApplyDiagnosis = useCallback((chunk: ClinicalChunk1142) => {
		const patch: VisitNoteFieldsPatch = { diagnosis: activeTooth ? `${chunk.name} (зуб ${activeTooth})` : chunk.name };
		onApplyPatch(patch, `Установлен диагноз МКБ-10: ${chunk.name}`);
		onClose();
	}, [activeTooth, onApplyPatch, onClose]);

	return {
		searchQuery, setSearchQuery, activeCategory, setActiveCategory,
		viewMode, setViewMode, expandedProcedureId, setExpandedProcedureId,
		page, setPage, PAGE_SIZE, tabsRef, canScrollLeft, canScrollRight,
		scrollTabs, filteredProcedures, filteredChunks, filteredDiagnoses,
		paginatedProcedures, paginatedChunks, paginatedDiagnoses,
		handleApplyFullProcedure, handleApplySingleChunk, handleApplyDiagnosis,
	};
}
