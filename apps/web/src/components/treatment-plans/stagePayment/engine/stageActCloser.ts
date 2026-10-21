import type { Kopecks } from "@dental/shared";
import type { MilestoneStage } from "./types";

/**
 * Закрытие этапа актом выполненных работ (ст. 720 ГК РФ)
 * Разблокирует замороженный эскроу-депозит и признает выручку клиники
 */
export function closeStageWithCompletedAct(
	stage: MilestoneStage,
	actNumber: string,
	actDate?: string,
): {
	readonly updatedStage: MilestoneStage;
	readonly releasedEscrowKopecks: Kopecks;
	readonly recognizedRevenueKopecks: Kopecks;
} {
	const releasedEscrow = 0;
	const recognizedRevenue = stage.totalKopecks;
	const isFullyPaid = stage.advancePaidKopecks + stage.completionPaidKopecks >= stage.totalKopecks;

	const updatedStage: MilestoneStage = {
		...stage,
		status: isFullyPaid ? "fully_paid" : "act_completed",
		escrowLockedKopecks: 0,
		actNumber: actNumber.trim() || `АКТ-ЭТ-${stage.stageNumber}-${Date.now().toString().slice(-4)}`,
		actSignedAt: actDate || new Date().toISOString(),
	};

	return {
		updatedStage,
		releasedEscrowKopecks: releasedEscrow,
		recognizedRevenueKopecks: recognizedRevenue,
	};
}
