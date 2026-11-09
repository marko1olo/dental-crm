import { useCallback, useEffect, useMemo, useState } from "react";
import type { Dashboard } from "@dental/shared";
import { isDemoShowcaseMode } from "../../../lib/demoMode";
import { denteAdminSecretRequestHeaders } from "../../../lib/denteRequestHeaders";
import { showToast } from "../../GlobalToast";
import type { ClinicalSpecialty, ClinicalVisitItem } from "./types";
import { DEFAULT_CLINICAL_VISITS } from "./types";
import { mapApiRecordsToClinicalVisits, type ApiVisitRow, type ApiDiaryRow } from "./patientRecordsApiMapper";
import { filterVisits, groupVisitsByMonth, calculateHistoryFinancialSummary } from "./patientHistoryTimelineCalc";

export interface UsePatientHistoryParams {
	patientId?: string | null | undefined;
	initialVisits?: ClinicalVisitItem[] | undefined;
	dashboard?: Dashboard | null | undefined;
	onPrintProtocol?: ((visit: ClinicalVisitItem) => void) | undefined;
	onExtractVisitSummary?: ((visit: ClinicalVisitItem) => void) | undefined;
	onExtractRecord?: ((visit: ClinicalVisitItem) => void) | undefined;
	onExtract043?: ((visit: ClinicalVisitItem) => void) | undefined;
	onAddToTreatmentPlan?: ((visit: ClinicalVisitItem) => void) | undefined;
}

export function usePatientHistory({
	patientId,
	initialVisits,
	dashboard,
	onPrintProtocol,
	onExtractVisitSummary,
	onExtractRecord,
	onExtract043,
	onAddToTreatmentPlan,
}: UsePatientHistoryParams) {
	const [selectedSpecialty, setSelectedSpecialty] = useState<ClinicalSpecialty>("all");
	const [searchQuery, setSearchQuery] = useState<string>("");
	// Без захардкоженного vis-101 (Мандат 8a / 8s): честный пустой набор
	const [expandedVisitIds, setExpandedVisitIds] = useState<Set<string>>(new Set());
	const [selectedDetailVisit, setSelectedDetailVisit] = useState<ClinicalVisitItem | null>(null);
	const [serverVisits, setServerVisits] = useState<ClinicalVisitItem[]>([]);
	const [isLoadingRecords, setIsLoadingRecords] = useState<boolean>(false);

	// Загрузка реальных клинических записей из PostgreSQL (/api/patients/:id/records)
	useEffect(() => {
		const cleanId = (patientId ?? "").trim();
		if (!cleanId) {
			setServerVisits([]);
			return;
		}

		let isMounted = true;
		setIsLoadingRecords(true);

		async function fetchRecords() {
			try {
				const res = await fetch(`/api/patients/${encodeURIComponent(cleanId)}/records`, {
					headers: denteAdminSecretRequestHeaders(),
				});
				if (!res.ok) {
					if (isMounted) setServerVisits([]);
					return;
				}
				const data = (await res.json()) as {
					visits?: ApiVisitRow[];
					diaries?: ApiDiaryRow[];
				};
				if (!isMounted) return;

				const mapped = mapApiRecordsToClinicalVisits(data.visits ?? [], data.diaries ?? []);
				setServerVisits(mapped);
			} catch (e) {
				console.warn("[usePatientHistory] Failed to fetch patient records from DB:", e);
				if (isMounted) setServerVisits([]);
			} finally {
				if (isMounted) setIsLoadingRecords(false);
			}
		}

		void fetchRecords();

		return () => {
			isMounted = false;
		};
	}, [patientId]);

	const rawVisitsList = useMemo<ClinicalVisitItem[]>(() => {
		if (initialVisits && initialVisits.length > 0) {
			return initialVisits;
		}
		if (serverVisits.length > 0) {
			return serverVisits;
		}
		if (isDemoShowcaseMode() && !patientId) {
			return DEFAULT_CLINICAL_VISITS;
		}
		return [];
	}, [initialVisits, serverVisits, patientId]);

	const filteredVisits = useMemo(
		() => filterVisits(rawVisitsList, selectedSpecialty, searchQuery),
		[rawVisitsList, selectedSpecialty, searchQuery],
	);

	const groupedByMonth = useMemo(
		() => groupVisitsByMonth(filteredVisits),
		[filteredVisits],
	);

	const financialSummary = useMemo(
		() => calculateHistoryFinancialSummary(rawVisitsList),
		[rawVisitsList],
	);

	const getSpecialtyCount = useCallback(
		(specialty: ClinicalSpecialty) => {
			if (specialty === "all") return rawVisitsList.length;
			return rawVisitsList.filter((v) => v.specialty === specialty).length;
		},
		[rawVisitsList],
	);

	const toggleAccordion = useCallback((visitId: string) => {
		setExpandedVisitIds((prev) => {
			const next = new Set(prev);
			if (next.has(visitId)) next.delete(visitId);
			else next.add(visitId);
			return next;
		});
	}, []);

	const handleExpandAll = useCallback(() => {
		setExpandedVisitIds(new Set(filteredVisits.map((v) => v.id)));
	}, [filteredVisits]);

	const handleCollapseAll = useCallback(() => {
		setExpandedVisitIds(new Set());
	}, []);

	const handlePrint = useCallback(
		(visit: ClinicalVisitItem) => {
			if (onPrintProtocol) onPrintProtocol(visit);
			else if (typeof window !== "undefined") {
				window.print();
				showToast(`Печать протокола приёма по визиту от ${visit.date.slice(0, 10)}`, "info");
			}
		},
		[onPrintProtocol],
	);

	const handleExtract = useCallback(
		(visit: ClinicalVisitItem) => {
			const extractFn = onExtractRecord || onExtractVisitSummary || onExtract043;
			if (extractFn) extractFn(visit);
			else if (onPrintProtocol) onPrintProtocol(visit);
			else if (typeof window !== "undefined") {
				window.print();
				showToast(`Медицинская выписка: сформирована по визиту от ${visit.date.slice(0, 10)} (${visit.diagnosisCode})`, "success");
			}
		},
		[onExtractRecord, onExtractVisitSummary, onExtract043, onPrintProtocol],
	);

	const handleAddToTreatmentPlan = useCallback(
		(visit: ClinicalVisitItem) => {
			if (onAddToTreatmentPlan) onAddToTreatmentPlan(visit);
			else {
				showToast(`Диагноз ${visit.diagnosisCode} (${visit.diagnosisTitle})${visit.toothNumber ? ` • Зуб ${visit.toothNumber}` : ""} добавлен в предварительный план лечения`, "success");
			}
		},
		[onAddToTreatmentPlan],
	);

	const handleOpenDetailDrawer = useCallback((visit: ClinicalVisitItem) => { setSelectedDetailVisit(visit); }, []);
	const handleCloseDetailDrawer = useCallback(() => { setSelectedDetailVisit(null); }, []);

	return {
		selectedSpecialty,
		setSelectedSpecialty,
		searchQuery,
		setSearchQuery,
		expandedVisitIds,
		selectedDetailVisit,
		rawVisitsList,
		filteredVisits,
		groupedByMonth,
		financialSummary,
		isLoadingRecords,
		getSpecialtyCount,
		toggleAccordion,
		handleExpandAll,
		handleCollapseAll,
		handlePrint,
		handleExtractRecord: handleExtract,
		handleExtract043: handleExtract,
		handleExtractVisitSummary: handleExtract,
		handleAddToTreatmentPlan,
		handleOpenDetailDrawer,
		handleCloseDetailDrawer,
	};
}
