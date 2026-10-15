import type { DentalLabConstructionType, DentalLabOrderStatus } from "../dentalLabDefinitions";

export interface DentalLabOrderRecord {
	readonly id: string;
	readonly orderNumber: string;
	readonly patientId: string;
	readonly patientName: string;
	readonly doctorId: string;
	readonly doctorName: string;
	readonly labName: string;
	readonly technicianName?: string | undefined;
	readonly teethFdi: readonly number[];
	readonly teeth?: readonly (number | string)[] | undefined;
	readonly constructionType: DentalLabConstructionType;
	readonly materialRu: string;
	readonly material?: string | undefined;
	readonly vitaShade: string;
	readonly colorVita?: string | undefined;
	readonly shadeSystem?: "classical" | "3d_master" | "bleach" | undefined;
	readonly translucency?: string | undefined;
	readonly stumpShade?: string | undefined;
	readonly sentDate: string;     // YYYY-MM-DD
	readonly deadlineDate: string; // YYYY-MM-DD (дата примерки/сдачи)
	readonly dueDate?: string | undefined;
	readonly status: DentalLabOrderStatus;
	readonly patientPriceKopecks: number;
	readonly priceRub?: number | undefined;
	readonly ztlCostKopecks: number;
	readonly doctorSharePercent: number;
	readonly scheduledVisitDate?: string | undefined; // YYYY-MM-DD
	readonly appointmentId?: string | undefined;
	readonly treatmentPlanId?: string | undefined;
	readonly stageNumber?: number | undefined;
	readonly stageTitle?: string | undefined;
	readonly stageId?: string | undefined;
	readonly isWarrantyRemake?: boolean | undefined;
	readonly isWarrantyRework?: boolean | undefined;
	readonly warrantyReason?: string | undefined;
	readonly reworkReason?: string | undefined;
	readonly clinicalNotes?: string | undefined;
	readonly attachedScanUrl?: string | undefined;
	readonly deliveredTeeth?: readonly number[] | undefined;
	readonly reworkTeeth?: readonly number[] | undefined;
	readonly isPartialDelivery?: boolean | undefined;
	readonly originalOrderId?: string | undefined;
	readonly originalOrderNumber?: string | undefined;
	readonly warrantyLiabilityType?: "clinic_warranty" | "lab_defect" | "patient_fault" | undefined;
	readonly fittingCollisionWarning?: string | undefined;
	readonly anatomicalFeatures?: {
		readonly opalescence?: boolean | undefined;
		readonly mamelons?: boolean | undefined;
		readonly calcifications?: boolean | undefined;
		readonly translucencyLevel?: string | undefined;
		readonly stumpShade?: string | undefined;
	} | undefined;
	readonly createdAt: string;
	readonly updatedAt: string;
}
