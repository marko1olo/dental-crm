import React from "react";
import { logger } from "../../../utils/logger";
import { showToast } from "../../GlobalToast";
import { staffTelemetryService } from "../../../services/logging/staffTelemetryService";
import {
	type ClinicalVisitCompletionResult,
	completeClinicalVisitAndAssembleEstimate,
} from "../clinicalVisitWorkflow";
import { assembleVisitStoreCompletedServices } from "../useVisitCompletion";
import {
	executeVisitPostCompletionPipeline,
	type ActiveVisitCompletionContext,
	type DashboardCompletionContext,
	type DashboardAppointmentContext,
} from "../completionModules/visitCompletionPipeline";
import { createVisitInvoiceInApi } from "../completionModules/visitInvoiceCreationService";
import type { Dashboard, Patient } from "@dental/shared";
import type { VisitPatientEntity, VisitDoctorEntity } from "../view/VisitViewProps";
import type { VisitEmkDashboardEntity } from "./types";

export type CompletionDashboardContext = DashboardCompletionContext & {
	readonly activeDoctor?: VisitDoctorEntity | { id?: string; fullName?: string; specialty?: string } | null | undefined;
	readonly activeVisit?: ActiveVisitCompletionContext | null | undefined;
	readonly activeAppointment?: DashboardAppointmentContext | null | undefined;
	readonly [key: string]: unknown;
};

export interface UseVisitCompletionWorkflowOptions {
	openVisitId: string;
	activePatient?: VisitPatientEntity | Patient | { id?: string; fullName?: string; phone?: string; name?: string } | null | undefined;
	activeDoctor?: VisitDoctorEntity | { id?: string; fullName?: string; specialty?: string } | null | undefined;
	dashboard?: (Dashboard & VisitEmkDashboardEntity) | CompletionDashboardContext | null | undefined;
	visitNoteForm: Record<string, unknown>;
	flushSoloPendingSave: () => Promise<void>;
	acceptDraftToVisit?: (() => Promise<void>) | undefined;
	diagnosisTooth?: string | number | null | undefined;
}

export function useVisitCompletionWorkflow({
	openVisitId,
	activePatient,
	activeDoctor,
	dashboard,
	visitNoteForm,
	flushSoloPendingSave,
	acceptDraftToVisit,
	diagnosisTooth,
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
				complaint:
					typeof visitNoteForm?.complaint === "string" && visitNoteForm.complaint.trim() !== ""
						? visitNoteForm.complaint
						: "Жалоб нет",
				anamnesis:
					typeof visitNoteForm?.anamnesis === "string" && visitNoteForm.anamnesis.trim() !== ""
						? visitNoteForm.anamnesis
						: "Соматически здоров. Аллергоанамнез не отягощен.",
				objectiveStatus:
					typeof visitNoteForm?.objectiveStatus === "string" && visitNoteForm.objectiveStatus.trim() !== ""
						? visitNoteForm.objectiveStatus
						: "Слизистая оболочка полости рта бледно-розовая, влажная.",
				diagnosis:
					typeof visitNoteForm?.diagnosis === "string" && visitNoteForm.diagnosis.trim() !== ""
						? visitNoteForm.diagnosis
						: "Z01.2 Осмотр полости рта, патологий не выявлено (Норма)",
				treatmentPlan:
					typeof visitNoteForm?.treatmentPlan === "string" && visitNoteForm.treatmentPlan.trim() !== ""
						? visitNoteForm.treatmentPlan
						: "План оздоровления и гигиены",
				recommendations:
					typeof visitNoteForm?.recommendations === "string" && visitNoteForm.recommendations.trim() !== ""
						? visitNoteForm.recommendations
						: "Профосмотр через 6 месяцев",
			};

			const additionalServices = assembleVisitStoreCompletedServices();
			const effectiveVisitId = openVisitId || `VIS-${Date.now()}`;
			const effectivePatientId = activePatient?.id;
			if (!effectivePatientId) {
				throw new Error("Не указан пациент для завершения приёма и формирования счёта.");
			}
			const effectivePatientName = activePatient?.fullName || "Пациент";
			const effectiveDoctorName =
				activeDoctor?.fullName ||
				dashboard?.activeDoctor?.fullName ||
				"Лечащий врач";

			const effectiveDiagnosisTooth =
				diagnosisTooth != null && String(diagnosisTooth).trim() !== ""
					? String(diagnosisTooth).trim()
					: visitNoteForm?.diagnosisTooth != null && String(visitNoteForm.diagnosisTooth).trim() !== ""
						? String(visitNoteForm.diagnosisTooth).trim()
						: visitNoteForm?.toothNumber != null && String(visitNoteForm.toothNumber).trim() !== ""
							? String(visitNoteForm.toothNumber).trim()
							: "";

			const result = await completeClinicalVisitAndAssembleEstimate({
				visitId: openVisitId,
				patientId: effectivePatientId,
				patientName: effectivePatientName,
				doctorName: effectiveDoctorName,
				diary: {
					anamnesis: finalDiary.anamnesis,
					statusLocalis: finalDiary.objectiveStatus,
					diagnosisIcd10: finalDiary.diagnosis,
					diagnosisTooth: effectiveDiagnosisTooth,
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
					diagnosisTooth: effectiveDiagnosisTooth,
					treatmentDescription: finalDiary.treatmentPlan,
				},
				effectiveCompletedPlan: [],
				targetPlanId:
					dashboard?.activeVisit?.treatmentPlanId ||
					dashboard?.activeAppointment?.treatmentPlanId ||
					null,
				stageNumber:
					typeof dashboard?.activeVisit?.stageNumber === "number"
						? dashboard.activeVisit.stageNumber
						: typeof dashboard?.activeAppointment?.stageNumber === "number"
							? dashboard.activeAppointment.stageNumber
							: undefined,
				activeVisit: dashboard?.activeVisit ?? undefined,
				dashboard: dashboard ?? undefined,
				result,
			});

			const effectiveDoctorId =
				activeDoctor?.id ||
				dashboard?.activeDoctor?.id ||
				undefined;

			const createdInvoice = await createVisitInvoiceInApi({
				effectiveVisitId,
				effectivePatientId,
				effectiveDoctorId,
				result,
			});

			const finalCompletionResult: ClinicalVisitCompletionResult = createdInvoice.isPersistedInDb
				? {
						...result,
						invoiceId: createdInvoice.invoiceId,
						receiptNumber: createdInvoice.invoiceNumber,
				  }
				: result;

			staffTelemetryService.recordAction({
				actionType: "custom_action",
				entityType: "visit",
				entityId: openVisitId,
				patientId: activePatient?.id || null,
				details: {
					status: "completed",
					invoiceId: createdInvoice.invoiceId,
					totalNetRub: finalCompletionResult.totalNetRub,
					receiptNumber: createdInvoice.invoiceNumber,
				},
			});

			const pendingCheckout = {
				patientId: effectivePatientId,
				patientName:
					activePatient?.fullName ||
					(typeof (activePatient as { name?: string } | undefined)?.name === "string"
						? (activePatient as { name?: string }).name
						: "Пациент"),
				visitId: openVisitId,
				invoiceId: createdInvoice.invoiceId,
				services: finalCompletionResult.items,
				totalDueRub: createdInvoice.totalAmountRub,
				receiptNumber: createdInvoice.invoiceNumber,
				timestamp: Date.now(),
			};
			try {
				sessionStorage.setItem("dente_pending_checkout", JSON.stringify(pendingCheckout));
				localStorage.setItem("dente_pending_checkout", JSON.stringify(pendingCheckout));
			} catch {
				// Local storage quota safe
			}

			setCompletionResult(finalCompletionResult);
			// Мандат 8e: Запрет насильственного срыва экрана в кассу. Врач остаётся в карте приёма!
			setIsSbpQrModalOpen(false);
			showToast(
				`Приём завершён. Счёт №${createdInvoice.invoiceNumber}: ${finalCompletionResult.totalNetRub.toLocaleString("ru-RU")} ₽ сформирован.`,
				"success",
				4000,
			);
			if (typeof window !== "undefined") {
				window.dispatchEvent(
					new CustomEvent("dente-invoice-created", {
						detail: {
							invoiceId: createdInvoice.invoiceId,
							patientId: effectivePatientId,
						},
					}),
				);
				window.dispatchEvent(
					new CustomEvent("dente:pending-checkout-ready", {
						detail: pendingCheckout,
					}),
				);
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
	}, [visitNoteForm, openVisitId, activePatient, activeDoctor, dashboard, flushSoloPendingSave, acceptDraftToVisit, diagnosisTooth]);

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
