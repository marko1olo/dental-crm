import {
	ImplantStabilityValidationError,
	DirectionalISQ,
	ISQMeasurementStatistics,
	ImplantStabilityService,
} from "./ImplantStabilityService.js";

/**
 * Стандарты классификации стабильности (ISQ):
 * < 60: Низкая стабильность (Двухэтапный протокол)
 * 60-70: Средняя стабильность (Одноэтапный протокол)
 * >= 70: Высокая стабильность (Немедленная нагрузка)
 */

export interface IsqProtocolClassification {
	readonly classification: "low" | "medium" | "high";
	readonly protocolRu: string;
	readonly descriptionRu: string;
}

export class ImplantIsqResonanceFrequencyService {
	public static readonly ISQ_LOW_THRESHOLD = 60;
	public static readonly ISQ_MEDIUM_THRESHOLD = 70;
	public static readonly STABILITY_DIP_WEEK_START = 3;
	public static readonly STABILITY_DIP_WEEK_END = 4;

	/**
	 * Определяет протокол на основе среднего значения ISQ.
	 */
	public static classifyIsqStability(averageIsq: number): IsqProtocolClassification {
		if (averageIsq < this.ISQ_LOW_THRESHOLD) {
			return {
				classification: "low",
				protocolRu: "Двухэтапный протокол",
				descriptionRu: "Заглубление имплантата, 3-4 месяца без нагрузки.",
			};
		}
		if (averageIsq < this.ISQ_MEDIUM_THRESHOLD) {
			return {
				classification: "medium",
				protocolRu: "Одноэтапный протокол",
				descriptionRu: "Установка с формирователем десны.",
			};
		}
		return {
			classification: "high",
			protocolRu: "Допуск к немедленной нагрузке",
			descriptionRu: "Immediate loading (при соблюдении торка и клинических условий).",
		};
	}

	/**
	 * Детектирует провал стабильности (Stability Dip) на 3-4 неделе.
	 * Сравнивает текущий замер с базовым (первичным) замером.
	 */
	public static detectStabilityDip(
		baselineIsq: number,
		currentIsq: number,
		weeksElapsed: number
	): boolean {
		const isWithinDipWindow =
			weeksElapsed >= this.STABILITY_DIP_WEEK_START &&
			weeksElapsed <= this.STABILITY_DIP_WEEK_END;

		// Снижение стабильности (Stability Dip)
		const isDip = currentIsq < baselineIsq;

		return isWithinDipWindow && isDip;
	}
}
