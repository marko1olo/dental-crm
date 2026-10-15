import { parseDateOnly, toIsoDate } from "./labDateUtils";

export interface FittingCollisionGuardResult {
	readonly hasCollision: boolean;
	readonly warningRu: string | null;
	readonly daysGap: number;
	readonly deadlineDateIso: string;
	readonly scheduledVisitDateIso: string | null;
}

/**
 * Защита от коллизий визита примерки и срока готовности ЗТЛ:
 * Если визит на примерку/фиксацию в расписании назначен РАНЬШЕ расчетного срока готовности ЗТЛ,
 * формируется тревожное предупреждение: «Внимание: прием на примерку назначен раньше готовности лаборатории!».
 */
export function checkFittingAppointmentCollision(
	deadlineDate?: string | Date | null,
	scheduledVisitDate?: string | Date | null,
): FittingCollisionGuardResult {
	if (!deadlineDate) {
		return {
			hasCollision: false,
			warningRu: null,
			daysGap: 0,
			deadlineDateIso: "",
			scheduledVisitDateIso: null,
		};
	}
	const deadline = parseDateOnly(deadlineDate);
	const deadlineIso = toIsoDate(deadline);
	if (!scheduledVisitDate) {
		return {
			hasCollision: false,
			warningRu: null,
			daysGap: 0,
			deadlineDateIso: deadlineIso,
			scheduledVisitDateIso: null,
		};
	}
	const visit = parseDateOnly(scheduledVisitDate);
	const visitIso = toIsoDate(visit);
	const diffMs = deadline.getTime() - visit.getTime();
	const daysGap = Math.round(diffMs / (1000 * 60 * 60 * 24));
	const hasCollision = daysGap > 0;

	return {
		hasCollision,
		warningRu: hasCollision
			? `Внимание: прием на примерку назначен раньше готовности лаборатории! (дефицит: ${daysGap} дн., готовность: ${deadlineIso}, визит: ${visitIso})`
			: null,
		daysGap: hasCollision ? daysGap : 0,
		deadlineDateIso: deadlineIso,
		scheduledVisitDateIso: visitIso,
	};
}
