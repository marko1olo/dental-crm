import type { DentalLabWorkflowOrder } from "../dentalLabWorkflowModel";
import { ORTHOPEDIC_WORK_TYPES, LAB_WORKFLOW_STATUSES } from "../dentalLabWorkflowEngine";
import {
	ABUTMENT_TYPE_OPTIONS,
	LAB_TECHNOLOGICAL_STAGES,
} from "../orders/labWorkOrderPresets";

export function exportDentalLabOrdersToCsv(orders: readonly DentalLabWorkflowOrder[]): string {
	const headers = [
		"Номер наряда", "Пациент", "№ Медкарты", "Врач-ортопед", "Лаборатория", "Вид конструкции",
		"Зубы (FDI)", "Кол-во единиц", "Оттенок (VITA)", "Оттенок культи (ND)", "Текущий статус",
		"Дата наряда", "План готовности ЗТЛ", "Дата примерки", "ID Приема", "Статус дедлайна",
		"Задержка ЗТЛ (Alert)", "Стоимость пациента (руб)", "Себестоимость ЗТЛ (руб)",
		"Маржа клиники (руб)", "ЗП врача (руб)", "Платформа имплантата", "Тип абатмента",
		"Тип фиксации", "Технологический этап ЗТЛ", "Примечания",
	];

	const escapeCsv = (val: unknown): string => {
		if (val === null || val === undefined) return '""';
		const str = String(val).replace(/"/g, '""');
		return `"${str}"`;
	};

	const rows = orders.map((ord) => {
		const preset = ORTHOPEDIC_WORK_TYPES[ord.workTypeId] || ORTHOPEDIC_WORK_TYPES.crown_emax;
		const stage = LAB_WORKFLOW_STATUSES[ord.currentStage] || LAB_WORKFLOW_STATUSES.draft;
		const teethStr = ord.selectedTeeth.join(", ");
		const implantPlatRu = ord.implantPlatform === "conical" ? "Конус Морзе" : ord.implantPlatform === "hex" ? "Шестигранник" : "—";
		const abutmentRu = ord.abutmentType ? (ABUTMENT_TYPE_OPTIONS.find((a) => a.id === ord.abutmentType)?.nameRu || ord.abutmentType) : "—";
		const fixationRu = ord.fixationType === "screw_retained" ? "Винтовая" : ord.fixationType === "cement_retained" ? "Цементная" : "—";
		const techStageRu = ord.techStage ? (LAB_TECHNOLOGICAL_STAGES[ord.techStage]?.nameRu || ord.techStage) : "—";

		return [
			escapeCsv(ord.orderNumber),
			escapeCsv(ord.patientName),
			escapeCsv(ord.patientChartNumber || ""),
			escapeCsv(ord.doctorName),
			escapeCsv(ord.labName),
			escapeCsv(preset.nameRu),
			escapeCsv(teethStr),
			escapeCsv(ord.financials.unitsCount),
			escapeCsv(ord.shadeCode),
			escapeCsv(ord.stumpShadeCode || ""),
			escapeCsv(stage.nameRu),
			escapeCsv(ord.orderDateIso),
			escapeCsv(ord.expectedLabDateIso),
			escapeCsv(ord.fittingDate || ord.scheduledVisitDateIso || ""),
			escapeCsv(ord.appointmentId || ""),
			escapeCsv(ord.delayAlert.status),
			escapeCsv(ord.isDelayedAlert ? "ДА" : "НЕТ"),
			escapeCsv(ord.financials.patientPriceTotalRub),
			escapeCsv(ord.financials.labCostTotalRub),
			escapeCsv(ord.financials.clinicGrossMarginRub),
			escapeCsv(ord.financials.doctorWageRub),
			escapeCsv(implantPlatRu),
			escapeCsv(abutmentRu),
			escapeCsv(fixationRu),
			escapeCsv(techStageRu),
			escapeCsv(ord.clinicalNotes || ""),
		].join(";");
	});

	return `\uFEFF${headers.join(";")}\r\n${rows.join("\r\n")}`;
}
