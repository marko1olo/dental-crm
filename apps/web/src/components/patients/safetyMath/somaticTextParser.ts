import { isNegativeAllergyStatement } from "../../../utils/somaticNorm";
import { DEFAULT_SOMATIC_HEALTHY_NORM } from "./somaticDefaults";
import type { PatientClinicalSafetyProfile, PregnancyTrimester } from "./types";

export function parseSafetyProfileFromText(text?: string | null | undefined): PatientClinicalSafetyProfile {
	const raw = (text ?? "").toLowerCase();
	if (!raw.trim() || isNegativeAllergyStatement(raw)) {
		return { ...DEFAULT_SOMATIC_HEALTHY_NORM, pregnancyTrimester: "none" };
	}

	let pregnancyTrimester: PregnancyTrimester = "none";
	if (raw.includes("беременн") || raw.includes("лактац") || raw.includes("триместр") || raw.includes("гв")) {
		if (raw.includes("1 триместр") || raw.includes("1-й триместр")) pregnancyTrimester = "trimester_1";
		else if (raw.includes("3 триместр") || raw.includes("3-й триместр")) pregnancyTrimester = "trimester_3";
		else if (raw.includes("лактац") || raw.includes("гв")) pregnancyTrimester = "lactation";
		else pregnancyTrimester = "trimester_2";
	}

	const hasSevereHypertension = raw.includes("аг 3") || raw.includes("гб 3") || raw.includes("3 стад") || raw.includes("криз") || raw.includes("180/") || raw.includes("190/");
	const hasHypertension = hasSevereHypertension || raw.includes("гипертон") || raw.includes("гипертенз") || raw.includes("давлен") || raw.includes(" гб") || raw.includes(" аг");
	const hasThyrotoxicosis = raw.includes("тиреотоксикоз") || raw.includes("гипертиреоз") || raw.includes("токсический зоб");
	const takesBetaBlockers = raw.includes("бета-блокатор") || raw.includes("бисопролол") || raw.includes("конкор") || raw.includes("анаприлин") || raw.includes("метопролол");
	const hasIhd = raw.includes("ибс") || raw.includes("стенокард") || raw.includes("инфаркт");
	const hasArrhythmia = raw.includes("аритми") || raw.includes("тахикарди");
	const hasCardio = hasHypertension || hasSevereHypertension || hasThyrotoxicosis || takesBetaBlockers || hasIhd || hasArrhythmia;

	return {
		hasArticaineAllergy: raw.includes("артикаин") || raw.includes("ультракаин") || raw.includes("септанест"),
		hasLidocaineAllergy: raw.includes("лидокаин") || raw.includes("ксилокаин"),
		hasMepivacaineAllergy: raw.includes("мепивакаин") || raw.includes("скандонест"),
		hasEsterAnestheticsAllergy: raw.includes("новокаин") || raw.includes("прокаин") || raw.includes("анестезин"),
		hasSulfiteAllergy: raw.includes("сульфит") || raw.includes("метабисульфит"),
		hasPacemakerExs: raw.includes("кардиостимулятор") || /(^|[^а-яёa-z0-9])экс([^а-яёa-z0-9]|$)/i.test(raw) || raw.includes("пейсмейкер"),
		takesBisphosphonates: raw.includes("бисфосфонат") || raw.includes("акласта") || raw.includes("зомета") || raw.includes("бонвива") || raw.includes("пролиа") || raw.includes("mronj") || raw.includes("бонч"),
		takesAnticoagulants: raw.includes("варфарин") || raw.includes("ксарелто") || raw.includes("эликвис") || raw.includes("прадакса") || raw.includes("плавикс") || raw.includes("тромбо асс") || raw.includes("антикоагулянт"),
		pregnancyTrimester,
		hasCardiovascularDisease: hasCardio,
		hasHypertension,
		hasSevereHypertensionStage3: hasSevereHypertension,
		hasThyrotoxicosis,
		takesBetaBlockers,
		hasIhd,
		hasArrhythmia,
		hasDiabetesMellitus: raw.includes("диабет") || raw.includes("инсулин"),
		hasBronchialAsthma: raw.includes("астма") || raw.includes("бронхиальн"),
		hasEpilepsy: raw.includes("эпилепс") || raw.includes("судорог"),
		hasHepatitis: raw.includes("гепатит"),
		hasHiv: raw.includes("вич") || raw.includes("спид"),
		hasPenicillinAllergy: raw.includes("пенициллин") || raw.includes("амоксициллин") || raw.includes("амоксиклав") || raw.includes("аугментин"),
		hasLatexAllergy: raw.includes("латекс"),
		hasNsaidAllergy: raw.includes("нпвп") || raw.includes("нпвс") || raw.includes("аспирин") || raw.includes("кеторол") || raw.includes("ибупрофен") || raw.includes("диклофенак") || raw.includes("аспириновая астма"),
		hasIodineAllergy: raw.includes("йод") || raw.includes("йодоформ") || raw.includes("бетадин"),
		customChronicNotes: text ? text : undefined,
	};
}
