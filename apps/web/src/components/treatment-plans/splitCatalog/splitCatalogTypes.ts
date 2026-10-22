/**
 * splitCatalogTypes.ts — контракты и типы для двухколоночного сплит-режима каталога
 * и этапов плана лечения DENTE CRM.
 */

import type { CatalogServiceLookupItem } from "../treatmentPlanPricingEngine";
import type { TreatmentPlanDoctorOption, TreatmentPlanItem, TreatmentPlanStage } from "../types";

export interface SplitCatalogQuickTooth {
	readonly toothNumber: number;
	readonly label: string;
	readonly quadrant: 1 | 2 | 3 | 4;
}

export interface SplitCatalogCategoryGroup {
	readonly categoryName: string;
	readonly services: readonly CatalogServiceLookupItem[];
}

export interface SplitCatalogPanelProps {
	readonly catalog: readonly CatalogServiceLookupItem[];
	readonly activeStageNumber: number;
	readonly activeStageTitle: string;
	readonly selectedTooth: number | null;
	readonly onSelectTooth: (tooth: number | null) => void;
	readonly onAddServiceToStage: (service: CatalogServiceLookupItem, toothNumber: number | null) => void;
	readonly onApplyBundle?: ((bundleId: string, toothNumber?: number) => void) | undefined;
	readonly stageItemCountsMap?: Record<string, number> | undefined;
	readonly className?: string | undefined;
}

export interface SplitStagesHeaderBarProps {
	readonly stages: readonly TreatmentPlanStage[];
	readonly activeStageNumber: number;
	readonly onSelectActiveStage: (stageNum: number) => void;
	readonly onOpenCreateStageModal: () => void;
	readonly onApplyDoctorDiscount?: ((pct: number) => void) | undefined;
	readonly onExecuteCopilot?: (() => void) | undefined;
	readonly isCopilotExecuting?: boolean | undefined;
	readonly totalPlanRub: number;
}

export interface StageServicesTableProps {
	readonly stage: TreatmentPlanStage;
	readonly doctors?: readonly TreatmentPlanDoctorOption[] | undefined;
	readonly onUpdateItemQuantity?: ((itemId: string, newQty: number) => void) | undefined;
	readonly onUpdateItemPrice?: ((itemId: string, newPriceRub: number) => void) | undefined;
	readonly onUpdateItem?: ((updatedItem: TreatmentPlanItem) => void) | undefined;
	readonly onRemoveItem?: ((itemId: string) => void) | undefined;
	readonly onAssignDoctorToItem?: ((itemId: string, doctorId: string | null, doctorName: string | null, doctorSpecialty: string | null) => void) | undefined;
	readonly onAddItemToStage?: ((stage: TreatmentPlanStage) => void) | undefined;
	readonly onStartStage?: ((stage: TreatmentPlanStage) => void) | undefined;
	readonly onPayStage?: ((stage: TreatmentPlanStage) => void) | undefined;
	readonly className?: string | undefined;
}
