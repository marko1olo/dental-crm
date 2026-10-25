/**
 * @dental/shared/anesthesia/safetyModules/contraindicationsScreen.ts
 * Clinical contraindications screening (Mandate 8b, <= 120 lines)
 */

import { ANESTHESIA_DRUG_CATALOG } from "../catalog.js";
import type { AnestheticDrugId, PatientAnesthesiaProfile } from "../types.js";

export function screenPatientContraindications(
	profile: PatientAnesthesiaProfile,
	drugId: AnestheticDrugId,
): {
	isBlocked: boolean;
	blockingContraindications: string[];
	warnings: string[];
	recommendedAlternativeId?: AnestheticDrugId | undefined;
	recommendedAlternativeKey?: AnestheticDrugId | undefined;
} {
	const drug = ANESTHESIA_DRUG_CATALOG[drugId] || ANESTHESIA_DRUG_CATALOG.articaine_4_epi_100k;
	const blockingContraindications: string[] = [];
	const warnings: string[] = [];
	let recommendedAlternativeId: AnestheticDrugId | undefined = undefined;

	if (profile.takesMaoInhibitors && !drug.isAdrenalineFree) {
		blockingContraindications.push("БЛОКИРУЮЩЕЕ ПРОТИВОПОКАЗАНИЕ: Пациент принимает ингибиторы МАО. Препарат выбора — Мепивакаин 3%.");
		recommendedAlternativeId = "mepivacaine_3_plain";
	}

	if (profile.takesTricyclicAntidepressants) {
		if (drug.vasoconstrictorRatio === "1:100000") {
			blockingContraindications.push("БЛОКИРУЮЩЕЕ ПРЕДУПРЕЖДЕНИЕ: Пациент принимает трициклические антидепрессанты (ТЦА). Концентрация адреналина 1:100 000 противопоказана! Рекомендуется Мепивакаин 3%.");
			recommendedAlternativeId = "mepivacaine_3_plain";
		} else if (!drug.isAdrenalineFree) {
			warnings.push("ВНИМАНИЕ (ТЦА): Прием трициклических антидепрессантов потенцирует действие адреналина. Макс. 0.04 мг адреналина.");
		}
	}

	if (profile.hasThyrotoxicosis && !drug.isAdrenalineFree) {
		blockingContraindications.push("БЛОКИРУЮЩЕЕ ПРОТИВОПОКАЗАНИЕ: Декомпенсированный тиреотоксикоз. Препарат выбора — Мепивакаин 3%.");
		recommendedAlternativeId = "mepivacaine_3_plain";
	}

	if (profile.hasCardiacArrhythmia) {
		if (drug.vasoconstrictorRatio === "1:100000") {
			blockingContraindications.push("БЛОКИРУЮЩЕЕ ПРЕДУПРЕЖДЕНИЕ: Тяжелые нарушения ритма сердца. Анестетики 1:100 000 противопоказаны! Рекомендуется Мепивакаин 3%.");
			recommendedAlternativeId = "mepivacaine_3_plain";
		} else if (!drug.isAdrenalineFree) {
			warnings.push("КАРДИОРИСК: Нарушение ритма сердца. Доза адреналина лимитирована 0.04 мг.");
		}
	}

	if (drug.containsSulfites && (profile.hasSulfiteAllergy || profile.hasBronchialAsthma)) {
		blockingContraindications.push("БЛОКИРУЮЩЕЕ ПРОТИВОПОКАЗАНИЕ: Препарат содержит метабисульфит натрия (E223) — риск аллергии и бронхоспазма. Препарат выбора — Мепивакаин 3%.");
		recommendedAlternativeId = "mepivacaine_3_plain";
	}

	const isSevereHypertension =
		(typeof profile.bpSystolic === "number" && profile.bpSystolic >= 180) ||
		(typeof profile.bpDiastolic === "number" && profile.bpDiastolic >= 110);

	if (isSevereHypertension && !drug.isAdrenalineFree) {
		blockingContraindications.push(`БЛОКИРУЮЩЕЕ ПРЕДУПРЕЖДЕНИЕ: Неконтролируемая гипертензия (${profile.bpSystolic ?? 180}/${profile.bpDiastolic ?? 110}). Запрещены вазоконстрикторы — применять Мепивакаин 3%.`);
		recommendedAlternativeId = "mepivacaine_3_plain";
	}

	if (typeof profile.heartRateBpm === "number" && profile.heartRateBpm > 100 && !drug.isAdrenalineFree) {
		warnings.push(`ТАХИКАРДИЯ (${profile.heartRateBpm} уд/мин): Риск аритмии при введении адреналина. Рекомендуется Мепивакаин 3%.`);
	}

	if (profile.hasPheochromocytoma && !drug.isAdrenalineFree) {
		blockingContraindications.push("БЛОКИРУЮЩЕЕ ПРОТИВОПОКАЗАНИЕ: Феохромоцитома. Вазоконстрикторы абсолютно противопоказаны!");
		recommendedAlternativeId = "mepivacaine_3_plain";
	}

	if (profile.hasGlaucoma && !drug.isAdrenalineFree) {
		warnings.push("ВНИМАНИЕ: Закрытоугольная глаукома. Опасность повышения внутриглазного давления.");
	}

	if (profile.hasAmideAllergy) {
		blockingContraindications.push("КРИТИЧЕСКАЯ АЛЛЕРГИЯ: Анамнез аллергических реакций на амидные анестетики.");
	}

	if (profile.isPregnantOrLactating && drug.vasoconstrictorRatio === "1:100000") {
		warnings.push("БЕРЕМЕННОСТЬ: Концентрация адреналина 1:100 000 может вызывать спазм маточных сосудов. Предпочтителен Артикаин 1:200 000.");
	}

	if (profile.hasSevereLiverDisease && drugId === "mepivacaine_3_plain") {
		warnings.push("ПЕЧЕНОЧНАЯ НЕДОСТАТОЧНОСТЬ: Мепивакаин метаболизируется в печени. Артикаин предпочтительнее.");
	}

	return {
		isBlocked: blockingContraindications.length > 0,
		blockingContraindications,
		warnings,
		recommendedAlternativeId,
		recommendedAlternativeKey: recommendedAlternativeId,
	};
}
