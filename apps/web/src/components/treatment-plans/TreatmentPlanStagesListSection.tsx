import React from "react";
import type { InventoryItemLookup } from "./treatmentPlanMaterialEngine";
import { TreatmentPlanStageCard } from "./TreatmentPlanStageCard";
import { TreatmentPlanSplitView } from "./splitCatalog/TreatmentPlanSplitView";
import { TreatmentPlanStagesEmptyState } from "./TreatmentPlanStagesEmptyState";
import type { TreatmentPlanStagesListSectionProps } from "./TreatmentPlanStagesListSectionTypes";

export type { TreatmentPlanStagesListSectionProps } from "./TreatmentPlanStagesListSectionTypes";

export const TreatmentPlanStagesListSection: React.FC<TreatmentPlanStagesListSectionProps> = (props) => {
	const {
		visibleStages,
		specialtyFilter,
		onSetSpecialtyFilter,
		onApplyClinicalBundle,
		onOpenCreateStageModal,
		dashboard,
		doctorOptions,
		onAssignDoctorToStage,
		onAssignDoctorToItem,
		onUpdateItemQuantity,
		onUpdateItemPrice,
		onUpdateItem,
		onRemoveItem,
		onAddItemToStage,
		onDeleteStage,
		onExecuteWriteOffStage,
		onStartStage,
		onChangeStageStatus,
		onPayStage,
		onOpenLabOrder,
		onOneClickLabOrder,
		onOpenInstallment,
		onApplyStageDiscount,
		onExportStageEstimate,
		catalog,
		onQuickAddService,
		isSplitMode = true,
		onExecuteCopilot,
		isCopilotExecuting,
		onApplyDoctorDiscount,
	} = props;

	if (visibleStages.length === 0) {
		return (
			<TreatmentPlanStagesEmptyState
				specialtyFilter={specialtyFilter}
				onSetSpecialtyFilter={onSetSpecialtyFilter}
				onApplyClinicalBundle={onApplyClinicalBundle}
				onOpenCreateStageModal={onOpenCreateStageModal}
			/>
		);
	}

	if (isSplitMode && onQuickAddService) {
		return (
			<TreatmentPlanSplitView
				stages={visibleStages}
				catalog={catalog}
				doctors={doctorOptions}
				onQuickAddService={onQuickAddService}
				onUpdateItemQuantity={onUpdateItemQuantity}
				onUpdateItemPrice={onUpdateItemPrice}
				onUpdateItem={onUpdateItem}
				onRemoveItem={onRemoveItem}
				onAssignDoctorToItem={onAssignDoctorToItem}
				onOpenCreateStageModal={onOpenCreateStageModal}
				onAddItemToStage={onAddItemToStage}
				onStartStage={onStartStage}
				onPayStage={onPayStage}
				onApplyDoctorDiscount={onApplyDoctorDiscount}
				onExecuteCopilot={onExecuteCopilot}
				isCopilotExecuting={isCopilotExecuting}
				onApplyClinicalBundle={onApplyClinicalBundle}
			/>
		);
	}

	return (
		<div className="flex flex-col gap-4">
			{visibleStages.map((stage) => (
				<TreatmentPlanStageCard
					key={stage.stageNumber}
					stage={stage}
					defaultExpanded={true}
					{...(Array.isArray(dashboard?.inventoryItems) && dashboard.inventoryItems.length > 0 ? { inventoryItems: dashboard.inventoryItems as InventoryItemLookup[] } : {})}
					doctors={doctorOptions}
					onAssignStageDoctor={onAssignDoctorToStage}
					onAssignItemDoctor={onAssignDoctorToItem}
					onUpdateItemQuantity={onUpdateItemQuantity}
					onUpdateItemPrice={onUpdateItemPrice}
					onUpdateItem={onUpdateItem}
					onRemoveItem={onRemoveItem}
					onAddItem={onAddItemToStage}
					onDeleteStage={onDeleteStage}
					onExecuteWriteOffStage={onExecuteWriteOffStage}
					onStartStage={onStartStage}
					onChangeStageStatus={onChangeStageStatus}
					onPayStage={onPayStage}
					onExportStageEstimate={onExportStageEstimate}
					onApplyStageDiscount={onApplyStageDiscount}
					onOpenLabOrder={onOpenLabOrder}
					onOneClickLabOrder={onOneClickLabOrder}
					onOpenInstallment={onOpenInstallment}
				/>
			))}
		</div>
	);
};
