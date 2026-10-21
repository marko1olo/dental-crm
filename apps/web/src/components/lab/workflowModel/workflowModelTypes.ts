import type {
	OrthopedicWorkTypeId,
	LabWorkflowStatus,
	LabDelayAlert,
	DentalLabWorkflowFinancials,
	WarrantyLiabilityType,
} from "../dentalLabWorkflowEngine";
import type {
	ImplantPlatformType,
	AbutmentCategoryType,
	FixationType,
	LabTechnologicalStageId,
	LabImplantComponentsManifest,
} from "../orders/labWorkOrderPresets";

export type { CreateDentalLabOrderParams } from "./workflowParamsTypes";

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
	readonly clinicPhone?: string | undefined;
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
	readonly urgentDelivery?: boolean | undefined;
	readonly originalOrderId?: string | undefined;
	readonly originalOrderNumber?: string | undefined;
	readonly isWarrantyRework?: boolean | undefined;
	readonly warrantyLiabilityType?: WarrantyLiabilityType | undefined;
	readonly reworkReason?: string | undefined;
	readonly createdAtIso: string;
	readonly updatedAtIso: string;
}
