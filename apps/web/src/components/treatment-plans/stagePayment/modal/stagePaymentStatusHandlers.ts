import { formatKopecksRu } from "@dental/shared";
import { STAGE_STATUS_UI_MAP, type StagePaymentStatus } from "../stagePaymentPresets.js";
import {
	type MilestoneStage,
	validateStageStateTransition,
} from "../stagePaymentEngine.js";

export function handleTransitionStageStatus(
	stages: MilestoneStage[],
	stageId: string,
	newStatus: StagePaymentStatus,
): { updatedStages: MilestoneStage[]; message: string; isError?: boolean } {
	const target = stages.find((s) => s.id === stageId);
	if (!target) return { updatedStages: stages, message: "Этап не найден", isError: true };
	const v = validateStageStateTransition(target.status, newStatus);
	if (!v.allowed) {
		return { updatedStages: stages, message: v.reasonRu ?? "Недопустимый переход статуса", isError: true };
	}
	const updated = stages.map((s) => {
		if (s.id !== stageId) return s;
		let advance = s.advancePaidKopecks;
		let escrow = s.escrowLockedKopecks;
		let comp = s.completionPaidKopecks;
		if (newStatus === "advance_paid" && advance === 0) {
			advance = s.advanceRequiredKopecks;
			escrow = s.advanceRequiredKopecks;
		} else if (newStatus === "fully_paid") {
			comp = Math.max(0, s.totalKopecks - advance);
			escrow = 0;
		} else if (newStatus === "refunded") {
			escrow = 0;
		}
		return { ...s, status: newStatus, advancePaidKopecks: advance, escrowLockedKopecks: escrow, completionPaidKopecks: comp };
	});
	return {
		updatedStages: updated,
		message: `Статус этапа №${target.stageNumber} успешно изменен на "${STAGE_STATUS_UI_MAP[newStatus].labelRu}"`,
	};
}

export function handlePayAdvance(
	stages: MilestoneStage[],
	stageId: string,
): { updatedStages: MilestoneStage[]; message: string } | null {
	const target = stages.find((s) => s.id === stageId);
	if (!target) return null;
	const updated = stages.map((s) =>
		s.id === stageId
			? { ...s, status: "advance_paid" as const, advancePaidKopecks: s.advanceRequiredKopecks, escrowLockedKopecks: s.advanceRequiredKopecks }
			: s,
	);
	return {
		updatedStages: updated,
		message: `Аванс ${formatKopecksRu(target.advanceRequiredKopecks)} по этапу №${target.stageNumber} внесен в эскроу.`,
	};
}
