import type { StagePaymentStatus } from "../stagePaymentPresets.js";

/**
 * Валидация допустимости перехода между статусами этапа
 */
export function validateStageStateTransition(
	currentStatus: StagePaymentStatus,
	targetStatus: StagePaymentStatus,
): { allowed: boolean; reasonRu?: string } {
	if (currentStatus === targetStatus) {
		return { allowed: true };
	}

	const allowedTransitions: Record<StagePaymentStatus, readonly StagePaymentStatus[]> = {
		draft: ["advance_paid", "in_progress", "act_completed", "fully_paid", "refunded"],
		advance_paid: ["in_progress", "act_completed", "fully_paid", "refunded", "draft"],
		in_progress: ["act_completed", "fully_paid", "refunded", "advance_paid"],
		act_completed: ["fully_paid", "refunded"],
		fully_paid: ["refunded"],
		refunded: ["draft"],
	};

	const allowed = allowedTransitions[currentStatus]?.includes(targetStatus) ?? false;

	if (!allowed) {
		return {
			allowed: false,
			reasonRu: `Переход из статуса "${currentStatus}" в "${targetStatus}" запрещен нормативным регламентом.`,
		};
	}

	return { allowed: true };
}
