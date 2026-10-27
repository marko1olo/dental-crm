import { type AnestheticDrugInfo } from "../anesthesiaCatalog.js";
import type { AnesthesiaCalculationInput } from "./anesthesiaEngineTypes.js";

export function collectCardioRiskReasons(input: AnesthesiaCalculationInput): string[] {
	const reasons: (string | false | undefined)[] = [
		input.hasCardiovascularRisk && "сердечно-сосудистая патология",
		input.hasIschemicHeartDisease && "ИБС",
		input.hasMyocardialInfarctionHistory && "инфаркт миокарда в анамнезе",
		input.hasHypertension && "артериальная гипертония",
		input.hasCardiacArrhythmia && "аритмия",
		input.asaStatus === "asa_3" && "статус ASA III",
		input.asaStatus === "asa_4" && "статус ASA IV",
	];
	return reasons.filter((r): r is string => Boolean(r));
}

export interface EvaluatedSafetyAdvisory {
	cardioRiskReasons: string[];
	isCardioRisk: boolean;
	contraindicationsTriggered: string[];
	warnings: string[];
	isOverdose: boolean;
	isEpinephrineOverdose: boolean;
}

export function evaluateSafetyAdvisories(
	input: AnesthesiaCalculationInput,
	drug: AnestheticDrugInfo,
	metrics: {
		injectedActiveMg: number;
		maxSafeActiveMg: number;
		injectedEpinephrineMg: number;
		maxSafeEpinephrineMg: number;
	},
): EvaluatedSafetyAdvisory {
	const cardioRiskReasons = collectCardioRiskReasons(input);
	const isCardioRisk = cardioRiskReasons.length > 0;
	const isOverdose = metrics.injectedActiveMg > metrics.maxSafeActiveMg;
	const isEpinephrineOverdose =
		!drug.isAdrenalineFree &&
		metrics.injectedEpinephrineMg > metrics.maxSafeEpinephrineMg;

	const contraindicationsTriggered: string[] = [];
	const warnings: string[] = [];

	if (
		drug.containsSulfites &&
		(input.hasSulfiteAllergy || input.hasBronchialAsthma)
	) {
		contraindicationsTriggered.push(
			"Препарат содержит сульфиты. Рекомендован Мепивакаин 3% (Скандонест) без адреналина.",
		);
	}
	if (!drug.isAdrenalineFree && input.asaStatus === "asa_4") {
		warnings.push(
			"Статус ASA IV: рекомендован Мепивакаин 3% без адреналина.",
		);
	}
	if (isCardioRisk && drug.vasoconstrictorRatio === "1:100000") {
		warnings.push(
			`Кардио-профиль (${cardioRiskReasons.join(", ")}): рекомендован Артикаин 1:200 000 или Скандонест 3%.`,
		);
	}
	if (input.isPregnantOrLactating && drug.vasoconstrictorRatio === "1:100000") {
		warnings.push(
			"Беременность / Лактация: предпочтителен Артикаин 1:200 000 или Скандонест 3%.",
		);
	}
	if (isEpinephrineOverdose) {
		warnings.push(
			`Превышен кардиоваскулярный ориентир адреналина (${metrics.injectedEpinephrineMg.toFixed(3)} мг > ${metrics.maxSafeEpinephrineMg.toFixed(3)} мг).`,
		);
	}
	if (isOverdose) {
		warnings.push(
			`Превышение максимальной суточной дозы (${metrics.injectedActiveMg} мг > ${metrics.maxSafeActiveMg} мг).`,
		);
	}

	return {
		cardioRiskReasons,
		isCardioRisk,
		contraindicationsTriggered,
		warnings,
		isOverdose,
		isEpinephrineOverdose,
	};
}
