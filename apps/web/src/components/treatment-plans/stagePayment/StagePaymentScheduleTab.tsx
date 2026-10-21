/**
 * StagePaymentScheduleTab.tsx — Вкладка графика этапов и оплат (DENTE CRM).
 */

import React from "react";
import type { MilestoneStage, StagePaymentTotals } from "./stagePaymentEngine.js";
import type { StagePaymentStatus } from "./stagePaymentPresets.js";
import { StagePaymentProgressCard } from "./scheduleTab/StagePaymentProgressCard";
import { StagePaymentCard } from "./scheduleTab/StagePaymentCard";

export interface StagePaymentScheduleTabProps {
	readonly stages: readonly MilestoneStage[];
	readonly totals: StagePaymentTotals;
	readonly activeStageMenuId: string | null;
	readonly onToggleStageMenu: (stageId: string) => void;
	readonly onPayAdvance: (stageId: string) => void;
	readonly onStageStatusChange: (stageId: string, newStatus: StagePaymentStatus) => void;
	readonly onOpenActTab: (stageId: string) => void;
	readonly onOpenInstallmentModal: (stage: MilestoneStage) => void;
	readonly onOpenFiscalTab: (stageId: string) => void;
}

export const StagePaymentScheduleTab: React.FC<StagePaymentScheduleTabProps> = ({
	stages,
	totals,
	activeStageMenuId,
	onToggleStageMenu,
	onPayAdvance,
	onStageStatusChange,
	onOpenActTab,
	onOpenInstallmentModal,
	onOpenFiscalTab,
}) => {
	return (
		<div className="flex flex-col gap-5">
			<StagePaymentProgressCard totals={totals} />

			<div className="flex flex-col gap-4">
				{stages.map((stage) => (
					<StagePaymentCard
						key={stage.id}
						stage={stage}
						activeStageMenuId={activeStageMenuId}
						onToggleStageMenu={onToggleStageMenu}
						onPayAdvance={onPayAdvance}
						onStageStatusChange={onStageStatusChange}
						onOpenActTab={onOpenActTab}
						onOpenInstallmentModal={onOpenInstallmentModal}
						onOpenFiscalTab={onOpenFiscalTab}
					/>
				))}
			</div>
		</div>
	);
};

export default StagePaymentScheduleTab;
