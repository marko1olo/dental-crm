/**
 * types.ts — типы состояния, этапов, позиций 804н, вариантов смет и коллбэков
 * хука бизнес-логики комплексного плана лечения (useTreatmentPlanLogic).
 * Выделено из useTreatmentPlanLogic.ts строго по Мандату 8b (лимит строк <= 800).
 */

import type { Dispatch, SetStateAction } from "react";
import type {
	CashierInvoiceExportData,
	DigitalSignatureAgreementData,
	ToothData,
	TreatmentPlanDoctorOption,
	TreatmentPlanItem,
	TreatmentPlanStage,
	TreatmentPlanStatus,
	TreatmentPlanTier,
	TreatmentPlanTierId,
	TreatmentPlanValidationPayload,
} from "../types";
import type { TreatmentPlanStageStatus } from "../TreatmentPlanStageCard";
import type {
	CatalogServiceLookupItem,
	LoyaltyBonusCalculationResult,
} from "../treatmentPlanStagesEngine";
import type {
	CompletedWorksActResult,
	InventoryItemLookup,
} from "../treatmentPlanMaterialEngine";
import type {
	ClinicalBundleDefinition,
	ClinicalBundleId,
} from "../treatmentPlanBundlesEngine";
import type { CopilotCommandType } from "../../../services/ai/treatmentPlanCopilot";

export type TreatmentPlanViewTab = "3tier" | "stages" | "phased4" | "roadmap";

export type TreatmentPlanSpecialtyFilter =
	| "all"
	| "therapy"
	| "surgery"
	| "orthopedics"
	| "orthodontics"
	| "periodontics";

export type TreatmentPlanCreateStagePresetKind =
	| "therapy"
	| "surgery"
	| "orthopedics"
	| "orthodontics"
	| "periodontics"
	| "custom";

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

export interface UseTreatmentPlanLogicProps {
	readonly patientId: string;
	readonly patientName?: string | undefined;
	readonly teethData: readonly ToothData[];
	readonly onExportToCashier?: ((data: CashierInvoiceExportData) => void) | undefined;
	readonly onPlanSaved?: ((planId: string) => void) | undefined;
	readonly planCreatedAtIso?: string | undefined;
	readonly initialStatus?: TreatmentPlanStatus | undefined;
	readonly onStatusChange?: ((status: TreatmentPlanStatus) => void) | undefined;
	readonly initialPlanId?: string | null | undefined;
	readonly initialViewTab?: TreatmentPlanViewTab | undefined;
}

export interface PatientFinancialContextSummary {
	readonly patient: any;
	readonly patientBalanceRub: number;
	readonly patientPhone: string;
	readonly patientBirthDate: string | undefined;
}

export interface StageCompletionProgressSummary {
	readonly totalStages: number;
	readonly completedStages: number;
	readonly inProgressStages: number;
	readonly completionPercent: number;
}

export interface PlanStageMutationContext {
	readonly patientId: string;
	readonly patientName: string;
	readonly effectiveTeethData: readonly ToothData[];
	readonly catalog: CatalogServiceLookupItem[] | undefined;
	readonly discountPercent: number;
	readonly stages: readonly TreatmentPlanStage[];
	readonly currentPlanId: string | null;
	readonly onExportToCashier?: ((data: CashierInvoiceExportData) => void) | undefined;
	readonly setCbctAutoPlanTiers: Dispatch<
		SetStateAction<[TreatmentPlanTier, TreatmentPlanTier, TreatmentPlanTier] | null>
	>;
	readonly setSelectedTierId: Dispatch<SetStateAction<TreatmentPlanTierId>>;
	readonly setCustomStages: Dispatch<SetStateAction<TreatmentPlanStage[] | null>>;
	readonly setActiveViewTab: Dispatch<SetStateAction<TreatmentPlanViewTab>>;
	readonly setIsCopilotExecuting: Dispatch<SetStateAction<boolean>>;
	readonly setCopilotFeedback: Dispatch<SetStateAction<string | null>>;
	readonly setIsChairsideBundlesModalOpen: Dispatch<SetStateAction<boolean>>;
	readonly setDiscountPercent: Dispatch<SetStateAction<number>>;
}

export interface PlanStageMutationHandlers {
	readonly handleGenerateCbctAutoPlan: () => void;
	readonly handleUpdateItemQuantity: (itemId: string, newQty: number) => void;
	readonly handleUpdateItemPrice: (itemId: string, newPriceRub: number) => void;
	readonly handleUpdateItem: (updatedItem: TreatmentPlanItem) => void;
	readonly handleRemoveItem: (itemId: string) => void;
	readonly handleAssignDoctorToStage: (
		stage: TreatmentPlanStage,
		doctorId: string | null,
		doctorName: string | null,
		doctorSpecialty: string | null,
	) => void;
	readonly handleAssignDoctorToItem: (
		itemId: string,
		doctorId: string | null,
		doctorName: string | null,
		doctorSpecialty: string | null,
	) => void;
	readonly handleExecuteCopilot: (cmdOrText: CopilotCommandType | string) => void;
	readonly handleApplyClinicalBundle: (bundleId: ClinicalBundleId, toothNumber?: number) => void;
	readonly handleApplyChairsideBundlePlan: (
		items: TreatmentPlanItem[],
		bundle: ClinicalBundleDefinition,
	) => void;
	readonly handleApplyChairsideBundleInvoice: (
		_invoiceItems: unknown[],
		bundle: ClinicalBundleDefinition,
		toothNumber?: number,
	) => void;
	readonly handleAddItemToStage: (
		targetStageNumber: number,
		newItemData: Partial<TreatmentPlanItem>,
	) => void;
	readonly handleApplyDiscount: (newDiscountPercent: number, reason?: string) => void;
	readonly handleCreateNewStage: (
		presetKind: TreatmentPlanCreateStagePresetKind,
		customTitle?: string,
	) => void;
	readonly handleDeleteStage: (stageToDelete: TreatmentPlanStage) => void;
	readonly handleStartStage: (stageToStart: TreatmentPlanStage) => void;
	readonly handleChangeStageStatus: (
		stageToChange: TreatmentPlanStage,
		newStatus: TreatmentPlanStageStatus,
	) => void;
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
	readonly handleExportCashier: () => void;
	readonly handleSavePlanToDatabase: () => Promise<void>;
	readonly handleExecuteWriteOffStage: (stage: TreatmentPlanStage) => void;
	readonly handleConfirmExecuteWriteOff: () => Promise<void>;
}

export type {
	CashierInvoiceExportData,
	CatalogServiceLookupItem,
	ClinicalBundleDefinition,
	ClinicalBundleId,
	CompletedWorksActResult,
	CopilotCommandType,
	DigitalSignatureAgreementData,
	InventoryItemLookup,
	LoyaltyBonusCalculationResult,
	ToothData,
	TreatmentPlanDoctorOption,
	TreatmentPlanItem,
	TreatmentPlanStage,
	TreatmentPlanStageStatus,
	TreatmentPlanStatus,
	TreatmentPlanTier,
	TreatmentPlanTierId,
	TreatmentPlanValidationPayload,
};
