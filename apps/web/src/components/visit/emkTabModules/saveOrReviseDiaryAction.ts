/**
 * apps/web/src/components/visit/emkTabModules/saveOrReviseDiaryAction.ts
 *
 * Сервис синхронизации и ревизии дневников приёма с Fastify API / PostgreSQL 18.
 * Автономия врача («Исправленному верить», Мандаты 8e, 8n).
 */

import { generateUuidV7 } from "@dental/shared";
import { getDenteAuthHeaders } from "../../../lib/denteRequestHeaders";
import { denteQueryClient } from "../../../lib/queryClient";
import { showToast } from "../../GlobalToast";

export interface SaveOrReviseDiaryParams {
	readonly effectiveVisitId: string;
	readonly effectivePatientId: string;
	readonly visitNoteForm: Record<string, unknown>;
	readonly effectiveActiveTooth: number | null;
	readonly isSignedVisit: boolean;
	readonly isRevisingVisitNote: boolean;
}

const isUuid = (val: unknown): val is string =>
	typeof val === "string" &&
	/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val);

export async function executeSaveOrReviseDiary(
	params: SaveOrReviseDiaryParams,
): Promise<boolean> {
	const {
		effectiveVisitId,
		effectivePatientId,
		visitNoteForm,
		effectiveActiveTooth,
		isSignedVisit,
		isRevisingVisitNote,
	} = params;

	if (!isUuid(effectiveVisitId) || !isUuid(effectivePatientId)) {
		showToast(
			"Не указан корректный идентификатор приёма или пациента для сохранения дневника",
			"error",
			5000,
		);
		return false;
	}

	try {
		const complaintText = String(visitNoteForm?.complaint || "").trim();
		const anamnesisText = String(visitNoteForm?.anamnesis || "").trim();
		const statusLocalisText = String(visitNoteForm?.objectiveStatus || "").trim();
		const diagnosisRaw = String(visitNoteForm?.diagnosis || "").trim();
		const diagnosisIcd10Code =
			String(visitNoteForm?.diagnosisIcd10 || "").trim() ||
			diagnosisRaw.match(/^[A-Z]\d{2}(?:\.\d{1,2})?/i)?.[0]?.toUpperCase();
		const treatmentText = String(visitNoteForm?.treatmentPlan || "").trim();
		const toothRaw = effectiveActiveTooth
			? String(effectiveActiveTooth)
			: visitNoteForm?.diagnosisTooth
				? String(visitNoteForm.diagnosisTooth)
				: undefined;

		const idempotencyKey =
			typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
				? crypto.randomUUID()
				: generateUuidV7();

		if (isSignedVisit && isRevisingVisitNote) {
			let targetDiaryId: string | null =
				typeof visitNoteForm?.diaryId === "string" && isUuid(visitNoteForm.diaryId)
					? visitNoteForm.diaryId
					: null;

			if (!targetDiaryId) {
				try {
					const diaryLookupRes = await fetch(`/api/diaries/visit/${effectiveVisitId}`, {
						headers: { ...getDenteAuthHeaders() },
						credentials: "same-origin",
					});
					if (diaryLookupRes.ok) {
						const diaryLookupJson = (await diaryLookupRes.json().catch(() => null)) as {
							diary?: { id?: string | null } | null;
						} | null;
						if (
							typeof diaryLookupJson?.diary?.id === "string" &&
							isUuid(diaryLookupJson.diary.id)
						) {
							targetDiaryId = diaryLookupJson.diary.id;
						}
					}
				} catch (fetchErr) {
					console.warn(
						"saveOrReviseDiaryAction: ошибка поиска diaryId для ревизии",
						fetchErr,
					);
				}
			}

			if (targetDiaryId) {
				const reviseRes = await fetch(`/api/diaries/${targetDiaryId}/revise`, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"Idempotency-Key": idempotencyKey,
						...getDenteAuthHeaders(),
					},
					credentials: "same-origin",
					body: JSON.stringify({
						complaint: complaintText || "Жалоб на момент осмотра не предъявляет.",
						anamnesis: anamnesisText || "Соматически здоров. Аллергоанамнез не отягощен.",
						statusLocalis:
							statusLocalisText ||
							"Слизистая оболочка полости рта бледно-розовая, влажная. Патологических изменений не выявлено.",
						diagnosisIcd10: diagnosisIcd10Code || undefined,
						diagnosisTooth: toothRaw,
						treatmentDescription:
							treatmentText || "Проведен осмотр, санация / консультация.",
						revisionReason: "Исправленному верить",
					}),
				});

				if (!reviseRes.ok) {
					const errJson = (await reviseRes.json().catch(() => null)) as {
						error?: string;
						message?: string;
					} | null;
					const errorMsg =
						errJson?.message ||
						"Ошибка сохранения ревизии дневника приёма («Исправленному верить»)";
					console.warn(
						"saveOrReviseDiaryAction: отказ ревизии дневника в /api/diaries/:id/revise",
						errJson,
					);
					showToast(errorMsg, "error", 5000);
					return false;
				}
			} else {
				// Если прямой diaryId не найден, бэкенд saveOrSignDiaryTx.ts (строки 37-109)
				// автоматически сопоставляет дневник по visitId и при наличии заблокированного/подписанного
				// дневника создаёт ревизию в visitDiaryRevisions («Исправленному верить»), устраняя блокировку
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
						complaint: complaintText || "Жалоб на момент осмотра не предъявляет.",
						anamnesis: anamnesisText || "Соматически здоров. Аллергоанамнез не отягощен.",
						statusLocalis:
							statusLocalisText ||
							"Слизистая оболочка полости рта бледно-розовая, влажная. Патологических изменений не выявлено.",
						diagnosisIcd10: diagnosisIcd10Code || undefined,
						diagnosisTooth: toothRaw,
						treatmentDescription: treatmentText || "Проведен осмотр, санация / консультация.",
						status: "signed",
					}),
				});

				if (!diaryRes.ok) {
					const errJson = (await diaryRes.json().catch(() => null)) as {
						error?: string;
						message?: string;
					} | null;
					console.warn(
						"saveOrReviseDiaryAction: ошибка сохранения ревизии дневника по visitId в /api/diaries",
						errJson,
					);
					showToast(errJson?.message || "Ошибка сохранения ревизии дневника приёма", "error", 5000);
					return false;
				}
			}

			void denteQueryClient.invalidateQueries({ queryKey: ["diaries"] });
			void denteQueryClient.invalidateQueries({ queryKey: ["visit_diaries"] });
			void denteQueryClient.invalidateQueries({ queryKey: ["visits"] });
			void denteQueryClient.invalidateQueries({ queryKey: ["patient", effectivePatientId] });

			if (typeof window !== "undefined") {
				window.dispatchEvent(
					new CustomEvent("dente:diary-saved", {
						detail: { visitId: effectiveVisitId, patientId: effectivePatientId },
					}),
				);
				window.dispatchEvent(
					new CustomEvent("dente:emk-updated", {
						detail: { visitId: effectiveVisitId, patientId: effectivePatientId },
					}),
				);
				window.dispatchEvent(
					new CustomEvent("dente:visit-updated", {
						detail: { visitId: effectiveVisitId },
					}),
				);
			}

			return true;
		}

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
				complaint: complaintText || "Жалоб на момент осмотра не предъявляет.",
				anamnesis: anamnesisText || "Соматически здоров. Аллергоанамнез не отягощен.",
				statusLocalis:
					statusLocalisText ||
					"Слизистая оболочка полости рта бледно-розовая, влажная. Патологических изменений не выявлено.",
				diagnosisIcd10: diagnosisIcd10Code || undefined,
				diagnosisTooth: toothRaw,
				treatmentDescription: treatmentText || "Проведен осмотр, санация / консультация.",
				status: isSignedVisit ? "signed" : "draft",
			}),
		});

		if (!diaryRes.ok) {
			const errJson = (await diaryRes.json().catch(() => null)) as {
				error?: string;
				message?: string;
			} | null;
			console.warn(
				"saveOrReviseDiaryAction: ошибка сохранения дневника в /api/diaries",
				errJson,
			);
			showToast(errJson?.message || "Ошибка сохранения дневника приёма", "error", 5000);
			return false;
		}

		void denteQueryClient.invalidateQueries({ queryKey: ["diaries"] });
		void denteQueryClient.invalidateQueries({ queryKey: ["visit_diaries"] });
		void denteQueryClient.invalidateQueries({ queryKey: ["visits"] });
		void denteQueryClient.invalidateQueries({ queryKey: ["patient", effectivePatientId] });

		if (typeof window !== "undefined") {
			window.dispatchEvent(
				new CustomEvent("dente:diary-saved", {
					detail: { visitId: effectiveVisitId, patientId: effectivePatientId },
				}),
			);
			window.dispatchEvent(
				new CustomEvent("dente:emk-updated", {
					detail: { visitId: effectiveVisitId, patientId: effectivePatientId },
				}),
			);
			window.dispatchEvent(
				new CustomEvent("dente:visit-updated", {
					detail: { visitId: effectiveVisitId },
				}),
			);
		}

		return true;
	} catch (diaryErr) {
		console.warn(
			"saveOrReviseDiaryAction: сетевая ошибка сохранения дневника в /api/diaries",
			diaryErr,
		);
		showToast("Сетевая ошибка при сохранении дневника приёма", "error", 5000);
		return false;
	}
}
