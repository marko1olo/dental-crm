import type { Kopecks } from "@dental/shared";
import type { StagePaymentStatus } from "../stagePaymentPresets.js";
import type { MilestoneStage, PatientDepositWallet } from "./types";

/**
 * Распределение свободного депозита пациента по этапам в порядке приоритета
 */
export function allocatePatientDepositToStages(
	stages: readonly MilestoneStage[],
	deposit: PatientDepositWallet,
): {
	readonly updatedStages: readonly MilestoneStage[];
	readonly updatedDeposit: PatientDepositWallet;
	readonly allocatedLog: readonly { stageId: string; amountKopecks: Kopecks; reason: string }[];
} {
	let available = deposit.availableDepositKopecks;
	const log: { stageId: string; amountKopecks: Kopecks; reason: string }[] = [];

	const updatedStages: MilestoneStage[] = stages.map((stage) => {
		if (available <= 0 || stage.status === "fully_paid" || stage.status === "refunded") {
			return stage;
		}

		// 1. Покрываем обязательный аванс этапа из свободного депозита пациента
		const unpaidAdvance = Math.max(0, stage.advanceRequiredKopecks - stage.advancePaidKopecks);
		let currentAdvancePaid = stage.advancePaidKopecks;
		let currentCompletionPaid = stage.completionPaidKopecks;
		let currentStatus: StagePaymentStatus = stage.status;

		if (unpaidAdvance > 0 && available > 0) {
			const toAllocateAdvance = Math.min(available, unpaidAdvance);
			available -= toAllocateAdvance;
			currentAdvancePaid += toAllocateAdvance;

			log.push({
				stageId: stage.id,
				amountKopecks: toAllocateAdvance,
				reason: `Списание с авансового депозита этапа №${stage.stageNumber} "${stage.title}"`,
			});

			if (currentAdvancePaid >= stage.advanceRequiredKopecks && currentStatus === "draft") {
				currentStatus = "advance_paid";
			}
		}

		// 2. Если аванс закрыт, а этап уже принят по акту, покрываем остаток
		const unpaidTotal = Math.max(
			0,
			stage.totalKopecks - (currentAdvancePaid + currentCompletionPaid),
		);

		if (unpaidTotal > 0 && available > 0 && (currentStatus === "act_completed" || currentStatus === "advance_paid" || currentStatus === "in_progress")) {
			const toAllocateRemaining = Math.min(available, unpaidTotal);
			available -= toAllocateRemaining;
			currentCompletionPaid += toAllocateRemaining;

			log.push({
				stageId: stage.id,
				amountKopecks: toAllocateRemaining,
				reason: `Списание с депозита в счет окончательного расчета этапа №${stage.stageNumber} "${stage.title}"`,
			});

			if (currentAdvancePaid + currentCompletionPaid >= stage.totalKopecks) {
				currentStatus = currentStatus === "act_completed" ? "fully_paid" : currentStatus;
			}
		}

		return {
			...stage,
			advancePaidKopecks: currentAdvancePaid,
			escrowLockedKopecks: 0,
			completionPaidKopecks: currentCompletionPaid,
			status: currentStatus,
		};
	});

	const updatedDeposit: PatientDepositWallet = {
		patientId: deposit.patientId,
		availableDepositKopecks: available,
		lockedEscrowKopecks: 0,
		totalBalanceKopecks: available,
	};

	return {
		updatedStages,
		updatedDeposit,
		allocatedLog: log,
	};
}
