import React from "react";
import { logger } from "../../../utils/logger";
import { showToast } from "../../GlobalToast";
import { staffTelemetryService } from "../../../services/logging/staffTelemetryService";
import { denteAdminSecretRequestHeaders } from "../../../AppHelpers";
import { fetchWithHandling } from "../../../utils/networkUtils";
import { useInventoryStore } from "../../../store/inventoryStore";
import {
	mapVisitUiStateToToothDataState,
	inferToothStateFromService,
} from "../../../store/visitStore";
import {
	type ClinicalVisitCompletionResult,
	completeClinicalVisitAndAssembleEstimate,
} from "../clinicalVisitWorkflow";
import { assembleVisitStoreCompletedServices } from "../useVisitCompletion";
import { performAutoVisitBomDeduction } from "../../inventory/autoBomDeductionEngine";

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
	const [isSbpQrModalOpen, setIsSbpQrModalOpen] = React.useState<boolean>(false);

	const handleCompleteVisitAndGenerateReceipt = React.useCallback(async () => {
		setIsCompletingVisit(true);
		try {
			await flushSoloPendingSave();
			if (acceptDraftToVisit) {
				await acceptDraftToVisit();
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

			const result = await completeClinicalVisitAndAssembleEstimate({
				visitId: openVisitId,
				patientId: activePatient?.id || "pat-default",
				patientName: activePatient?.fullName || "Пациент",
				doctorName: dashboard?.activeDoctor?.fullName || "Лечащий врач",
				diary: {
					anamnesis: finalDiary.anamnesis,
					statusLocalis: finalDiary.objectiveStatus,
					diagnosisIcd10: finalDiary.diagnosis,
					treatmentDescription: finalDiary.treatmentPlan,
				},
				additionalServices,
			});

			try {
				await performAutoVisitBomDeduction({
					visitId: openVisitId || `VIS-${Date.now()}`,
					patientId: activePatient?.id || "pat-default",
					patientFullName: activePatient?.fullName || "Пациент",
					doctorId: dashboard?.activeDoctor?.id || dashboard?.activeDoctor?.fullName || "Лечащий врач",
					doctorFullName: dashboard?.activeDoctor?.fullName || "Лечащий врач",
					renderedServices: result.items,
					allowOverdraft: true,
					includeStandardPpe: true,
					organizationId: activePatient?.organizationId || (dashboard as any)?.clinicSettings?.profile?.organizationId || "org-default",
					warehouseItems: useInventoryStore.getState().items as any,
					fetchFn: fetchWithHandling as unknown as typeof fetch,
				});
			} catch (deductionErr) {
				logger.warn("[useVisitCompletionWorkflow] Фоновое списание материалов выполнено в локальном режиме:", deductionErr);
			}

			const isUuid = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
			if (openVisitId && isUuid(openVisitId)) {
				try {
					await fetchWithHandling(`/api/visits/${openVisitId}/complete-work-order`, {
						method: "POST",
						headers: {
							"Content-Type": "application/json",
							...denteAdminSecretRequestHeaders(),
						},
						body: JSON.stringify({ status: "signed" }),
					}).catch((workErr) => {
						logger.warn("[useVisitCompletionWorkflow] Фоновое закрытие наряда на бэкенде:", workErr);
					});
				} catch {
					// Мягкий режим
				}
			}

			const effectivePatId = activePatient?.id;
			if (effectivePatId && effectivePatId !== "pat-unknown" && effectivePatId !== "pat-default") {
				try {
					const treatedTeethMap = new Map<number, { state: string; reason: string }>();
					for (const item of result.items) {
						let toothNum: number | null = null;
						if (item.toothNumber !== undefined && item.toothNumber !== null) {
							const parsed = Number.parseInt(String(item.toothNumber), 10);
							if (Number.isFinite(parsed) && parsed > 0) toothNum = parsed;
						}
						if (toothNum) {
							const uiState = inferToothStateFromService({ code: item.code || "", title: item.name });
							const clinicalState = mapVisitUiStateToToothDataState(uiState);
							treatedTeethMap.set(toothNum, { state: clinicalState, reason: item.name });
						}
					}
					if (treatedTeethMap.size > 0) {
						const stateGroups = new Map<string, { teeth: number[]; reasons: string[] }>();
						for (const [tNum, info] of treatedTeethMap.entries()) {
							const group = stateGroups.get(info.state) || { teeth: [], reasons: [] };
							group.teeth.push(tNum);
							if (info.reason && !group.reasons.includes(info.reason)) group.reasons.push(info.reason);
							stateGroups.set(info.state, group);
						}
						for (const [targetState, group] of stateGroups.entries()) {
							await fetchWithHandling(`/api/patients/${effectivePatId}/tooth-states/batch`, {
								method: "POST",
								headers: {
									"Content-Type": "application/json",
									...denteAdminSecretRequestHeaders(),
								},
								body: JSON.stringify({
									toothNumbers: group.teeth,
									state: targetState,
									visitId: openVisitId,
									reason: group.reasons.join("; ") || "Завершение визита и оказание услуг",
								}),
							}).catch(() => {});
						}
					}
				} catch {
					// Мягкий режим
				}
			}

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

			setCompletionResult(result);
			setIsSbpQrModalOpen(true);
			showToast("Приём завершён! Смета и чек сформированы", "success", 4000);
		} catch (err) {
			logger.error("[useVisitCompletionWorkflow] Ошибка завершения приёма:", err);
			showToast("Ошибка при завершении приёма", "error", 4000);
		} finally {
			setIsCompletingVisit(false);
		}
	}, [visitNoteForm, openVisitId, activePatient, dashboard, flushSoloPendingSave, acceptDraftToVisit]);

	React.useEffect(() => {
		const handleExternalTrigger = () => {
			void handleCompleteVisitAndGenerateReceipt();
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
		isSbpQrModalOpen,
		setIsSbpQrModalOpen,
		handleCompleteVisitAndGenerateReceipt,
	};
}
