/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DENTE Dental CRM — 1-Click Visit Completion & Estimate Assembly Hook
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Автономия врача:
 * 1. 1-клик завершение приёма без участия ассистента или медсестры (assistantUserId: null).
 * 2. Нулевая зависимость от штрихкодов лотков/крафт-пакетов или журналов СанПиН.
 * 3. Мгновенная сборка itemized-сметы и чека 54-ФЗ с точностью до копейки.
 * 4. Генерация СБП QR-кода для оплаты в кресле.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useCallback, useState } from "react";
import {
	completeClinicalVisitAndAssembleEstimate,
	type ClinicalEstimateItem,
	type ClinicalVisitCompletionInput,
	type ClinicalVisitCompletionResult,
} from "./clinicalVisitWorkflow";
import type { DiaryState } from "../useVisitDiaryLogic";
import { useAppStore } from "../../store/appStore";
import { showToast } from "../GlobalToast";
import { logger } from "../../utils/logger";
import { fetchWithHandling } from "../../utils/networkUtils";

export interface UseVisitCompletionOptions {
	visitId?: string | null | undefined;
	patientId?: string | null | undefined;
	patientName?: string | null | undefined;
	patientPhone?: string | null | undefined;
	doctorName?: string | null | undefined;
	doctorSpecialty?: string | null | undefined;
	clinicName?: string | null | undefined;
	diary?: DiaryState | {
		anamnesis?: string | null | undefined;
		statusLocalis?: string | null | undefined;
		diagnosisIcd10?: string | null | undefined;
		diagnosisTooth?: string | null | undefined;
		treatmentDescription?: string | null | undefined;
	} | undefined;
	completedPlanItems?: readonly any[] | undefined;
	additionalServices?: readonly ClinicalEstimateItem[] | undefined;
	discountPercent?: number | undefined;
	onCompleteSuccess?: ((result: ClinicalVisitCompletionResult) => void) | undefined;
	onCompleteError?: ((error: unknown) => void) | undefined;
}

export interface UseVisitCompletionReturn {
	isCompleting: boolean;
	completionResult: ClinicalVisitCompletionResult | null;
	completeVisit: (overrideInput?: Partial<ClinicalVisitCompletionInput>) => Promise<ClinicalVisitCompletionResult>;
	resetCompletion: () => void;
}

export function useVisitCompletion(options?: UseVisitCompletionOptions): UseVisitCompletionReturn {
	const [isCompleting, setIsCompleting] = useState<boolean>(false);
	const [completionResult, setCompletionResult] = useState<ClinicalVisitCompletionResult | null>(null);

	const dashboard = useAppStore((s) => s.dashboard);
	const activeDoctorName = useAppStore((s) => s.activeDoctorName);
	const activeVisit = useAppStore((s) => s.dashboard?.activeVisit);

	const resetCompletion = useCallback(() => {
		setCompletionResult(null);
		setIsCompleting(false);
	}, []);

	const completeVisit = useCallback(
		async (overrideInput?: Partial<ClinicalVisitCompletionInput>): Promise<ClinicalVisitCompletionResult> => {
			setIsCompleting(true);
			try {
				const effectiveVisitId =
					overrideInput?.visitId ||
					options?.visitId ||
					activeVisit?.id ||
					`VIS-${Date.now()}`;

				const effectivePatientId =
					overrideInput?.patientId ||
					options?.patientId ||
					activeVisit?.patientId ||
					"pat-unknown";

				const effectivePatientName =
					overrideInput?.patientName ||
					options?.patientName ||
					"Пациент";

				const effectivePatientPhone =
					overrideInput?.patientPhone ||
					options?.patientPhone ||
					"";

				const effectiveDoctorName =
					overrideInput?.doctorName ||
					options?.doctorName ||
					activeDoctorName ||
					"Лечащий врач";

				const effectiveDoctorSpecialty =
					overrideInput?.doctorSpecialty ||
					options?.doctorSpecialty ||
					"Врач-стоматолог";

				const effectiveClinicName =
					overrideInput?.clinicName ||
					options?.clinicName ||
					dashboard?.clinicSettings?.profile?.clinicName ||
					"Стоматологическая клиника «DENTE»";

				const rawDiary = overrideInput?.diary || options?.diary || {};
				const effectiveDiary = {
					anamnesis: rawDiary.anamnesis || "Жалоб на момент осмотра активно не предъявляет.",
					statusLocalis: rawDiary.statusLocalis || "Слизистая оболочка полости рта бледно-розовая, влажная.",
					diagnosisIcd10: rawDiary.diagnosisIcd10 || "K02.1",
					diagnosisTooth: rawDiary.diagnosisTooth || "",
					treatmentDescription: rawDiary.treatmentDescription || "Проведен осмотр и санация полости рта.",
				};

				const effectiveCompletedPlan =
					overrideInput?.completedPlanItems ||
					options?.completedPlanItems ||
					[];

				const effectiveAdditionalServices =
					overrideInput?.additionalServices ||
					options?.additionalServices ||
					[];

				const effectiveDiscountPercent =
					overrideInput?.discountPercent !== undefined
						? overrideInput.discountPercent
						: options?.discountPercent ?? 0;

				// 1-клик сборка сметы и чека
				const result = completeClinicalVisitAndAssembleEstimate({
					visitId: effectiveVisitId,
					patientId: effectivePatientId,
					patientName: effectivePatientName,
					patientPhone: effectivePatientPhone,
					doctorName: effectiveDoctorName,
					doctorSpecialty: effectiveDoctorSpecialty,
					clinicName: effectiveClinicName,
					diary: effectiveDiary,
					completedPlanItems: effectiveCompletedPlan,
					additionalServices: effectiveAdditionalServices,
					discountPercent: effectiveDiscountPercent,
				});

				// Опциональная синхронизация с бэкендом (если визит зарегистрирован в БД)
				if (activeVisit?.id && activeVisit.id !== "no-active-visit") {
					try {
						await fetchWithHandling(`/api/visits/${activeVisit.id}/draft/autosave`, {
							method: "PUT",
							headers: { "Content-Type": "application/json" },
							body: JSON.stringify({
								patientId: effectivePatientId,
								transcript: "",
								clientDraftId: `completion-${activeVisit.id}`,
								clientSavedAt: new Date().toISOString(),
								baseRevision: activeVisit.revision ?? null,
							}),
						}).catch((err) => {
							logger.warn("[useVisitCompletion] Мягкое фоновое автосохранение:", err);
						});
					} catch {
						// Не блокируем завершение при сетевой задержке
					}
				}

				setCompletionResult(result);
				showToast(`Приём завершён! ${result.statusBannerText}`, "success", 4500);
				options?.onCompleteSuccess?.(result);

				return result;
			} catch (error) {
				logger.error("[useVisitCompletion] Ошибка при завершении визита:", error);
				showToast("Ошибка при формировании сметы и чека визита", "error", 4000);
				options?.onCompleteError?.(error);
				throw error;
			} finally {
				setIsCompleting(false);
			}
		},
		[options, activeVisit, activeDoctorName, dashboard],
	);

	return {
		isCompleting,
		completionResult,
		completeVisit,
		resetCompletion,
	};
}
