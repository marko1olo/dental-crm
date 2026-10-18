import React from "react";
import { Check } from "lucide-react";
import type { TreatmentPlanStageStatus } from "../types";
import type { StageStatusConfigItem } from "../TreatmentPlanStageFooter";

export interface StageFooterStatusPickerProps {
	readonly currentStatus: TreatmentPlanStageStatus;
	readonly stageStatusConfig: Record<TreatmentPlanStageStatus, StageStatusConfigItem>;
	readonly onSelectStatus: (newStatus: TreatmentPlanStageStatus, e?: React.MouseEvent) => void;
	readonly onClose: () => void;
}

const STAGE_STATUS_KEYS: readonly TreatmentPlanStageStatus[] = [
	"draft",
	"agreed",
	"in_progress",
	"completed",
];

export const StageFooterStatusPicker: React.FC<StageFooterStatusPickerProps> = ({
	currentStatus,
	stageStatusConfig,
	onSelectStatus,
	onClose,
}) => {
	return (
		<>
			<div className="px-2.5 py-1 text-[11.5px] font-semibold text-[var(--muted,#64748b)] uppercase tracking-wider">
				Статус этапа:
			</div>
			{STAGE_STATUS_KEYS.map((st) => {
				const cfg = stageStatusConfig[st];
				const ItemIcon = cfg.icon;
				const isCurrent = currentStatus === st;
				return (
					<button
						key={st}
						type="button"
						onClick={(e) => {
							onClose();
							onSelectStatus(st, e);
						}}
						className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-2 cursor-pointer transition-colors h-7 ${
							isCurrent
								? "font-bold text-[var(--teal-dark,var(--teal))] bg-[var(--teal-soft,var(--paper-soft))]"
								: "font-medium text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f8fafc)]"
						}`}
						role="menuitem"
					>
						<ItemIcon size={12} />
						<span>{cfg.label}</span>
						{isCurrent && (
							<Check size={12} className="ml-auto text-[var(--teal-dark,var(--teal))] shrink-0" />
						)}
					</button>
				);
			})}
		</>
	);
};
