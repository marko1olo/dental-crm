import React from "react";
import type { TreatmentPlanStageCategory } from "@dental/shared";
import {
	CATEGORY_ORDER,
	STAGE_STATUS_META,
	STAGE_TIMELINE_LABELS,
	type CategorizedPhasedPlanData,
	type PhasedStageStatus,
} from "../types.js";

export interface PhasedStepperGridProps {
	readonly categorized: CategorizedPhasedPlanData;
	readonly completionPercent: number;
	readonly stageStatuses: Readonly<Record<TreatmentPlanStageCategory, PhasedStageStatus>>;
	readonly expandedStages: Readonly<Record<TreatmentPlanStageCategory, boolean>>;
	readonly onSelectStageStep: (category: TreatmentPlanStageCategory) => void;
}

const STEP_SHORT_TITLES: Record<TreatmentPlanStageCategory, string> = {
	hygiene_sanitation: "1. Санация и гигиена",
	endo_therapy: "2. Терапия и каналы",
	surgery_implant: "3. Хирургия и имплантация",
	ortho_prosthetics: "4. Ортопедия и коронки",
};

export const PhasedStepperGrid: React.FC<PhasedStepperGridProps> = ({
	categorized,
	completionPercent,
	stageStatuses,
	expandedStages,
	onSelectStageStep,
}) => {
	return (
		<div className="pt-3 border-t border-[var(--line)] space-y-2.5">
			<div className="flex items-center justify-between text-xs">
				<span className="font-semibold text-[var(--ink)]">
					Маршрут реабилитации ({categorized.totalItemsCount} манипуляций в 4 фазах)
				</span>
				<span className="font-semibold text-[var(--teal)] tabular-nums">
					Готовность маршрута: {completionPercent}%
				</span>
			</div>
			<div className="h-1.5 w-full rounded-full bg-[var(--paper-soft)] overflow-hidden border border-[var(--line)]">
				<div
					className="h-full bg-[var(--teal)] transition-all duration-300"
					style={{ width: `${Math.max(completionPercent, 8)}%` }}
				/>
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 pt-1">
				{CATEGORY_ORDER.map((cat, idx) => {
					const stageData = categorized.map[cat];
					const status = stageStatuses[cat];
					const statusMeta = STAGE_STATUS_META[status];
					const isExpanded = expandedStages[cat];
					const hasItems = stageData.items.length > 0;

					return (
						<button
							key={cat}
							type="button"
							onClick={() => onSelectStageStep(cat)}
							className={`text-left rounded-lg border p-2.5 transition-colors cursor-pointer min-h-[44px] flex flex-col justify-between ${
								isExpanded
									? "border-[var(--teal)] bg-[color-mix(in_srgb,var(--teal)_6%,var(--paper))]"
									: "border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--paper)]"
							}`}
						>
							<div className="flex items-center justify-between gap-1.5">
								<span className="text-xs font-bold text-[var(--ink)] truncate">
									{STEP_SHORT_TITLES[cat] || `${idx + 1}. ${stageData.meta.shortLabelRu}`}
								</span>
								<span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold border shrink-0 ${statusMeta.badgeClass}`}>
									{statusMeta.label}
								</span>
							</div>
							<div className="mt-1.5 flex items-center justify-between gap-2 text-[11px]">
								<span className="text-[var(--ink-muted)] truncate">
									{STAGE_TIMELINE_LABELS[cat]}
								</span>
								<span className="font-bold text-[var(--ink)] tabular-nums shrink-0">
									{hasItems ? `${stageData.subtotalRub.toLocaleString("ru-RU")} ₽` : "0 ₽"}
								</span>
							</div>
						</button>
					);
				})}
			</div>
		</div>
	);
};
