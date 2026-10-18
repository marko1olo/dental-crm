/**
 * PhasedStageCardList.tsx — Карточки 4 клинических фаз плана лечения
 * Декомпозирован по Мандату 8b (все файлы <= 120 строк).
 */

import React from "react";
import type { TreatmentPlanStageCategory } from "@dental/shared";
import {
	CATEGORY_ORDER,
	type CategorizedPhasedPlanData,
	type PhasedStageItem,
	type PhasedStageStatus,
} from "./types";
import { PhasedStageEmptyState } from "./cards/PhasedStageEmptyState";
import { PhasedStageCard } from "./cards/PhasedStageCard";

export interface PhasedStageCardListProps {
	readonly categorized: CategorizedPhasedPlanData;
	readonly expandedStages: Readonly<Record<TreatmentPlanStageCategory, boolean>>;
	readonly expandedConsumables: Readonly<Record<TreatmentPlanStageCategory, boolean>>;
	readonly stageStatuses: Readonly<Record<TreatmentPlanStageCategory, PhasedStageStatus>>;
	readonly onToggleExpandStage: (category: TreatmentPlanStageCategory) => void;
	readonly onToggleStageConsumables: (category: TreatmentPlanStageCategory, e: React.MouseEvent) => void;
	readonly onCycleStageStatus: (category: TreatmentPlanStageCategory, e: React.MouseEvent) => void;
	readonly onSetStageAgreed: (category: TreatmentPlanStageCategory) => void;
	readonly onBookStageToVisit?: ((category: TreatmentPlanStageCategory, items: readonly PhasedStageItem[]) => void) | undefined;
	readonly onExecuteStage?: ((category: TreatmentPlanStageCategory) => void) | undefined;
	readonly onOpenStagePayment?: ((category: TreatmentPlanStageCategory, amountRub: number) => void) | undefined;
}

export const PhasedStageCardList: React.FC<PhasedStageCardListProps> = ({
	categorized,
	expandedStages,
	expandedConsumables,
	stageStatuses,
	onToggleExpandStage,
	onToggleStageConsumables,
	onCycleStageStatus,
	onSetStageAgreed,
	onBookStageToVisit,
	onExecuteStage,
	onOpenStagePayment,
}) => {
	return (
		<>
			{categorized.totalItemsCount === 0 && <PhasedStageEmptyState />}

			<div className="grid grid-cols-1 gap-4">
				{CATEGORY_ORDER.map((cat, idx) => (
					<PhasedStageCard
						key={cat}
						category={cat}
						stageIndex={idx}
						stageData={categorized.map[cat]}
						isExpanded={expandedStages[cat]}
						showConsumables={expandedConsumables[cat]}
						currentStatus={stageStatuses[cat]}
						grandTotalRub={categorized.grandTotalRub}
						onToggleExpand={() => onToggleExpandStage(cat)}
						onToggleConsumables={onToggleStageConsumables}
						onCycleStatus={(e) => onCycleStageStatus(cat, e)}
						onSetStageAgreed={onSetStageAgreed}
						onBookStageToVisit={onBookStageToVisit}
						onExecuteStage={onExecuteStage}
						onOpenStagePayment={onOpenStagePayment}
					/>
				))}
			</div>
		</>
	);
};

export default PhasedStageCardList;
