import React from "react";
import type { TreatmentPlanStageCategory } from "@dental/shared";
import { isMicroConsumable } from "../../TreatmentPlanPresenterModal";
import type {
	CategorizedStageData,
	PhasedStageItem,
	PhasedStageStatus,
} from "../types";
import { PhasedStageCardHeader } from "./PhasedStageCardHeader";
import { PhasedStageItemsList } from "./PhasedStageItemsList";
import { PhasedStageCardActions } from "./PhasedStageCardActions";

export interface PhasedStageCardProps {
	readonly category: TreatmentPlanStageCategory;
	readonly stageIndex: number;
	readonly stageData: CategorizedStageData;
	readonly isExpanded: boolean;
	readonly showConsumables: boolean;
	readonly currentStatus: PhasedStageStatus;
	readonly grandTotalRub: number;
	readonly onToggleExpand: () => void;
	readonly onToggleConsumables: (category: TreatmentPlanStageCategory, e: React.MouseEvent) => void;
	readonly onCycleStatus: (e: React.MouseEvent) => void;
	readonly onSetStageAgreed: (category: TreatmentPlanStageCategory) => void;
	readonly onBookStageToVisit?: ((category: TreatmentPlanStageCategory, items: readonly PhasedStageItem[]) => void) | undefined;
	readonly onExecuteStage?: ((category: TreatmentPlanStageCategory) => void) | undefined;
	readonly onOpenStagePayment?: ((category: TreatmentPlanStageCategory, amountRub: number) => void) | undefined;
}

export const PhasedStageCard: React.FC<PhasedStageCardProps> = ({
	category,
	stageIndex,
	stageData,
	isExpanded,
	showConsumables,
	currentStatus,
	grandTotalRub,
	onToggleExpand,
	onToggleConsumables,
	onCycleStatus,
	onSetStageAgreed,
	onBookStageToVisit,
	onExecuteStage,
	onOpenStagePayment,
}) => {
	const hasItems = stageData.items.length > 0;
	const stageSharePercent = grandTotalRub > 0 ? Math.round((stageData.subtotalRub / grandTotalRub) * 100) : 0;
	const primaryItems = stageData.items.filter((it) => !isMicroConsumable(it));
	const microConsumables = stageData.items.filter((it) => isMicroConsumable(it));
	const visibleItems = showConsumables || primaryItems.length === 0 ? stageData.items : primaryItems;
	const microConsumablesTotalRub = microConsumables.reduce((sum, it) => sum + it.priceRub, 0);

	return (
		<div
			data-testid={`phased-stage-card-${category}`}
			className={`rounded-xl border transition-all ${
				hasItems ? "border-[var(--line)] bg-[var(--paper)] shadow-sm" : "border-dashed border-[var(--line)] bg-[var(--paper-soft)]"
			}`}
		>
			<PhasedStageCardHeader
				category={category}
				stageIndex={stageIndex}
				stageData={stageData}
				isExpanded={isExpanded}
				currentStatus={currentStatus}
				stageSharePercent={stageSharePercent}
				hasItems={hasItems}
				onToggle={onToggleExpand}
				onCycleStatus={onCycleStatus}
			/>

			{isExpanded && (
				<div className="border-t border-[var(--line)] px-4 py-3 space-y-2">
					{hasItems ? (
						<PhasedStageItemsList
							category={category}
							visibleItems={visibleItems}
							microConsumables={microConsumables}
							primaryItems={primaryItems}
							showConsumables={showConsumables}
							microConsumablesTotalRub={microConsumablesTotalRub}
							onToggleConsumables={onToggleConsumables}
						/>
					) : (
						<div className="py-3 text-xs text-[var(--ink-muted)] flex items-center justify-between flex-wrap gap-2">
							<span>На данном этапе манипуляции не назначены — этап не блокирует согласование остальных фаз лечения.</span>
							<span className="text-[11px] font-semibold text-[var(--ink)] tabular-nums">0 ₽</span>
						</div>
					)}

					<PhasedStageCardActions
						category={category}
						stageIndex={stageIndex}
						stageData={stageData}
						currentStatus={currentStatus}
						hasItems={hasItems}
						onSetStageAgreed={onSetStageAgreed}
						onBookStageToVisit={onBookStageToVisit}
						onExecuteStage={onExecuteStage}
						onOpenStagePayment={onOpenStagePayment}
					/>
				</div>
			)}
		</div>
	);
};
