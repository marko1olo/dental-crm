import type { DentalLabWorkflowOrder, CreateDentalLabOrderParams } from "./workflowModelTypes";
import type { LabWorkflowStatus } from "../dentalLabWorkflowEngine";
import {
	ORTHOPEDIC_WORK_TYPES,
	checkLabDeadlineAndAlert,
	calculateLabWorkflowFinancials,
	addWorkingDaysRu,
	parseDateToMidnight,
	formatDateToIsoDay,
} from "../dentalLabWorkflowEngine";
import type { LabTechnologicalStageId } from "../orders/labWorkOrderPresets";

export function generateLabOrderNumber(sequence = 1, date = new Date()): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const seq = String(sequence).padStart(4, "0");
	return `ЗТЛ-${year}/${month}-${seq}`;
}

export function createDentalLabOrder(params: CreateDentalLabOrderParams): DentalLabWorkflowOrder {
	const orderDate = params.orderDate ? parseDateToMidnight(params.orderDate) : parseDateToMidnight(new Date());
	const orderDateIso = formatDateToIsoDay(orderDate);

	const preset = ORTHOPEDIC_WORK_TYPES[params.workTypeId] || ORTHOPEDIC_WORK_TYPES.crown_emax;
	const teeth = params.selectedTeeth.length > 0 ? params.selectedTeeth : [11];
	const unitsCount = teeth.length;

	const expectedLabDate = params.expectedLabDate
		? parseDateToMidnight(params.expectedLabDate)
		: addWorkingDaysRu(orderDate, preset.standardTurnaroundWorkingDays);
	const expectedLabDateIso = formatDateToIsoDay(expectedLabDate);

	const scheduledVisitDate = params.scheduledVisitDate ? parseDateToMidnight(params.scheduledVisitDate) : undefined;
	const scheduledVisitDateIso = scheduledVisitDate ? formatDateToIsoDay(scheduledVisitDate) : undefined;

	const fittingDate = params.fittingDate
		? parseDateToMidnight(params.fittingDate)
		: (scheduledVisitDate || addWorkingDaysRu(expectedLabDate, 1));
	const fittingDateIso = fittingDate ? formatDateToIsoDay(fittingDate) : undefined;

	const unitPriceKopecks = params.pricePerUnitKopecks ??
		(params.pricePerUnitRub ? Math.round(params.pricePerUnitRub * 100) : preset.defaultPriceKopecks);
	const unitCostKopecks = params.costPerUnitKopecks ??
		(params.costPerUnitRub ? Math.round(params.costPerUnitRub * 100) : preset.defaultCostKopecks);

	const financials = calculateLabWorkflowFinancials({
		unitsCount,
		pricePerUnitKopecks: unitPriceKopecks,
		costPerUnitKopecks: unitCostKopecks,
		doctorPercent: params.doctorPercent ?? 20,
	});

	const initialStage: LabWorkflowStatus = params.initialStatus || "draft";
	const isInstalled = initialStage === "installed_completed";

	const delayAlert = checkLabDeadlineAndAlert({
		expectedLabDate,
		scheduledVisitDate: scheduledVisitDate || fittingDate,
		fittingDate,
		appointmentId: params.appointmentId,
		currentDate: orderDate,
		isInstalledOrCompleted: isInstalled,
		orderNumber: "",
		patientName: params.patientName,
		doctorName: params.doctorName,
		labName: params.labName,
	});

	const seq = params.sequenceNumber ?? ((Math.floor(Date.now() / 1000) % 9000) + 1000);
	const orderNumber = params.orderNumber || generateLabOrderNumber(seq, orderDate);
	const id = `ztl-ord-${Date.now()}-${(params.patientId || "pat").replace(/[^a-zA-Z0-9]/g, "").slice(-4) || "0001"}`;
	const nowIso = new Date().toISOString();
	const techStage: LabTechnologicalStageId = params.techStage || "impression_scan";

	return {
		id, orderNumber, clinicName: params.clinicName || "Стоматологическая клиника DENTE",
		labName: params.labName || "Центральная зуботехническая лаборатория",
		labContactPhone: params.labContactPhone || "", patientId: params.patientId,
		patientName: params.patientName, patientChartNumber: params.patientChartNumber || undefined,
		doctorId: params.doctorId, doctorName: params.doctorName, doctorPhone: params.doctorPhone,
		workTypeId: params.workTypeId, materialName: params.materialName || preset.defaultMaterialRu,
		selectedTeeth: [...teeth], shadeSystem: params.shadeSystem || "classical",
		shadeCode: params.shadeCode || "A2",
		stumpShadeCode: params.stumpShadeCode || (preset.requiresStumpShade ? "ND2" : undefined),
		translucency: params.translucency || "MT", surfaceTexture: params.surfaceTexture || "microtexture",
		occlusalScheme: params.occlusalScheme || "Взаимно-защищенная окклюзия",
		contactTightness: params.contactTightness || "Плотный (50 мкм Shimstock)",
		implantPlatform: params.implantPlatform, abutmentType: params.abutmentType,
		fixationType: params.fixationType, implantComponents: params.implantComponents,
		currentStage: initialStage, techStage,
		stageHistory: [{ stage: initialStage, timestampIso: nowIso, authorName: params.doctorName, note: "Наряд первично сформирован врачом-ортопедом" }],
		techStageHistory: [{ stage: techStage, timestampIso: nowIso, authorName: params.doctorName, note: "Первичный технологический этап ЗТЛ" }],
		orderDateIso, expectedLabDateIso, scheduledVisitDateIso,
		fittingDate: fittingDateIso, fittingDateIso, appointmentId: params.appointmentId,
		financials, delayAlert, isDelayedAlert: delayAlert.isDelayedAlert,
		clinicalNotes: params.clinicalNotes, technicianNotes: params.technicianNotes,
		isUrgent: params.isUrgent ?? false, originalOrderId: params.originalOrderId,
		originalOrderNumber: params.originalOrderNumber, isWarrantyRework: params.isWarrantyRework ?? false,
		reworkReason: params.reworkReason, createdAtIso: nowIso, updatedAtIso: nowIso,
	};
}
