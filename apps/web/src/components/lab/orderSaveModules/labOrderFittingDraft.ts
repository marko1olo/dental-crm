import { LAB_MATERIALS } from "../labMath";

export interface FittingAppointmentDraftParams {
	effectivePatientId: string;
	formPatientName: string;
	formDoctorId: string;
	formDoctorName: string;
	effectiveFittingDate: string;
	material: string;
	selectedTeeth: readonly number[];
	gostOrderNumber: string;
	finalShade: string;
	dueDate: string;
}

export function buildFittingAppointmentDraft({
	effectivePatientId,
	formPatientName,
	formDoctorId,
	formDoctorName,
	effectiveFittingDate,
	material,
	selectedTeeth,
	gostOrderNumber,
	finalShade,
	dueDate,
}: FittingAppointmentDraftParams) {
	const toothLabel = selectedTeeth.length > 0 ? selectedTeeth.join(", ") : "11";
	const matTitle = LAB_MATERIALS.find((m) => m.id === material)?.name || material;

	return {
		patientId: effectivePatientId,
		patientName: formPatientName,
		patientPhone: "",
		doctorId: formDoctorId || "doc-current",
		doctorName: formDoctorName || "Врач-ортопед",
		serviceTitle: `Примерка и фиксация: ${matTitle} (зуб ${toothLabel})`,
		serviceCode: "A16.07.004", // Прейскурант ортопедии
		durationMinutes: 45,
		scheduledDate: effectiveFittingDate,
		targetDate: effectiveFittingDate,
		stageKind: "stage_3_orthopedics",
		orderNumber: gostOrderNumber,
		notes: `Автобронь примерки из ЗТЛ № ${gostOrderNumber} (${matTitle}, зуб ${toothLabel}, цвет ${finalShade}). Дедлайн ЗТЛ: ${dueDate || "—"}.`,
	};
}
