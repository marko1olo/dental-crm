/**
 * PhasedStageProgressStepper.tsx — Шапка 4-стадийного плана и визуальный
 * прогресс-степпер клинических фаз со сроками заживления, бюджетом и % выполнения.
 */

import React from "react";
import type { TreatmentPlanStageCategory } from "@dental/shared";
import {
	CATEGORY_ORDER,
	type CategorizedPhasedPlanData,
	type InstallmentMonthsOption,
	type PhasedStageStatus,
} from "./types.js";
import { PhasedStepperHeader } from "./stepper/PhasedStepperHeader.js";
import { PhasedStepperGrid } from "./stepper/PhasedStepperGrid.js";

export interface PhasedStageProgressStepperProps {
	readonly categorized: CategorizedPhasedPlanData;
	readonly planTierTitle: string;
	readonly patientName?: string | undefined;
	readonly formattedPlanAgeBadge: string;
	readonly isExpired: boolean;
	readonly installmentMonths: InstallmentMonthsOption;
	readonly installmentMonthlyRub: number;
	readonly stageStatuses: Readonly<Record<TreatmentPlanStageCategory, PhasedStageStatus>>;
	readonly expandedStages: Readonly<Record<TreatmentPlanStageCategory, boolean>>;
	readonly onSelectStageStep: (category: TreatmentPlanStageCategory) => void;
}

export const PhasedStageProgressStepper: React.FC<PhasedStageProgressStepperProps> = ({
	categorized,
	planTierTitle,
	patientName,
	formattedPlanAgeBadge,
	isExpired,
	installmentMonths,
	installmentMonthlyRub,
	stageStatuses,
	expandedStages,
	onSelectStageStep,
}) => {
	const activeCategories = CATEGORY_ORDER.filter(
		(cat) => categorized.map[cat].items.length > 0,
	);
	const totalActiveStages = activeCategories.length || 1;
	const completedOrAgreedCount = activeCategories.filter((cat) => {
		const status = stageStatuses[cat];
		return status === "completed" || status === "in_progress" || status === "agreed";
	}).length;
	const completionPercent = Math.round(
		(completedOrAgreedCount / totalActiveStages) * 100,
	);

	return (
		<div className="rounded-xl border border-[var(--line)] bg-[var(--paper)] p-4 shadow-sm space-y-4">
			<PhasedStepperHeader
				categorized={categorized}
				planTierTitle={planTierTitle}
				patientName={patientName}
				formattedPlanAgeBadge={formattedPlanAgeBadge}
				isExpired={isExpired}
				installmentMonths={installmentMonths}
				installmentMonthlyRub={installmentMonthlyRub}
			/>

			<PhasedStepperGrid
				categorized={categorized}
				completionPercent={completionPercent}
				stageStatuses={stageStatuses}
				expandedStages={expandedStages}
				onSelectStageStep={onSelectStageStep}
			/>
		</div>
	);
};
