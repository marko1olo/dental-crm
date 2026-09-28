/**
 * dentalLabWorkflowModel.ts — Dental Lab Workflow Order Data Model, Factory,
 * 4-Stage Transitions, 8 Technological Stages, and Warranty Rework Engine.
 */

import type {
	OrthopedicWorkTypeId,
	LabWorkflowStatus,
	LabDelayAlert,
	DentalLabWorkflowFinancials,
	WarrantyLiabilityType,
} from "./dentalLabWorkflowEngine";
import {
	ORTHOPEDIC_WORK_TYPES,
	LAB_WORKFLOW_STATUSES,
	checkLabDeadlineAndAlert,
	calculateLabWorkflowFinancials,
	addWorkingDaysRu,
	parseDateToMidnight,
	formatDateToIsoDay,
} from "./dentalLabWorkflowEngine";
import {
	type ImplantPlatformType,
	type AbutmentCategoryType,
	type FixationType,
	type LabTechnologicalStageId,
	type LabImplantComponentsManifest,
	LAB_TECHNOLOGICAL_STAGES,
} from "./orders/labWorkOrderPresets";

export interface LabStlScanAttachment {
	readonly id: string;
	readonly fileName: string;
	readonly fileSizeBytes?: number | undefined;
	readonly fileSizeMb?: number | undefined;
	readonly archType?: "upper" | "lower" | "bite" | "prep" | "antagonist" | undefined;
	readonly type?: "upper_jaw" | "lower_jaw" | "bite_registration" | "prep_scan" | "other" | undefined;
	readonly scanType?: "upper_jaw" | "lower_jaw" | "bite_registration" | "prep_scan" | "other" | undefined;
	readonly uploadDateIso?: string | undefined;
	readonly uploadedAtIso?: string | undefined;
	readonly isEncrypted152Fz?: boolean | undefined;
	readonly url?: string | undefined;
	readonly downloadUrl?: string | undefined;
}

export interface DentalLabWorkflowOrder {
	readonly id: string;
	readonly orderNumber: string;
	readonly organizationId?: string | undefined;
	readonly clinicName: string;
	readonly labName: string;
	readonly labContactPhone?: string | undefined;
	readonly patientId: string;
	readonly patientName: string;
	readonly patientChartNumber?: string | undefined;
	readonly doctorId: string;
	readonly doctorName: string;
	readonly doctorPhone?: string | undefined;
	readonly workTypeId: OrthopedicWorkTypeId;
	readonly materialName: string;
	readonly selectedTeeth: readonly number[];
	readonly shadeSystem: "classical" | "3d_master" | "bleach";
	readonly shadeCode: string;
	readonly stumpShadeCode?: string | undefined;
	readonly translucency: "HT" | "MT" | "LT" | "MO" | "HO";
	readonly surfaceTexture: "high_gloss" | "microtexture" | "matte";
	readonly occlusalScheme?: string | undefined;
	readonly contactTightness?: string | undefined;
	readonly implantPlatform?: ImplantPlatformType | undefined;
	readonly abutmentType?: AbutmentCategoryType | string | undefined;
	readonly fixationType?: FixationType | undefined;
	readonly implantComponents?: LabImplantComponentsManifest | undefined;
	readonly techStage?: LabTechnologicalStageId | undefined;
	readonly techStageHistory?: ReadonlyArray<{
		readonly stage: LabTechnologicalStageId;
		readonly timestampIso: string;
		readonly authorName: string;
		readonly note?: string | undefined;
	}> | undefined;
	readonly currentStage: LabWorkflowStatus;
	readonly stageHistory: ReadonlyArray<{
		readonly stage: LabWorkflowStatus;
		readonly timestampIso: string;
		readonly authorName: string;
		readonly note?: string | undefined;
	}>;
	readonly orderDateIso: string;
	readonly expectedLabDateIso: string;
	readonly scheduledVisitDateIso?: string | undefined;
	readonly fittingDate?: string | undefined;
	readonly fittingDateIso?: string | undefined;
	readonly appointmentId?: string | undefined;
	readonly financials: DentalLabWorkflowFinancials;
	readonly delayAlert: LabDelayAlert;
	readonly isDelayedAlert: boolean;
	readonly clinicalNotes?: string | undefined;
	readonly technicianNotes?: string | undefined;
	readonly isUrgent?: boolean | undefined;
	readonly originalOrderId?: string | undefined;
	readonly originalOrderNumber?: string | undefined;
	readonly isWarrantyRework?: boolean | undefined;
	readonly warrantyLiabilityType?: WarrantyLiabilityType | undefined;
	readonly reworkReason?: string | undefined;
	readonly createdAtIso: string;
	readonly updatedAtIso: string;
}

export interface CreateDentalLabOrderParams {
	readonly patientId: string;
	readonly patientName: string;
	readonly patientChartNumber?: string | undefined;
	readonly doctorId: string;
	readonly doctorName: string;
	readonly doctorPhone?: string | undefined;
	readonly clinicName?: string | undefined;
	readonly labName?: string | undefined;
	readonly labContactPhone?: string | undefined;
	readonly workTypeId: OrthopedicWorkTypeId;
	readonly materialName?: string | undefined;
	readonly selectedTeeth: number[];
	readonly shadeSystem?: "classical" | "3d_master" | "bleach" | undefined;
	readonly shadeCode?: string | undefined;
	readonly stumpShadeCode?: string | undefined;
	readonly translucency?: "HT" | "MT" | "LT" | "MO" | "HO" | undefined;
	readonly surfaceTexture?: "high_gloss" | "microtexture" | "matte" | undefined;
	readonly occlusalScheme?: string | undefined;
	readonly contactTightness?: string | undefined;
	readonly implantPlatform?: ImplantPlatformType | undefined;
	readonly abutmentType?: AbutmentCategoryType | string | undefined;
	readonly fixationType?: FixationType | undefined;
	readonly implantComponents?: LabImplantComponentsManifest | undefined;
	readonly techStage?: LabTechnologicalStageId | undefined;
	readonly orderNumber?: string | undefined;
	readonly sequenceNumber?: number | undefined;
	readonly pricePerUnitRub?: number | undefined;
	readonly costPerUnitRub?: number | undefined;
	readonly pricePerUnitKopecks?: number | undefined;
	readonly costPerUnitKopecks?: number | undefined;
	readonly doctorPercent?: number | undefined;
	readonly orderDate?: Date | string | undefined;
	readonly expectedLabDate?: Date | string | undefined;
	readonly scheduledVisitDate?: Date | string | undefined;
	readonly fittingDate?: Date | string | undefined;
	readonly appointmentId?: string | undefined;
	readonly clinicalNotes?: string | undefined;
	readonly technicianNotes?: string | undefined;
	readonly isUrgent?: boolean | undefined;
	readonly originalOrderId?: string | undefined;
	readonly originalOrderNumber?: string | undefined;
	readonly isWarrantyRework?: boolean | undefined;
	readonly reworkReason?: string | undefined;
	readonly initialStatus?: LabWorkflowStatus | undefined;
}

export function generateLabOrderNumber(sequence = 1, date = new Date()): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const seq = String(sequence).padStart(4, "0");
	return `ЗТЛ-${year}/${month}-${seq}`;
}

/**
 * Создание наряд-заказа ЗТЛ с расчетом всех дедлайнов, себестоимости и 4 клинических статусов.
 */
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
		: (scheduledVisitDate || (preset.requiresFittingStage ? addWorkingDaysRu(expectedLabDate, 1) : undefined));
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
		id,
		orderNumber,
		clinicName: params.clinicName || "Стоматологическая клиника DENTE",
		labName: params.labName || "Центральная зуботехническая лаборатория",
		labContactPhone: params.labContactPhone || "",
		patientId: params.patientId,
		patientName: params.patientName,
		patientChartNumber: params.patientChartNumber || undefined,
		doctorId: params.doctorId,
		doctorName: params.doctorName,
		doctorPhone: params.doctorPhone,
		workTypeId: params.workTypeId,
		materialName: params.materialName || preset.defaultMaterialRu,
		selectedTeeth: [...teeth],
		shadeSystem: params.shadeSystem || "classical",
		shadeCode: params.shadeCode || "A2",
		stumpShadeCode: params.stumpShadeCode || (preset.requiresStumpShade ? "ND2" : undefined),
		translucency: params.translucency || "MT",
		surfaceTexture: params.surfaceTexture || "microtexture",
		occlusalScheme: params.occlusalScheme || "Взаимно-защищенная окклюзия",
		contactTightness: params.contactTightness || "Плотный (50 мкм Shimstock)",
		implantPlatform: params.implantPlatform,
		abutmentType: params.abutmentType,
		fixationType: params.fixationType,
		implantComponents: params.implantComponents,
		currentStage: initialStage,
		techStage,
		stageHistory: [
			{
				stage: initialStage,
				timestampIso: nowIso,
				authorName: params.doctorName,
				note: "Наряд первично сформирован врачом-ортопедом",
			},
		],
		techStageHistory: [
			{
				stage: techStage,
				timestampIso: nowIso,
				authorName: params.doctorName,
				note: "Первичный технологический этап ЗТЛ",
			},
		],
		orderDateIso,
		expectedLabDateIso,
		scheduledVisitDateIso,
		fittingDate: fittingDateIso,
		fittingDateIso,
		appointmentId: params.appointmentId,
		financials,
		delayAlert,
		isDelayedAlert: delayAlert.isDelayedAlert,
		clinicalNotes: params.clinicalNotes,
		technicianNotes: params.technicianNotes,
		isUrgent: params.isUrgent ?? false,
		originalOrderId: params.originalOrderId,
		originalOrderNumber: params.originalOrderNumber,
		isWarrantyRework: params.isWarrantyRework ?? false,
		reworkReason: params.reworkReason,
		createdAtIso: nowIso,
		updatedAtIso: nowIso,
	};
}

/**
 * Перевод наряд-заказа на технологический этап ЗТЛ (1..8).
 */
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

/**
 * Перевод наряд-заказа на следующий или целевой этап с пересчетом дедлайнов.
 */
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

/**
 * Отправка сданного наряд-заказа на гарантийную переделку / рекламацию в ЗТЛ.
 * Сохраняет прямую ссылку на исходный заказ-наряд, фиксирует причину рекламации,
 * разграничивает гарантийные обязательства клиники и брак ЗТЛ,
 * и пересчитывает плановый срок готовности доработки ЗТЛ (+4 рабочих дня).
 */
export function sendOrderToWarrantyRework(
	order: DentalLabWorkflowOrder,
	reworkReason: string = "Гарантийная рекламация: скол керамики / завышение прикуса / краевое прилегание",
	authorName: string = "Врач-ортопед",
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

	// Гарантийный финансовый протокол (пациент СТРОГО 0 ₽, расчет обязательств без копеечного дрейфа)
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
