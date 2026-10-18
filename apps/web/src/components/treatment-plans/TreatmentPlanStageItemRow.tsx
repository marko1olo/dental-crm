/**
 * TreatmentPlanStageItemRow.tsx — Строка процедуры этапа плана лечения
 * Декомпозирована по Мандату 8b (все файлы <= 120 строк).
 */

import React from "react";
import type { TreatmentPlanDoctorOption, TreatmentPlanItem } from "./types";
import { MissingPriceAlert } from "./MissingPriceAlert";
import { checkIsLabOrderEligible, getItemUnitPrice } from "./stageRow/stageRowHelpers";
import { StageItemMetaAndDoctor } from "./stageRow/StageItemMetaAndDoctor";
import { StageItemActionsAndPrice } from "./stageRow/StageItemActionsAndPrice";
import { StageItemArchivedAlert } from "./stageRow/StageItemArchivedAlert";

export interface TreatmentPlanStageItemRowProps {
	readonly item: TreatmentPlanItem;
	readonly planStatus?: "draft" | "approved" | "in_progress" | "completed" | string | undefined;
	readonly currentCatalogPriceRub?: number | undefined;
	readonly isArchivedInCatalog?: boolean | undefined;
	readonly doctors?: readonly TreatmentPlanDoctorOption[] | undefined;
	readonly onAssignDoctor?: ((itemId: string, doctorId: string | null, doctorName: string | null, doctorSpecialty: string | null) => void) | undefined;
	readonly onOpenLabOrder?: ((teeth?: number[], options?: Record<string, unknown>) => void) | undefined;
	readonly onOneClickLabOrder?: ((teeth?: number[]) => void) | undefined;
	readonly onUpdateItemQuantity?: ((itemId: string, newQty: number) => void) | undefined;
	readonly onUpdateItemPrice?: ((itemId: string, newPriceRub: number) => void) | undefined;
	readonly onUpdateItem?: ((updatedItem: TreatmentPlanItem) => void) | undefined;
	readonly onRemoveItem?: ((itemId: string) => void) | undefined;
	readonly onKeepAgreedPrice?: ((itemId: string) => void) | undefined;
	readonly onReplaceWithCatalogItem?: ((itemId: string, newCatalogPriceRub?: number) => void) | undefined;
}

export const TreatmentPlanStageItemRow: React.FC<TreatmentPlanStageItemRowProps> = ({
	item,
	currentCatalogPriceRub,
	isArchivedInCatalog,
	doctors,
	onAssignDoctor,
	onOpenLabOrder,
	onOneClickLabOrder,
	onUpdateItemQuantity,
	onUpdateItemPrice,
	onUpdateItem,
	onRemoveItem,
	onKeepAgreedPrice,
	onReplaceWithCatalogItem,
}) => {
	const isLabOrderEligible = checkIsLabOrderEligible(item);
	const catalogPrice = currentCatalogPriceRub !== undefined ? currentCatalogPriceRub : item.currentCatalogPriceRub;
	const isArchived = isArchivedInCatalog !== undefined ? isArchivedInCatalog : Boolean(item.isArchivedInCatalog);
	const itemUnitPrice = getItemUnitPrice(item);
	const hasPriceDrift =
		catalogPrice !== undefined &&
		Number.isFinite(catalogPrice) &&
		Math.abs(catalogPrice - itemUnitPrice) > 0.001;
	const isAgreedPriceKept = item.archivedResolution === "keep_agreed_price";

	return (
		<div className="flex flex-col gap-2 px-4 py-3 hover:bg-[var(--paper-soft,#f8fafc)] transition-colors">
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
				<StageItemMetaAndDoctor
					item={item}
					doctors={doctors}
					onAssignDoctor={onAssignDoctor}
				/>

				<StageItemActionsAndPrice
					item={item}
					isLabOrderEligible={isLabOrderEligible}
					catalogPrice={catalogPrice}
					itemUnitPrice={itemUnitPrice}
					hasPriceDrift={hasPriceDrift}
					onOpenLabOrder={onOpenLabOrder}
					onOneClickLabOrder={onOneClickLabOrder}
					onUpdateItemQuantity={onUpdateItemQuantity}
					onRemoveItem={onRemoveItem}
				/>
			</div>

			{isArchived && !isAgreedPriceKept && (
				<StageItemArchivedAlert
					item={item}
					catalogPrice={catalogPrice}
					onKeepAgreedPrice={onKeepAgreedPrice}
					onReplaceWithCatalogItem={onReplaceWithCatalogItem}
					onUpdateItem={onUpdateItem}
				/>
			)}

			{(item.requiresManualPricing || item.priceRub === 0) && (
				<MissingPriceAlert
					item={item}
					onUpdatePrice={onUpdateItemPrice}
					onUpdateItem={onUpdateItem}
					variant="full"
					className="mt-1"
				/>
			)}
		</div>
	);
};

export default TreatmentPlanStageItemRow;
