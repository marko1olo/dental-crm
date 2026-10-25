/**
 * @dental/shared/anesthesia/pkuDisposal/vitalsSafety.ts
 * Preoperative Vitals Assessment (Mandate 8b, <= 120 lines)
 */

import type { PreoperativeVitalsChecklist } from "../types.js";

/**
 * Оценивает соматическую безопасность пациента по предоперационным витальным показателям (АД, ЧСС, SpO2).
 */
export function evaluatePreoperativeVitalsSafety(vitals: PreoperativeVitalsChecklist): {
	isHemodynamicallyStable: boolean;
	isCrisis: boolean;
	warnings: string[];
	recommendedActionRu: string | null;
} {
	const warnings: string[] = [];
	let isCrisis = false;
	let isHemodynamicallyStable = true;
	let recommendedActionRu: string | null = null;

	const sys = vitals.bpSystolic;
	const dia = vitals.bpDiastolic;
	const hr = vitals.heartRateBpm;
	const spo2 = vitals.spo2Percent;

	if (typeof sys === "number" && typeof dia === "number") {
		if (sys >= 180 || dia >= 110) {
			isCrisis = true;
			isHemodynamicallyStable = false;
			warnings.push(
				`ГИПЕРТОНИЧЕСКИЙ КРИЗ: АД ${sys}/${dia} мм рт. ст. Плановое вмешательство отложить! Вазоконстрикторы абсолютно противопоказаны.`,
			);
			recommendedActionRu = "Отложить плановое вмешательство. Купировать криз. При неотложном приеме — только Мепивакаин 3%.";
		} else if (sys >= 160 || dia >= 100) {
			isHemodynamicallyStable = false;
			warnings.push(
				`АРТЕРИАЛЬНАЯ ГИПЕРТЕНЗИЯ II СТ.: АД ${sys}/${dia} мм рт. ст. Лимит адреналина строго <= 0.04 мг. Препарат выбора — Мепивакаин 3%.`,
			);
			if (!recommendedActionRu) {
				recommendedActionRu = "Рекомендуется Скандонест 3% (без адреналина) или Ультракаин Д-С 1:200k с мониторингом АД.";
			}
		} else if (sys <= 90 || dia <= 55) {
			warnings.push(
				`АРТЕРИАЛЬНАЯ ГИПОТОНИЯ: АД ${sys}/${dia} мм рт. ст. Риск ортостатического коллапса при быстром подъеме кресла.`,
			);
		}
	}

	if (typeof hr === "number") {
		if (hr > 100) {
			warnings.push(
				`ТАХИКАРДИЯ: ЧСС ${hr} уд/мин. Препарат выбора — Мепивакаин 3%.`,
			);
			if (!recommendedActionRu) {
				recommendedActionRu = "Использовать Мепивакаин 3% (Скандонест) без вазоконстриктора.";
			}
		} else if (hr < 50) {
			warnings.push(
				`ВЫРАЖЕННАЯ БРАДИКАРДИЯ: ЧСС ${hr} уд/мин. Исключить АВ-блокаду перед введением анестетиков амидного ряда.`,
			);
		}
	}

	if (typeof spo2 === "number") {
		if (spo2 < 92) {
			isHemodynamicallyStable = false;
			warnings.push(
				`ГИПОКСЕМИЯ: SpO2 ${spo2}%. Немедленная оксигенотерапия. Исключить бронхоспазм.`,
			);
		} else if (spo2 < 95) {
			warnings.push(
				`Умеренное снижение сатурации: SpO2 ${spo2}%. Рекомендуется контроль дыхания.`,
			);
		}
	}

	return {
		isHemodynamicallyStable,
		isCrisis,
		warnings,
		recommendedActionRu,
	};
}
