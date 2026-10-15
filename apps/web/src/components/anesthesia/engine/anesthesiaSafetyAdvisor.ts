import {
	INJECTION_TECHNIQUES,
	type AnestheticDrugInfo,
} from '../anesthesiaCatalog';
import type { AnesthesiaCalculationInput } from './anesthesiaEngineTypes';

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
	}
): EvaluatedSafetyAdvisory {
	const cardioRiskReasons: string[] = [];
	if (input.hasCardiovascularRisk) cardioRiskReasons.push('сердечно-сосудистая патология');
	if (input.hasIschemicHeartDisease) cardioRiskReasons.push('ИБС');
	if (input.hasMyocardialInfarctionHistory) cardioRiskReasons.push('инфаркт миокарда в анамнезе');
	if (input.hasHypertension) cardioRiskReasons.push('артериальная гипертония II-III ст.');
	if (typeof input.bpSystolic === 'number' && input.bpSystolic >= 140)
		cardioRiskReasons.push(`систолическая гипертензия (АД ${input.bpSystolic} мм рт. ст.)`);
	if (typeof input.bpDiastolic === 'number' && input.bpDiastolic >= 90)
		cardioRiskReasons.push(`диастолическая гипертензия (ДАД ${input.bpDiastolic} мм рт. ст.)`);
	if (input.hasCardiacArrhythmia) cardioRiskReasons.push('нарушения сердечного ритма');
	if (typeof input.heartRateBpm === 'number' && input.heartRateBpm > 90)
		cardioRiskReasons.push(`тахикардия (ЧСС ${input.heartRateBpm} уд/мин)`);
	if (input.takesBetaBlockers) cardioRiskReasons.push('прием бета-блокаторов');
	if (input.takesTricyclicAntidepressants) cardioRiskReasons.push('прием трициклических антидепрессантов (ТЦА)');
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
			'ПРЕПАРАТ СОДЕРЖИТ СУЛЬФИТЫ (метабисульфит натрия E223). Противопоказан при бронхиальной астме и аллергии на сульфиты! Рекомендуется Скандонест 3% (Мепивакаин).'
		);
	}
	if (!drug.isAdrenalineFree && input.asaStatus === 'asa_4') {
		contraindicationsTriggered.push(
			'КРИТИЧЕСКИЙ РИСК: При ASA IV адреналинсодержащие анестетики противопоказаны для планового амбулаторного приема.'
		);
	}
	if (input.takesMaoInhibitors && !drug.isAdrenalineFree) {
		contraindicationsTriggered.push(
			'БЛОКИРУЮЩЕЕ ПРОТИВОПОКАЗАНИЕ: Пациент принимает ингибиторы МАО. Вазоконстрикторы абсолютно противопоказаны (риск гипертонического криза). Препарат выбора — Мепивакаин 3% (Скандонест).'
		);
	}
	if (input.hasThyrotoxicosis && !drug.isAdrenalineFree) {
		contraindicationsTriggered.push(
			'БЛОКИРУЮЩЕЕ ПРОТИВОПОКАЗАНИЕ: Декомпенсированный тиреотоксикоз. Адреналинсодержащие анестетики противопоказаны (риск фибрилляции желудочков). Препарат выбора — Мепивакаин 3% (Скандонест).'
		);
	}
	if (drug.id === 'bupivacaine_05') {
		if (input.patientAgeYears < 12) {
			contraindicationsTriggered.push(
				'Бупивакаин (Маркаин) строго противопоказан детям до 12 лет из-за высокой кардиотоксичности!'
			);
		}
		if (input.hasCardiacArrhythmia) {
			contraindicationsTriggered.push(
				'Бупивакаин (Маркаин) противопоказан при нарушениях сердечного ритма (высокая аритмогенность и кардиотоксичность)!'
			);
		}
	}
	if (input.isPregnantOrLactating && drug.vasoconstrictorRatio === '1:100000') {
		warnings.push(
			'Беременность / Лактация: предпочтительнее Артикаин 1:200 000 (Ультракаин Д-С) или Мепивакаин без адреналина.'
		);
	}
	if (isCardioRisk && drug.vasoconstrictorRatio === '1:100000') {
		warnings.push(
			`Кардиоваскулярный риск (${cardioRiskReasons.join(', ')}): Высокая концентрация адреналина 1:100 000 не рекомендуется при ССЗ! Строгий лимит адреналина 0.04 мг (максимум 2 карпулы 1:100k или 4 карпулы 1:200k). Препарат первого выбора при кардио-рисках — Мепивакаин 3% без вазоконстриктора (Скандонест/Мепивастезин).`
		);
	}
	if (input.takesBetaBlockers && !drug.isAdrenalineFree) {
		warnings.push(
			'ВНИМАНИЕ: Пациент принимает бета-блокаторы! Риск тяжелого гипертонического криза и рефлекторной брадикардии при взаимодействии с адреналином. Препарат выбора — Мепивакаин 3% без вазоконстриктора (Скандонест).'
		);
	}
	if (isEpinephrineOverdose) {
		warnings.push(
			`Превышен кардиоваскулярный лимит адреналина (${metrics.injectedEpinephrineMg.toFixed(3)} мг > ${metrics.maxSafeEpinephrineMg.toFixed(3)} мг). Риск тахикардии, гипертонического криза, аритмии!`
		);
	}
	if (isOverdose) {
		warnings.push(
			`ПРЕВЫШЕНИЕ МАКСИМАЛЬНОЙ СУТОЧНОЙ ДОЗЫ (${metrics.injectedActiveMg} мг > ${metrics.maxSafeActiveMg} мг). Риск токсического действия анестетика (головокружение, судороги, угнетение дыхания)!`
		);
	}
	if (!input.aspirationNegativeConfirmed && INJECTION_TECHNIQUES[input.techniqueId]?.aspirationCheckMandatory) {
		warnings.push('Внимание: Аспирационная проба обязательна для проводниковых блокад перед введением полной дозы!');
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
