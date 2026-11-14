/**
 * apps/web/src/components/emr/record/useMedicalRecordSave.ts
 *
 * Канонический сервис персистентности медицинской карты приёма и дневников SOAP.
 * Сохраняет данные в реальный PostgreSQL 18 через /api/diaries и /api/visits/:visitId/draft/autosave
 * с клиентским Idempotency-Key (UUIDv7), реактивной гидратацией и тостами (Мандаты 8e, 8n, 8am).
 */

import { useCallback, useState } from "react";
import { generateUuidV7 } from "@dental/shared";
import { showToast } from "../../GlobalToast";
import { denteAdminSecretRequestHeaders } from "../../../lib/denteRequestHeaders";
import type { MedicalRecordData } from "../types/recordDataTypes";

export interface UseMedicalRecordSaveParams {
	formData: MedicalRecordData;
	onSave?: ((updated: MedicalRecordData) => void | Promise<void>) | undefined;
	visitId?: string | undefined;
	patientId?: string | undefined;
	initialData?: Record<string, unknown> | undefined;
	effectiveIsDraft: boolean;
}

export function useMedicalRecordSave({
	formData,
	onSave,
	visitId,
	patientId,
	initialData,
	effectiveIsDraft,
}: UseMedicalRecordSaveParams) {
	const [isSaving, setIsSaving] = useState(false);

	const handleSaveForm = useCallback(async () => {
		if (isSaving) return;
		setIsSaving(true);
		try {
			if (onSave) {
				await onSave(formData);
			}

			const initialVisit = initialData?.visit as Record<string, unknown> | undefined;
			const initialPatient = initialData?.patient as Record<string, unknown> | undefined;

			const effectiveVisitId =
				(typeof visitId === "string" && visitId) ||
				(typeof initialData?.visitId === "string" && initialData.visitId) ||
				(typeof initialVisit?.id === "string" && initialVisit.id) ||
				null;
			const effectivePatientId =
				(typeof patientId === "string" && patientId) ||
				(typeof initialData?.patientId === "string" && initialData.patientId) ||
				(typeof initialPatient?.id === "string" && initialPatient.id) ||
				null;

			if (effectiveVisitId && effectivePatientId) {
				const mutationId = generateUuidV7();
				const primaryDiary = formData.visitDiaries[0];
				const complaint = formData.anamnesis.chiefComplaint || primaryDiary?.subjectiveComplaints || "";
				const anamnesis = formData.anamnesis.historyOfPresentIllness || "";
				const statusLocalis = primaryDiary?.objectiveStatusLocalis || formData.dentalStatus.oralMucosaStatus || "";
				const diagnosisIcd10 = formData.passport.primaryDiagnosisIcd10 || primaryDiary?.assessmentIcd10Code || "Z01.2";
				const diagnosisTooth = primaryDiary?.toothNumber || "";
				const treatmentDescription = formData.generalTreatmentPlan || primaryDiary?.procedureProtocol || "";

				const res = await fetch("/api/diaries", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"Idempotency-Key": mutationId,
						...denteAdminSecretRequestHeaders(),
					},
					credentials: "same-origin",
					body: JSON.stringify({
						visitId: effectiveVisitId,
						patientId: effectivePatientId,
						complaint,
						anamnesis,
						statusLocalis,
						diagnosisIcd10,
						diagnosisTooth,
						treatmentDescription,
						status: effectiveIsDraft ? "draft" : "signed",
					}),
				});

				if (res.ok) {
					try {
						await fetch(`/api/visits/${effectiveVisitId}/draft/autosave`, {
							method: "PUT",
							headers: {
								"Content-Type": "application/json",
								...denteAdminSecretRequestHeaders(),
							},
							credentials: "same-origin",
							body: JSON.stringify({
								patientId: effectivePatientId,
								selectedSpecialty: "therapist",
								transcript: "",
								draft: {
									complaint,
									anamnesis,
									objectiveStatus: statusLocalis,
									diagnosis: diagnosisIcd10,
									treatmentPlan: treatmentDescription,
									warnings: [],
								},
								clientDraftId: `visit-draft-${effectiveVisitId}`,
								clientSavedAt: new Date().toISOString(),
							}),
						});
					} catch {}

					if (typeof window !== "undefined") {
						window.dispatchEvent(
							new CustomEvent("dente:diary-saved", {
								detail: { visitId: effectiveVisitId, patientId: effectivePatientId },
							}),
						);
						window.dispatchEvent(new CustomEvent("dente:emk-updated", { detail: formData }));
						window.dispatchEvent(new CustomEvent("dente:visit-updated", { detail: { visitId: effectiveVisitId } }));
					}
					showToast("Медицинская карта приёма сохранена в базу данных", "success", 4000);
				}
			} else {
				if (typeof window !== "undefined") {
					window.dispatchEvent(new CustomEvent("dente:emk-updated", { detail: formData }));
				}
				showToast("Медицинская карта приёма успешно сохранена", "success", 3000);
			}
		} catch (err) {
			console.error("useMedicalRecordSave: ошибка сохранения", err);
			showToast("Ошибка сохранения медицинской карты приёма", "error", 4000);
		} finally {
			setIsSaving(false);
		}
	}, [formData, onSave, visitId, patientId, initialData, effectiveIsDraft, isSaving]);

	return { isSaving, handleSaveForm };
}
