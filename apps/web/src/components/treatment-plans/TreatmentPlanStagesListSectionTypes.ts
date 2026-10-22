import type { InventoryItemLookup } from "./treatmentPlanMaterialEngine";
import type { CatalogServiceLookupItem } from "./treatmentPlanPricingEngine";
import type { TreatmentPlanDoctorOption, TreatmentPlanItem, TreatmentPlanStage } from "./types";

export interface TreatmentPlanStagesListSectionProps {
	readonly visibleStages: readonly TreatmentPlanStage[];
	readonly specialtyFilter: string;
	readonly onSetSpecialtyFilter: (filter: any) => void;
	readonly onApplyClinicalBundle: (bundleId: any, toothNumber?: number) => void;
	readonly onOpenCreateStageModal: () => void;
	readonly dashboard?: any;
	readonly doctorOptions?: readonly TreatmentPlanDoctorOption[];
	readonly onAssignDoctorToStage?: ((stage: TreatmentPlanStage, doctorId: string | null, doctorName: string | null, doctorSpecialty: string | null) => void) | undefined;
	readonly onAssignDoctorToItem?: ((itemId: string, doctorId: string | null, doctorName: string | null, doctorSpecialty: string | null) => void) | undefined;
	readonly onUpdateItemQuantity?: ((itemId: string, newQty: number) => void) | undefined;
	readonly onUpdateItemPrice?: ((itemId: string, newPriceRub: number) => void) | undefined;
	readonly onUpdateItem?: ((updatedItem: any) => void) | undefined;
	readonly onRemoveItem?: ((itemId: string) => void) | undefined;
	readonly onAddItemToStage?: ((stage: TreatmentPlanStage) => void) | undefined;
	readonly onDeleteStage?: ((stage: TreatmentPlanStage) => void) | undefined;
	readonly onExecuteWriteOffStage?: ((stage: TreatmentPlanStage) => void) | undefined;
	readonly onStartStage?: ((stage: TreatmentPlanStage) => void) | undefined;
	readonly onChangeStageStatus?: ((stage: TreatmentPlanStage, newStatus: any) => void) | undefined;
	readonly onPayStage?: ((stage: TreatmentPlanStage) => void) | undefined;
	readonly onOpenLabOrder?: ((teeth?: number[], options?: Record<string, unknown>) => void) | undefined;
	readonly onOneClickLabOrder?: ((teeth?: number[]) => void) | undefined;
	readonly onOpenInstallment?: ((stage: TreatmentPlanStage) => void) | undefined;
	readonly onApplyStageDiscount?: (() => void) | undefined;
	readonly onExportStageEstimate?: ((stage: TreatmentPlanStage) => void) | undefined;
	readonly catalog?: readonly CatalogServiceLookupItem[] | undefined;
	readonly onQuickAddService?: ((targetStageNumber: number, newItemData: Partial<TreatmentPlanItem>) => void) | undefined;
	readonly isSplitMode?: boolean | undefined;
	readonly onExecuteCopilot?: (() => void) | undefined;
	readonly isCopilotExecuting?: boolean | undefined;
	readonly onApplyDoctorDiscount?: ((pct: number) => void) | undefined;
}
