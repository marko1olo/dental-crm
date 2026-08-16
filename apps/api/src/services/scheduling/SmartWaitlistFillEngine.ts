export interface FreedSlotInfo {
	doctorId?: string;
	durationMinutes: number;
	startTime: Date;
}

export interface WaitlistCandidate {
	id: string;
	patientId: string;
	preferredDoctorId?: string;
	requestedDurationMinutes: number;
	urgency: "urgent_pain" | "standard";
	waitingSince: Date;
}

export interface RankedCandidateResult {
	candidate: WaitlistCandidate;
	matchScore: number;
	fitReason: string;
}

export class SmartWaitlistFillEngine {
	/**
	 * Ранжирование кандидатов из листа ожидания под освободившийся слот
	 */
	public static rankCandidates(
		slot: FreedSlotInfo,
		candidates: WaitlistCandidate[],
	): RankedCandidateResult[] {
		const results: RankedCandidateResult[] = [];

		for (const cand of candidates) {
			// Проверка вместимости по длительности приема
			if (cand.requestedDurationMinutes > slot.durationMinutes) {
				continue; // Пациент не поместится в окно
			}

			let score = 0;
			const reasons: string[] = [];

			// Приоритет острой боли
			if (cand.urgency === "urgent_pain") {
				score += 50;
				reasons.push("Острая боль (urgent_pain)");
			}

			// Совпадение по врачу
			if (slot.doctorId && cand.preferredDoctorId === slot.doctorId) {
				score += 30;
				reasons.push("Точное совпадение с лечащим врачом");
			}

			// Идеальное совпадение по длительности
			if (cand.requestedDurationMinutes === slot.durationMinutes) {
				score += 20;
				reasons.push("Идеальное заполнение длительности слота (100%)");
			}

			results.push({
				candidate: cand,
				matchScore: score,
				fitReason: reasons.join(", "),
			});
		}

		return results.sort((a, b) => b.matchScore - a.matchScore);
	}
}
