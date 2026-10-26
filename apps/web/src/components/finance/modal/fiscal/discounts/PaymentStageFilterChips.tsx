import React from "react";
import { Layers } from "lucide-react";
import type { TreatmentPlanItem } from "../../../../treatment-plans/types";
import {
	mapTreatmentItemsToFiscalReceipt,
	TREATMENT_STAGE_LABELS,
} from "../../../fiscalReceiptEngine";
import { formatMoneyRu } from "../fiscalModalRefundLogic";

export interface PaymentStageFilterChipsProps {
	readonly availableStages: readonly string[];
	readonly selectedStageKind: string;
	readonly handleSelectStage: (stage: string) => void;
	readonly activeItems: readonly TreatmentPlanItem[];
	readonly items: readonly TreatmentPlanItem[];
}

export const PaymentStageFilterChips: React.FC<PaymentStageFilterChipsProps> = ({
	availableStages,
	selectedStageKind,
	handleSelectStage,
	activeItems,
	items,
}) => {
	if (availableStages.length === 0) return null;

	const allSumRub = mapTreatmentItemsToFiscalReceipt(items).totalRub;

	return (
		<div className="p-3.5 rounded-2xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--border,#cbd5e1)] space-y-2">
			<div className="flex items-center justify-between text-xs font-bold">
				<span className="flex items-center gap-1.5 text-[var(--muted,#64748b)] uppercase tracking-wider text-xs">
					<Layers size={14} className="text-teal-600 dark:text-teal-400" />
					Этап плана лечения для оплаты:
				</span>
				<span className="font-mono text-teal-700 dark:text-teal-300">
					Позиций: {activeItems.length}
				</span>
			</div>
			<div className="flex flex-wrap gap-1.5">
				<button
					type="button"
					onClick={() => handleSelectStage("all")}
					className={`h-8 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-center ${
						selectedStageKind === "all"
							? "bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,#ffffff)] shadow-xs"
							: "bg-[var(--paper-strong,var(--paper,#ffffff))] border border-[var(--border,#cbd5e1)] text-[var(--ink,#0f172a)] hover:border-teal-400"
					}`}
				>
					Все этапы ({formatMoneyRu(allSumRub)})
				</button>
				{availableStages.map((st) => {
					const stageItems = items.filter((i) => (i.stageKind || i.category) === st);
					const stageSumRub = mapTreatmentItemsToFiscalReceipt(stageItems).totalRub;
					const label = TREATMENT_STAGE_LABELS[st] || st;
					return (
						<button
							key={st}
							type="button"
							onClick={() => handleSelectStage(st)}
							className={`h-8 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-center ${
								selectedStageKind === st
									? "bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,#ffffff)] shadow-xs"
									: "bg-[var(--paper-strong,var(--paper,#ffffff))] border border-[var(--border,#cbd5e1)] text-[var(--ink,#0f172a)] hover:border-teal-400"
							}`}
						>
							{label} ({formatMoneyRu(stageSumRub)})
						</button>
					);
				})}
			</div>
		</div>
	);
};
