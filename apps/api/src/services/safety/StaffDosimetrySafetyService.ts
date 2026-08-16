export const ANNUAL_DOSE_LIMIT_MSV = 20.0;
export const MONTHLY_DOSE_WARNING_MSV = 1.5;

export const DOSE_PER_TYPE_MSV = {
	periapical: 0.003, // Прицельный снимок на визиографе
	opg: 0.02, // Ортопантомограмма (ОПТГ)
	cbct: 0.05, // КЛКТ конусно-лучевая томография
};

export type DosimetryStatus = "normal" | "monthly_warning" | "annual_limit_exceeded";

export interface ExposureEvaluationResult {
	status: DosimetryStatus;
	isSuspended: boolean;
	annualDoseMsv: number;
	monthlyDoseMsv: number;
	rationale: string;
}

export class StaffDosimetrySafetyService {
	/**
	 * Расчет суммарной дозы по количеству выполненных рентген-снимков
	 */
	public static calculateShotsDose(shots: {
		periapicalCount?: number;
		opgCount?: number;
		cbctCount?: number;
	}): number {
		const periapical = (shots.periapicalCount ?? 0) * DOSE_PER_TYPE_MSV.periapical;
		const opg = (shots.opgCount ?? 0) * DOSE_PER_TYPE_MSV.opg;
		const cbct = (shots.cbctCount ?? 0) * DOSE_PER_TYPE_MSV.cbct;

		return Number((periapical + opg + cbct).toFixed(4));
	}

	/**
	 * Оценка радиационной безопасности сотрудника по СанПиН 2.6.1.1192-03
	 */
	public static evaluateExposureRisk(
		annualDoseMsv: number,
		monthlyDoseMsv: number,
	): ExposureEvaluationResult {
		if (annualDoseMsv >= ANNUAL_DOSE_LIMIT_MSV) {
			return {
				status: "annual_limit_exceeded",
				isSuspended: true,
				annualDoseMsv,
				monthlyDoseMsv,
				rationale: `Превышен предельный годовой лимит облучения персонала группы А (${annualDoseMsv} мЗв >= ${ANNUAL_DOSE_LIMIT_MSV} мЗв по СанПиН 2.6.1.1192-03). Сотрудник временно отстранен от работы с источниками ИИИ.`,
			};
		}

		if (monthlyDoseMsv >= MONTHLY_DOSE_WARNING_MSV) {
			return {
				status: "monthly_warning",
				isSuspended: false,
				annualDoseMsv,
				monthlyDoseMsv,
				rationale: `Внимание: месячная доза облучения (${monthlyDoseMsv} мЗв) превысила порог раннего предупреждения (${MONTHLY_DOSE_WARNING_MSV} мЗв). Рекомендуется аудит средств индивидуальной защиты и барьерных экранов.`,
			};
		}

		return {
			status: "normal",
			isSuspended: false,
			annualDoseMsv,
			monthlyDoseMsv,
			rationale: "Дозовые нагрузки находятся в пределах санитарных норм радиационной безопасности.",
		};
	}
}
