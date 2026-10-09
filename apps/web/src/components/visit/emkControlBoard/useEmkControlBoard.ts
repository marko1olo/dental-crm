import { useCallback, useEffect, useMemo, useState } from "react";
import {
	type CmoAuditEvaluatedVisit,
	type CmoAuditVisitItem,
	type EmkDefectTag,
	type EmkQualityStatus,
	calculateCmoAuditSummary,
} from "@dental/shared";
import { denteAdminSecretRequestHeaders } from "../../../lib/denteRequestHeaders";

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
				headers: denteAdminSecretRequestHeaders(),
			});
			if (!res.ok) {
				throw new Error("Не удалось загрузить приемы для проверки");
			}
			const data = await res.json();
			const visitsList = (data.visits || []).map(
				// biome-ignore lint/suspicious/noExplicitAny: backend row map
				(row: any): CmoAuditVisitItem => ({
					id: row.id,
					organizationId: row.organizationId || "org-1",
					patientId: row.patientId,
					patientFullName:
						row.patientFullName || row.patientName || "Пациент клиники",
					patientCardCode: row.patientCardCode || `К-${row.id.slice(0, 6)}`,
					patientBirthDate: row.patientBirthDate || null,
					patientPhone: row.patientPhone || null,
					doctorUserId: row.doctorUserId || row.doctorId || "doc-1",
					doctorFullName:
						row.doctorFullName || row.doctorName || "Лечащий врач",
					doctorSpecialty: row.doctorSpecialty || "Врач-стоматолог",
					chairName: row.chairName || "Кресло 1",
					visitDateIso: row.createdAt || new Date().toISOString(),
					status: row.status || "signed",
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
					servicesCount: row.servicesCount ?? (row.diagnosis ? 2 : 0),
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
				headers: denteAdminSecretRequestHeaders({
					"Content-Type": "application/json",
				}),
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
				headers: denteAdminSecretRequestHeaders({
					"Content-Type": "application/json",
				}),
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
					headers: denteAdminSecretRequestHeaders({
						"Content-Type": "application/json",
					}),
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
