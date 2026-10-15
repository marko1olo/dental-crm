import React from "react";
import { AlertTriangle, ChevronDown, ChevronUp, Clock } from "lucide-react";
import {
	type TreatmentPlanDoctorOption,
	type TreatmentPlanStage,
	type TreatmentPlanStageStatus,
	romanizeStageNumber,
} from "./types";
import { STAGE_COLOR_MAP } from "./treatmentPlanStageConfig";
import { TreatmentPlanStageStatusMenu } from "./TreatmentPlanStageStatusMenu";
import { TreatmentPlanStageDoctorSelector } from "./TreatmentPlanStageDoctorSelector";

export interface TreatmentPlanStageHeaderProps {
	readonly stage: TreatmentPlanStage;
	readonly isExpanded: boolean;
	readonly onToggleExpanded: () => void;
	readonly currentStatus: TreatmentPlanStageStatus;
	readonly isStatusMenuOpen: boolean;
	readonly setIsStatusMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
	readonly onSelectStatus: (newStatus: TreatmentPlanStageStatus, e?: React.MouseEvent) => void;
	readonly doctors?: readonly TreatmentPlanDoctorOption[] | undefined;
	readonly onAssignStageDoctor?: ((stage: TreatmentPlanStage, doctorId: string | null, doctorName: string | null, doctorSpecialty: string | null) => void) | undefined;
	readonly hasDeficit: boolean;
	readonly deficitCount: number;
}

export const TreatmentPlanStageHeader: React.FC<TreatmentPlanStageHeaderProps> = ({
	stage,
	isExpanded,
	onToggleExpanded,
	currentStatus,
	isStatusMenuOpen,
	setIsStatusMenuOpen,
	onSelectStatus,
	doctors,
	onAssignStageDoctor,
	hasDeficit,
	deficitCount,
}) => {
	const theme = STAGE_COLOR_MAP[stage.stageNumber as 1 | 2 | 3] ?? STAGE_COLOR_MAP[1];

	return (
		<div
			onClick={onToggleExpanded}
			className={`flex items-center justify-between p-3.5 sm:p-4 cursor-pointer select-none transition-colors hover:bg-[var(--paper-soft,#f8fafc)] border-b ${
				isExpanded ? "border-[var(--line,var(--border,#cbd5e1))]" : "border-transparent"
			} ${theme.headerBg} ${isExpanded ? "rounded-t-2xl" : "rounded-2xl"}`}
			role="button"
			tabIndex={0}
			onKeyDown={(e) => {
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault();
					onToggleExpanded();
				}
			}}
			aria-expanded={isExpanded}
			aria-label={stage.title}
		>
			<div className="flex items-center gap-3 min-w-0">
				<div className={`flex items-center justify-center w-10 h-10 rounded-xl font-bold font-mono text-sm shrink-0 border ${theme.iconBg} ${theme.accentBorder}`}>
					{romanizeStageNumber(stage.stageNumber)}
				</div>

				<div className="flex flex-col min-w-0">
					<div className="flex items-center gap-2 flex-wrap">
						<h4 className="text-sm font-bold text-[var(--ink,#0f172a)] truncate">{stage.title}</h4>
						<span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold border ${theme.badge}`}>
							{stage.items.length} {stage.items.length === 1 ? "процедура" : "процедур"}
						</span>

						<TreatmentPlanStageStatusMenu
							stage={stage} currentStatus={currentStatus} isStatusMenuOpen={isStatusMenuOpen}
							setIsStatusMenuOpen={setIsStatusMenuOpen} onSelectStatus={onSelectStatus}
						/>

						<TreatmentPlanStageDoctorSelector stage={stage} doctors={doctors} onAssignStageDoctor={onAssignStageDoctor} />

						{hasDeficit && (
							<span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/30 flex items-center gap-1">
								<AlertTriangle size={11} /> Дефицит ТМЦ ({deficitCount})
							</span>
						)}
					</div>
					<p className="text-xs text-[var(--muted,#64748b)] truncate max-w-xl min-w-0">{stage.subtitle}</p>
				</div>
			</div>

			<div className="flex items-center gap-4 shrink-0">
				<div className="text-right flex flex-col">
					<span className="text-xs sm:text-sm font-bold text-emerald-600 dark:text-emerald-400 font-mono">
						{(stage.totalRub || 0).toLocaleString("ru-RU")} ₽
					</span>
					<span className="text-[10px] text-[var(--muted,#64748b)] hidden sm:flex items-center justify-end gap-1">
						<Clock size={11} /> {stage.estimatedVisits} виз. · {stage.estimatedWeeks} нед.
					</span>
				</div>

				<div className="p-1 rounded-lg text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)]">
					{isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
				</div>
			</div>
		</div>
	);
};
