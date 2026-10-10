/**
 * TreatmentPlanPhased4StageView.tsx — 4-стадийный клинический презентер плана лечения (Мандат 8b).
 * Тонкий фасад (<= 120 строк), делегирующий рендер модульным субкомпонентам в `./phased4StageView/`.
 */

import React, { useMemo, useState } from "react";
import type { TreatmentPlanStageCategory } from "@dental/shared";
import { showToast } from "../GlobalToast";
import {
	INITIAL_EXPANDED_CONSUMABLES,
	INITIAL_EXPANDED_STAGES,
	INITIAL_STAGE_STATUSES,
	PhasedStageCardList,
	PhasedStageFinancialSummary,
	PhasedStageFooterActions,
	PhasedStageProgressStepper,
	STAGE_STATUS_Order,
	categorizePhasedPlanStages,
	formatPlanAgeBadge,
	type InstallmentMonthsOption,
	type PhasedStageItem,
	type PhasedStageStatus,
	type TreatmentPlanPhased4StageViewProps,
} from "./phased4StageView";

export type { PhasedStageItem, PhasedStageStatus, TreatmentPlanPhased4StageViewProps } from "./phased4StageView/types";

export const TreatmentPlanPhased4StageView: React.FC<TreatmentPlanPhased4StageViewProps> = ({
	stages,
	planTierTitle = "Комплексный план реабилитации",
	patientName,
	planAgeDays = 0,
	planCreatedAtIso,
	onToggleStage,
	onExecuteStage,
	onBookStageToVisit,
	onOpenStagePayment,
	onOpenInstallment,
	onApproveAndSign,
	onPrintContract,
	onChangeStageStatus,
}) => {
	const [expandedStages, setExpandedStages] = useState(INITIAL_EXPANDED_STAGES);
	const [expandedConsumables, setExpandedConsumables] = useState(INITIAL_EXPANDED_CONSUMABLES);
	const [stageStatuses, setStageStatuses] = useState(INITIAL_STAGE_STATUSES);
	const [installmentMonths, setInstallmentMonths] = useState<InstallmentMonthsOption>(12);
	const [planApproved, setPlanApproved] = useState(false);

	const categorized = useMemo(() => categorizePhasedPlanStages(stages), [stages]);
	const installmentMonthlyRub = Math.round(categorized.grandTotalRub / installmentMonths);
	const formattedPlanAgeBadge = useMemo(() => formatPlanAgeBadge(planAgeDays, planCreatedAtIso), [planAgeDays, planCreatedAtIso]);

	const handleToggleStage = (cat: TreatmentPlanStageCategory) => {
		setExpandedStages((prev) => ({ ...prev, [cat]: !prev[cat] }));
		onToggleStage?.(cat);
	};

	return (
		<div data-testid="treatment-plan-phased-4stage-view" className="space-y-5 pb-24 sm:pb-0">
			<PhasedStageProgressStepper
				categorized={categorized}
				planTierTitle={planTierTitle}
				patientName={patientName}
				formattedPlanAgeBadge={formattedPlanAgeBadge}
				isExpired={planAgeDays > 30}
				installmentMonths={installmentMonths}
				installmentMonthlyRub={installmentMonthlyRub}
				stageStatuses={stageStatuses}
				expandedStages={expandedStages}
				onSelectStageStep={handleToggleStage}
			/>
			<PhasedStageCardList
				categorized={categorized}
				expandedStages={expandedStages}
				expandedConsumables={expandedConsumables}
				stageStatuses={stageStatuses}
				onToggleExpandStage={handleToggleStage}
				onToggleStageConsumables={(cat, e) => { e.stopPropagation(); setExpandedConsumables((prev) => ({ ...prev, [cat]: !prev[cat] })); }}
				onCycleStageStatus={(cat, e) => {
					e.stopPropagation();
					const nextStatus = STAGE_STATUS_Order[(STAGE_STATUS_Order.indexOf(stageStatuses[cat]) + 1) % STAGE_STATUS_Order.length] ?? "draft";
					setStageStatuses((prev) => ({ ...prev, [cat]: nextStatus }));
					onChangeStageStatus?.(cat, nextStatus);
				}}
				onSetStageAgreed={(cat) => { setStageStatuses((prev) => ({ ...prev, [cat]: "agreed" })); onChangeStageStatus?.(cat, "agreed"); }}
				onBookStageToVisit={onBookStageToVisit}
				onExecuteStage={onExecuteStage}
				onOpenStagePayment={onOpenStagePayment}
			/>
			<PhasedStageFinancialSummary
				categorized={categorized}
				stageStatuses={stageStatuses}
				installmentMonths={installmentMonths}
				installmentMonthlyRub={installmentMonthlyRub}
				onChangeInstallmentMonths={setInstallmentMonths}
			/>
			<PhasedStageFooterActions
				totalItemsCount={categorized.totalItemsCount}
				grandTotalRub={categorized.grandTotalRub}
				installmentMonths={installmentMonths}
				installmentMonthlyRub={installmentMonthlyRub}
				planApproved={planApproved}
				patientName={patientName}
				onApprovePlan={() => {
					setPlanApproved(true);
					showToast(`Комплексный 4-этапный план (${categorized.grandTotalRub.toLocaleString("ru-RU")} ₽) согласован с пациентом`, "success", 3500);
					onApproveAndSign?.();
				}}
				onOpenInstallment={onOpenInstallment}
				onOpenStagePayment={(amountRub) => onOpenStagePayment?.("hygiene_sanitation", amountRub)}
				onPrintContract={onPrintContract}
			/>
		</div>
	);
};
