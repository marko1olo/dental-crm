/**
 * apps/web/src/components/emr/record/useMedicalRecordSave.ts
 *
 * Канонический сервис персистентности медицинской карты приёма и дневников SOAP.
 * Сохраняет данные в реальный PostgreSQL 18 через /api/diaries и /api/visits/:visitId/draft/autosave
 * с клиентским Idempotency-Key (UUIDv7), реактивной гидратацией и тостами (Мандаты 8e, 8n, 8am).
 */

import { useCallback, useState } from "react";
import { resolveDentalSpecialty, generateUuidV7 } from "@dental/shared";
import { showToast } from "../../GlobalToast";
import { getDenteAuthHeaders } from "../../../lib/denteRequestHeaders";
import { denteQueryClient } from "../../../lib/queryClient";
import { deleteOfflineDraft } from "../../../services/offline/storage/idbDraftOps";
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
					let anyDiaryFailed = false;
					try {
						// Последовательное сохранение всех дневников приёма (Multi-Tooth SOAP Loop, Мандаты 8e, 8n)
						for (const diary of diariesToPersist) {
							const diaryComplaint = diary?.subjectiveComplaints || formData.anamnesis.chiefComplaint || complaint;
							const diaryAnamnesis = formData.anamnesis.historyOfPresentIllness || anamnesis;
							const diaryStatusLocalis = diary?.objectiveStatusLocalis || statusLocalis;
							const diaryDiagnosisIcd10 = diary?.assessmentIcd10Code || formData.passport.primaryDiagnosisIcd10 || diagnosisIcd10;
							const diaryTreatmentDescription = diary?.procedureProtocol || formData.generalTreatmentPlan || treatmentDescription;
							const diaryTooth = diary?.toothNumber ? String(diary.toothNumber).trim() : undefined;

							const idempotencyKey =
								typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
									? crypto.randomUUID()
									: generateUuidV7();

							const diaryRes = await fetch("/api/diaries", {
								method: "POST",
								headers: {
									"Content-Type": "application/json",
									"Idempotency-Key": idempotencyKey,
									...getDenteAuthHeaders(),
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

							if (!diaryRes.ok) {
								anyDiaryFailed = true;
								const errJson = (await diaryRes.json().catch(() => null)) as { error?: string; message?: string } | null;
								const errorMessage = errJson?.message || errJson?.error || "Ошибка сохранения дневника приёма в базу данных";
								console.warn("useMedicalRecordSave: ошибка сохранения дневника в /api/diaries", errJson);
								showToast(errorMessage, "error", 5000);
							}
						}
					} catch (diaryPersistErr) {
						anyDiaryFailed = true;
						console.warn("useMedicalRecordSave: ошибка персистентности в /api/diaries", diaryPersistErr);
						showToast("Сетевая ошибка при сохранении дневника приёма", "error", 5000);
					}

					if (!anyDiaryFailed) {
						if (effectivePatientId) {
							void deleteOfflineDraft(`draft:emk:${effectivePatientId}`);
							void deleteOfflineDraft(`dente:medical_card_autosave:${effectivePatientId}`);
							if (typeof sessionStorage !== "undefined") {
								try {
									sessionStorage.removeItem(`dente:medical_card_autosave:${effectivePatientId}`);
								} catch { /* ignore storage error */ }
							}
						}
						void denteQueryClient.invalidateQueries({ queryKey: ["diaries"] });
						void denteQueryClient.invalidateQueries({ queryKey: ["visit_diaries"] });
						void denteQueryClient.invalidateQueries({ queryKey: ["visits"] });
						if (effectivePatientId) {
							void denteQueryClient.invalidateQueries({ queryKey: ["patient", effectivePatientId] });
						}
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
				}
			} else if (effectivePatientId) {
				const isUuid = (val: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
				if (isUuid(effectivePatientId)) {
					const patchPayload: Record<string, unknown> = {
						...(formData.passport.patientFullName ? { fullName: formData.passport.patientFullName } : {}),
						...(formData.passport.patientBirthDate ? { birthDate: formData.passport.patientBirthDate } : {}),
						...(formData.passport.patientPhone ? { phone: formData.passport.patientPhone } : {}),
						...(formData.anamnesis.chiefComplaint ? { notes: formData.anamnesis.chiefComplaint } : {}),
						administrativeProfile: {
							...(formData.passport.patientIdentityDocument ? { identityDocument: formData.passport.patientIdentityDocument } : {}),
							...(formData.passport.patientSnils ? { snils: formData.passport.patientSnils } : {}),
							...(formData.passport.patientInsurancePolicy ? { insurancePolicyNumber: formData.passport.patientInsurancePolicy } : {}),
							...(formData.passport.patientAddressRegistration ? { registrationAddress: formData.passport.patientAddressRegistration } : {}),
							...(formData.passport.patientAddressResidence ? { residentialAddress: formData.passport.patientAddressResidence } : {}),
							clinicalSafetyProfile: {
								allergies: formData.anamnesis.allergologicalHistory || "",
								somaticDiseases: formData.anamnesis.concomitantSomaticDiseases || "",
								somaticNotes: formData.anamnesis.medicalHistoryVitae || "",
								pastDiseases: formData.anamnesis.pastDentalInterventions || "",
								heredity: formData.anamnesis.occupationalHazardsAndHabits || "",
							},
							somaticAlerts: formData.anamnesis.allergologicalHistory ? [formData.anamnesis.allergologicalHistory] : [],
						},
					};

					const res = await fetch(`/api/patients/${effectivePatientId}`, {
						method: "PATCH",
						headers: {
							"Content-Type": "application/json",
							"Idempotency-Key": generateUuidV7(),
							...getDenteAuthHeaders(),
						},
						body: JSON.stringify(patchPayload),
					});

					if (!res.ok) {
						const errorPayload = (await res.json().catch(() => null)) as { error?: string; message?: string } | null;
						const errorMessage = errorPayload?.error || errorPayload?.message || "Не удалось сохранить медицинскую карту";
						showToast(errorMessage, "error", 4000);
						return;
					}

					void denteQueryClient.invalidateQueries({ queryKey: ["patient", effectivePatientId] });
					void denteQueryClient.invalidateQueries({ queryKey: ["patients"] });
				}

				if (effectivePatientId) {
					void deleteOfflineDraft(`draft:emk:${effectivePatientId}`);
					void deleteOfflineDraft(`dente:medical_card_autosave:${effectivePatientId}`);
					if (typeof sessionStorage !== "undefined") {
						try {
							sessionStorage.removeItem(`dente:medical_card_autosave:${effectivePatientId}`);
						} catch { /* ignore storage error */ }
					}
				}

				if (typeof window !== "undefined") {
					window.dispatchEvent(new CustomEvent("dente:emk-updated", { detail: formData }));
				}
				showToast("Медицинская карта приёма сохранена в базу данных", "success", 3000);
			} else {
				if (typeof window !== "undefined") {
					window.dispatchEvent(new CustomEvent("dente:emk-updated", { detail: formData }));
				}
				showToast("Медицинская карта приёма сохранена (локально)", "info", 3000);
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
