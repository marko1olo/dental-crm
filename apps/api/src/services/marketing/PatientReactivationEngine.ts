export type ReactivationRisk = "low" | "medium" | "high" | "critical";

export interface ChurnScoreResult {
	churnRiskScore: number;
	riskCategory: ReactivationRisk;
	triggerReasons: string[];
}

export class PatientReactivationEngine {
	/**
	 * Чистый расчет скоринга вероятности оттока и триггеров реактивации
	 */
	public static calculateChurnScore(params: {
		monthsSinceLastHygiene?: number;
		hasUnfinishedTreatmentPlan?: boolean;
		monthsSinceLastVisit?: number;
	}): ChurnScoreResult {
		let score = 0;
		const triggerReasons: string[] = [];

		if (params.monthsSinceLastHygiene !== undefined && params.monthsSinceLastHygiene >= 6) {
			score += 40;
			triggerReasons.push("Профгигиена не проводилась более 6 месяцев");
		}

		if (params.hasUnfinishedTreatmentPlan) {
			score += 30;
			triggerReasons.push("Незавершенный план лечения (ожидает санации/ортопедии)");
		}

		if (params.monthsSinceLastVisit !== undefined && params.monthsSinceLastVisit >= 12) {
			score += 30;
			triggerReasons.push("Контрольный профилактический осмотр не проводился более 12 месяцев");
		}

		const churnRiskScore = Math.min(score, 100);
		let riskCategory: ReactivationRisk = "low";
		if (churnRiskScore >= 80) riskCategory = "critical";
		else if (churnRiskScore >= 60) riskCategory = "high";
		else if (churnRiskScore >= 30) riskCategory = "medium";

		return {
			churnRiskScore,
			riskCategory,
			triggerReasons,
		};
	}
}
