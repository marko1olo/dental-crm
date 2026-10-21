/**
 * StagePaymentActTab.tsx — Вкладка закрытия этапа актом выполненных работ (DENTE CRM).
 */

import React from "react";
import { FileCheck } from "lucide-react";
import type { MilestoneStage } from "./stagePaymentEngine.js";
import { StageActFormInputs } from "./actTab/StageActFormInputs.js";
import { SelectedStageDetailCard } from "./actTab/SelectedStageDetailCard.js";

export interface StagePaymentActTabProps {
	readonly stages: readonly MilestoneStage[];
	readonly selectedStageForActId: string;
	readonly onSelectStageForAct: (stageId: string) => void;
	readonly actNumberInput: string;
	readonly onActNumberChange: (value: string) => void;
	readonly actSignDate: string;
	readonly onActSignDateChange: (value: string) => void;
	readonly doctorFullName: string;
	readonly onSignStageAct: () => void;
}

export const StagePaymentActTab: React.FC<StagePaymentActTabProps> = ({
	stages,
	selectedStageForActId,
	onSelectStageForAct,
	actNumberInput,
	onActNumberChange,
	actSignDate,
	onActSignDateChange,
	doctorFullName,
	onSignStageAct,
}) => {
	const selectedStage = stages.find((s) => s.id === selectedStageForActId);

	return (
		<div className="flex flex-col gap-6">
			<div className="rounded-2xl border border-[var(--border,#cbd5e1)] bg-[var(--paper-strong,#ffffff)] p-5 flex flex-col gap-5">
				<div className="flex items-center justify-between">
					<h3 className="font-bold text-base text-[var(--ink,#0f172a)] flex items-center gap-2">
						<FileCheck className="h-5 w-5 text-[var(--teal,var(--brand-primary))]" />
						Оформление Акта сдачи-приемки выполненных работ (ст. 720 ГК РФ)
					</h3>
					<span className="text-xs text-[var(--muted,#64748b)]">
						Врач: {doctorFullName}
					</span>
				</div>

				<StageActFormInputs
					stages={stages}
					selectedStageForActId={selectedStageForActId}
					onSelectStageForAct={onSelectStageForAct}
					actNumberInput={actNumberInput}
					onActNumberChange={onActNumberChange}
					actSignDate={actSignDate}
					onActSignDateChange={onActSignDateChange}
				/>

				{selectedStage && <SelectedStageDetailCard stage={selectedStage} />}

				<div className="flex justify-end gap-3">
					<button
						type="button"
						onClick={onSignStageAct}
						className="stage-action-btn primary"
					>
						<FileCheck className="h-4 w-4" />
						<span>Подписать акт сдачи-приемки и перевести оплату из эскроу</span>
					</button>
				</div>
			</div>
		</div>
	);
};

export default StagePaymentActTab;
