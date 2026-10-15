import { PROSTHETIC_TYPES, type ProstheticTypeId, type LabTechnologicalStageId } from "./labWorkOrderPresets";
import { calculateLabFinancials } from "./labWorkOrderFinancials";
import { calculateLabTurnaroundSchedule, formatDateToIsoDay } from "./labWorkOrderScheduler";
import { generateLabOrderNumber } from "./labWorkOrderBarcodes";
import type {
	LabWorkOrder,
	LabOrderStage,
	CreateSoloDoctorLabWorkOrderParams,
	LabImplantComponentsManifest,
} from "./labWorkOrderTypes";
import type { ImplantPlatformType, AbutmentCategoryType, FixationType } from "./labWorkOrderPresets";

export function createLabWorkOrder(params: {
	patientId: string; patientName: string; patientChartNumber?: string | undefined;
	doctorId: string; doctorName: string; clinicName?: string | undefined; labName?: string | undefined;
	selectedTeeth: number[]; prostheticTypeId: ProstheticTypeId; materialId?: string | undefined;
	shadeSystem?: "classical" | "3d_master" | "bleach" | undefined; shadeCode?: string | undefined;
	stumpShadeCode?: string | undefined; translucency?: "HT" | "MT" | "LT" | "MO" | "HO" | undefined;
	surfaceTexture?: "high_gloss" | "microtexture" | "matte" | undefined; implantPlatform?: ImplantPlatformType | undefined;
	abutmentType?: AbutmentCategoryType | string | undefined; fixationType?: FixationType | undefined;
	implantComponents?: LabImplantComponentsManifest | undefined; pricePerUnitRub?: number | undefined;
	costPerUnitRub?: number | undefined; doctorPercent?: number | undefined; customWorkingDays?: number | undefined;
	clinicalNotes?: string | undefined; orderDate?: Date | string | undefined; orderNumber?: string | undefined;
	sequenceNumber?: number | undefined; initialStage?: LabOrderStage | undefined; techStage?: LabTechnologicalStageId | undefined;
	isWarrantyRework?: boolean | undefined; reworkReason?: string | undefined; originalOrderId?: string | undefined; originalOrderNumber?: string | undefined;
}): LabWorkOrder {
	const orderDate = params.orderDate ? (typeof params.orderDate === "string" ? new Date(params.orderDate) : params.orderDate) : new Date();
	const preset = PROSTHETIC_TYPES[params.prostheticTypeId] || PROSTHETIC_TYPES.crown_zirconia_monolithic;
	const count = Math.max(1, params.selectedTeeth.length || 1);
	const unitPrice = params.pricePerUnitRub ?? preset.defaultPriceClinicRub;
	const unitCost = params.costPerUnitRub ?? preset.defaultCostLabRub;

	const financials = calculateLabFinancials({
		unitsCount: count, pricePerUnitRub: unitPrice, costPerUnitRub: unitCost,
		doctorPercent: params.doctorPercent ?? 20, isWarrantyRework: params.isWarrantyRework,
	});

	const schedule = calculateLabTurnaroundSchedule({
		orderDate, prostheticTypeId: params.prostheticTypeId, customWorkingDays: params.customWorkingDays, currentDate: orderDate,
	});

	const seq = params.sequenceNumber ?? ((Math.floor(Date.now() / 1000) % 9000) + 1000);
	const orderNumber = params.orderNumber || generateLabOrderNumber(seq, orderDate);
	const orderDateIso = formatDateToIsoDay(orderDate);
	const id = `lab-ord-${Date.now()}-${params.patientId.replace(/[^a-zA-Z0-9]/g, "").slice(-4) || "0001"}`;
	const initialStage: LabOrderStage = params.initialStage || "impression_sent";
	const techStage: LabTechnologicalStageId = params.techStage || "impression_scan";

	return {
		id, orderNumber, patientId: params.patientId, patientName: params.patientName, patientChartNumber: params.patientChartNumber,
		doctorId: params.doctorId, doctorName: params.doctorName, clinicName: params.clinicName || "DENTE Clinic",
		labName: params.labName || "Центральная Лаборатория DENTE", selectedTeeth: params.selectedTeeth,
		prostheticTypeId: params.prostheticTypeId, materialId: params.materialId || preset.defaultMaterialId,
		shadeSystem: params.shadeSystem || "classical", shadeCode: params.shadeCode || "A2",
		stumpShadeCode: params.stumpShadeCode || (preset.requiresStumpShade ? "ND2" : undefined),
		translucency: params.translucency || "MT", surfaceTexture: params.surfaceTexture || "microtexture",
		implantPlatform: params.implantPlatform, abutmentType: params.abutmentType, fixationType: params.fixationType,
		implantComponents: params.implantComponents, currentStage: initialStage, techStage,
		stageHistory: [{ stage: initialStage, timestampIso: new Date().toISOString(), authorName: params.doctorName, note: "Заказ первично сформирован и слепки отправлены в лабораторию" }],
		techStageHistory: [{ stage: techStage, timestampIso: new Date().toISOString(), authorName: params.doctorName, note: "Первичный технологический этап ЗТЛ" }],
		orderDateIso, fittingDateIso: schedule.expectedFittingDate, deliveryDateIso: schedule.expectedDeliveryDate,
		financials, schedule, clinicalNotes: params.clinicalNotes, isWarrantyRework: params.isWarrantyRework,
		reworkReason: params.reworkReason, originalOrderId: params.originalOrderId, originalOrderNumber: params.originalOrderNumber,
		createdAtIso: new Date().toISOString(), updatedAtIso: new Date().toISOString(),
	};
}

export function createSoloDoctorLabWorkOrder(params: CreateSoloDoctorLabWorkOrderParams): LabWorkOrder {
	const presetMap: Record<CreateSoloDoctorLabWorkOrderParams["prostheticPreset"], ProstheticTypeId> = {
		zirconia_crown: "crown_zirconia_monolithic",
		veneer: "veneer_refractory",
		removable_prosthesis: "removable_clasp_prosthesis",
		emax_press: "crown_emax_press",
		pmma_temporary: "crown_pmma_temporary",
		implant_crown: "implant_screw_retained_crown",
	};

	const prostheticTypeId = presetMap[params.prostheticPreset] || "crown_zirconia_monolithic";
	const initialStage: LabOrderStage = params.isDraft ? "draft" : "in_progress";

	return createLabWorkOrder({
		patientId: params.patientId, patientName: params.patientName, patientChartNumber: params.patientChartNumber,
		doctorId: params.doctorId, doctorName: params.doctorName, clinicName: params.clinicName || "Стоматологический кабинет",
		labName: params.externalLabName || "Внешняя зуботехническая лаборатория",
		selectedTeeth: params.selectedTeeth && params.selectedTeeth.length > 0 ? params.selectedTeeth : [11],
		prostheticTypeId, shadeCode: params.shadeCode || "A2", customWorkingDays: params.customWorkingDays,
		clinicalNotes: params.clinicalNotes, orderDate: params.orderDate, initialStage,
	});
}
