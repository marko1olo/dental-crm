import { INJECTION_TECHNIQUES, type AnestheticDrugInfo } from '../anesthesiaCatalog.js';
import type { AnesthesiaCalculationInput } from './anesthesiaEngineTypes.js';

export interface EvaluatedSafetyAdvisory {
	cardioRiskReasons: string[];
	isCardioRisk: boolean;
	contraindicationsTriggered: string[];
	warnings: string[];
	isOverdose: boolean;
	isEpinephrineOverdose: boolean;
}

/**
 * evaluateSafetyAdvisories — Clinical Safety Guidance (Non-Blocking, Mandate 8e/8y)
 */
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
	const cardioRiskReasons: string[] = [];
	if (input.hasCardiovascularRisk) cardioRiskReasons.push('сердечно-сосудистая патология');
	if (input.hasIschemicHeartDisease) cardioRiskReasons.push('ИБС');
	if (input.hasMyocardialInfarctionHistory) cardioRiskReasons.push('инфаркт миокарда в анамнезе');
	if (input.hasHypertension) cardioRiskReasons.push('артериальная гипертония');
	if (typeof input.bpSystolic === 'number' && input.bpSystolic >= 140)
		cardioRiskReasons.push(`систолическое АД ${input.bpSystolic} мм рт. ст.`);
	if (typeof input.bpDiastolic === 'number' && input.bpDiastolic >= 90)
		cardioRiskReasons.push(`ДАД ${input.bpDiastolic} мм рт. ст.`);
	if (input.hasCardiacArrhythmia) cardioRiskReasons.push('аритмия');
	if (typeof input.heartRateBpm === 'number' && input.heartRateBpm > 90)
		cardioRiskReasons.push(`тахикардия ${input.heartRateBpm} уд/мин`);
	if (input.takesBetaBlockers) cardioRiskReasons.push('прием бета-блокаторов');
	if (input.takesTricyclicAntidepressants) cardioRiskReasons.push('прием ТЦА');
	if (input.asaStatus === 'asa_3') cardioRiskReasons.push('статус ASA III');
	if (input.asaStatus === 'asa_4') cardioRiskReasons.push('статус ASA IV');

	const isCardioRisk = cardioRiskReasons.length > 0;
	const isOverdose = metrics.injectedActiveMg > metrics.maxSafeActiveMg;
	const isEpinephrineOverdose =
		!drug.isAdrenalineFree && metrics.injectedEpinephrineMg > metrics.maxSafeEpinephrineMg;

	const contraindicationsTriggered: string[] = [];
	const warnings: string[] = [];

	if (drug.containsSulfites && (input.hasSulfiteAllergy || input.hasBronchialAsthma)) {
		contraindicationsTriggered.push(
			'Препарат содержит сульфиты (E223). Рекомендован Скандонест 3% (Мепивакаин без адреналина).'
		);
	}
	if (!drug.isAdrenalineFree && input.asaStatus === 'asa_4') {
		warnings.push('Статус ASA IV: рекомендован Мепивакаин без адреналина либо стационарное пособие.');
	}
	if (input.takesMaoInhibitors && !drug.isAdrenalineFree) {
		warnings.push('Прием ингибиторов МАО: рекомендован Мепивакаин 3% (Скандонест) без вазоконстриктора.');
	}
	if (input.hasThyrotoxicosis && !drug.isAdrenalineFree) {
		warnings.push('Тиреотоксикоз: рекомендован Мепивакаин 3% (Скандонест) без вазоконстриктора.');
	}
	if (drug.id === 'bupivacaine_05' && input.patientAgeYears < 12) {
		warnings.push('Бупивакаин не рекомендуется детям до 12 лет.');
	}
	if (input.isPregnantOrLactating && drug.vasoconstrictorRatio === '1:100000') {
		warnings.push('Беременность / Лактация: предпочтительнее Артикаин 1:200 000 или Скандонест.');
	}
	if (isCardioRisk && drug.vasoconstrictorRatio === '1:100000') {
		warnings.push(
			`Кардио-риск (${cardioRiskReasons.join(', ')}): рекомендован Артикаин 1:200 000 или Скандонест.`
		);
	}
	if (input.takesBetaBlockers && !drug.isAdrenalineFree) {
		warnings.push('Бета-блокаторы: рекомендован Мепивакаин 3% (Скандонест без адреналина).');
	}
	if (isEpinephrineOverdose) {
		warnings.push(
			`Превышен кардио-лимит адреналина (${metrics.injectedEpinephrineMg.toFixed(3)} мг > ${metrics.maxSafeEpinephrineMg.toFixed(3)} мг).`
		);
	}
	if (isOverdose) {
		warnings.push(
			`Превышена рекомендуемая доза (${metrics.injectedActiveMg} мг > ${metrics.maxSafeActiveMg} мг).`
		);
	}
	if (!input.aspirationNegativeConfirmed && INJECTION_TECHNIQUES[input.techniqueId]?.aspirationCheckMandatory) {
		warnings.push('Аспирационная проба рекомендуется перед введением проводниковой анестезии.');
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
