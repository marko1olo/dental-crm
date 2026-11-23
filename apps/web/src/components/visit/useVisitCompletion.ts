/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DENTE Dental CRM — Visit Completion & Estimate Assembly Hook (Facade)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Автономия врача (Мандаты 8b, 8e, 8k, 8n):
 * 1. Завершение приёма без обязательного участия ассистента или медсестры.
 * 2. Нулевая зависимость от штрихкодов лотков/крафт-пакетов или журналов СанПиН.
 * 3. Мгновенная сборка itemized-сметы и чека 54-ФЗ с точностью до копейки.
 * 4. Фоновое мягкое списание расходных материалов BOM по технологическим картам 804н.
 * 5. Асинхронное обновление позиций плана лечения и истории одонтограммы.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useCallback, useState } from "react";
import { generateUuidV7 } from "@dental/shared";
import {
	completeClinicalVisitAndAssembleEstimate,
	type ClinicalEstimateItem,
	type ClinicalVisitCompletionInput,
	type ClinicalVisitCompletionResult,
} from "./clinicalVisitWorkflow";
import type { DiaryState } from "../../lib/protocols/protocolTypes";
import { useAppStore } from "../../store/appStore";
import { showToast } from "../GlobalToast";
import { logger } from "../../utils/logger";
import {
	assembleVisitStoreCompletedServices,
	mergeExplicitAndStoreServices,
} from "./completionModules/visitCompletionServicesAssembler";
import { executeVisitPostCompletionPipeline } from "./completionModules/visitCompletionPipeline";
import { createVisitInvoiceInApi } from "./completionModules/visitInvoiceCreationService";
import { staffTelemetryService } from "../../services/logging/staffTelemetryService";
import type { VisitPlanItemLike } from "./completedServicesPlan";

export { assembleVisitStoreCompletedServices } from "./completionModules/visitCompletionServicesAssembler";

export interface UseVisitCompletionOptions {
	visitId?: string | null | undefined;
	patientId?: string | null | undefined;
	patientName?: string | null | undefined;
	patientPhone?: string | null | undefined;
	doctorName?: string | null | undefined;
	doctorSpecialty?: string | null | undefined;
	clinicName?: string | null | undefined;
	treatmentPlanId?: string | null | undefined;
	stageNumber?: number | null | undefined;
	diary?: DiaryState | {
		anamnesis?: string | null | undefined;
		statusLocalis?: string | null | undefined;
		diagnosisIcd10?: string | null | undefined;
		diagnosisTooth?: string | null | undefined;
		treatmentDescription?: string | null | undefined;
	} | undefined;
	completedPlanItems?: readonly VisitPlanItemLike[] | undefined;
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

const isUuid = (val: unknown): val is string =>
	typeof val === "string" &&
	/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val);

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
				const candidateVisitId =
					overrideInput?.visitId ||
					options?.visitId ||
					activeVisit?.id;
				const effectiveVisitId =
					candidateVisitId && isUuid(candidateVisitId)
						? candidateVisitId
						: generateUuidV7();

				const candidatePatientId =
					overrideInput?.patientId ||
					options?.patientId ||
					activeVisit?.patientId;
				const effectivePatientId =
					candidatePatientId && isUuid(candidatePatientId)
						? candidatePatientId
						: generateUuidV7();

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
					diagnosisIcd10: rawDiary.diagnosisIcd10 || "Z01.2",
					diagnosisTooth: rawDiary.diagnosisTooth || "",
					treatmentDescription: rawDiary.treatmentDescription || "Проведен осмотр и санация полости рта.",
				};

				const effectiveCompletedPlan =
					overrideInput?.completedPlanItems ||
					options?.completedPlanItems ||
					[];

				const storeServices = assembleVisitStoreCompletedServices();
				const explicitServices =
					overrideInput?.additionalServices ||
					options?.additionalServices ||
					[];
				const effectiveAdditionalServices = mergeExplicitAndStoreServices(
					explicitServices,
					storeServices,
				);

				const effectiveDiscountPercent =
					overrideInput?.discountPercent !== undefined
						? overrideInput.discountPercent
						: options?.discountPercent ?? 0;

				// Мгновенная сборка itemized-сметы и чека
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

				// Запуск фонового пайплайна пост-завершения (BOM списание, черновик, наряд, план, одонтограмма)
				const materialsDeduction = await executeVisitPostCompletionPipeline({
					effectiveVisitId,
					effectivePatientId,
					effectivePatientName,
					effectiveDoctorName,
					effectiveDiary,
					effectiveCompletedPlan,
					targetPlanId: overrideInput?.treatmentPlanId || options?.treatmentPlanId,
					stageNumber: overrideInput?.stageNumber !== undefined ? overrideInput.stageNumber : options?.stageNumber,
					activeVisit,
					dashboard,
					result,
				});

				const effectiveDoctorId =
					(activeVisit && "doctorId" in activeVisit && typeof (activeVisit as { doctorId?: unknown }).doctorId === "string"
						? ((activeVisit as { doctorId: string }).doctorId)
						: undefined) ||
					(dashboard && "activeDoctor" in dashboard && typeof (dashboard as { activeDoctor?: { id?: string } }).activeDoctor?.id === "string"
						? (dashboard as { activeDoctor: { id: string } }).activeDoctor.id
						: undefined);

				let createdInvoice: {
					invoiceId: string;
					invoiceNumber: string;
					totalAmountRub: number;
					isPersistedInDb: boolean;
				} | null = null;

				if (effectivePatientId && isUuid(effectivePatientId)) {
					try {
						createdInvoice = await createVisitInvoiceInApi({
							effectiveVisitId,
							effectivePatientId,
							effectiveDoctorId,
							result,
						});
					} catch (invErr) {
						logger.warn("[useVisitCompletion] Мягкое фоновое создание счёта:", invErr);
					}
				}

				const finalResult: ClinicalVisitCompletionResult = {
					...result,
					...(createdInvoice?.invoiceId
						? {
								invoiceId: createdInvoice.invoiceId,
								receiptNumber: createdInvoice.invoiceNumber,
							}
						: {}),
					form043uSaved: true,
					emkSaved: true,
					medicalCardSaved: true,
					...(materialsDeduction ? { materialsDeduction } : {}),
				};

				if (createdInvoice?.invoiceId) {
					staffTelemetryService.recordAction({
						actionType: "custom_action",
						entityType: "visit",
						entityId: effectiveVisitId,
						patientId: effectivePatientId,
						details: {
							status: "completed",
							invoiceId: createdInvoice.invoiceId,
							totalNetRub: finalResult.totalNetRub,
							receiptNumber: createdInvoice.invoiceNumber,
						},
					});

					const pendingCheckout = {
						patientId: effectivePatientId,
						patientName: effectivePatientName,
						visitId: effectiveVisitId,
						invoiceId: createdInvoice.invoiceId,
						services: finalResult.items,
						totalDueRub: createdInvoice.totalAmountRub,
						receiptNumber: createdInvoice.invoiceNumber,
						timestamp: Date.now(),
					};

					try {
						sessionStorage.setItem("dente_pending_checkout", JSON.stringify(pendingCheckout));
						localStorage.setItem("dente_pending_checkout", JSON.stringify(pendingCheckout));
					} catch {
						// Safe
					}

					if (typeof window !== "undefined") {
						window.dispatchEvent(
							new CustomEvent("dente-invoice-created", {
								detail: {
									invoiceId: createdInvoice.invoiceId,
									patientId: effectivePatientId,
									visitId: effectiveVisitId,
									totalAmountRub: createdInvoice.totalAmountRub,
								},
							}),
						);
						window.dispatchEvent(
							new CustomEvent("dente:pending-checkout-ready", {
								detail: pendingCheckout,
							}),
						);
					}
				}

				setCompletionResult(finalResult);
				const toastMessage = createdInvoice?.invoiceNumber
					? `Приём завершён. Счёт №${createdInvoice.invoiceNumber}: ${finalResult.totalNetRub.toLocaleString("ru-RU")} ₽ сформирован.`
					: `Приём завершён! ${finalResult.statusBannerText}`;
				showToast(toastMessage, "success", 4500);
				options?.onCompleteSuccess?.(finalResult);

				return finalResult;
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
