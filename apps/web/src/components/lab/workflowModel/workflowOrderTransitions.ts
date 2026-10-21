import type { DentalLabWorkflowOrder } from "./workflowModelTypes";
import type { LabWorkflowStatus } from "../dentalLabWorkflowEngine";
import { LAB_WORKFLOW_STATUSES, checkLabDeadlineAndAlert } from "../dentalLabWorkflowEngine";
import { type LabTechnologicalStageId, LAB_TECHNOLOGICAL_STAGES } from "../orders/labWorkOrderPresets";

export function advanceLabOrderTechStage(
	order: DentalLabWorkflowOrder,
	newTechStage: LabTechnologicalStageId,
	authorName: string,
	note?: string,
): DentalLabWorkflowOrder {
	const nowIso = new Date().toISOString();
	const stageInfo = LAB_TECHNOLOGICAL_STAGES[newTechStage];
	const autoNote = note || `Перевод на технологический этап: ${stageInfo?.nameRu || newTechStage}`;

	return {
		...order,
		techStage: newTechStage,
		techStageHistory: [
			...(order.techStageHistory || []),
			{
				stage: newTechStage,
				timestampIso: nowIso,
				authorName,
				note: autoNote,
			},
		],
		updatedAtIso: nowIso,
	};
}

export function advanceLabOrderStage(
	order: DentalLabWorkflowOrder,
	newStage: LabWorkflowStatus,
	authorName: string,
	note?: string,
	currentDate: Date = new Date(),
): DentalLabWorkflowOrder {
	const nowIso = new Date().toISOString();
	const isInstalled = newStage === "installed_completed";
	const isWarranty = newStage === "warranty_rework" || Boolean(order.isWarrantyRework);

	const delayAlert = checkLabDeadlineAndAlert({
		expectedLabDate: order.expectedLabDateIso,
		scheduledVisitDate: order.scheduledVisitDateIso,
		fittingDate: order.fittingDateIso || order.fittingDate,
		appointmentId: order.appointmentId,
		currentDate,
		isInstalledOrCompleted: isInstalled,
		orderNumber: order.orderNumber,
		patientName: order.patientName,
		doctorName: order.doctorName,
		labName: order.labName,
	});

	const stageInfo = LAB_WORKFLOW_STATUSES[newStage];
	const autoNote = note || `Перевод на этап: ${stageInfo?.nameRu || newStage}`;

	return {
		...order,
		currentStage: newStage,
		isWarrantyRework: isWarranty,
		originalOrderId: order.originalOrderId || (newStage === "warranty_rework" ? order.id : undefined),
		originalOrderNumber: order.originalOrderNumber || (newStage === "warranty_rework" ? order.orderNumber : undefined),
		stageHistory: [
			...order.stageHistory,
			{
				stage: newStage,
				timestampIso: nowIso,
				authorName,
				note: autoNote,
			},
		],
		delayAlert,
		isDelayedAlert: delayAlert.isDelayedAlert,
		updatedAtIso: nowIso,
	};
}
