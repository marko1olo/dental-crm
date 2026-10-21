import type { DentalLabWorkflowOrder } from "./workflowModelTypes";
import type { WarrantyLiabilityType } from "../dentalLabWorkflowEngine";
import {
	checkLabDeadlineAndAlert,
	calculateLabWorkflowFinancials,
	addWorkingDaysRu,
	formatDateToIsoDay,
} from "../dentalLabWorkflowEngine";

export function sendOrderToWarrantyRework(
	order: DentalLabWorkflowOrder,
	reworkReason = "Гарантийная рекламация: скол керамики / завышение прикуса / краевое прилегание",
	authorName = "Врач-ортопед",
	currentDate: Date = new Date(),
	warrantyLiabilityType: WarrantyLiabilityType = "clinic_warranty",
): DentalLabWorkflowOrder {
	const nowIso = currentDate.toISOString();
	const newExpectedDate = addWorkingDaysRu(currentDate, 4);
	const newExpectedIso = formatDateToIsoDay(newExpectedDate);

	const delayAlert = checkLabDeadlineAndAlert({
		expectedLabDate: newExpectedIso,
		scheduledVisitDate: undefined,
		fittingDate: undefined,
		appointmentId: undefined,
		currentDate,
		isInstalledOrCompleted: false,
		orderNumber: order.orderNumber,
		patientName: order.patientName,
		doctorName: order.doctorName,
		labName: order.labName,
	});

	const liabilityLabelRu =
		warrantyLiabilityType === "lab_defect"
			? "Брак ЗТЛ (переделка за счет лаборатории 0 ₽)"
			: "Гарантийные обязательства клиники";

	const reworkNote = `Гарантийная переделка [${liabilityLabelRu}] (исходный наряд № ${order.orderNumber}): ${reworkReason}`;

	const warrantyFinancials = calculateLabWorkflowFinancials({
		unitsCount: order.financials.unitsCount,
		costPerUnitKopecks: order.financials.costPerUnitKopecks,
		doctorPercent: order.financials.doctorPercent,
		isWarrantyRework: true,
		warrantyLiabilityType,
	});

	return {
		...order,
		currentStage: "warranty_rework",
		isWarrantyRework: true,
		warrantyLiabilityType,
		reworkReason,
		originalOrderId: order.originalOrderId || order.id,
		originalOrderNumber: order.originalOrderNumber || order.orderNumber,
		financials: warrantyFinancials,
		expectedLabDateIso: newExpectedIso,
		stageHistory: [
			...order.stageHistory,
			{
				stage: "warranty_rework",
				timestampIso: nowIso,
				authorName,
				note: reworkNote,
			},
		],
		delayAlert,
		isDelayedAlert: delayAlert.isDelayedAlert,
		updatedAtIso: nowIso,
	};
}
