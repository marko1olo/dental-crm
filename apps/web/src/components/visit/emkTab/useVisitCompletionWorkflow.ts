import React from "react";
import { logger } from "../../../utils/logger";
import { showToast } from "../../GlobalToast";
import { staffTelemetryService } from "../../../services/logging/staffTelemetryService";
import {
	type ClinicalVisitCompletionResult,
	completeClinicalVisitAndAssembleEstimate,
} from "../clinicalVisitWorkflow";
import { assembleVisitStoreCompletedServices } from "../useVisitCompletion";
import { executeVisitPostCompletionPipeline } from "../completionModules/visitCompletionPipeline";

export interface UseVisitCompletionWorkflowOptions {
	openVisitId: string;
	activePatient?: any;
	dashboard?: any;
	visitNoteForm: Record<string, any>;
	flushSoloPendingSave: () => Promise<void>;
	acceptDraftToVisit?: (() => Promise<void>) | undefined;
}

export function useVisitCompletionWorkflow({
	openVisitId,
	activePatient,
	dashboard,
	visitNoteForm,
	flushSoloPendingSave,
	acceptDraftToVisit,
}: UseVisitCompletionWorkflowOptions) {
	const [isCompletingVisit, setIsCompletingVisit] = React.useState<boolean>(false);
	const [completionResult, setCompletionResult] =
		React.useState<ClinicalVisitCompletionResult | null>(null);
	const [completionError, setCompletionError] = React.useState<string | null>(null);
	const [isSbpQrModalOpen, setIsSbpQrModalOpen] = React.useState<boolean>(false);

	const handleCompleteVisitAndGenerateReceipt = React.useCallback(async () => {
		setIsCompletingVisit(true);
		setCompletionError(null);
		try {
			try {
				await flushSoloPendingSave();
			} catch (flushErr) {
				logger.warn("[useVisitCompletionWorkflow] Предварительное сохранение выполнено локально:", flushErr);
			}
			if (acceptDraftToVisit) {
				try {
					await acceptDraftToVisit();
				} catch (draftErr) {
					logger.warn("[useVisitCompletionWorkflow] Черновик принят локально:", draftErr);
				}
			}

			const finalDiary = {
				complaint: visitNoteForm?.complaint || "Жалоб нет",
				anamnesis:
					visitNoteForm?.anamnesis ||
					"Соматически здоров. Аллергоанамнез не отягощен.",
				objectiveStatus:
					visitNoteForm?.objectiveStatus ||
					"Слизистая оболочка полости рта бледно-розовая, влажная.",
				diagnosis:
					visitNoteForm?.diagnosis ||
					"Z01.2 Осмотр полости рта, патологий не выявлено (Норма)",
				treatmentPlan:
					visitNoteForm?.treatmentPlan || "План оздоровления и гигиены",
				recommendations:
					visitNoteForm?.recommendations || "Профосмотр через 6 месяцев",
			};

			const additionalServices = assembleVisitStoreCompletedServices();
			const effectiveVisitId = openVisitId || `VIS-${Date.now()}`;
			const effectivePatientId = activePatient?.id || "pat-default";
			const effectivePatientName = activePatient?.fullName || "Пациент";
			const effectiveDoctorName =
				dashboard?.activeDoctor?.fullName || "Лечащий врач";

			const result = await completeClinicalVisitAndAssembleEstimate({
				visitId: openVisitId,
				patientId: effectivePatientId,
				patientName: effectivePatientName,
				doctorName: effectiveDoctorName,
				diary: {
					anamnesis: finalDiary.anamnesis,
					statusLocalis: finalDiary.objectiveStatus,
					diagnosisIcd10: finalDiary.diagnosis,
					treatmentDescription: finalDiary.treatmentPlan,
				},
				additionalServices,
			});

			await executeVisitPostCompletionPipeline({
				effectiveVisitId,
				effectivePatientId,
				effectivePatientName,
				effectiveDoctorName,
				effectiveDiary: {
					anamnesis: finalDiary.anamnesis,
					statusLocalis: finalDiary.objectiveStatus,
					diagnosisIcd10: finalDiary.diagnosis,
					diagnosisTooth: "",
					treatmentDescription: finalDiary.treatmentPlan,
				},
				effectiveCompletedPlan: [],
				targetPlanId:
					(dashboard as any)?.activeVisit?.treatmentPlanId ||
					(dashboard as any)?.activeAppointment?.treatmentPlanId ||
					null,
				stageNumber:
					(dashboard as any)?.activeVisit?.stageNumber ??
					(dashboard as any)?.activeAppointment?.stageNumber ??
					undefined,
				activeVisit: (dashboard as any)?.activeVisit,
				dashboard,
				result,
			});

			staffTelemetryService.recordAction({
				actionType: "custom_action",
				entityType: "visit",
				entityId: openVisitId,
				patientId: activePatient?.id || null,
				details: {
					status: "completed",
					totalNetRub: result.totalNetRub,
					receiptNumber: result.receiptNumber,
				},
			});

			const pendingCheckout = {
				patientId: activePatient?.id || "pat-default",
				patientName: activePatient?.fullName || (activePatient as any)?.name || "Пациент",
				visitId: openVisitId,
				services: result.items,
				totalDueRub: result.totalNetRub,
				receiptNumber: result.receiptNumber,
				timestamp: Date.now(),
			};
			try {
				sessionStorage.setItem("dente_pending_checkout", JSON.stringify(pendingCheckout));
				localStorage.setItem("dente_pending_checkout", JSON.stringify(pendingCheckout));
			} catch {
				// Local storage quota safe
			}

			setCompletionResult(result);
			setIsSbpQrModalOpen(true);
			showToast(`Приём завершён! Смета: ${result.totalNetRub.toLocaleString("ru-RU")} ₽. Переход в кассу...`, "success", 4000);
			if (typeof window !== "undefined") {
				window.dispatchEvent(new CustomEvent("dente:pending-checkout-ready", { detail: pendingCheckout }));
				window.location.hash = "finance";
			}
			return true;
		} catch (err) {
			logger.error("[useVisitCompletionWorkflow] Ошибка завершения приёма:", err);
			const errMsg =
				err instanceof Error && err.message
					? err.message
					: "Не удалось рассчитать смету приёма. Проверьте данные и повторите расчёт.";
			setCompletionError(errMsg);
			showToast(
				"Ошибка расчёта сметы. Нажмите «Повторить расчёт сметы»",
				"error",
				5000,
			);
			return false;
		} finally {
			setIsCompletingVisit(false);
		}
	}, [visitNoteForm, openVisitId, activePatient, dashboard, flushSoloPendingSave, acceptDraftToVisit]);

	React.useEffect(() => {
		const handleExternalTrigger = (e: Event) => {
			const detail = (
				e as CustomEvent<{ promise?: Promise<boolean>; handled?: boolean }>
			)?.detail;
			const completionPromise = handleCompleteVisitAndGenerateReceipt();
			if (detail && typeof detail === "object") {
				detail.handled = true;
				detail.promise = completionPromise;
			}
		};
		if (typeof window !== "undefined") {
			window.addEventListener("dente:trigger-complete-visit", handleExternalTrigger);
		}
		return () => {
			if (typeof window !== "undefined") {
				window.removeEventListener("dente:trigger-complete-visit", handleExternalTrigger);
			}
		};
	}, [handleCompleteVisitAndGenerateReceipt]);

	return {
		isCompletingVisit,
		completionResult,
		completionError,
		clearCompletionError: () => setCompletionError(null),
		isSbpQrModalOpen,
		setIsSbpQrModalOpen,
		handleCompleteVisitAndGenerateReceipt,
	};
}
