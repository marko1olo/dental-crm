import type { TreatmentPlanStage } from "../types";

export interface StageFooterActionFlags {
	readonly isLabOrderEligible: boolean;
	readonly isAction1Start: boolean;
	readonly isAction1WriteOff: boolean;
	readonly isAction2Estimate: boolean;
	readonly isAction2Pay: boolean;
	readonly isAction2WriteOff: boolean;
	readonly showWriteOffInMenu: boolean;
	readonly showPayInMenu: boolean;
	readonly showEstimateInMenu: boolean;
	readonly hasSecondaryActions: boolean;
}

export function computeStageFooterActionFlags(
	stage: TreatmentPlanStage,
	handlers: {
		onStartStage?: unknown;
		onExecuteWriteOffStage?: unknown;
		onPayStage?: unknown;
		onExportStageEstimate?: unknown;
		onOpenLabOrder?: unknown;
		onOneClickLabOrder?: unknown;
		onApplyStageDiscount?: unknown;
		onOpenInstallment?: unknown;
		onDeleteStage?: unknown;
	},
): StageFooterActionFlags {
	const isLabOrderEligible =
		stage.stageKind === "stage_3_orthopedics" ||
		stage.stageNumber === 3 ||
		stage.items.some(
			(it) =>
				it.category === "Ортопедия" ||
				it.category === "Детская ортопедия" ||
				/коронк|мост|протез|винир|вкладк|абатмент|бюгел/i.test(it.name),
		);

	const isAction1Start = Boolean(handlers.onStartStage);
	const isAction1WriteOff = !isAction1Start && Boolean(handlers.onExecuteWriteOffStage && stage.items.length > 0);

	const isAction2Pay = Boolean(handlers.onPayStage && (stage.totalRub || 0) > 0);
	const isAction2Estimate = !isAction2Pay && Boolean(handlers.onExportStageEstimate);
	const isAction2WriteOff =
		!isAction2Estimate &&
		!isAction2Pay &&
		!isAction1WriteOff &&
		Boolean(handlers.onExecuteWriteOffStage && stage.items.length > 0);

	const showWriteOffInMenu = Boolean(
		handlers.onExecuteWriteOffStage && stage.items.length > 0 && !isAction1WriteOff && !isAction2WriteOff,
	);
	const showPayInMenu = Boolean(handlers.onPayStage && (stage.totalRub || 0) > 0 && !isAction2Pay);
	const showEstimateInMenu = Boolean(handlers.onExportStageEstimate && !isAction2Estimate);

	const hasSecondaryActions = Boolean(
		showWriteOffInMenu ||
		showPayInMenu ||
		showEstimateInMenu ||
		(handlers.onOpenLabOrder && isLabOrderEligible) ||
		(handlers.onOneClickLabOrder && isLabOrderEligible) ||
		(handlers.onOpenInstallment && stage.totalRub > 0) ||
		handlers.onApplyStageDiscount ||
		handlers.onDeleteStage,
	);

	return {
		isLabOrderEligible,
		isAction1Start,
		isAction1WriteOff,
		isAction2Estimate,
		isAction2Pay,
		isAction2WriteOff,
		showWriteOffInMenu,
		showPayInMenu,
		showEstimateInMenu,
		hasSecondaryActions,
	};
}
