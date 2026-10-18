import React from "react";
import { CreditCard, Percent, Trash2 } from "lucide-react";
import type { TreatmentPlanStage } from "../types";
import type { StageFooterActionFlags } from "./stageFooterHelpers";
import { StageFooterLabOrderButtons } from "./StageFooterLabOrderButtons";

export interface StageFooterLabAndDiscountActionsProps {
	readonly stage: TreatmentPlanStage;
	readonly flags: StageFooterActionFlags;
	readonly onClose: () => void;
	readonly onOpenLabOrder?: ((teeth?: number[], options?: Record<string, unknown>) => void) | undefined;
	readonly onOneClickLabOrder?: ((teeth?: number[]) => void) | undefined;
	readonly onApplyStageDiscount?: ((stage: TreatmentPlanStage) => void) | undefined;
	readonly onOpenInstallment?: ((stage: TreatmentPlanStage) => void) | undefined;
	readonly onDeleteStage?: ((stage: TreatmentPlanStage) => void) | undefined;
}

export const StageFooterLabAndDiscountActions: React.FC<StageFooterLabAndDiscountActionsProps> = ({
	stage,
	flags,
	onClose,
	onOpenLabOrder,
	onOneClickLabOrder,
	onApplyStageDiscount,
	onOpenInstallment,
	onDeleteStage,
}) => {
	return (
		<>
			<StageFooterLabOrderButtons
				stage={stage}
				flags={flags}
				onClose={onClose}
				onOpenLabOrder={onOpenLabOrder}
				onOneClickLabOrder={onOneClickLabOrder}
			/>

			{onApplyStageDiscount && (
				<button
					type="button"
					onClick={() => {
						onClose();
						onApplyStageDiscount(stage);
					}}
					className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f8fafc)] transition-colors flex items-center gap-2 cursor-pointer touch-manipulation h-8"
					title="Применить скидку к этапу лечения"
					data-testid={`stage-${stage.stageNumber}-discount-btn`}
					role="menuitem"
				>
					<Percent size={14} className="text-[var(--teal,var(--brand-primary))] shrink-0" />
					<span>Скидка на этап</span>
				</button>
			)}

			{onOpenInstallment && stage.totalRub > 0 && (
				<button
					type="button"
					onClick={() => {
						onClose();
						onOpenInstallment(stage);
					}}
					className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold text-emerald-800 dark:text-emerald-200 hover:bg-emerald-500/10 transition-colors flex items-center gap-2 cursor-pointer touch-manipulation h-8"
					title={`Оформить беспроцентную банковскую рассрочку (Сбер / Т-Банк / Подели) на этап №${stage.stageNumber}`}
					data-testid={`stage-${stage.stageNumber}-installment-btn`}
					role="menuitem"
				>
					<CreditCard size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
					<span>Рассрочка на этап</span>
				</button>
			)}

			{onDeleteStage && (
				<>
					<div className="my-1 border-t border-[var(--line,var(--border,#cbd5e1))]" />
					<button
						type="button"
						onClick={() => {
							onClose();
							onDeleteStage(stage);
						}}
						className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors flex items-center gap-2 cursor-pointer touch-manipulation h-8"
						title="Удалить данный этап из плана лечения"
						data-testid={`stage-${stage.stageNumber}-delete-btn`}
						role="menuitem"
					>
						<Trash2 size={14} className="text-rose-600 dark:text-rose-400 shrink-0" />
						<span>Удалить этап</span>
					</button>
				</>
			)}
		</>
	);
};
