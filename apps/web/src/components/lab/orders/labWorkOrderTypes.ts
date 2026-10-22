import { z } from "zod";
import {
	type ProstheticTypeId, type ImplantPlatformType, type AbutmentCategoryType,
	type FixationType, type LabTechnologicalStageId, type LabImplantComponentsManifest,
	formatImplantComponentsSummary,
} from "./labWorkOrderPresets";

export { type LabImplantComponentsManifest, formatImplantComponentsSummary };

export const LabOrderStageSchema = z.enum([
	"draft", "draft_order", "in_progress", "sent_to_lab", "fitting_scheduled",
	"delivered_completed", "installed_completed", "correction_remake", "warranty_rework",
	"impression_sent", "cad_design", "milling_wax_up", "try_in_fitting",
	"delivered_to_clinic", "installed_in_mouth",
]);

export type LabOrderStage = z.infer<typeof LabOrderStageSchema>;

export interface LabWorkOrderFinancials {
	patientPriceTotalRub: number;
	labCostTotalRub: number;
	grossMarginRub: number;
	grossMarginPercent: number;
	doctorCommissionRub: number;
	doctorPercent: number;
	clinicNetProfitRub: number;
	unitsCount: number;
	pricePerUnitRub: number;
	costPerUnitRub: number;
	patientPriceTotalKopecks?: number | undefined;
	labCostTotalKopecks?: number | undefined;
	grossMarginKopecks?: number | undefined;
	doctorWageKopecks?: number | undefined;
	clinicNetProfitKopecks?: number | undefined;
	isBalanced?: boolean | undefined;
}

export interface LabWorkOrderSchedule {
	orderDate: string; // ISO date string (YYYY-MM-DD)
	workingDaysRequired: number;
	expectedCadDate: string;
	expectedMillingDate: string;
	expectedFittingDate?: string | undefined;
	expectedDeliveryDate: string;
	daysRemaining: number;
	isOverdue: boolean;
	deadlineStatus: "on_track" | "approaching_deadline" | "urgent_today" | "overdue";
	deadlineStatusRu: string;
	colorToken: string;
}

export interface LabCourierDispatch {
	courierService: string;
	trackingNumber: string;
	dispatchDate: string;
	estimatedArrivalDate: string;
	contactPhone?: string | undefined;
	notes?: string | undefined;
}

export interface LabWorkOrder {
	id: string;
	orderNumber: string;
	patientId: string;
	patientName: string;
	patientChartNumber?: string | undefined;
	doctorId: string;
	doctorName: string;
	clinicName?: string | undefined;
	labName?: string | undefined;
	selectedTeeth: number[];
	prostheticTypeId: ProstheticTypeId;
	materialId: string;
	shadeSystem: "classical" | "3d_master" | "bleach";
	shadeCode: string;
	stumpShadeCode?: string | undefined;
	translucency: "HT" | "MT" | "LT" | "MO" | "HO";
	surfaceTexture: "high_gloss" | "microtexture" | "matte";
	occlusalScheme?: string | undefined;
	contactTightness?: string | undefined;
	implantPlatform?: ImplantPlatformType | undefined;
	abutmentType?: AbutmentCategoryType | string | undefined;
	fixationType?: FixationType | undefined;
	implantComponents?: LabImplantComponentsManifest | undefined;
	currentStage: LabOrderStage;
	techStage?: LabTechnologicalStageId | undefined;
	stageHistory: Array<{ stage: LabOrderStage; timestampIso: string; authorName: string; note?: string | undefined; }>;
	techStageHistory?: Array<{ stage: LabTechnologicalStageId; timestampIso: string; authorName: string; note?: string | undefined; }> | undefined;
	orderDateIso: string;
	fittingDateIso?: string | undefined;
	deliveryDateIso: string;
	financials: LabWorkOrderFinancials;
	schedule: LabWorkOrderSchedule;
	courier?: LabCourierDispatch | undefined;
	clinicalNotes?: string | undefined;
	technicianNotes?: string | undefined;
	isWarrantyRework?: boolean | undefined;
	reworkReason?: string | undefined;
	originalOrderId?: string | undefined;
	originalOrderNumber?: string | undefined;
	createdAtIso: string;
	updatedAtIso: string;
}

export {
	type CreateSoloDoctorLabWorkOrderParams,
} from "./soloDoctorLabOrderTypes";
