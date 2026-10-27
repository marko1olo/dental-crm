import type { Patient } from "@dental/shared";
import { useEffect, useMemo, useState } from "react";
import { useDomListPagination } from "../../../hooks/useMemoryLeakGuard";
import { actionFailureToast } from "../../../lib/panelStateText";
import { showToast } from "../../GlobalToast";
import type { PatientInsight } from "./types";
import { usePatientCategoryCounters } from "./usePatientCategoryCounters";
import { usePatientSearchDebounce } from "./usePatientSearchDebounce";

export interface UsePatientsFilterLogicOptions {
	filteredPatients: Patient[];
	query: string;
	setQuery: (val: string) => void;
	appointments?: Array<{ id: string; patientId?: string | null }> | null | undefined;
	patientInsightById?: Map<string, PatientInsight> | null | undefined;
	selectedPatientId: string | null;
	setSelectedPatientId: (id: string) => void;
	setMobileActiveView: (view: "list" | "card") => void;
	showToastFn?: ((text: string, type?: "success" | "error" | "info" | "warning", duration?: number) => void) | undefined;
}

export function usePatientsFilterLogic({
	filteredPatients, query, setQuery, appointments, patientInsightById,
	selectedPatientId, setSelectedPatientId, setMobileActiveView, showToastFn = showToast,
}: UsePatientsFilterLogicOptions) {
	const { localQuery, setLocalQuery, handleSearchChange, handleClearSearch } =
		usePatientSearchDebounce(query, setQuery, setMobileActiveView);

	const [showLostPatientsOnly, setShowLostPatientsOnly] = useState(false);
	const [lostPatientIds, setLostPatientIds] = useState<Set<string> | null>(null);
	const [isLoadingLost, setIsLoadingLost] = useState(false);

	const toggleLostPatients = () => {
		if (showLostPatientsOnly) { setShowLostPatientsOnly(false); return; }
		setIsLoadingLost(true);
		fetch("/api/analytics/lost-patients-filters")
			.then((res) => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.json(); })
			.then((data: Array<{ id: string }>) => {
				setLostPatientIds(new Set((data || []).map((item) => item.id)));
				setShowLostPatientsOnly(true);
			})
			.catch((err) => {
				showToastFn(actionFailureToast("Не удалось загрузить фильтры потерянных пациентов", (err as { status?: number })?.status ?? null), "error");
				setLostPatientIds(new Set());
				setShowLostPatientsOnly(true);
			})
			.finally(() => setIsLoadingLost(false));
	};

	const [patientCategoryFilter, setPatientCategoryFilter] = useState<"all" | "treatment" | "primary" | "debt" | "archive">("all");

	const patientApptCountMap = useMemo(() => {
		const map = new Map<string, number>();
		for (const a of appointments || []) {
			if (a.patientId) map.set(a.patientId, (map.get(a.patientId) || 0) + 1);
		}
		return map;
	}, [appointments]);

	const { countAll, countTreatment, countPrimary, countDebt, countArchive } =
		usePatientCategoryCounters(filteredPatients, patientApptCountMap, patientInsightById);

	const displayPatients = useMemo(() => {
		let list = filteredPatients ?? [];
		if (showLostPatientsOnly && lostPatientIds) list = list.filter((p) => lostPatientIds.has(p.id));
		if (patientCategoryFilter === "treatment") {
			list = list.filter((p) => p.status !== "archived" && (patientApptCountMap.get(p.id) || 0) > 1);
		} else if (patientCategoryFilter === "primary") {
			list = list.filter((p) => p.status !== "archived" && (patientApptCountMap.get(p.id) || 0) <= 1);
		} else if (patientCategoryFilter === "debt") {
			list = list.filter((p) => (patientInsightById?.get(p.id)?.balanceDueRub ?? 0) > 0 || (p.balanceRub !== undefined && p.balanceRub < 0));
		} else if (patientCategoryFilter === "archive") {
			list = list.filter((p) => p.status === "archived");
		} else if (patientCategoryFilter === "all" && !localQuery.trim() && !query.trim()) {
			list = list.filter((p) => p.status !== "archived");
		}
		return list;
	}, [filteredPatients, showLostPatientsOnly, lostPatientIds, patientCategoryFilter, patientApptCountMap, patientInsightById, localQuery, query]);

	const patientPagination = useDomListPagination(displayPatients, { initialLimit: 40, step: 40 });

	useEffect(() => {
		patientPagination.resetLimit();
	}, [query, showLostPatientsOnly, patientCategoryFilter]);

	useEffect(() => {
		const firstPatient = (displayPatients ?? [])[0];
		if (!selectedPatientId && firstPatient?.id) setSelectedPatientId(firstPatient.id);
	}, [selectedPatientId, displayPatients, setSelectedPatientId]);

	return {
		localQuery, setLocalQuery, handleSearchChange, handleClearSearch,
		showLostPatientsOnly, isLoadingLost, toggleLostPatients,
		patientCategoryFilter, setPatientCategoryFilter,
		countAll, countTreatment, countPrimary, countDebt, countArchive,
		displayPatients, patientPagination,
	};
}
