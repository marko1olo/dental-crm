export interface IndicatorEvaluationResult {
	status: "passed" | "failed_quarantine";
	isQuarantineRequired: boolean;
	rationale: string;
}

export interface CycleValidationResult {
	isValid: boolean;
	errors: string[];
}

export class AutoclaveChemicalIndicatorService {
	/**
	 * Оценка результатов химического индикатора / PCD теста по СанПиН 3.3686-21
	 */
	public static evaluateIndicator(
		indicatorType: "class_4" | "class_5" | "class_6" | "helix_pcd" | "bowie_dick",
		colorChangeVerified: boolean,
	): IndicatorEvaluationResult {
		if (!colorChangeVerified) {
			return {
				status: "failed_quarantine",
				isQuarantineRequired: true,
				rationale: `Химический индикатор (${indicatorType}) не подтвердил достижение критических параметров стерилизации. Вся партия лотков переведена в карантин (FAILED_QUARANTINE) и подлежит повторной предстерилизационной очистке и стерилизации.`,
			};
		}

		return {
			status: "passed",
			isQuarantineRequired: false,
			rationale: `Химический индикатор (${indicatorType}) успешно валидирован. Партия инструментов допущена к клиническому приему.`,
		};
	}

	/**
	 * Проверка параметров режима B-класса (134°C / 2.1 bar 5 мин либо 121°C / 1.1 bar 20 мин)
	 */
	public static validateBClassCycle(
		tempCelsius: number,
		pressureBar: number,
		holdingTimeMinutes: number,
	): CycleValidationResult {
		const errors: string[] = [];

		if (tempCelsius >= 134) {
			if (pressureBar < 2.05) {
				errors.push(`Давление (${pressureBar} bar) ниже нормы для режима 134°C (мин. 2.05 bar).`);
			}
			if (holdingTimeMinutes < 5) {
				errors.push(`Время стерилизационной выдержки (${holdingTimeMinutes} мин) меньше нормы (мин. 5 мин).`);
			}
		} else if (tempCelsius >= 121) {
			if (pressureBar < 1.05) {
				errors.push(`Давление (${pressureBar} bar) ниже нормы для режима 121°C (мин. 1.05 bar).`);
			}
			if (holdingTimeMinutes < 20) {
				errors.push(`Время стерилизационной выдержки (${holdingTimeMinutes} мин) меньше нормы (мин. 20 мин).`);
			}
		} else {
			errors.push(`Температура стерилизации (${tempCelsius}°C) ниже минимального порога 121°C.`);
		}

		return {
			isValid: errors.length === 0,
			errors,
		};
	}
}
