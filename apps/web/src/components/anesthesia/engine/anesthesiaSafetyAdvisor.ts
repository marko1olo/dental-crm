import {
	type AnestheticDrugInfo,
	INJECTION_TECHNIQUES,
} from "../anesthesiaCatalog.js";
import type { AnesthesiaCalculationInput } from "./anesthesiaEngineTypes.js";

export function collectCardioRiskReasons(
	input: AnesthesiaCalculationInput,
): string[] {
	const reasons: (string | false | undefined)[] = [
		input.hasCardiovascularRisk && "сердечно-сосудистая патология",
		input.hasIschemicHeartDisease && "ИБС",
		input.hasMyocardialInfarctionHistory && "инфаркт миокарда в анамнезе",
		input.hasHypertension && "артериальная гипертония",
		(input.bpSystolic ?? 0) >= 140 &&
			`систолическое АД ${input.bpSystolic} мм рт. ст.`,
		(input.bpDiastolic ?? 0) >= 90 && `ДАД ${input.bpDiastolic} мм рт. ст.`,
		input.hasCardiacArrhythmia && "аритмия",
		(input.heartRateBpm ?? 0) > 90 && `тахикардия ${input.heartRateBpm} уд/мин`,
		input.takesBetaBlockers && "прием бета-блокаторов",
		input.takesTricyclicAntidepressants && "прием ТЦА",
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
			"ПРЕПАРАТ СОДЕРЖИТ СУЛЬФИТЫ (метабисульфит E223). Рекомендован Скандонест 3% (Мепивакаин без адреналина).",
		);
	}
	if (!drug.isAdrenalineFree && input.asaStatus === "asa_4") {
		warnings.push(
			"Статус ASA IV: рекомендован Мепивакаин без адреналина либо стационарное пособие.",
		);
	}
	if (input.takesMaoInhibitors && !drug.isAdrenalineFree) {
		warnings.push(
			"Прием ингибиторов МАО: рекомендован Мепивакаин 3% (Скандонест) без вазоконстриктора.",
		);
	}
	if (input.hasThyrotoxicosis && !drug.isAdrenalineFree) {
		warnings.push(
			"Тиреотоксикоз: рекомендован Мепивакаин 3% (Скандонест) без вазоконстриктора.",
		);
	}
	if (drug.id === "bupivacaine_05" && input.patientAgeYears < 12) {
		warnings.push("Бупивакаин не рекомендуется детям до 12 лет.");
	}
	if (input.isPregnantOrLactating && drug.vasoconstrictorRatio === "1:100000") {
		warnings.push(
			"Беременность / Лактация: предпочтительнее Артикаин 1:200 000 или Скандонест.",
		);
	}
	if (isCardioRisk && drug.vasoconstrictorRatio === "1:100000") {
		warnings.push(
			`Кардио-риск (${cardioRiskReasons.join(", ")}): рекомендован Артикаин 1:200 000 или Скандонест.`,
		);
	}
	if (input.takesBetaBlockers && !drug.isAdrenalineFree) {
		warnings.push(
			"Бета-блокаторы: рекомендован Мепивакаин 3% (Скандонест без адреналина).",
		);
	}
	if (isEpinephrineOverdose) {
		warnings.push(
			`Превышен кардиоваскулярный лимит адреналина (${metrics.injectedEpinephrineMg.toFixed(3)} мг > ${metrics.maxSafeEpinephrineMg.toFixed(3)} мг).`,
		);
	}
	if (isOverdose) {
		warnings.push(
			`ПРЕВЫШЕНИЕ МАКСИМАЛЬНОЙ СУТОЧНОЙ ДОЗЫ (МРД): превышена рекомендуемая доза (${metrics.injectedActiveMg} мг > ${metrics.maxSafeActiveMg} мг).`,
		);
	}
	if (
		input.aspirationNegativeConfirmed === false &&
		INJECTION_TECHNIQUES[input.techniqueId]?.aspirationCheckMandatory
	) {
		warnings.push(
			"Аспирационная проба обязательна: проба не подтверждена перед введением проводниковой анестезии.",
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
