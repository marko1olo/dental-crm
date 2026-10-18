import React from "react";
import { CreditCard, Package, Play, Printer } from "lucide-react";
import type { TreatmentPlanStage } from "../types";
import type { StageFooterActionFlags } from "./stageFooterHelpers";

export interface StageFooterPrimaryActionsProps {
	readonly stage: TreatmentPlanStage;
	readonly flags: StageFooterActionFlags;
	readonly onStartStageClick: (e?: React.MouseEvent) => void;
	readonly onExecuteWriteOffStage?: ((stage: TreatmentPlanStage) => void) | undefined;
	readonly onExportStageEstimate?: ((stage: TreatmentPlanStage) => void) | undefined;
	readonly onPayStage?: ((stage: TreatmentPlanStage) => void) | undefined;
}

export const StageFooterPrimaryActions: React.FC<StageFooterPrimaryActionsProps> = ({
	stage,
	flags,
	onStartStageClick,
	onExecuteWriteOffStage,
	onExportStageEstimate,
	onPayStage,
}) => {
	return (
		<>
			{/* Action 1 */}
			{flags.isAction1Start ? (
				<button
					type="button"
					onClick={onStartStageClick}
					className="h-9 min-h-[36px] [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:min-h-[44px] px-4 rounded-lg text-[13px] font-semibold text-sky-800 dark:text-sky-200 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 cursor-pointer transition-colors flex items-center justify-center gap-1.5 shrink-0 touch-manipulation shadow-2xs"
					title={`Взять этап №${stage.stageNumber} «${stage.title}» в работу`}
					data-testid={`stage-${stage.stageNumber}-start-btn`}
				>
					<Play size={13} className="text-sky-600 dark:text-sky-400 shrink-0 fill-current" />
					<span>В работу</span>
				</button>
			) : flags.isAction1WriteOff ? (
				<button
					type="button"
					onClick={() => onExecuteWriteOffStage!(stage)}
					className="h-9 min-h-[36px] [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:min-h-[44px] px-4 rounded-lg text-[13px] font-medium text-[var(--teal-dark,var(--teal))] bg-[var(--teal-soft,var(--paper-soft))] hover:bg-[var(--teal-soft,var(--paper-soft))] border border-[var(--teal,var(--brand-primary))]/30 cursor-pointer transition-colors flex items-center justify-center gap-1.5 shrink-0 touch-manipulation shadow-2xs"
					title="Сформировать Акт выполненных работ и провести списание ТМЦ со склада"
					data-testid={`stage-${stage.stageNumber}-writeoff-btn`}
				>
					<Package size={14} className="text-[var(--teal,var(--brand-primary))] shrink-0" />
					<span>Акт и списание</span>
				</button>
			) : null}

			{/* Action 2 */}
			{flags.isAction2Estimate ? (
				<button
					type="button"
					onClick={() => onExportStageEstimate!(stage)}
					className="h-9 min-h-[36px] [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:min-h-[44px] px-4 rounded-lg text-[13px] font-medium text-[var(--ink,#0f172a)] bg-[var(--paper-strong,var(--paper,#ffffff))] hover:bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,var(--border,#cbd5e1))] cursor-pointer transition-colors flex items-center justify-center gap-1.5 shrink-0 touch-manipulation shadow-2xs"
					title={`Печать сметы и спецификации по этапу №${stage.stageNumber}`}
					data-testid={`stage-${stage.stageNumber}-estimate-btn`}
				>
					<Printer size={14} className="text-[var(--muted,#64748b)] shrink-0" />
					<span>Смета</span>
				</button>
			) : flags.isAction2Pay ? (
				<button
					type="button"
					onClick={() => onPayStage!(stage)}
					className="h-9 min-h-[36px] [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:min-h-[44px] px-4 rounded-lg text-[13px] font-semibold text-emerald-800 dark:text-emerald-200 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 cursor-pointer transition-colors flex items-center justify-center gap-1.5 shrink-0 touch-manipulation shadow-2xs"
					title={`Принять оплату за этап №${stage.stageNumber} (${(stage.totalRub || 0).toLocaleString("ru-RU")} ₽)`}
					data-testid={`stage-${stage.stageNumber}-pay-btn`}
				>
					<CreditCard size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
					<span>Оплатить этап</span>
				</button>
			) : flags.isAction2WriteOff ? (
				<button
					type="button"
					onClick={() => onExecuteWriteOffStage!(stage)}
					className="h-9 min-h-[36px] [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:min-h-[44px] px-4 rounded-lg text-[13px] font-medium text-[var(--teal-dark,var(--teal))] bg-[var(--teal-soft,var(--paper-soft))] hover:bg-[var(--teal-soft,var(--paper-soft))] border border-[var(--teal,var(--brand-primary))]/30 cursor-pointer transition-colors flex items-center justify-center gap-1.5 shrink-0 touch-manipulation shadow-2xs"
					title="Сформировать Акт выполненных работ и провести списание ТМЦ со склада"
					data-testid={`stage-${stage.stageNumber}-writeoff-btn`}
				>
					<Package size={14} className="text-[var(--teal,var(--brand-primary))] shrink-0" />
					<span>Акт и списание</span>
				</button>
			) : null}
		</>
	);
};
