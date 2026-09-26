/**
 * safetyMath.ts — Клинический двигатель безопасности пациента, аллергостатуса и критических стоп-факторов.
 *
 * Соответствует клиническим рекомендациям Стоматологической Ассоциации России (СтАР),
 * Приказам Минздрава РФ № 804н, № 203н и СанПиН 3.3686-21.
 *
 * Охватывает критические клинические стоп-факторы:
 * 1. Острая аллергия на анестетики (Лидокаин, Артикаин, Мепивакаин, метабисульфиты, анафилаксия).
 * 2. Имплантированный кардиостимулятор / ЭКС (Абсолютный запрет УЗ-скейлинга и монополярной электрокоагуляции).
 * 3. Прием антикоагулянтов / дезагрегантов (Варфарин, Ксарелто, Эликвис, Прадакса, Плавикс) — риск кровотечения.
 * 4. Бисфосфонатная и антирезорбтивная терапия (Золедронат, Акласта, Бонвива, Пролиа) — риск остеонекроза челюсти (MRONJ/БОНЧ).
 * 5. Беременность по триместрам (1-й триместр: органогенез, запрет адреналина и КТ; 2-й триместр: безопасное окно; 3-й: синдром НПВ) и лактация.
 * 6. Хронические соматические заболевания (Сахарный диабет, Гипертония, Астма, Эпилепсия, Гепатит B/C, ВИЧ, аллергия на латекс и пенициллины).
 */

import {
	type AnesthesiaDrugKey,
	type AutopilotResolutionResult,
	type PatientMrdCalculation,
	type SomaticRiskProfile,
	calculatePatientMrd,
	resolveAutopilotAnesthesia,
} from "../visit/anesthesiaCalculatorEngine";
import { isNegativeAllergyStatement } from "../../utils/somaticNorm";
export { isNegativeAllergyStatement };

export type ClinicalSafetySeverity = "critical" | "high" | "moderate" | "info" | "none";

export type ClinicalSafetyCategory =
	| "anesthesia_allergy"
	| "pacemaker_cardio"
	| "anticoagulants"
	| "bisphosphonates"
	| "pregnancy"
	| "chronic_somatic"
	| "general_allergy";

export type PregnancyTrimester = "none" | "trimester_1" | "trimester_2" | "trimester_3" | "lactation";

export interface ClinicalSafetyItemDefinition {
	readonly id: string;
	readonly category: ClinicalSafetyCategory;
	readonly severity: ClinicalSafetySeverity;
	readonly shortBadge: string;
	readonly titleRu: string;
	readonly fullDescription: string;
	readonly forbiddenProcedures: readonly string[];
	readonly mandatoryPrecautions: readonly string[];
	readonly recommendedAnesthesiaNotes?: string | undefined;
	readonly icd10Codes?: readonly string[] | undefined;
	readonly keywords: readonly string[];
}

/** Профиль безопасности пациента, сохраняемый в базе и анкете здоровья */
export interface PatientClinicalSafetyProfile {
	// 1. Аллергии на анестетики и консерванты
	readonly hasLidocaineAllergy?: boolean | undefined;
	readonly hasArticaineAllergy?: boolean | undefined;
	readonly hasMepivacaineAllergy?: boolean | undefined;
	readonly hasEsterAnestheticsAllergy?: boolean | undefined;
	readonly hasSulfiteAllergy?: boolean | undefined;
	readonly hasSulfitesAllergy?: boolean | undefined;
	readonly hasAnestheticAllergy?: boolean | undefined;
	readonly hasIodineAllergy?: boolean | undefined;
	readonly hasAnaphylaxisHistory?: boolean | undefined;

	// 2. ЭКС / Кардиостимулятор & Кардиология
	readonly hasPacemakerExs?: boolean | undefined;
	readonly hasCardiovascularDisease?: boolean | undefined;
	readonly hasHypertension?: boolean | undefined;
	readonly hasSevereHypertensionStage3?: boolean | undefined;
	readonly hasIhd?: boolean | undefined;
	readonly hasArrhythmia?: boolean | undefined;
	readonly takesBetaBlockers?: boolean | undefined;
	readonly hasPheochromocytoma?: boolean | undefined;

	// 3. Гематология & Антикоагулянты
	readonly takesAnticoagulants?: boolean | undefined;
	readonly hasAnticoagulantTherapy?: boolean | undefined;
	readonly anticoagulantName?: string | undefined; // Варфарин, Ксарелто, Эликвис, Тромбо АСС и т.д.
	readonly lastInrValue?: number | undefined; // Значение МНО (INR)

	// 4. Бисфосфонаты & Остеонекроз (MRONJ)
	readonly takesBisphosphonates?: boolean | undefined;
	readonly hasBisphosphonateTherapy?: boolean | undefined;
	readonly bisphosphonateName?: string | undefined; // Акласта, Зомета, Фосамакс, Пролиа

	// 5. Беременность и лактация
	readonly pregnancyTrimester: PregnancyTrimester;
	readonly gestationalWeeks?: number | undefined;

	// 6. Хронические заболевания (Соматический статус)
	readonly hasDiabetesMellitus?: boolean | undefined;
	readonly diabetesType?: "1" | "2" | "unknown" | undefined;
	readonly hasBronchialAsthma?: boolean | undefined;
	readonly hasEpilepsy?: boolean | undefined;
	readonly hasHepatitis?: boolean | undefined;
	readonly hasHiv?: boolean | undefined;
	readonly hasThyroidDisease?: boolean | undefined;
	readonly hasThyrotoxicosis?: boolean | undefined;
	readonly hasPenicillinAllergy?: boolean | undefined;
	readonly hasLatexAllergy?: boolean | undefined;
	readonly hasNsaidAllergy?: boolean | undefined; // Аллергия на НПВП / Аспириновая триада

	// Свободные примечания
	readonly customAllergyNotes?: string | undefined;
	readonly customAllergiesNotes?: string | undefined;
	readonly customChronicNotes?: string | undefined;
	readonly currentMedicationsList?: string | undefined;
	readonly lastUpdated?: string | undefined;
}

/**
 * Канонический профиль физиологической нормы соматического здоровья (Мандат 8e п. 3, Мандат 8k, Мандат 8n).
 * Аллергий нет, соматических противопоказаний нет, гемостаз в норме.
 */
export const DEFAULT_SOMATIC_HEALTHY_NORM: PatientClinicalSafetyProfile = {
	hasLidocaineAllergy: false,
	hasArticaineAllergy: false,
	hasMepivacaineAllergy: false,
	hasSulfiteAllergy: false,
	hasSulfitesAllergy: false,
	hasAnestheticAllergy: false,
	hasIodineAllergy: false,
	hasAnaphylaxisHistory: false,
	hasPacemakerExs: false,
	hasCardiovascularDisease: false,
	hasHypertension: false,
	takesAnticoagulants: false,
	hasAnticoagulantTherapy: false,
	anticoagulantName: "",
	takesBisphosphonates: false,
	hasBisphosphonateTherapy: false,
	bisphosphonateName: "",
	pregnancyTrimester: "none",
	hasDiabetesMellitus: false,
	diabetesType: "unknown",
	hasBronchialAsthma: false,
	hasEpilepsy: false,
	hasHepatitis: false,
	hasHiv: false,
	hasThyroidDisease: false,
	hasPenicillinAllergy: false,
	hasLatexAllergy: false,
	hasNsaidAllergy: false,
	customAllergyNotes: "",
	customChronicNotes: "Соматически здоров. Аллергоанамнез не отягощен. Перенесенные инфекционные заболевания (гепатит B/C, ВИЧ, сифилис) со слов отрицает. Физиологическая норма.",
	currentMedicationsList: "",
};

/**
 * Создание чистого профиля физиологической нормы в 1 клик.
 */
export function createHealthySomaticNormProfile(): PatientClinicalSafetyProfile {
	return { ...DEFAULT_SOMATIC_HEALTHY_NORM };
}

/**
 * Проверка, является ли профиль пациента физиологической нормой (без отягощений).
 */
export function isSomaticProfilePhysiologicalNorm(
	profile?: Partial<PatientClinicalSafetyProfile> | null,
): boolean {
	if (!profile) return true;
	return (
		!profile.hasLidocaineAllergy &&
		!profile.hasArticaineAllergy &&
		!profile.hasMepivacaineAllergy &&
		!profile.hasSulfiteAllergy &&
		!profile.hasSulfitesAllergy &&
		!profile.hasAnestheticAllergy &&
		!profile.hasIodineAllergy &&
		!profile.hasAnaphylaxisHistory &&
		!profile.hasPacemakerExs &&
		!profile.hasCardiovascularDisease &&
		!profile.hasHypertension &&
		!profile.takesAnticoagulants &&
		!profile.hasAnticoagulantTherapy &&
		!profile.takesBisphosphonates &&
		!profile.hasBisphosphonateTherapy &&
		(profile.pregnancyTrimester === "none" || !profile.pregnancyTrimester) &&
		!profile.hasDiabetesMellitus &&
		!profile.hasBronchialAsthma &&
		!profile.hasEpilepsy &&
		!profile.hasHepatitis &&
		!profile.hasHiv &&
		!profile.hasThyroidDisease &&
		!profile.hasPenicillinAllergy &&
		!profile.hasLatexAllergy &&
		!profile.hasNsaidAllergy
	);
}

export { CLINICAL_SAFETY_CATALOG } from "./clinicalSafetyCatalogData";

export {
	evaluatePatientSafetyFlags,
	checkProcedureSafety,
	formatSafetyProfileToDiaryText,
} from "./patientSafetyEvaluation";
export type {
	PatientSafetyEvaluationResult,
	ClinicalSafetyFlag,
} from "./patientSafetyEvaluation";

/**
 * Парсит произвольный текст анамнеза, заметок или сопутствующих патологий
 * и извлекает структурированный профиль безопасности.
 */
export function parseSafetyProfileFromText(text?: string | null | undefined): PatientClinicalSafetyProfile {
	const raw = (text ?? "").toLowerCase();
	if (!raw.trim()) {
		return { pregnancyTrimester: "none" };
	}

	const isCleanAllergyText = isNegativeAllergyStatement(raw);

	const hasArticaine =
		!isCleanAllergyText &&
		(raw.includes("артикаин") ||
			raw.includes("ультракаин") ||
			raw.includes("септанест") ||
			raw.includes("убистезин"));

	const hasLidocaine =
		!isCleanAllergyText &&
		(raw.includes("лидокаин") || raw.includes("ксилокаин"));

	const hasEsterAnesthetics =
		!isCleanAllergyText &&
		(raw.includes("дикаин") ||
			raw.includes("тетракаин") ||
			raw.includes("новокаин") ||
			raw.includes("прокаин") ||
			raw.includes("анестезин") ||
			raw.includes("бензокаин"));

	const hasMepivacaine =
		!isCleanAllergyText &&
		(raw.includes("мепивакаин") ||
			raw.includes("скандонест") ||
			raw.includes("мепивастезин"));

	const hasSulfites =
		!isCleanAllergyText &&
		(raw.includes("сульфит") ||
			raw.includes("дисульфит") ||
			raw.includes("метабисульфит") ||
			raw.includes("пиросульфит") ||
			raw.includes("е223") ||
			raw.includes("e223") ||
			raw.includes("консервант"));

	const hasPacemaker =
		raw.includes("кардиостимулятор") ||
		/(^|[^а-яёa-z0-9])экс([^а-яёa-z0-9]|$)/i.test(raw) ||
		/(^|[^а-яёa-z0-9])икд([^а-яёa-z0-9]|$)/i.test(raw) ||
		raw.includes("пейсмейкер") ||
		raw.includes("водитель ритма") ||
		raw.includes("z95.0");

	const hasBisphosphonates =
		raw.includes("бисфосфонат") ||
		raw.includes("акласта") ||
		raw.includes("зомета") ||
		raw.includes("золедронат") ||
		raw.includes("фосамакс") ||
		raw.includes("алендронат") ||
		raw.includes("бонвива") ||
		raw.includes("пролиа") ||
		raw.includes("деносумаб") ||
		raw.includes("остеонекроз") ||
		raw.includes("бонч") ||
		raw.includes("m87.1");

	const hasAnticoagulants =
		raw.includes("варфарин") ||
		raw.includes("ксарелто") ||
		raw.includes("ривароксабан") ||
		raw.includes("эликвис") ||
		raw.includes("апиксабан") ||
		raw.includes("прадакса") ||
		raw.includes("дабигатран") ||
		raw.includes("плавикс") ||
		raw.includes("клопидогрел") ||
		raw.includes("тромбо асс") ||
		raw.includes("антикоагулянт") ||
		raw.includes("дезагрегант") ||
		raw.includes("z92.1");

	// Беременность по триместрам
	let pregnancyTrimester: PregnancyTrimester = "none";
	if (raw.includes("беременн") || raw.includes("лактац") || raw.includes("триместр") || raw.includes("кормлен") || raw.includes("гв") || raw.includes("z33")) {
		if (raw.includes("1 триместр") || raw.includes("1-й триместр") || raw.includes("первый триместр") || raw.includes("ранние сроки")) {
			pregnancyTrimester = "trimester_1";
		} else if (raw.includes("2 триместр") || raw.includes("2-й триместр") || raw.includes("второй триместр")) {
			pregnancyTrimester = "trimester_2";
		} else if (raw.includes("3 триместр") || raw.includes("3-й триместр") || raw.includes("третий триместр")) {
			pregnancyTrimester = "trimester_3";
		} else if (raw.includes("лактац") || raw.includes("гв") || raw.includes("кормлен")) {
			pregnancyTrimester = "lactation";
		} else {
			pregnancyTrimester = "trimester_2"; // Безопасное среднее предположение
		}
	}

	const hasHypertension =
		raw.includes("гипертон") ||
		raw.includes("гипертенз") ||
		raw.includes("давлен") ||
		raw.includes("аг ") ||
		raw.includes("аг,") ||
		raw.includes("криз") ||
		raw.includes("i10") ||
		raw.includes("i11") ||
		raw.includes("i12") ||
		raw.includes("i13") ||
		raw.includes("i14") ||
		raw.includes("i15");

	const hasIhd =
		raw.includes("ибс") ||
		raw.includes("стенокард") ||
		raw.includes("инфаркт") ||
		raw.includes("постинфаркт") ||
		raw.includes("стентирован") ||
		raw.includes("шунтирован") ||
		raw.includes("i20") ||
		raw.includes("i21") ||
		raw.includes("i22") ||
		raw.includes("i23") ||
		raw.includes("i24") ||
		raw.includes("i25");

	const hasArrhythmia =
		raw.includes("аритми") ||
		raw.includes("мерцательн") ||
		raw.includes("экстрасистол") ||
		raw.includes("тахикарди") ||
		raw.includes("фибрилляц") ||
		raw.includes("пароксизм") ||
		raw.includes("блокад") ||
		raw.includes("i44") ||
		raw.includes("i45") ||
		raw.includes("i47") ||
		raw.includes("i48") ||
		raw.includes("i49");

	const hasSevereHypertension =
		raw.includes("аг 3") ||
		raw.includes("аг iii") ||
		raw.includes("3 стад") ||
		raw.includes("iii стад") ||
		raw.includes("криз") ||
		raw.includes("тяжелая гипертенз") ||
		raw.includes("тяжелой гипертенз") ||
		raw.includes("давление 180") ||
		raw.includes("давление > 180") ||
		raw.includes("180/");

	const hasThyrotoxicosis =
		raw.includes("тиреотоксикоз") ||
		raw.includes("гипертиреоз") ||
		raw.includes("базедов") ||
		raw.includes("e05") ||
		raw.includes("е05") ||
		raw.includes("токсический зоб");

	const takesBetaBlockers =
		raw.includes("бета-блокатор") ||
		raw.includes("бетаблокатор") ||
		raw.includes("бисопролол") ||
		raw.includes("конкор") ||
		raw.includes("анаприлин") ||
		raw.includes("пропранолол") ||
		raw.includes("метопролол") ||
		raw.includes("эгилок") ||
		raw.includes("соталол") ||
		raw.includes("атенолол") ||
		raw.includes("небиволол") ||
		raw.includes("беталок") ||
		raw.includes("карведилол");

	const hasCardio =
		hasHypertension ||
		hasSevereHypertension ||
		hasIhd ||
		hasArrhythmia ||
		hasThyrotoxicosis ||
		takesBetaBlockers ||
		raw.includes("сердеч") ||
		raw.includes("кардио") ||
		raw.includes("пороком сердца") ||
		raw.includes("хсн");

	const hasDiabetes =
		raw.includes("диабет") ||
		raw.includes("инсулин") ||
		raw.includes("глюкоз") ||
		raw.includes("e10") ||
		raw.includes("e11");

	const hasAsthma =
		raw.includes("астма") ||
		raw.includes("астм") ||
		raw.includes("бронхиальн") ||
		raw.includes("сальбутамол") ||
		raw.includes("беродуал") ||
		raw.includes("j45") ||
		raw.includes("j46");

	const hasEpilepsy =
		raw.includes("эпилепс") ||
		raw.includes("судорог") ||
		raw.includes("припад") ||
		raw.includes("g40");

	const hasHepatitis =
		raw.includes("гепатит") ||
		raw.includes("b18");

	const hasHiv =
		raw.includes("вич") ||
		raw.includes("спид") ||
		raw.includes("b20");

	const hasPenicillin =
		!isCleanAllergyText &&
		(raw.includes("пенициллин") ||
			raw.includes("амоксициллин") ||
			raw.includes("амоксиклав") ||
			raw.includes("аугментин") ||
			raw.includes("флемоксин") ||
			raw.includes("z88.0"));

	const hasLatex = !isCleanAllergyText && raw.includes("латекс");

	const hasNsaid =
		!isCleanAllergyText &&
		(raw.includes("нпвп") ||
			raw.includes("нпвс") ||
			raw.includes("аспирин") ||
			raw.includes("кеторол") ||
			raw.includes("кеторолак") ||
			raw.includes("ибупрофен") ||
			raw.includes("нурофен") ||
			raw.includes("диклофенак") ||
			raw.includes("нимесулид") ||
			raw.includes("кетонал") ||
			raw.includes("аспириновая астма") ||
			raw.includes("z88.6"));

	const hasIodine =
		!isCleanAllergyText &&
		(raw.includes("йод") ||
			raw.includes("йодоформ") ||
			raw.includes("повидон-йод") ||
			raw.includes("бетадин") ||
			raw.includes("метапекс") ||
			raw.includes("йодинол") ||
			raw.includes("альвожил") ||
			raw.includes("alveogyl") ||
			raw.includes("люголь"));

	const hasPheochromocytoma =
		raw.includes("феохромоцитом") ||
		raw.includes("надпочечник") ||
		raw.includes("c74.1") ||
		raw.includes("d35.0");

	return {
		hasArticaineAllergy: hasArticaine,
		hasLidocaineAllergy: hasLidocaine,
		hasMepivacaineAllergy: hasMepivacaine,
		hasEsterAnestheticsAllergy: hasEsterAnesthetics,
		hasSulfiteAllergy: hasSulfites,
		hasPacemakerExs: hasPacemaker,
		takesBisphosphonates: hasBisphosphonates,
		takesAnticoagulants: hasAnticoagulants,
		pregnancyTrimester,
		hasCardiovascularDisease: hasCardio,
		hasHypertension,
		hasSevereHypertensionStage3: hasSevereHypertension,
		hasThyrotoxicosis,
		takesBetaBlockers,
		hasIhd,
		hasArrhythmia,
		hasPheochromocytoma,
		hasDiabetesMellitus: hasDiabetes,
		hasBronchialAsthma: hasAsthma,
		hasEpilepsy: hasEpilepsy,
		hasHepatitis: hasHepatitis,
		hasHiv: hasHiv,
		hasPenicillinAllergy: hasPenicillin,
		hasLatexAllergy: hasLatex,
		hasNsaidAllergy: hasNsaid,
		hasIodineAllergy: hasIodine,
		customChronicNotes: text ? text : undefined,
	};
}

/**
 * Преобразует профиль безопасности пациента в соматический профиль риска для анестезиологического калькулятора.
 */
export function patientProfileToSomaticRiskProfile(
	profile?: Partial<PatientClinicalSafetyProfile> | string | null | undefined,
): SomaticRiskProfile {
	if (!profile) return {};
	if (typeof profile === "string") {
		const parsed = parseSafetyProfileFromText(profile);
		return patientProfileToSomaticRiskProfile(parsed);
	}

	const hasCardio = Boolean(
		profile.hasCardiovascularDisease ||
		profile.hasHypertension ||
		profile.hasSevereHypertensionStage3 ||
		profile.hasIhd ||
		profile.hasArrhythmia ||
		profile.hasPacemakerExs,
	);
	const isPregnant = Boolean(
		profile.pregnancyTrimester && profile.pregnancyTrimester !== "none",
	);

	return {
		hasCardiovascularRisk: hasCardio,
		hasHypertension: Boolean(profile.hasHypertension),
		hasSevereHypertensionStage3: Boolean(profile.hasSevereHypertensionStage3),
		hasIhd: Boolean(profile.hasIhd),
		hasArrhythmia: Boolean(profile.hasArrhythmia),
		hasThyrotoxicosis: Boolean(profile.hasThyrotoxicosis),
		takesBetaBlockers: Boolean(profile.takesBetaBlockers),
		hasArticaineAllergy: Boolean(profile.hasArticaineAllergy),
		hasMepivacaineAllergy: Boolean(profile.hasMepivacaineAllergy),
		hasLidocaineAllergy: Boolean(profile.hasLidocaineAllergy),
		hasSulfiteAllergy: Boolean(profile.hasSulfiteAllergy || profile.hasSulfitesAllergy),
		hasBronchialAsthma: Boolean(profile.hasBronchialAsthma),
		isPregnantOrLactating: isPregnant,
		pregnancyTrimester: profile.pregnancyTrimester,
		customNotes: profile.customChronicNotes || profile.customAllergyNotes,
	};
}

/**
 * Автоматически рассчитывает безопасный анестетик и дозировки на основе профиля пациента (Автопилот безопасности).
 */
export function getAnesthesiaAutopilotForPatient(
	profile?: Partial<PatientClinicalSafetyProfile> | string | null | undefined,
	weightKg?: number | undefined,
	ageYears?: number | null | undefined,
	isPediatric?: boolean | undefined,
): AutopilotResolutionResult {
	const somatic = patientProfileToSomaticRiskProfile(profile);
	return resolveAutopilotAnesthesia({
		somaticProfile: somatic,
		patientWeightKg: weightKg,
		patientAgeYears: ageYears,
		isPediatric,
	});
}

/**
 * Рассчитывает МРД (максимальную разовую дозу) анестетика с учетом кардио-ограничений профиля пациента.
 */
export function calculatePatientMrdForProfile(params: {
	profile?: Partial<PatientClinicalSafetyProfile> | string | null | undefined;
	drugKey: AnesthesiaDrugKey;
	patientWeightKg: number;
	patientAgeYears?: number | null | undefined;
	isPediatric?: boolean | undefined;
}): PatientMrdCalculation {
	const somatic = patientProfileToSomaticRiskProfile(params.profile);
	const hasCardio = Boolean(
		somatic.hasCardiovascularRisk ||
		somatic.hasHypertension ||
		somatic.hasIhd ||
		somatic.hasArrhythmia,
	);

	return calculatePatientMrd({
		drugKey: params.drugKey,
		patientWeightKg: params.patientWeightKg,
		patientAgeYears: params.patientAgeYears,
		isPediatric: params.isPediatric,
		isCardioRestricted: hasCardio,
	});
}

