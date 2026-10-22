import React from "react";
import type { CatalogServiceLookupItem } from "../treatmentPlanPricingEngine";
import type { TreatmentPlanDoctorOption, TreatmentPlanItem, TreatmentPlanStage } from "../types";
import { SplitCatalogPanel } from "./SplitCatalogPanel";
import { SplitStagesHeaderBar } from "./SplitStagesHeaderBar";
import { StageServicesTable } from "../stageEditor/StageServicesTable";
import { useTreatmentPlanSplitView } from "./useTreatmentPlanSplitView";

export interface TreatmentPlanSplitViewProps {
	readonly stages: readonly TreatmentPlanStage[];
	readonly catalog?: readonly CatalogServiceLookupItem[] | undefined;
	readonly doctors?: readonly TreatmentPlanDoctorOption[] | undefined;
	readonly onQuickAddService: (targetStageNumber: number, itemData: Partial<TreatmentPlanItem>) => void;
	readonly onUpdateItemQuantity?: ((itemId: string, newQty: number) => void) | undefined;
	readonly onUpdateItemPrice?: ((itemId: string, newPriceRub: number) => void) | undefined;
	readonly onUpdateItem?: ((updatedItem: TreatmentPlanItem) => void) | undefined;
	readonly onRemoveItem?: ((itemId: string) => void) | undefined;
	readonly onAssignDoctorToItem?: ((itemId: string, doctorId: string | null, doctorName: string | null, doctorSpecialty: string | null) => void) | undefined;
	readonly onOpenCreateStageModal: () => void;
	readonly onAddItemToStage?: ((stage: TreatmentPlanStage) => void) | undefined;
	readonly onStartStage?: ((stage: TreatmentPlanStage) => void) | undefined;
	readonly onPayStage?: ((stage: TreatmentPlanStage) => void) | undefined;
	readonly onApplyDoctorDiscount?: ((pct: number) => void) | undefined;
	readonly onExecuteCopilot?: (() => void) | undefined;
	readonly isCopilotExecuting?: boolean | undefined;
	readonly onApplyClinicalBundle?: ((bundleId: string, toothNumber?: number) => void) | undefined;
	readonly className?: string | undefined;
}

export const TreatmentPlanSplitView: React.FC<TreatmentPlanSplitViewProps> = ({
	stages,
	catalog = [],
	doctors,
	onQuickAddService,
	onUpdateItemQuantity,
	onUpdateItemPrice,
	onUpdateItem,
	onRemoveItem,
	onAssignDoctorToItem,
	onOpenCreateStageModal,
	onAddItemToStage,
	onStartStage,
	onPayStage,
	onApplyDoctorDiscount,
	onExecuteCopilot,
	isCopilotExecuting,
	onApplyClinicalBundle,
	className = "",
}) => {
	const {
		activeStageNumber,
		setActiveStageNumber,
		selectedTooth,
		setSelectedTooth,
		activeStage,
		stageItemCountsMap,
		handleCatalogAdd,
		totalPlanRub,
	} = useTreatmentPlanSplitView({ stages, onQuickAddService });

	return (
		<div className={`treatment-plan-split-view ${className}`.trim()} data-testid="treatment-plan-split-view">
			<div className="split-view-catalog-col">
				<SplitCatalogPanel
					catalog={catalog}
					activeStageNumber={activeStage?.stageNumber ?? 1}
					activeStageTitle={activeStage?.title ?? "Текущий этап"}
					selectedTooth={selectedTooth}
					onSelectTooth={setSelectedTooth}
					onAddServiceToStage={handleCatalogAdd}
					onApplyBundle={onApplyClinicalBundle}
					stageItemCountsMap={stageItemCountsMap}
				/>
			</div>

			<div className="split-view-stages-col">
				<SplitStagesHeaderBar
					stages={stages}
					activeStageNumber={activeStage?.stageNumber ?? 1}
					onSelectActiveStage={setActiveStageNumber}
					onOpenCreateStageModal={onOpenCreateStageModal}
					onApplyDoctorDiscount={onApplyDoctorDiscount}
					onExecuteCopilot={onExecuteCopilot}
					isCopilotExecuting={isCopilotExecuting}
					totalPlanRub={totalPlanRub}
				/>

				{activeStage && (
					<StageServicesTable
						stage={activeStage}
						doctors={doctors}
						onUpdateItemQuantity={onUpdateItemQuantity}
						onUpdateItemPrice={onUpdateItemPrice}
						onUpdateItem={onUpdateItem}
						onRemoveItem={onRemoveItem}
						onAssignDoctorToItem={onAssignDoctorToItem}
						onAddItemToStage={onAddItemToStage}
						onStartStage={onStartStage}
						onPayStage={onPayStage}
					/>
				)}
			</div>
		</div>
	);
};
