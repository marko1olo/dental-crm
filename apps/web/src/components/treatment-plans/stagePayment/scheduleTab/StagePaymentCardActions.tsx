/**
 * apps/web/src/components/treatment-plans/stagePayment/scheduleTab/StagePaymentCardActions.tsx
 *
 * Кнопки первичных действий этапа и вызов контекстного меню.
 */

import React from "react";
import { Coins, FileCheck, Lock } from "lucide-react";
import { formatKopecksRu } from "@dental/shared";
import type { MilestoneStage } from "../stagePaymentEngine.js";
import type { StagePaymentStatus } from "../stagePaymentPresets.js";
import { StagePaymentActionsMenu } from "./StagePaymentActionsMenu";

export interface StagePaymentCardActionsProps {
	readonly stage: MilestoneStage;
	readonly activeStageMenuId: string | null;
	readonly onToggleStageMenu: (stageId: string) => void;
	readonly onPayAdvance: (stageId: string) => void;
	readonly onStageStatusChange: (stageId: string, newStatus: StagePaymentStatus) => void;
	readonly onOpenActTab: (stageId: string) => void;
	readonly onOpenInstallmentModal: (stage: MilestoneStage) => void;
	readonly onOpenFiscalTab: (stageId: string) => void;
}

export const StagePaymentCardActions: React.FC<StagePaymentCardActionsProps> = ({
	stage,
	activeStageMenuId,
	onToggleStageMenu,
	onPayAdvance,
	onStageStatusChange,
	onOpenActTab,
	onOpenInstallmentModal,
	onOpenFiscalTab,
}) => {
	return (
		<div className="flex items-center gap-1.5 shrink-0">
			{stage.status === "draft" && (
				<button
					type="button"
					onClick={() => onPayAdvance(stage.id)}
					className="stage-action-btn primary"
				>
					<Coins className="h-4 w-4" />
					<span>Внести аванс ({formatKopecksRu(stage.advanceRequiredKopecks)})</span>
				</button>
			)}

			{stage.status === "advance_paid" && (
				<button
					type="button"
					onClick={() => onStageStatusChange(stage.id, "in_progress")}
					className="stage-action-btn primary"
				>
					<Lock className="h-4 w-4" />
					<span>Взять в работу (Эскроу)</span>
				</button>
			)}

			{stage.status === "in_progress" && (
				<button
					type="button"
					onClick={() => onOpenActTab(stage.id)}
					className="stage-action-btn primary"
				>
					<FileCheck className="h-4 w-4" />
					<span>Закрыть актом</span>
				</button>
			)}

			<StagePaymentActionsMenu
				stage={stage}
				isOpen={activeStageMenuId === stage.id}
				onToggle={() => onToggleStageMenu(stage.id)}
				onStageStatusChange={onStageStatusChange}
				onOpenActTab={onOpenActTab}
				onOpenInstallmentModal={onOpenInstallmentModal}
				onOpenFiscalTab={onOpenFiscalTab}
			/>
		</div>
	);
};
