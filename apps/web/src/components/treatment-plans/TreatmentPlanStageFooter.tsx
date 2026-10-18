/**
 * TreatmentPlanStageFooter.tsx — Подвал этапа плана лечения
 * Декомпозирован по Мандату 8b (все файлы <= 120 строк).
 */

import React from "react";
import type { TreatmentPlanStage, TreatmentPlanStageStatus } from "./types";
import { computeStageFooterActionFlags } from "./stageFooter/stageFooterHelpers";
import { StageFooterPrimaryActions } from "./stageFooter/StageFooterPrimaryActions";
import { StageFooterMenu } from "./stageFooter/StageFooterMenu";

export interface StageStatusConfigItem {
	readonly label: string;
	readonly badge: string;
	readonly icon: React.ComponentType<{ size?: number; className?: string }>;
}

export interface TreatmentPlanStageFooterProps {
	readonly stage: TreatmentPlanStage;
	readonly currentStatus: TreatmentPlanStageStatus;
	readonly stageStatusConfig: Record<TreatmentPlanStageStatus, StageStatusConfigItem>;
	readonly onStartStage?: ((stage: TreatmentPlanStage) => void) | undefined;
	readonly onExecuteWriteOffStage?: ((stage: TreatmentPlanStage) => void) | undefined;
	readonly onPayStage?: ((stage: TreatmentPlanStage) => void) | undefined;
	readonly onExportStageEstimate?: ((stage: TreatmentPlanStage) => void) | undefined;
	readonly onOpenLabOrder?: ((teeth?: number[], options?: Record<string, unknown>) => void) | undefined;
	readonly onOneClickLabOrder?: ((teeth?: number[]) => void) | undefined;
	readonly onApplyStageDiscount?: ((stage: TreatmentPlanStage) => void) | undefined;
	readonly onOpenInstallment?: ((stage: TreatmentPlanStage) => void) | undefined;
	readonly onDeleteStage?: ((stage: TreatmentPlanStage) => void) | undefined;
	readonly onSelectStatus: (newStatus: TreatmentPlanStageStatus, e?: React.MouseEvent) => void;
	readonly onStartStageClick: (e?: React.MouseEvent) => void;
}

export const TreatmentPlanStageFooter: React.FC<TreatmentPlanStageFooterProps> = ({
	stage,
	currentStatus,
	stageStatusConfig,
	onStartStage,
	onExecuteWriteOffStage,
	onPayStage,
	onExportStageEstimate,
	onOpenLabOrder,
	onOneClickLabOrder,
	onApplyStageDiscount,
	onOpenInstallment,
	onDeleteStage,
	onSelectStatus,
	onStartStageClick,
}) => {
	const flags = computeStageFooterActionFlags(stage, {
		onStartStage,
		onExecuteWriteOffStage,
		onPayStage,
		onExportStageEstimate,
		onOpenLabOrder,
		onOneClickLabOrder,
		onApplyStageDiscount,
		onOpenInstallment,
		onDeleteStage,
	});

	return (
		<div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 text-xs font-semibold text-[var(--muted,#64748b)] border-t border-[var(--line,var(--border,#cbd5e1))] bg-[var(--paper-soft,#f8fafc)] rounded-b-2xl">
			<div className="flex items-center gap-2">
				<span>Итого за этап:</span>
				<span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 font-mono">
					{(stage.totalRub || 0).toLocaleString("ru-RU")} ₽
				</span>
			</div>

			<div className="flex items-center justify-end gap-2 flex-wrap">
				<StageFooterPrimaryActions
					stage={stage}
					flags={flags}
					onStartStageClick={onStartStageClick}
					onExecuteWriteOffStage={onExecuteWriteOffStage}
					onExportStageEstimate={onExportStageEstimate}
					onPayStage={onPayStage}
				/>

				{flags.hasSecondaryActions && (
					<StageFooterMenu
						stage={stage}
						currentStatus={currentStatus}
						stageStatusConfig={stageStatusConfig}
						flags={flags}
						onSelectStatus={onSelectStatus}
						onExecuteWriteOffStage={onExecuteWriteOffStage}
						onPayStage={onPayStage}
						onExportStageEstimate={onExportStageEstimate}
						onOpenLabOrder={onOpenLabOrder}
						onOneClickLabOrder={onOneClickLabOrder}
						onApplyStageDiscount={onApplyStageDiscount}
						onOpenInstallment={onOpenInstallment}
						onDeleteStage={onDeleteStage}
					/>
				)}
			</div>
		</div>
	);
};

export default TreatmentPlanStageFooter;
