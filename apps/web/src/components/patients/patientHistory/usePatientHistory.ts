import { useCallback, useMemo, useState } from "react";
import type { Dashboard } from "@dental/shared";
import { showToast } from "../../GlobalToast";
import type { ClinicalSpecialty, ClinicalVisitItem } from "./types";
import { mapDashboardAppointmentsToVisits } from "./patientVisitsDashboardMapper";
import { filterVisits, groupVisitsByMonth, calculateHistoryFinancialSummary } from "./patientHistoryTimelineCalc";

export interface UsePatientHistoryParams {
	patientId?: string | null | undefined;
	initialVisits?: ClinicalVisitItem[] | undefined;
	dashboard?: Dashboard | null | undefined;
	onPrintProtocol?: ((visit: ClinicalVisitItem) => void) | undefined;
	onExtract043?: ((visit: ClinicalVisitItem) => void) | undefined;
	onAddToTreatmentPlan?: ((visit: ClinicalVisitItem) => void) | undefined;
}

export function usePatientHistory({
	patientId, initialVisits, dashboard,
	onPrintProtocol, onExtract043, onAddToTreatmentPlan,
}: UsePatientHistoryParams) {
	const [selectedSpecialty, setSelectedSpecialty] = useState<ClinicalSpecialty>("all");
	const [searchQuery, setSearchQuery] = useState<string>("");
	const [expandedVisitIds, setExpandedVisitIds] = useState<Set<string>>(new Set(["vis-101"]));
	const [selectedDetailVisit, setSelectedDetailVisit] = useState<ClinicalVisitItem | null>(null);

	const rawVisitsList = useMemo<ClinicalVisitItem[]>(
		() => mapDashboardAppointmentsToVisits(initialVisits, dashboard, patientId),
		[initialVisits, dashboard, patientId],
	);

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

	const handleExtract043 = useCallback(
		(visit: ClinicalVisitItem) => {
			if (onExtract043) onExtract043(visit);
			else if (onPrintProtocol) onPrintProtocol(visit);
			else if (typeof window !== "undefined") {
				window.print();
				showToast(`Медицинская выписка: сформирована по визиту от ${visit.date.slice(0, 10)} (${visit.diagnosisCode})`, "success");
			}
		},
		[onExtract043, onPrintProtocol],
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
		selectedSpecialty, setSelectedSpecialty, searchQuery, setSearchQuery,
		expandedVisitIds, selectedDetailVisit, rawVisitsList, filteredVisits,
		groupedByMonth, financialSummary, getSpecialtyCount, toggleAccordion,
		handleExpandAll, handleCollapseAll, handlePrint, handleExtract043,
		handleAddToTreatmentPlan, handleOpenDetailDrawer, handleCloseDetailDrawer,
	};
}
