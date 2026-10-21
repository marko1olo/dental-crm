import type { MilestoneStage, StagePaymentTotals } from "./types";

/**
 * Kopeck-exact расчет сводных финансовых показателей по всем этапам
 */
export function calculateStagePaymentTotals(
	stages: readonly MilestoneStage[],
): StagePaymentTotals {
	let grandTotal = 0;
	let totalAdvanceRequired = 0;
	let totalAdvancePaid = 0;
	let totalEscrowLocked = 0;
	let totalActCompleted = 0;
	let totalCompletionPaid = 0;

	for (const stage of stages) {
		const stageTotal = Number(stage.totalKopecks ?? (stage as unknown as { totalAmountKopecks?: number }).totalAmountKopecks) || 0;
		grandTotal += stageTotal;
		totalAdvanceRequired += Number(stage.advanceRequiredKopecks) || 0;
		totalAdvancePaid += Number(stage.advancePaidKopecks) || 0;
		totalEscrowLocked += Number(stage.escrowLockedKopecks) || 0;
		totalCompletionPaid += Number(stage.completionPaidKopecks) || 0;

		if (stage.status === "act_completed" || stage.status === "fully_paid") {
			totalActCompleted += stageTotal;
		}
	}

	const totalPaid = totalAdvancePaid + totalCompletionPaid;
	const remainingDue = Math.max(0, grandTotal - totalPaid);
	const progressPercent =
		grandTotal > 0
			? Math.min(100, Math.round((totalActCompleted / grandTotal) * 100))
			: 0;

	return {
		grandTotalKopecks: grandTotal,
		totalAdvanceRequiredKopecks: totalAdvanceRequired,
		totalAdvancePaidKopecks: totalAdvancePaid,
		totalEscrowLockedKopecks: totalEscrowLocked,
		totalActCompletedKopecks: totalActCompleted,
		totalCompletionPaidKopecks: totalCompletionPaid,
		totalPaidKopecks: totalPaid,
		remainingDueKopecks: remainingDue,
		progressPercent,
	};
}
