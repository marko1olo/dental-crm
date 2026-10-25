/**
 * @dental/shared/anesthesia/calculator/somaticAdjusterModules/somaticRiskProfileParser.ts
 * Somatic anamnesis risk profile parser (Mandate 8b, <= 120 lines)
 */

import type { SomaticRiskProfile } from "../types.js";

function parseTrimester(raw: string, isPregnant: boolean): SomaticRiskProfile["pregnancyTrimester"] {
	if (!isPregnant) return "none";
	if (raw.includes("1 триместр") || raw.includes("1-й триместр") || raw.includes("первый триместр")) return "trimester_1";
	if (raw.includes("2 триместр") || raw.includes("2-й триместр") || raw.includes("второй триместр")) return "trimester_2";
	if (raw.includes("3 триместр") || raw.includes("3-й триместр") || raw.includes("третий триместр")) return "trimester_3";
	if (raw.includes("лактац") || raw.includes("гв") || raw.includes("кормлен")) return "lactation";
	return "trimester_2";
}

export function extractSomaticRiskProfileFromText(text?: string | null | undefined): SomaticRiskProfile {
	const raw = (text ?? "").toLowerCase();
	if (!raw.trim()) return {};

	const hasHypertension = raw.includes("гипертон") || raw.includes("гипертенз") || raw.includes("давлен") ||
		raw.includes("аг ") || raw.includes("аг,") || raw.includes("криз") ||
		/i1[0-5]/.test(raw);

	const hasIhd = raw.includes("ибс") || raw.includes("стенокард") || raw.includes("инфаркт") ||
		raw.includes("постинфаркт") || raw.includes("стентирован") || raw.includes("шунтирован") ||
		/i2[0-5]/.test(raw);

	const hasArrhythmia = raw.includes("аритми") || raw.includes("мерцательн") || raw.includes("экстрасистол") ||
		raw.includes("тахикарди") || raw.includes("фибрилляц") || raw.includes("пароксизм") ||
		raw.includes("блокад") || /i4[45789]/.test(raw);

	const hasSevereHypertension = raw.includes("аг 3") || raw.includes("аг iii") || raw.includes("3 стад") ||
		raw.includes("iii стад") || raw.includes("криз") || raw.includes("тяжелая гипертенз") || raw.includes("тяжелой гипертенз");

	const hasThyrotoxicosis = raw.includes("тиреотоксикоз") || raw.includes("гипертиреоз") ||
		raw.includes("базедов") || raw.includes("e05") || raw.includes("е05") || raw.includes("токсический зоб");

	const takesBetaBlockers = raw.includes("бета-блокатор") || raw.includes("бетаблокатор") ||
		raw.includes("бисопролол") || raw.includes("конкор") || raw.includes("анаприлин") ||
		raw.includes("пропранолол") || raw.includes("метопролол") || raw.includes("эгилок") ||
		raw.includes("соталол") || raw.includes("атенолол") || raw.includes("карведилол");

	const hasArticaineAllergy = (raw.includes("аллерг") || raw.includes("непереносим")) &&
		(raw.includes("артикаин") || raw.includes("ультракаин") || raw.includes("септанест") || raw.includes("убистезин"));

	const hasMepivacaineAllergy = (raw.includes("аллерг") || raw.includes("непереносим")) &&
		(raw.includes("мепивакаин") || raw.includes("скандонест") || raw.includes("мепивастезин"));

	const hasLidocaineAllergy = (raw.includes("аллерг") || raw.includes("непереносим")) &&
		(raw.includes("лидокаин") || raw.includes("новокаин") || raw.includes("ксилокаин"));

	const hasCardio = hasHypertension || hasSevereHypertension || hasIhd || hasArrhythmia ||
		hasThyrotoxicosis || takesBetaBlockers || raw.includes("сердеч") || raw.includes("кардио") ||
		raw.includes("пороком сердца") || raw.includes("хсн");

	const hasSulfite = raw.includes("сульфит") || raw.includes("дисульфит") || raw.includes("метабисульфит") ||
		raw.includes("пиросульфит") || raw.includes("е223") || raw.includes("e223") || raw.includes("консервант");

	const hasAsthma = raw.includes("астм") || raw.includes("бронхиальн") || raw.includes("сальбутамол") ||
		raw.includes("беродуал") || raw.includes("j45") || raw.includes("j46");

	const isPregnant = raw.includes("беременн") || raw.includes("лактац") || raw.includes("кормлен") ||
		raw.includes("гв") || raw.includes("триместр") || /z3[23459]/.test(raw);

	return {
		hasCardiovascularRisk: hasCardio,
		hasHypertension,
		hasSevereHypertensionStage3: hasSevereHypertension,
		hasIhd,
		hasArrhythmia,
		hasThyrotoxicosis,
		takesBetaBlockers,
		hasArticaineAllergy,
		hasMepivacaineAllergy,
		hasLidocaineAllergy,
		hasSulfiteAllergy: hasSulfite,
		hasBronchialAsthma: hasAsthma,
		isPregnantOrLactating: isPregnant,
		pregnancyTrimester: parseTrimester(raw, isPregnant),
		...(text ? { customNotes: text } : {}),
	};
}
