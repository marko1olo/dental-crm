import type { OrthopedicWorkTypeId, LabWorkflowStatus } from "../dentalLabWorkflowEngine";
import type {
	ImplantPlatformType,
	AbutmentCategoryType,
	FixationType,
	LabTechnologicalStageId,
	LabImplantComponentsManifest,
} from "../orders/labWorkOrderPresets";

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
