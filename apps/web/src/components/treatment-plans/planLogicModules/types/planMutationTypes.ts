import type { Dispatch, SetStateAction } from "react";
import type { CopilotCommandType } from "../../../../services/ai/treatmentPlanCopilot.js";
import type {
	CashierInvoiceExportData,
	ToothData,
	TreatmentPlanItem,
	TreatmentPlanStage,
	TreatmentPlanTier,
	TreatmentPlanTierId,
} from "../../types.js";
import type { TreatmentPlanStageStatus } from "../../TreatmentPlanStageCard.js";
import type { CatalogServiceLookupItem } from "../../treatmentPlanStagesEngine.js";
import type {
	ClinicalBundleDefinition,
	ClinicalBundleId,
} from "../../treatmentPlanBundlesEngine.js";
import type { TreatmentPlanViewTab } from "./planCoreTypes.js";

export type TreatmentPlanCreateStagePresetKind =
	| "therapy"
	| "surgery"
	| "orthopedics"
	| "orthodontics"
	| "periodontics"
	| "custom";

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
	readonly handleApplyChairsideBundlePlan: (items: TreatmentPlanItem[], bundle: ClinicalBundleDefinition) => void;
	readonly handleApplyChairsideBundleInvoice: (_invoiceItems: unknown[], bundle: ClinicalBundleDefinition, toothNumber?: number) => void;
	readonly handleAddItemToStage: (targetStageNumber: number, newItemData: Partial<TreatmentPlanItem>) => void;
	readonly handleApplyDiscount: (newDiscountPercent: number, reason?: string) => void;
	readonly handleCreateNewStage: (presetKind: TreatmentPlanCreateStagePresetKind, customTitle?: string) => void;
	readonly handleDeleteStage: (stageToDelete: TreatmentPlanStage) => void;
	readonly handleStartStage: (stageToStart: TreatmentPlanStage) => void;
	readonly handleChangeStageStatus: (stageToChange: TreatmentPlanStage, newStatus: TreatmentPlanStageStatus) => void;
}
