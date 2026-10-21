import { checkCandidateTimeOfDayFit } from "./smartSlotRecoveryUrgency";
import type {
	TimeOfDay,
	WaitlistEntryLike,
	WaitlistUrgency,
} from "./smartSlotRecoveryTypes";

export * from "./smartSlotRecoveryUrgency";

export function scoreCandidateWaitlist(params: {
	entry: WaitlistEntryLike;
	doctorId?: string | null;
	docSpecLower?: string | null;
	chairId?: string | null;
	timeOfDayCategory: TimeOfDay;
	slotDurationMinutes: number;
	waitingDays: number;
	urgency: WaitlistUrgency;
}): { score: number; rawScore: number; matchReasons: string[] } {
	const {
		entry, doctorId, docSpecLower, chairId,
		timeOfDayCategory, slotDurationMinutes, waitingDays, urgency,
	} = params;
	let score = 10;
	const matchReasons: string[] = [];

	if (doctorId && entry.preferredDoctorId && entry.preferredDoctorId === doctorId) {
		score += 35;
		matchReasons.push("Желаемый врач совпадает");
	} else if (!entry.preferredDoctorId) {
		score += 20;
		matchReasons.push("Любой врач клиники");
	} else if (docSpecLower && entry.treatmentCategory) {
		const c = entry.treatmentCategory.toLowerCase();
		if (c.includes(docSpecLower) || docSpecLower.includes(c)) {
			score += 15;
			matchReasons.push("Специализация врача совпадает");
		}
	}

	const timeFit = checkCandidateTimeOfDayFit(timeOfDayCategory, entry.preferredTimeRanges);
	if (timeFit.fits && timeFit.hasSpecificPreference) {
		score += 20;
		matchReasons.push(
			timeOfDayCategory === "morning"
				? "Утреннее время (желаемое)"
				: timeOfDayCategory === "afternoon"
					? "Дневное время (желаемое)"
					: "Вечернее время (желаемое)",
		);
	} else if (timeFit.fits) {
		score += 15;
		matchReasons.push("Время слота подходит");
	}

	const neededDur = entry.desiredDurationMinutes || (urgency === "acute_pain" ? 30 : urgency === "hygiene" || urgency === "ortho_endo" ? 60 : 30);
	if (slotDurationMinutes >= neededDur) {
		score += 15;
		matchReasons.push(`Слот ${slotDurationMinutes} мин подходит`);
	} else if (slotDurationMinutes >= 30 && neededDur - slotDurationMinutes <= 15) {
		score += 5;
		matchReasons.push(`Слот ${slotDurationMinutes} мин (экспресс)`);
	}

	if (urgency === "acute_pain") {
		score += 25;
		matchReasons.push("Острая боль (наивысший приоритет)");
	} else if (urgency === "ortho_endo") {
		score += 15;
		matchReasons.push("Продолжение орто/эндо");
	} else if (urgency === "hygiene") {
		score += 10;
		matchReasons.push("Профгигиена");
	} else {
		score += 5;
	}

	if (waitingDays >= 7) {
		score += 10;
		matchReasons.push(`Ожидает ${waitingDays} дн. (длительное ожидание)`);
	} else if (waitingDays >= 3) {
		score += 5;
		matchReasons.push(`Ожидает ${waitingDays} дн.`);
	} else if (waitingDays >= 1) {
		score += 2;
	}

	if (chairId) score += 5;

	return {
		score: Math.min(100, Math.max(0, Math.round(score))),
		rawScore: score,
		matchReasons,
	};
}
