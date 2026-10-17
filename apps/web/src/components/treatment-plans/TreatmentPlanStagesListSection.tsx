import React from "react";
import { Layers, Sparkles } from "lucide-react";
import type { InventoryItemLookup } from "./treatmentPlanMaterialEngine";
import type { TreatmentPlanStage } from "./types";
import { TreatmentPlanStageCard } from "./TreatmentPlanStageCard";

export interface TreatmentPlanStagesListSectionProps {
	readonly visibleStages: readonly TreatmentPlanStage[];
	readonly specialtyFilter: string;
	readonly onSetSpecialtyFilter: (filter: any) => void;
	readonly onApplyClinicalBundle: (bundleId: any, toothNumber?: number) => void;
	readonly onOpenCreateStageModal: () => void;
	readonly dashboard?: any;
	readonly doctorOptions?: readonly any[];
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
}

export const TreatmentPlanStagesListSection: React.FC<TreatmentPlanStagesListSectionProps> = (props) => {
	const { visibleStages, specialtyFilter, onSetSpecialtyFilter, onApplyClinicalBundle, onOpenCreateStageModal, dashboard, doctorOptions, onAssignDoctorToStage, onAssignDoctorToItem, onUpdateItemQuantity, onUpdateItemPrice, onUpdateItem, onRemoveItem, onAddItemToStage, onDeleteStage, onExecuteWriteOffStage, onStartStage, onChangeStageStatus, onPayStage, onOpenLabOrder, onOneClickLabOrder, onOpenInstallment, onApplyStageDiscount, onExportStageEstimate } = props;

	if (visibleStages.length === 0) {
		return (
			<div className="p-8 rounded-2xl border border-dashed border-[var(--line,var(--border,#cbd5e1))] bg-[var(--paper-soft,#f8fafc)] text-center text-xs text-[var(--muted,#64748b)] space-y-3">
				<Layers className="w-10 h-10 mx-auto text-[var(--muted,#64748b)] opacity-40" />
				<div className="font-bold text-sm text-[var(--ink,#0f172a)]">
					{specialtyFilter !== "all" ? "В выбранной специализации пока нет этапов" : "В плане лечения пока нет сформированных этапов"}
				</div>
				<p className="max-w-md mx-auto m-0 text-xs text-[var(--muted,#64748b)]">
					{specialtyFilter !== "all" ? "Сбросьте фильтр или добавьте новый этап по этой специальности." : "Добавьте клинический пакет, услугу из каталога или создайте этап вручную."}
				</p>
				<div className="flex items-center justify-center gap-2 pt-1 flex-wrap">
					{specialtyFilter !== "all" ? (
						<button type="button" onClick={() => onSetSpecialtyFilter("all")} className="h-8 px-3 rounded-lg text-xs font-bold text-[var(--ink,#0f172a)] bg-[var(--paper-strong,#ffffff)] hover:bg-[var(--paper-soft)] border border-[var(--line,var(--border,#cbd5e1))] transition-colors inline-flex items-center gap-1.5 shadow-2xs cursor-pointer">
							<span>Показать все этапы</span>
						</button>
					) : (
						<>
							<button type="button" onClick={() => onApplyClinicalBundle("hygiene_turnkey")} className="h-8 px-3 rounded-lg text-xs font-bold text-[var(--teal-dark,var(--teal))] bg-[var(--teal-soft,var(--paper-soft))] hover:bg-[var(--teal-soft)] border border-[var(--teal)]/30 transition-colors inline-flex items-center gap-1.5 shadow-2xs cursor-pointer">
								<Sparkles size={13} />
								<span>+ Пакет: Профгигиена</span>
							</button>
							<button type="button" onClick={onOpenCreateStageModal} className="h-8 px-3 rounded-lg text-xs font-bold text-[var(--ink,#0f172a)] bg-[var(--paper-strong,#ffffff)] hover:bg-[var(--paper-soft)] border border-[var(--line,var(--border,#cbd5e1))] transition-colors inline-flex items-center gap-1.5 shadow-2xs cursor-pointer">
								<span>+ Создать этап</span>
							</button>
						</>
					)}
				</div>
			</div>
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
