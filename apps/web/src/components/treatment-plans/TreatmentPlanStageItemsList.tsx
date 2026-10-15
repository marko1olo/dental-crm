import React from "react";
import { Package, Plus } from "lucide-react";
import type { TreatmentPlanDoctorOption, TreatmentPlanItem, TreatmentPlanStage } from "./types";
import { isMicroConsumable } from "./TreatmentPlanPresenterModal";
import { TreatmentPlanStageItemRow } from "./TreatmentPlanStageItemRow";

export interface TreatmentPlanStageItemsListProps {
	readonly stage: TreatmentPlanStage;
	readonly doctors?: readonly TreatmentPlanDoctorOption[] | undefined;
	readonly showMicroConsumables: boolean;
	readonly setShowMicroConsumables: React.Dispatch<React.SetStateAction<boolean>>;
	readonly onAddItem?: ((stage: TreatmentPlanStage) => void) | undefined;
	readonly onAssignItemDoctor?: ((itemId: string, doctorId: string | null, doctorName: string | null, doctorSpecialty: string | null) => void) | undefined;
	readonly onUpdateItemQuantity?: ((itemId: string, newQty: number) => void) | undefined;
	readonly onUpdateItemPrice?: ((itemId: string, newPriceRub: number) => void) | undefined;
	readonly onUpdateItem?: ((updatedItem: TreatmentPlanItem) => void) | undefined;
	readonly onRemoveItem?: ((itemId: string) => void) | undefined;
	readonly onOpenLabOrder?: ((teeth?: number[], options?: Record<string, unknown>) => void) | undefined;
	readonly onOneClickLabOrder?: ((teeth?: number[]) => void) | undefined;
}

export const TreatmentPlanStageItemsList: React.FC<TreatmentPlanStageItemsListProps> = (props) => {
	const { stage, doctors, showMicroConsumables, setShowMicroConsumables, onAddItem, onAssignItemDoctor, onUpdateItemQuantity, onUpdateItemPrice, onUpdateItem, onRemoveItem, onOpenLabOrder, onOneClickLabOrder } = props;

	if (stage.items.length === 0) {
		return (
			<div className="py-8 px-4 text-center text-xs text-[var(--muted,#64748b)] flex flex-col items-center justify-center gap-2">
				<Package size={24} className="text-[var(--muted,#64748b)] opacity-40" />
				<span className="font-semibold text-[var(--ink,#0f172a)]">В данном этапе нет запланированных процедур</span>
				<span className="text-[11px] text-[var(--muted,#64748b)] max-w-sm">Назначьте процедуры из клинического каталога или примените готовый пакет СтАР</span>
				{onAddItem && (
					<button type="button" onClick={() => onAddItem(stage)} className="mt-2 h-8 min-h-[32px] [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:min-h-[44px] px-3 rounded-lg text-[13px] font-medium text-[var(--teal-dark,var(--teal))] bg-[var(--teal-soft,var(--paper-soft))] hover:bg-[var(--teal)]/20 border border-[var(--teal,var(--brand-primary))]/30 cursor-pointer flex items-center gap-1.5 transition-colors shadow-2xs" data-testid={`stage-${stage.stageNumber}-empty-add-item-btn`}>
						<Plus size={13} /><span>Добавить услугу в этап</span>
					</button>
				)}
			</div>
		);
	}

	const microConsumables = stage.items.filter(isMicroConsumable);
	const displayItems = showMicroConsumables ? stage.items : stage.items.filter((it) => !isMicroConsumable(it));

	return (
		<div className="divide-y divide-[var(--line,#e2e8f0)]">
			{displayItems.map((item, idx) => (
				<TreatmentPlanStageItemRow
					key={item.id || idx} item={item} doctors={doctors} onAssignDoctor={onAssignItemDoctor}
					onOpenLabOrder={onOpenLabOrder ? (teeth, opts) => onOpenLabOrder(teeth, { stageId: stage.id, stageNumber: stage.stageNumber, stageTitle: stage.title, doctorId: (stage as any).assignedDoctorId, doctorName: (stage as any).assignedDoctorName, ...opts }) : undefined}
					onOneClickLabOrder={onOneClickLabOrder} onUpdateItemQuantity={onUpdateItemQuantity} onUpdateItemPrice={onUpdateItemPrice} onUpdateItem={onUpdateItem} onRemoveItem={onRemoveItem}
				/>
			))}
			{onAddItem && (
				<div className="px-4 py-2 bg-[var(--paper-soft,#f8fafc)] border-t border-[var(--line,#e2e8f0)] flex items-center justify-between text-xs">
					<span className="text-[12px] text-[var(--muted,#64748b)] font-medium">Добавить процедуру или пакет в этот этап:</span>
					<button type="button" onClick={() => onAddItem(stage)} className="h-8 min-h-[32px] [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:min-h-[44px] px-3 rounded-lg text-[13px] font-medium text-[var(--teal-dark,var(--teal))] bg-[var(--teal-soft,var(--paper-soft))] hover:bg-[var(--teal)]/20 border border-[var(--teal,var(--brand-primary))]/30 cursor-pointer flex items-center gap-1.5 transition-colors" data-testid={`stage-${stage.stageNumber}-add-item-btn`}>
						<Plus size={13} /><span>+ Услуга</span>
					</button>
				</div>
			)}
			{microConsumables.length > 0 && (
				<div className="px-4 py-2 bg-[var(--paper-soft,#f8fafc)] flex items-center justify-between text-xs text-[var(--muted,#64748b)] border-t border-[var(--line,#e2e8f0)]">
					<span>Сопутствующие микро-расходники ({microConsumables.length} поз.: валики, салфетки, перчатки, слюноотсосы) включены в процедуры</span>
					<button type="button" onClick={() => setShowMicroConsumables((prev) => !prev)} className="h-7 px-2 flex items-center text-[var(--teal,#0d9488)] hover:underline font-bold text-xs cursor-pointer ml-auto">
						{showMicroConsumables ? "Скрыть" : "Показать"}
					</button>
				</div>
			)}
		</div>
	);
};
