import { ORTHOPEDIC_WORK_TYPES, type OrthopedicWorkTypeId } from "../dentalLabWorkflowEngine";
import { formatRuDate } from "../dentalLabOrderEngine";

export function buildCreateFittingDraft(
	created: any,
	newWorkType: OrthopedicWorkTypeId,
	newFittingDate: string,
	newExpectedLabDate: string,
) {
	const teethLabel = created.selectedTeeth.join(", ");
	const workTypeTitle = ORTHOPEDIC_WORK_TYPES[newWorkType]?.shortNameRu || "Конструкция ЗТЛ";
	return {
		patientId: created.patientId,
		patientName: created.patientName,
		patientPhone: "",
		doctorId: created.doctorId,
		doctorName: created.doctorName,
		serviceTitle: `Примерка и фиксация: ${workTypeTitle} (зуб ${teethLabel})`,
		serviceCode: "A16.07.004",
		durationMinutes: 45,
		scheduledDate: newFittingDate,
		targetDate: newFittingDate,
		stageKind: "stage_3_orthopedics",
		orderNumber: created.orderNumber,
		notes: `Автобронь примерки из ЗТЛ № ${created.orderNumber} (${created.materialName}, зуб ${teethLabel}, цвет ${created.shadeCode}). План ЗТЛ: ${formatRuDate(newExpectedLabDate)}.`,
	};
}
