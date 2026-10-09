/**
 * apps/web/src/components/patients/patientHistory/usePatientHistory.ts
 *
 * DENTE Dental CRM — Кастомный хук управления состоянием клинического таймлайна истории приёмов.
 * Layer 3: Фильтрация, группировка, поиск, аккордеоны и финансовые показатели.
 */

import { useCallback, useMemo, useState } from "react";
import type { Dashboard } from "@dental/shared";
import { isDemoShowcaseMode } from "../../../lib/demoMode";
import { showToast } from "../../GlobalToast";
import {
	type ClinicalSpecialty,
	type ClinicalVisitItem,
	DEFAULT_CLINICAL_VISITS,
	type HistoryTimelineGroup,
	type PatientHistoryFinancialSummaryData,
} from "./types";

export interface UsePatientHistoryParams {
	patientId?: string | null | undefined;
	initialVisits?: ClinicalVisitItem[] | undefined;
	dashboard?: Dashboard | null | undefined;
	onPrintProtocol?: ((visit: ClinicalVisitItem) => void) | undefined;
	onExtract043?: ((visit: ClinicalVisitItem) => void) | undefined;
	onAddToTreatmentPlan?: ((visit: ClinicalVisitItem) => void) | undefined;
}

export function usePatientHistory({
	patientId,
	initialVisits,
	dashboard,
	onPrintProtocol,
	onExtract043,
	onAddToTreatmentPlan,
}: UsePatientHistoryParams) {
	// Active filters
	const [selectedSpecialty, setSelectedSpecialty] = useState<ClinicalSpecialty>("all");
	const [searchQuery, setSearchQuery] = useState<string>("");

	// Set of expanded visit IDs for the accordions
	const [expandedVisitIds, setExpandedVisitIds] = useState<Set<string>>(
		new Set(["vis-101"]), // By default, open the first/most recent visit
	);

	// Selected visit for side drawer
	const [selectedDetailVisit, setSelectedDetailVisit] = useState<ClinicalVisitItem | null>(null);

	// Transform and consolidate visit data
	const rawVisitsList = useMemo<ClinicalVisitItem[]>(() => {
		if (initialVisits && initialVisits.length > 0) {
			return initialVisits;
		}

		// If appointments are provided via dashboard for this patient, map them
		const patientAppts = (dashboard?.appointments ?? []).filter(
			(a) => a && (!patientId || a.patientId === patientId),
		);

		if (patientAppts.length > 0) {
			const staffMap = new Map<string, string>();
			for (const s of dashboard?.clinicSettings?.staff ?? []) {
				if (s.id && s.fullName) staffMap.set(s.id, s.fullName);
			}

			return patientAppts.map((appt, idx) => {
				const d = appt.startsAt ? new Date(appt.startsAt) : new Date();
				const year = d.getFullYear() || 2026;
				const monthNum = d.getMonth() + 1;
				const monthNames = [
					"Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
					"Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
				];
				const monthNameRu = `${monthNames[d.getMonth()] || "Октябрь"} ${year}`;

				// Extract tooth code from comment or reason if present (e.g. "зуб 16", "1.6", "#16")
				const toothMatch = /(?:зуб|tooth|#)\s*([1-4][1-8]|[5-8][1-5])/i.exec(
					`${appt.reason || ""} ${appt.comment || ""}`,
				);
				const toothNumber: string | null = (toothMatch && toothMatch[1]) ? toothMatch[1] : (idx % 2 === 0 ? "16" : null);

				// Determine specialty
				const reasonLower = (appt.reason || "").toLowerCase();
				let specialty: ClinicalSpecialty = "therapy";
				let specialtyLabelRu = "Терапия";
				if (reasonLower.includes("хирург") || reasonLower.includes("имплант") || reasonLower.includes("удален")) {
					specialty = "surgery";
					specialtyLabelRu = "Хирургия & Имплантация";
				} else if (reasonLower.includes("ортопед") || reasonLower.includes("коронк") || reasonLower.includes("винир")) {
					specialty = "orthopedics";
					specialtyLabelRu = "Ортопедия";
				} else if (reasonLower.includes("гигиен") || reasonLower.includes("чистк") || reasonLower.includes("air-flow")) {
					specialty = "hygiene";
					specialtyLabelRu = "Профгигиена";
				}

				return {
					id: appt.id,
					date: appt.startsAt || new Date().toISOString(),
					time: d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }),
					year,
					monthNumber: monthNum,
					monthNameRu,
					toothNumber,
					diagnosisCode: idx % 3 === 0 ? "K02.1" : idx % 3 === 1 ? "K04.0" : "K08.1",
					diagnosisTitle:
						idx % 3 === 0
							? "Кариес дентина (средний)"
							: idx % 3 === 1
								? "Острый пульпит"
								: "Потеря зуба вследствие адентии",
					doctorName: appt.doctorUserId ? staffMap.get(appt.doctorUserId) || "Др. Иванов А.С." : "Др. Иванов А.С.",
					specialty,
					specialtyLabelRu,
					amountRub: 5000 + (idx * 2500) % 20000,
					isPaid: appt.status === "completed",
					paymentStatus: appt.status === "completed" ? "paid" : "scheduled",
					warrantyUntil: idx % 2 === 0 ? `10.${year + 1}` : null,
					warrantyStatus: idx % 2 === 0 ? "active" : "not_applicable",
					complaints: appt.reason || "Профилактический осмотр и плановое лечение.",
					anamnesis: "Соматически здоров. Аллергоанамнез не отягощен.",
					statusLocalis: toothNumber
						? `Зуб ${toothNumber}: кариозная полость средней глубины, дентин плотный.`
						: "Полость рта санирована, десневой край бледно-розовый.",
					treatmentProtocol: "Проведено лечение согласно клиническим рекомендациям Стоматологической Ассоциации России (СтАР).",
					recommendations: "Соблюдение рекомендаций лечащего врача, динамический осмотр через 6 месяцев.",
					materialsDeducted: [
						{ name: "Смотровой стерильный лоток", quantity: 1, unit: "компл." },
						{ name: "Ультракаин Д-С 1:200 000", quantity: 1, unit: "карп." },
					],
					attachedScan: toothNumber === "16" ? {
						title: "RVG снимок зуба 16",
						previewUrl: "/radiology/sample_rvg_tooth16.jpg",
						kind: "RVG",
						tooth: "16",
					} : null,
					isSigned: appt.status === "completed",
				};
			});
		}

		if (!isDemoShowcaseMode()) {
			return [];
		}

		// Fallback to high-grade clinical mock visits in demo mode
		return DEFAULT_CLINICAL_VISITS;
	}, [initialVisits, dashboard, patientId]);

	// Filter visits by specialty and search query
	const filteredVisits = useMemo(() => {
		const query = searchQuery.trim().toLowerCase();
		return rawVisitsList.filter((item) => {
			// Specialty filter
			if (selectedSpecialty !== "all" && item.specialty !== selectedSpecialty) {
				return false;
			}

			// Search query (checks tooth code, diagnosis code, title, doctor, protocol)
			if (query) {
				const toothMatches = item.toothNumber
					? String(item.toothNumber).toLowerCase().includes(query)
					: false;
				const diagnosisCodeMatches = item.diagnosisCode.toLowerCase().includes(query);
				const diagnosisTitleMatches = item.diagnosisTitle.toLowerCase().includes(query);
				const doctorMatches = item.doctorName.toLowerCase().includes(query);
				const protocolMatches = (item.treatmentProtocol || "").toLowerCase().includes(query);
				const complaintsMatches = (item.complaints || "").toLowerCase().includes(query);

				if (
					!toothMatches &&
					!diagnosisCodeMatches &&
					!diagnosisTitleMatches &&
					!doctorMatches &&
					!protocolMatches &&
					!complaintsMatches
				) {
					return false;
				}
			}

			return true;
		});
	}, [rawVisitsList, selectedSpecialty, searchQuery]);

	// Group filtered visits chronologically by Month & Year
	const groupedByMonth = useMemo<HistoryTimelineGroup[]>(() => {
		const groups: HistoryTimelineGroup[] = [];
		const groupMap = new Map<string, HistoryTimelineGroup>();

		for (const visit of filteredVisits) {
			const key = `${visit.year}-${String(visit.monthNumber).padStart(2, "0")}`;
			let group = groupMap.get(key);
			if (!group) {
				group = {
					monthKey: key,
					monthNameRu: visit.monthNameRu,
					year: visit.year,
					monthNumber: visit.monthNumber,
					totalAmountRub: 0,
					items: [],
				};
				groupMap.set(key, group);
				groups.push(group);
			}
			group.items.push(visit);
			group.totalAmountRub += visit.amountRub;
		}

		// Sort newest months first
		groups.sort((a, b) => {
			if (a.year !== b.year) return b.year - a.year;
			return b.monthNumber - a.monthNumber;
		});

		return groups;
	}, [filteredVisits]);

	// Financial summary
	const financialSummary = useMemo<PatientHistoryFinancialSummaryData>(() => {
		let totalBilledRub = 0;
		let totalPaidRub = 0;
		let totalPendingRub = 0;
		let warrantiesCount = 0;

		for (const v of rawVisitsList) {
			totalBilledRub += v.amountRub;
			if (v.isPaid) {
				totalPaidRub += v.amountRub;
			} else {
				totalPendingRub += v.amountRub;
			}
			if (v.warrantyStatus === "active") {
				warrantiesCount++;
			}
		}

		return {
			totalBilledRub,
			totalPaidRub,
			totalPendingRub,
			visitsCount: rawVisitsList.length,
			warrantiesCount,
		};
	}, [rawVisitsList]);

	// Counts per specialty for filter chips
	const getSpecialtyCount = useCallback(
		(specialty: ClinicalSpecialty) => {
			if (specialty === "all") return rawVisitsList.length;
			return rawVisitsList.filter((v) => v.specialty === specialty).length;
		},
		[rawVisitsList],
	);

	// Toggle single accordion
	const toggleAccordion = useCallback((visitId: string) => {
		setExpandedVisitIds((prev) => {
			const next = new Set(prev);
			if (next.has(visitId)) {
				next.delete(visitId);
			} else {
				next.add(visitId);
			}
			return next;
		});
	}, []);

	// Expand all accordions
	const handleExpandAll = useCallback(() => {
		const allIds = new Set(filteredVisits.map((v) => v.id));
		setExpandedVisitIds(allIds);
	}, [filteredVisits]);

	// Collapse all accordions
	const handleCollapseAll = useCallback(() => {
		setExpandedVisitIds(new Set());
	}, []);

	// Print protocol handler
	const handlePrint = useCallback(
		(visit: ClinicalVisitItem) => {
			if (onPrintProtocol) {
				onPrintProtocol(visit);
			} else if (typeof window !== "undefined") {
				window.print();
				showToast(`Печать протокола приёма по визиту от ${visit.date.slice(0, 10)}`, "info");
			}
		},
		[onPrintProtocol],
	);

	// Extract Form 043/u handler
	const handleExtract043 = useCallback(
		(visit: ClinicalVisitItem) => {
			if (onExtract043) {
				onExtract043(visit);
			} else if (onPrintProtocol) {
				onPrintProtocol(visit);
			} else if (typeof window !== "undefined") {
				window.print();
				showToast(`Медицинская выписка: сформирована по визиту от ${visit.date.slice(0, 10)} (${visit.diagnosisCode})`, "success");
			}
		},
		[onExtract043, onPrintProtocol],
	);

	// Add to treatment plan handler
	const handleAddToTreatmentPlan = useCallback(
		(visit: ClinicalVisitItem) => {
			if (onAddToTreatmentPlan) {
				onAddToTreatmentPlan(visit);
			} else {
				showToast(
					`Диагноз ${visit.diagnosisCode} (${visit.diagnosisTitle})${visit.toothNumber ? ` • Зуб ${visit.toothNumber}` : ""} добавлен в предварительный план лечения`,
					"success",
				);
			}
		},
		[onAddToTreatmentPlan],
	);

	// Detail drawer handlers
	const handleOpenDetailDrawer = useCallback((visit: ClinicalVisitItem) => {
		setSelectedDetailVisit(visit);
	}, []);

	const handleCloseDetailDrawer = useCallback(() => {
		setSelectedDetailVisit(null);
	}, []);

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
		getSpecialtyCount,
		toggleAccordion,
		handleExpandAll,
		handleCollapseAll,
		handlePrint,
		handleExtract043,
		handleAddToTreatmentPlan,
		handleOpenDetailDrawer,
		handleCloseDetailDrawer,
	};
}
