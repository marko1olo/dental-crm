/**
 * packages/shared/src/clinical/somaticSafetyTypes.ts
 *
 * Types, interfaces, and canonical text standards for Chairside Somatic Safety & Stop-Factors.
 * Mandate 8s: Strict Bounded Context & Single Canonical Authority.
 */

/**
 * Single canonical 1-click physiological norm formulation for Form 043/u:
 * «Соматически здоров. Аллергоанамнез не отягощен. Перенесенные инфекционные заболевания со слов отрицает. Физиологическая норма.»
 */
export const CANONICAL_SOMATIC_HEALTHY_NORM_TEXT =
	"Соматически здоров. Аллергоанамнез не отягощен. Перенесенные инфекционные заболевания со слов отрицает. Физиологическая норма.";

export const CANONICAL_SOMATIC_HEALTHY_NORM_WITH_INFECTIONS_TEXT =
	"Соматически здоров. Аллергоанамнез не отягощен. Перенесенные инфекционные заболевания (гепатит B/C, ВИЧ, сифилис) со слов отрицает. Физиологическая норма.";

export const CANONICAL_SOMATIC_NORM_SHORT = "Соматически здоров / норма";

export const CANONICAL_SOMATIC_NORM_BADGE_LABEL = "Соматически здоров (Норма)";

/**
 * 5 Core Critical Dental Stop-Factor Categories
 */
export type SomaticStopFactorCategory =
	| "allergy" // 1. Аллергия на местные анестетики и антибиотики
	| "cardiovascular" // 2. Сердечно-сосудистые риски (гипертонический криз, инфаркт < 6 мес)
	| "anticoagulants" // 3. Антикоагулянты и антиагреганты (риск кровотечения)
	| "bisphosphonates" // 4. Бисфосфонаты (риск остеонекроза челюсти MRONJ / БОНЧ)
	| "diabetes_pregnancy" // 5. Сахарный диабет декомпенсированный / Беременность
	| "pacemaker" // Дополнительно: ЭКС (запрет УЗ / электрокоагуляции)
	| "other";

export type SomaticSeverity = "critical" | "warning" | "healthy";

export type SomaticPregnancyTrimester =
	| "trimester_1"
	| "trimester_2"
	| "trimester_3"
	| "lactation"
	| "none";

/**
 * Individual evaluated stop-factor entity
 */
export interface SomaticStopFactor {
	readonly id: string;
	readonly category: SomaticStopFactorCategory;
	readonly severity: SomaticSeverity;
	readonly title: string;
	readonly shortBadge: string;
	readonly fullLabel: string;
	readonly detectedItems: readonly string[];
	readonly prohibitions: readonly string[];
	readonly recommendations: readonly string[];
	readonly anesthesiaGuidance: string;
	readonly icd10Codes: readonly string[];
	readonly testId: string;
	readonly actionHint: string;
}

/**
 * Input representation: accepts structured patient profiles, patient card fields, or raw text
 */
export interface SomaticSafetyInput {
	readonly id?: string | null;
	readonly fullName?: string | null;
	readonly allergies?: string | null;
	readonly chronicConditions?: string | null;
	readonly notes?: string | null;
	readonly anamnesis?:
		| string
		| {
				allergies?: string | null;
				somaticNotes?: string | null;
				chronicConditions?: string | null;
				pregnancyTrimester?: string | null;
				anticoagulantName?: string | null;
				bisphosphonateName?: string | null;
		  }
		| null;
	readonly customAllergyNotes?: string | null;
	readonly customChronicNotes?: string | null;

	// Structured flags: Stop-factor 1 (Allergies)
	readonly hasArticaineAllergy?: boolean | null;
	readonly hasLidocaineAllergy?: boolean | null;
	readonly hasNovocaineAllergy?: boolean | null;
	readonly hasProcaineAllergy?: boolean | null;
	readonly hasMepivacaineAllergy?: boolean | null;
	readonly hasPenicillinAllergy?: boolean | null;
	readonly hasNsaidAllergy?: boolean | null;
	readonly hasLatexAllergy?: boolean | null;
	readonly hasSulfitesAllergy?: boolean | null;
	readonly hasIodineAllergy?: boolean | null;
	readonly hasAnaphylaxisHistory?: boolean | null;

	// Structured flags: Stop-factor 2 (Cardiovascular)
	readonly hasHypertension?: boolean | null;
	readonly hasHypertensiveCrisisHistory?: boolean | null;
	readonly hasMyocardialInfarctionRecent?: boolean | null; // инфаркт < 6 мес
	readonly hasRecentInfarction?: boolean | null;
	readonly hasCoronaryDisease?: boolean | null;
	readonly hasCardiacArrhythmia?: boolean | null;

	// Structured flags: Stop-factor 3 (Anticoagulants & Antiplatelets)
	readonly takesAnticoagulants?: boolean | null;
	readonly hasAnticoagulantTherapy?: boolean | null;
	readonly takesAntiplatelets?: boolean | null;
	readonly anticoagulantName?: string | null;

	// Structured flags: Stop-factor 4 (Bisphosphonates & Antiresorptives)
	readonly takesBisphosphonates?: boolean | null;
	readonly hasBisphosphonateTherapy?: boolean | null;
	readonly bisphosphonateName?: string | null;

	// Structured flags: Stop-factor 5 (Diabetes & Pregnancy)
	readonly hasDiabetesMellitus?: boolean | null;
	readonly isDiabetesDecompensated?: boolean | null;
	readonly diabetesType?: string | null;
	readonly pregnancyTrimester?: SomaticPregnancyTrimester | string | null;

	// Additional chairside somatic flags
	readonly hasPacemakerExs?: boolean | null;
	readonly hasBronchialAsthma?: boolean | null;
	readonly hasAsthma?: boolean | null;
	readonly hasEpilepsy?: boolean | null;
	readonly hasHepatitis?: boolean | null;
	readonly hasHiv?: boolean | null;

	// Doctor autonomy confirmation of physiological norm
	readonly isSomaticNormConfirmed?: boolean | null;
}

/**
 * Result of chairside somatic safety evaluation
 */
export interface SomaticSafetyEvaluation {
	readonly isHealthyNorm: boolean;
	readonly hasCriticalStop: boolean;
	readonly hasWarningStop: boolean;
	readonly stopFactors: readonly SomaticStopFactor[];
	readonly criticalStopFactors: readonly SomaticStopFactor[];
	readonly warningStopFactors: readonly SomaticStopFactor[];
	readonly primaryAlertBadge: {
		readonly id: string;
		readonly shortLabel: string;
		readonly fullLabel: string;
		readonly title: string;
		readonly severity: SomaticSeverity;
		readonly testId: string;
	};
	readonly badges: ReadonlyArray<{
		readonly id: string;
		readonly testId: string;
		readonly shortLabel: string;
		readonly fullLabel: string;
		readonly title: string;
		readonly severity: SomaticSeverity;
		readonly actionHint: string;
	}>;
	readonly diary043uSnippet: string;
	readonly chairsideGuidanceList: ReadonlyArray<{
		readonly title: string;
		readonly category: SomaticStopFactorCategory;
		readonly severity: SomaticSeverity;
		readonly prohibitions: readonly string[];
		readonly recommendations: readonly string[];
		readonly anesthesiaGuidance: string;
	}>;
}

/**
 * Detects whether an allergy/somatic text string represents an explicit negation of pathology
 * (e.g. "аллергий нет", "отрицает", "не отягощен", "норма", "-", "—", "соматически здоров").
 */
export function isNegativeAllergyOrSomaticStatement(text?: string | null): boolean {
	if (!text) return true;
	const trimmed = text.trim();
	if (!trimmed) return true;
	const lower = trimmed.toLowerCase();

	if (/^[-—–._\s/]*$/.test(trimmed) || /^(нет|none|no|n\/a|0)$/i.test(trimmed)) {
		return true;
	}

	// Active allergen / stop-factor mentions override simple punctuation
	const hasActiveTrigger =
		lower.includes("артикаин") ||
		lower.includes("ультракаин") ||
		lower.includes("лидокаин") ||
		lower.includes("мепивакаин") ||
		lower.includes("скандонест") ||
		lower.includes("новокаин") ||
		lower.includes("пенициллин") ||
		lower.includes("амоксиклав") ||
		lower.includes("аугментин") ||
		lower.includes("гипертонический криз") ||
		lower.includes("инфаркт") ||
		lower.includes("варфарин") ||
		lower.includes("ксарелто") ||
		lower.includes("эликвис") ||
		lower.includes("тромбо асс") ||
		lower.includes("бисфосфонат") ||
		lower.includes("зомета") ||
		lower.includes("фосамакс") ||
		lower.includes("акласта") ||
		lower.includes("mronj") ||
		lower.includes("бонч") ||
		lower.includes("декомпенсирован") ||
		lower.includes("кардиостимулятор");

	const isExplicitNegation =
		lower.includes("отрицает") ||
		lower.includes("не отягощен") ||
		lower.includes("не отягощён") ||
		lower.includes("нет аллергии") ||
		lower.includes("аллергий нет") ||
		lower.includes("аллергии нет") ||
		lower.includes("не принимает") ||
		lower.includes("не выявлено") ||
		lower.includes("без особенностей") ||
		lower.includes("соматически здоров") ||
		lower.includes("патологий не заявлено");

	if (isExplicitNegation && !hasActiveTrigger) {
		return true;
	}

	// Exact phrases of negation even if term was mentioned as negated
	if (
		lower === "нет" ||
		lower === "норма" ||
		lower === "отрицает" ||
		lower === "не отягощен" ||
		lower === "не отягощён" ||
		lower === "здоров" ||
		lower === "чисто" ||
		lower === "аллергоанамнез не отягощен" ||
		lower === "аллергии отрицает"
	) {
		return true;
	}

	return false;
}

/**
 * Extracts combined raw text from all possible patient input locations
 */
export function extractFullAnamnesisText(input?: SomaticSafetyInput | string | null): string {
	if (!input) return "";
	if (typeof input === "string") return input;

	const parts: Array<string | null | undefined> = [
		input.allergies,
		input.chronicConditions,
		input.notes,
		input.customAllergyNotes,
		input.customChronicNotes,
		input.anticoagulantName,
		input.bisphosphonateName,
		input.diabetesType,
	];

	if (typeof input.anamnesis === "string") {
		parts.push(input.anamnesis);
	} else if (input.anamnesis && typeof input.anamnesis === "object") {
		parts.push(input.anamnesis.allergies);
		parts.push(input.anamnesis.somaticNotes);
		parts.push(input.anamnesis.chronicConditions);
		parts.push(input.anamnesis.anticoagulantName);
		parts.push(input.anamnesis.bisphosphonateName);
	}

	return parts
		.filter((p): p is string => Boolean(p && typeof p === "string" && p.trim().length > 0))
		.join(" ")
		.trim();
}

/**
 * Creates canonical healthy norm profile (1-click doctor autonomy)
 */
export function createHealthySomaticNormProfile(): SomaticSafetyInput {
	return {
		allergies: "Аллергологический анамнез не отягощен.",
		chronicConditions: "Соматически здоров. Физиологическая норма.",
		customAllergyNotes: "Аллергии отрицает. Аллергоанамнез не отягощен.",
		customChronicNotes: CANONICAL_SOMATIC_HEALTHY_NORM_TEXT,
		hasArticaineAllergy: false,
		hasLidocaineAllergy: false,
		hasNovocaineAllergy: false,
		hasProcaineAllergy: false,
		hasMepivacaineAllergy: false,
		hasPenicillinAllergy: false,
		hasNsaidAllergy: false,
		hasLatexAllergy: false,
		hasSulfitesAllergy: false,
		hasIodineAllergy: false,
		hasAnaphylaxisHistory: false,
		hasHypertension: false,
		hasHypertensiveCrisisHistory: false,
		hasMyocardialInfarctionRecent: false,
		hasRecentInfarction: false,
		takesAnticoagulants: false,
		hasAnticoagulantTherapy: false,
		takesAntiplatelets: false,
		takesBisphosphonates: false,
		hasBisphosphonateTherapy: false,
		hasDiabetesMellitus: false,
		isDiabetesDecompensated: false,
		pregnancyTrimester: "none",
		hasPacemakerExs: false,
		hasBronchialAsthma: false,
		hasAsthma: false,
		hasEpilepsy: false,
		hasHepatitis: false,
		hasHiv: false,
		isSomaticNormConfirmed: true,
	};
}

/**
 * Applies 1-click somatic norm to existing profile (Mandates 8e, 8k)
 */
export function applySomaticNorm(
	currentProfile?: SomaticSafetyInput | null,
): SomaticSafetyInput {
	const norm = createHealthySomaticNormProfile();
	return {
		...(currentProfile || {}),
		...norm,
		isSomaticNormConfirmed: true,
	};
}
