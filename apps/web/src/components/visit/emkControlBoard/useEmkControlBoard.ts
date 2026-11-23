import { useCallback, useEffect, useMemo, useState } from "react";
import {
	type CmoAuditEvaluatedVisit,
	type CmoAuditVisitItem,
	type EmkDefectTag,
	type EmkQualityStatus,
	calculateCmoAuditSummary,
} from "./cmoAuditEngine.js";
import { getDenteAuthHeaders } from "../../../lib/denteRequestHeaders";

interface RawQualityControlRow {
	id: string;
	organizationId?: string | undefined;
	patientId: string;
	patientFullName?: string | undefined;
	patientName?: string | undefined;
	patientCardCode?: string | undefined;
	patientBirthDate?: string | null | undefined;
	patientPhone?: string | null | undefined;
	doctorUserId?: string | undefined;
	doctorId?: string | undefined;
	doctorFullName?: string | undefined;
	doctorName?: string | undefined;
	doctorSpecialty?: string | undefined;
	chairName?: string | undefined;
	createdAt?: string | undefined;
	status?: string | undefined;
	qualityControlStatus?: string | undefined;
	complaint?: string | null | undefined;
	anamnesis?: string | null | undefined;
	objectiveStatus?: string | null | undefined;
	diagnosis?: string | null | undefined;
	diagnosisIcd10?: string | null | undefined;
	diagnosisTooth?: string | null | undefined;
	treatmentPlan?: string | null | undefined;
	doctorSummary?: string | null | undefined;
	signedAt?: string | null | undefined;
	pepHash?: string | null | undefined;
	cmoReviewedAt?: string | null | undefined;
	cmoReviewedByName?: string | null | undefined;
	cmoRemarks?: string | null | undefined;
	cmoDefectTags?: EmkDefectTag[] | undefined;
	servicesCount?: number | undefined;
	odontogramTeeth?: CmoAuditVisitItem["odontogramTeeth"] | undefined;
	[key: string]: unknown;
}

export function useEmkControlBoard() {
	const [rawVisits, setRawVisits] = useState<CmoAuditVisitItem[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [submittingId, setSubmittingId] = useState<string | null>(null);
	const [batchSubmitting, setBatchSubmitting] = useState(false);

	// Filters
	const [selectedTab, setSelectedTab] = useState<EmkQualityStatus | "all">(
		"pending",
	);
	const [searchQuery, setSearchQuery] = useState("");
	const [expandedVisitId, setExpandedVisitId] = useState<string | null>(null);

	// Rejection modal target
	const [rejectionTarget, setRejectionTarget] =
		useState<CmoAuditEvaluatedVisit | null>(null);

	const loadVisits = useCallback(async () => {
		try {
			setLoading(true);
			setError(null);
			const res = await fetch("/api/visits/quality-control", {
				headers: getDenteAuthHeaders(),
			});
			if (!res.ok) {
				throw new Error("Не удалось загрузить приемы для проверки");
			}
			const data = await res.json();
			const visitsList = (data.visits || []).map(
				(row: RawQualityControlRow): CmoAuditVisitItem => ({
					id: row.id,
					organizationId: row.organizationId || undefined,
					patientId: row.patientId,
					patientFullName:
						row.patientFullName || row.patientName || "Пациент клиники",
					patientCardCode: row.patientCardCode || `К-${row.id.slice(0, 6)}`,
					patientBirthDate: row.patientBirthDate || null,
					patientPhone: row.patientPhone || null,
					doctorUserId: row.doctorUserId || row.doctorId || "",
					doctorFullName:
						row.doctorFullName || row.doctorName || "Лечащий врач",
					doctorSpecialty: row.doctorSpecialty || "Врач-стоматолог",
					chairName: row.chairName || undefined,
					visitDateIso: row.createdAt || new Date().toISOString(),
					status: (row.status === "completed" || row.status === "cancelled" || row.status === "draft" || row.status === "in_progress" || row.status === "signed") ? row.status : "signed",
					qualityControlStatus:
						(row.qualityControlStatus as EmkQualityStatus) || "pending",
					chiefComplaint: row.complaint || null,
					anamnesis: row.anamnesis || null,
					objectiveStatus: row.objectiveStatus || null,
					diagnosis: row.diagnosis || null,
					diagnosisIcd10: row.diagnosisIcd10 || null,
					diagnosisTooth: row.diagnosisTooth || null,
					treatmentPlan: row.treatmentPlan || null,
					doctorSummary: row.doctorSummary || null,
					emrSignedAtIso: row.signedAt || null,
					emrPepProtocolHash: row.pepHash || null,
					cmoReviewedAtIso: row.cmoReviewedAt || null,
					cmoReviewedByName: row.cmoReviewedByName || null,
					cmoRemarks: row.cmoRemarks || null,
					cmoDefectTags: row.cmoDefectTags || [],
					servicesCount: typeof row.servicesCount === "number" ? row.servicesCount : 0,
					odontogramTeeth: row.odontogramTeeth || [],
				}),
			);
			setRawVisits(visitsList);
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : "Ошибка загрузки";
			setError(msg);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		loadVisits();
	}, [loadVisits]);

	// Evaluation and Summary calculation
	const { evaluatedVisits, metrics } = useMemo(() => {
		return calculateCmoAuditSummary(rawVisits);
	}, [rawVisits]);

	// Filtered visits
	const filteredVisits = useMemo(() => {
		return evaluatedVisits.filter((v) => {
			if (selectedTab !== "all" && v.qualityControlStatus !== selectedTab) {
				return false;
			}
			if (searchQuery.trim()) {
				const q = searchQuery.toLowerCase();
				const matchesPatient = v.patientFullName.toLowerCase().includes(q);
				const matchesDoctor = v.doctorFullName.toLowerCase().includes(q);
				const matchesDiagnosis = (v.diagnosis || "").toLowerCase().includes(q);
				if (!matchesPatient && !matchesDoctor && !matchesDiagnosis) {
					return false;
				}
			}
			return true;
		});
	}, [evaluatedVisits, selectedTab, searchQuery]);

	// Actions
	const handleApprove = async (visitId: string) => {
		if (submittingId) return;
		try {
			setSubmittingId(visitId);
			const res = await fetch(`/api/visits/${visitId}/quality-control`, {
				method: "PUT",
				headers: {
					...getDenteAuthHeaders(),
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					status: "approved",
					cmoRemarks: "Утверждено Главным врачом. Стандарты СтАР соблюдены.",
				}),
			});
			if (!res.ok) throw new Error("Не удалось утвердить карту");
			await loadVisits();
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : "Ошибка утверждения";
			setError(msg);
		} finally {
			setSubmittingId(null);
		}
	};

	const handleRejectSubmit = async (
		visitId: string,
		rejectionReason: string,
		defectTags: EmkDefectTag[],
	) => {
		try {
			setSubmittingId(visitId);
			const res = await fetch(`/api/visits/${visitId}/quality-control`, {
				method: "PUT",
				headers: {
					...getDenteAuthHeaders(),
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					status: "needs_correction",
					cmoRemarks: rejectionReason,
					defectTags,
				}),
			});
			if (!res.ok) throw new Error("Не удалось отправить карту на доработку");
			await loadVisits();
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : "Ошибка возврата карты";
			setError(msg);
		} finally {
			setSubmittingId(null);
		}
	};

	const handleBatchApproveAllEligible = async () => {
		const eligible = evaluatedVisits.filter((v) => v.canBeApprovedInstantly);
		if (eligible.length === 0 || batchSubmitting) return;

		try {
			setBatchSubmitting(true);
			for (const v of eligible) {
				await fetch(`/api/visits/${v.id}/quality-control`, {
					method: "PUT",
					headers: {
						...getDenteAuthHeaders(),
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						status: "approved",
						cmoRemarks:
							"Пакетное утверждение Главным врачом (100% готовность).",
					}),
				});
			}
			await loadVisits();
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : "Ошибка пакетного утверждения";
			setError(msg);
		} finally {
			setBatchSubmitting(false);
		}
	};

	return {
		rawVisits,
		loading,
		error,
		submittingId,
		batchSubmitting,
		selectedTab,
		setSelectedTab,
		searchQuery,
		setSearchQuery,
		expandedVisitId,
		setExpandedVisitId,
		rejectionTarget,
		setRejectionTarget,
		loadVisits,
		evaluatedVisits,
		metrics,
		filteredVisits,
		handleApprove,
		handleRejectSubmit,
		handleBatchApproveAllEligible,
	};
}
