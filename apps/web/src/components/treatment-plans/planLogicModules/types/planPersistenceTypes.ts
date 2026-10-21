import type { Dispatch, SetStateAction } from "react";
import type {
	CashierInvoiceExportData,
	DigitalSignatureAgreementData,
	TreatmentPlanStage,
	TreatmentPlanStatus,
	TreatmentPlanTier,
} from "../../types.js";
import type {
	CatalogServiceLookupItem,
	LoyaltyBonusCalculationResult,
} from "../../treatmentPlanStagesEngine.js";
import type { CompletedWorksActResult } from "../../treatmentPlanMaterialEngine.js";

export interface LabOrderPrefillContext {
	readonly selectedTeeth?: readonly number[] | undefined;
	readonly stageId?: string | undefined;
	readonly stageNumber?: number | undefined;
	readonly stageTitle?: string | undefined;
	readonly itemName?: string | undefined;
	readonly constructionType?: string | undefined;
	readonly material?: string | undefined;
	readonly priceRub?: number | undefined;
	readonly doctorId?: string | undefined;
	readonly doctorName?: string | undefined;
}

export interface PlanPersistenceEffectsParams {
	readonly patientId: string;
	readonly catalog: CatalogServiceLookupItem[] | undefined;
	readonly initialPlanId?: string | null | undefined;
	readonly autoStages: readonly TreatmentPlanStage[];
	readonly setCurrentPlanId: Dispatch<SetStateAction<string | null>>;
	readonly setPlanStatus: Dispatch<SetStateAction<TreatmentPlanStatus>>;
	readonly setCustomStages: Dispatch<SetStateAction<TreatmentPlanStage[] | null>>;
}

export interface PlanPersistenceAndSyncContext {
	readonly patientId: string;
	readonly patientName: string;
	readonly patientPhone: string;
	readonly auth: any;
	readonly stages: readonly TreatmentPlanStage[];
	readonly currentTier: TreatmentPlanTier;
	readonly loyaltyDeduction: LoyaltyBonusCalculationResult;
	readonly orthopedicTeeth: number[];
	readonly currentPlanId: string | null;
	readonly planStatus: TreatmentPlanStatus;
	readonly signedAgreement: DigitalSignatureAgreementData | null;
	readonly grandTotalRub: number;
	readonly totalItemsCount: number;
	readonly isSaving: boolean;
	readonly completedActData: CompletedWorksActResult | null;
	readonly onStatusChange?: ((status: TreatmentPlanStatus) => void) | undefined;
	readonly onExportToCashier?: ((data: CashierInvoiceExportData) => void) | undefined;
	readonly onPlanSaved?: ((planId: string) => void) | undefined;
	readonly setPlanStatus: Dispatch<SetStateAction<TreatmentPlanStatus>>;
	readonly setSelectedLabTeeth: Dispatch<SetStateAction<number[] | undefined>>;
	readonly setLabOrderPrefill: Dispatch<SetStateAction<LabOrderPrefillContext | null>>;
	readonly setIsLabOrderModalOpen: Dispatch<SetStateAction<boolean>>;
	readonly setIsSaving: Dispatch<SetStateAction<boolean>>;
	readonly setCurrentPlanId: Dispatch<SetStateAction<string | null>>;
	readonly setSelectedActStage: Dispatch<SetStateAction<TreatmentPlanStage | null>>;
	readonly setIsActPrintOpen: Dispatch<SetStateAction<boolean>>;
	readonly setIsExecutingWriteOff: Dispatch<SetStateAction<boolean>>;
}

export interface PlanPersistenceAndSyncHandlers {
	readonly handleStatusTransition: (newStatus: TreatmentPlanStatus) => void;
	readonly handleOpenLabOrder: (
		teethOrContext?: number[] | LabOrderPrefillContext,
		maybeContext?: LabOrderPrefillContext,
	) => void;
	readonly handleOneClickLabOrder: (teeth?: number[]) => Promise<void>;
	readonly handleExportCashier: () => Promise<void> | void;
	readonly handleSavePlanToDatabase: () => Promise<void>;
	readonly handleExecuteWriteOffStage: (stage: TreatmentPlanStage) => void;
	readonly handleConfirmExecuteWriteOff: () => Promise<void>;
}
