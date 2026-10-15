import React, { useMemo, useState, useEffect } from "react";
import { Activity } from "lucide-react";
import {
	type InventoryItemLookup,
	calculateStageMaterialRequirements,
} from "./treatmentPlanMaterialEngine";
import type {
	TreatmentPlanDoctorOption,
	TreatmentPlanItem,
	TreatmentPlanStage,
	TreatmentPlanStageStatus,
} from "./types";
import { STAGE_STATUS_CONFIG } from "./treatmentPlanStageConfig";
import { TreatmentPlanStageHeader } from "./TreatmentPlanStageHeader";
import { TreatmentPlanStageItemsList } from "./TreatmentPlanStageItemsList";
import { TreatmentPlanStageMaterialsAccordion } from "./TreatmentPlanStageMaterialsAccordion";
import { TreatmentPlanStageFooter } from "./TreatmentPlanStageFooter";

export { TreatmentPlanStageItemRow } from "./TreatmentPlanStageItemRow";
export { TreatmentPlanStageFooter } from "./TreatmentPlanStageFooter";
export type { TreatmentPlanStageStatus };

export interface TreatmentPlanStageCardProps {
	readonly stage: TreatmentPlanStage;
	readonly defaultExpanded?: boolean | undefined;
	readonly inventoryItems?: readonly InventoryItemLookup[] | undefined;
	readonly doctors?: readonly TreatmentPlanDoctorOption[] | undefined;
	readonly onAssignStageDoctor?: ((stage: TreatmentPlanStage, doctorId: string | null, doctorName: string | null, doctorSpecialty: string | null) => void) | undefined;
	readonly onAssignItemDoctor?: ((itemId: string, doctorId: string | null, doctorName: string | null, doctorSpecialty: string | null) => void) | undefined;
	readonly onUpdateItemQuantity?: ((itemId: string, newQty: number) => void) | undefined;
	readonly onUpdateItemPrice?: ((itemId: string, newPriceRub: number) => void) | undefined;
	readonly onUpdateItem?: ((updatedItem: TreatmentPlanItem) => void) | undefined;
	readonly onRemoveItem?: ((itemId: string) => void) | undefined;
	readonly onAddItem?: ((stage: TreatmentPlanStage) => void) | undefined;
	readonly onChangeStageStatus?: ((stage: TreatmentPlanStage, newStatus: TreatmentPlanStageStatus) => void) | undefined;
	readonly onStartStage?: ((stage: TreatmentPlanStage) => void) | undefined;
	readonly onExecuteWriteOffStage?: ((stage: TreatmentPlanStage) => void) | undefined;
	readonly onPayStage?: ((stage: TreatmentPlanStage) => void) | undefined;
	readonly onOpenLabOrder?: ((teeth?: number[], options?: Record<string, unknown>) => void) | undefined;
	readonly onOneClickLabOrder?: ((teeth?: number[]) => void) | undefined;
	readonly onOpenInstallment?: ((stage: TreatmentPlanStage) => void) | undefined;
	readonly onApplyStageDiscount?: ((stage: TreatmentPlanStage) => void) | undefined;
	readonly onExportStageEstimate?: ((stage: TreatmentPlanStage) => void) | undefined;
	readonly onDeleteStage?: ((stage: TreatmentPlanStage) => void) | undefined;
	readonly className?: string | undefined;
}

export const TreatmentPlanStageCard: React.FC<TreatmentPlanStageCardProps> = (props) => {
	const { stage, defaultExpanded = true, inventoryItems, doctors, onAssignStageDoctor, onAssignItemDoctor, onUpdateItemQuantity, onUpdateItemPrice, onUpdateItem, onRemoveItem, onAddItem, onChangeStageStatus, onStartStage, onExecuteWriteOffStage, onPayStage, onOpenLabOrder, onOneClickLabOrder, onOpenInstallment, onApplyStageDiscount, onExportStageEstimate, onDeleteStage, className = "" } = props;

	const [isExpanded, setIsExpanded] = useState<boolean>(defaultExpanded);
	const [showMaterials, setShowMaterials] = useState<boolean>(false);
	const [showMicroConsumables, setShowMicroConsumables] = useState<boolean>(false);
	const [isStatusMenuOpen, setIsStatusMenuOpen] = useState<boolean>(false);
	const [localStatus, setLocalStatus] = useState<TreatmentPlanStageStatus>(
		stage.status || (stage.items.some((it) => it.isDraft) ? "draft" : "agreed"),
	);

	useEffect(() => {
		if (stage.status) setLocalStatus(stage.status);
	}, [stage.status]);

	const currentStatus: TreatmentPlanStageStatus = stage.status || localStatus;
	const handleSelectStatus = (newStatus: TreatmentPlanStageStatus, e?: React.MouseEvent) => {
		e?.stopPropagation();
		setLocalStatus(newStatus);
		setIsStatusMenuOpen(false);
		onChangeStageStatus?.(stage, newStatus);
	};

	const handleStartStageClick = (e?: React.MouseEvent) => {
		e?.stopPropagation();
		setLocalStatus("in_progress");
		onChangeStageStatus?.(stage, "in_progress");
		onStartStage?.(stage);
	};

	const materialSummary = useMemo(() => calculateStageMaterialRequirements(stage, inventoryItems), [stage, inventoryItems]);
	const presentationMaterials = useMemo(() => materialSummary.items.filter((m) => !m.hideInPatientPresentation), [materialSummary.items]);

	return (
		<div className={`treatment-stage-card flex flex-col rounded-2xl border border-[var(--line,var(--border,#cbd5e1))] bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink,#0f172a)] shadow-xs transition-all duration-200 ${className}`.trim()} data-testid={`treatment-stage-${stage.stageNumber}`}>
			<TreatmentPlanStageHeader stage={stage} isExpanded={isExpanded} onToggleExpanded={() => setIsExpanded((p) => !p)} currentStatus={currentStatus} isStatusMenuOpen={isStatusMenuOpen} setIsStatusMenuOpen={setIsStatusMenuOpen} onSelectStatus={handleSelectStatus} doctors={doctors} onAssignStageDoctor={onAssignStageDoctor} hasDeficit={materialSummary.hasDeficit} deficitCount={materialSummary.deficitCount} />
			{isExpanded && (
				<div className="flex flex-col bg-[var(--paper-strong,var(--paper,#ffffff))] rounded-b-2xl">
					{stage.clinicalGoal && (
						<div className="flex items-center gap-2 px-4 py-2.5 bg-[var(--paper-soft,#f8fafc)] border-b border-[var(--line,var(--border,#cbd5e1))]/60 text-xs text-[var(--muted,#64748b)]">
							<Activity size={14} className="text-[var(--teal,var(--brand-primary))] shrink-0" />
							<span className="font-medium"><strong>Клиническая цель:</strong> {stage.clinicalGoal}</span>
						</div>
					)}
					<TreatmentPlanStageItemsList stage={stage} doctors={doctors} showMicroConsumables={showMicroConsumables} setShowMicroConsumables={setShowMicroConsumables} onAddItem={onAddItem} onAssignItemDoctor={onAssignItemDoctor} onUpdateItemQuantity={onUpdateItemQuantity} onUpdateItemPrice={onUpdateItemPrice} onUpdateItem={onUpdateItem} onRemoveItem={onRemoveItem} onOpenLabOrder={onOpenLabOrder} onOneClickLabOrder={onOneClickLabOrder} />
					<TreatmentPlanStageMaterialsAccordion showMaterials={showMaterials} setShowMaterials={setShowMaterials} presentationMaterials={presentationMaterials} materialSummary={materialSummary} />
					<TreatmentPlanStageFooter stage={stage} currentStatus={currentStatus} stageStatusConfig={STAGE_STATUS_CONFIG} onStartStage={onStartStage} onExecuteWriteOffStage={onExecuteWriteOffStage} onPayStage={onPayStage} onExportStageEstimate={onExportStageEstimate} onOpenLabOrder={onOpenLabOrder} onOneClickLabOrder={onOneClickLabOrder} onApplyStageDiscount={onApplyStageDiscount} onOpenInstallment={onOpenInstallment} onDeleteStage={onDeleteStage} onSelectStatus={handleSelectStatus} onStartStageClick={handleStartStageClick} />
				</div>
			)}
		</div>
	);
};
