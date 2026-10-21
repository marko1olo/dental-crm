import type { LabOrderStageKey } from "../labClinicalStages";

export type JawScope = "upper" | "lower" | "both";

export interface DentalLabOrderData {
	id?: string;
	orderNumber?: string;
	patientId: string;
	patientName?: string;
	doctorId?: string | null;
	doctorName?: string | null;
	secureToken?: string;
	toothFdi?: string | null;
	selectedTeeth?: number[];
	jawScope?: JawScope | null;
	constructionType?: string;
	material?: string | null;
	impressionType?: string | null;
	colorVita?: string | null;
	shadeSystem?: "classical" | "3d_master" | "bleach";
	shadeCervical?: string;
	shadeBody?: string;
	shadeIncisal?: string;
	shadeStump?: string | null;
	translucency?: string;
	mamelons?: boolean;
	opalescence?: boolean;
	calcifications?: boolean;
	occlusalScheme?: string;
	contactTightness?: string;
	surfaceTexture?: string;
	cementGapMicrons?: number;
	status?: string;
	scheduledVisitDate?: string | null;
	fittingDate?: string | null;
	fittingCollisionWarning?: string;
	currentStage?: LabOrderStageKey;
	stageHistory?: Array<{ stage: LabOrderStageKey; timestamp: string; note?: string }>;
	dueDate?: string | null;
	frameworkTrialDate?: string | null;
	ceramicTrialDate?: string | null;
	deliveryDate?: string | null;
	treatmentPlanId?: string | null;
	stageId?: string | null;
	stageNumber?: number | null;
	stageTitle?: string | null;
	includeImpressionBilling?: boolean;
	clinicalNotes?: string | null;
	labComments?: string | null;
	attachedImageUrl?: string | null;
	priceRub?: number | null;
	clinicSharePct?: number;
	doctorSharePct?: number;
	doctorDeductionRub?: number | null;
	paidFromCashOperationId?: string | null;
	isLockedInstalled?: boolean;
	isWarrantyRework?: boolean;
	reworkReason?: string;
	originalOrderId?: string;
	originalOrderNumber?: string;
	createdAt?: string;
	updatedAt?: string;
}

export interface DentalLabOrderModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly initialOrder?: DentalLabOrderData | null | undefined;
	readonly patientId?: string | undefined;
	readonly patientName?: string | undefined;
	readonly doctorId?: string | undefined;
	readonly doctorName?: string | undefined;
	readonly initialToothFdi?: string | number | undefined;
	readonly initialTeeth?: readonly (number | string)[] | undefined;
	readonly patientChartNumber?: string | undefined;
	readonly treatmentPlanId?: string | undefined;
	readonly stageId?: string | undefined;
	readonly stageNumber?: number | undefined;
	readonly stageTitle?: string | undefined;
	readonly includeImpressionBilling?: boolean | undefined;
	readonly patientDepositRub?: number | undefined;
	readonly stageTotalRub?: number | undefined;
	readonly stagePaidRub?: number | undefined;
	readonly chiefDoctorName?: string | undefined;
	readonly skipFinancialGate?: boolean | undefined;
	readonly treatmentPlanAgeDays?: number | undefined;
	readonly isPlanExpired?: boolean | undefined;
	readonly initialTab?: "main" | "shades" | "stages" | "print" | undefined;
	readonly scheduledVisitDate?: string | undefined;
	readonly fittingDate?: string | undefined;
	readonly onOrderSaved?: ((order: DentalLabOrderData) => void) | undefined;
	readonly onSaveOrder?: ((order: DentalLabOrderData) => void) | undefined;
	readonly onRescheduleAppointment?: ((orderId: string, newDate: string) => void) | undefined;
	readonly onPartialDelivery?: ((result: any) => void) | undefined;
	readonly clinicPhone?: string | undefined;
	readonly clinicName?: string | undefined;
}

export interface LabTrackingDrawerProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly order: DentalLabOrderData | null;
	readonly patientDepositRub?: number | undefined;
	readonly stageTotalRub?: number | undefined;
	readonly stagePaidRub?: number | undefined;
	readonly chiefDoctorName?: string | undefined;
	readonly onStageUpdate?: ((orderId: string, newStage: LabOrderStageKey, note?: string | undefined) => Promise<void> | void) | undefined;
	readonly onFittingDateUpdate?: ((orderId: string, dates: { frameworkTrialDate?: string | undefined; ceramicTrialDate?: string | undefined; deliveryDate?: string | undefined }) => Promise<void> | void) | undefined;
}
