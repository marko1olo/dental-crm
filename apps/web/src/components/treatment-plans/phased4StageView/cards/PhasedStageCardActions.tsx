import React from "react";
import type { TreatmentPlanStageCategory } from "@dental/shared";
import { STAGE_TITLES, type CategorizedStageData, type PhasedStageItem, type PhasedStageStatus } from "../types.js";
import { PhasedStageCardButtons } from "./PhasedStageCardButtons.js";

export interface PhasedStageCardActionsProps {
	readonly category: TreatmentPlanStageCategory;
	readonly stageIndex: number;
	readonly stageData: CategorizedStageData;
	readonly currentStatus: PhasedStageStatus;
	readonly hasItems: boolean;
	readonly onSetStageAgreed: (category: TreatmentPlanStageCategory) => void;
	readonly onBookStageToVisit?: ((category: TreatmentPlanStageCategory, items: readonly PhasedStageItem[]) => void) | undefined;
	readonly onExecuteStage?: ((category: TreatmentPlanStageCategory) => void) | undefined;
	readonly onOpenStagePayment?: ((category: TreatmentPlanStageCategory, amountRub: number) => void) | undefined;
}

export const PhasedStageCardActions: React.FC<PhasedStageCardActionsProps> = ({
	category,
	stageIndex,
	stageData,
	currentStatus,
	hasItems,
	onSetStageAgreed,
	onBookStageToVisit,
	onExecuteStage,
	onOpenStagePayment,
}) => {
	const orderCodes = hasItems
		? Array.from(new Set(stageData.items.map((i) => i.code804n))).join(", ")
		: "—";

	return (
		<div className="pt-2 border-t border-[var(--line)] flex flex-wrap items-center justify-between gap-2 text-xs">
			<div className="flex items-center gap-3 flex-wrap">
				<span className="font-medium text-[var(--ink-muted)]">
					Итог по этапу #{stageIndex + 1} ({STAGE_TITLES[category]}):{" "}
					<strong className="text-[var(--ink)] tabular-nums">
						{stageData.subtotalRub.toLocaleString("ru-RU")} ₽
					</strong>
				</span>
				<span className="text-[11px] text-[var(--ink-muted)]">
					Позиций: {stageData.items.length} | Коды: {orderCodes}
				</span>
			</div>

			<PhasedStageCardButtons
				category={category}
				stageData={stageData}
				currentStatus={currentStatus}
				onSetStageAgreed={onSetStageAgreed}
				onBookStageToVisit={onBookStageToVisit}
				onExecuteStage={onExecuteStage}
				onOpenStagePayment={onOpenStagePayment}
			/>
		</div>
	);
};
