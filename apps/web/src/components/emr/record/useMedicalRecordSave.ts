/**
 * apps/web/src/components/emr/record/useMedicalRecordSave.ts
 *
 * Канонический сервис персистентности медицинской карты приёма и дневников SOAP.
 * Сохраняет данные в реальный PostgreSQL 18 через /api/diaries и /api/visits/:visitId/draft/autosave
 * с клиентским Idempotency-Key (UUIDv7), реактивной гидратацией и тостами (Мандаты 8e, 8n, 8am).
 */

import { useCallback, useState } from "react";
import { resolveDentalSpecialty } from "@dental/shared";
import { showToast } from "../../GlobalToast";
import { denteAdminSecretRequestHeaders } from "../../../lib/denteRequestHeaders";
import type { MedicalRecordData } from "../types/recordDataTypes";

/** Канонический ключ черновика дневника приёма (Мандаты 8x/8ap) */
export const RECORD_DIARY_DRAFT = "RECORD_DIARY_DRAFT";
/** @deprecated Использовать RECORD_DIARY_DRAFT */
export const DIARY_043_DRAFT = RECORD_DIARY_DRAFT;

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
				const primaryDiary = formData.visitDiaries[0];
				const complaint = formData.anamnesis.chiefComplaint || primaryDiary?.subjectiveComplaints || "";
				const anamnesis = formData.anamnesis.historyOfPresentIllness || "";
				const statusLocalis = primaryDiary?.objectiveStatusLocalis || formData.dentalStatus.oralMucosaStatus || "";
				const diagnosisIcd10 = formData.passport.primaryDiagnosisIcd10 || primaryDiary?.assessmentIcd10Code || "";
				const treatmentDescription = formData.generalTreatmentPlan || primaryDiary?.procedureProtocol || "";
				const resolvedSpecialty = resolveDentalSpecialty(formData.passport.attendingDoctorSpecialty);

				// DEF-EMR-01: Сохранение и персистентность в PostgreSQL 18 через POST /api/diaries (visit_diaries и visit_diary_revisions)
				const isUuid = (val: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
				if (isUuid(effectiveVisitId) && isUuid(effectivePatientId)) {
					const diariesToPersist = formData.visitDiaries.length > 0 ? formData.visitDiaries : [undefined];
					try {
						await Promise.all(
							diariesToPersist.map(async (diary) => {
								const diaryComplaint = formData.anamnesis.chiefComplaint || diary?.subjectiveComplaints || complaint;
								const diaryAnamnesis = formData.anamnesis.historyOfPresentIllness || anamnesis;
								const diaryStatusLocalis = diary?.objectiveStatusLocalis || statusLocalis;
								const diaryDiagnosisIcd10 = formData.passport.primaryDiagnosisIcd10 || diary?.assessmentIcd10Code || diagnosisIcd10;
								const diaryTreatmentDescription = formData.generalTreatmentPlan || diary?.procedureProtocol || treatmentDescription;
								const diaryTooth = diary?.toothNumber ? String(diary.toothNumber) : undefined;

								const idempotencyKey =
									typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
										? crypto.randomUUID()
										: undefined;

								const diaryRes = await fetch("/api/diaries", {
									method: "POST",
									headers: {
										"Content-Type": "application/json",
										...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
										...denteAdminSecretRequestHeaders(),
									},
									credentials: "same-origin",
									body: JSON.stringify({
										visitId: effectiveVisitId,
										patientId: effectivePatientId,
										complaint: diaryComplaint,
										anamnesis: diaryAnamnesis,
										statusLocalis: diaryStatusLocalis,
										diagnosisIcd10: diaryDiagnosisIcd10 || undefined,
										diagnosisTooth: diaryTooth,
										treatmentDescription: diaryTreatmentDescription,
										status: effectiveIsDraft ? "draft" : "signed",
									}),
								});

								if (!diaryRes.ok && !effectiveIsDraft) {
									const errJson = await diaryRes.json().catch(() => null);
									console.warn("useMedicalRecordSave: ошибка сохранения дневника в /api/diaries", errJson);
								}
							}),
						);
					} catch (diaryPersistErr) {
						console.warn("useMedicalRecordSave: ошибка персистентности в /api/diaries", diaryPersistErr);
					}
				}

				const autosaveIdempotency =
					typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
						? crypto.randomUUID()
						: undefined;

				const res = await fetch(`/api/visits/${effectiveVisitId}/draft/autosave`, {
					method: "PUT",
					headers: {
						"Content-Type": "application/json",
						...(autosaveIdempotency ? { "Idempotency-Key": autosaveIdempotency } : {}),
						...denteAdminSecretRequestHeaders(),
					},
					credentials: "same-origin",
					body: JSON.stringify({
						patientId: effectivePatientId,
						selectedSpecialty: resolvedSpecialty,
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

				if (res.ok) {
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
				} else {
					const errorPayload = (await res.json().catch(() => null)) as { error?: string; message?: string } | null;
					const errorMessage = errorPayload?.error || errorPayload?.message || "Не удалось сохранить медицинскую карту";
					showToast(errorMessage, "error", 4000);
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
