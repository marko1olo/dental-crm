/**
 * apps/web/src/utils/somaticNorm.ts
 *
 * Single Canonical Authority for Somatic Status, Health Norm & Dental Contraindications.
 *
 * CONSTITUTIONAL MANDATES:
 * - Mandate 8e: Doctor Autonomy (1-click physiological norm, 0 disabled buttons due to somatic fields, doctor edits pathology only).
 * - Mandate 8i: Ambulatory Dental Context (Strictly chairside dental risks: allergies, pacemaker -> ultrasound ban, anticoagulants, pregnancy, bisphosphonates; zero hospital inpatient bloat).
 * - Mandate 8k: Friction-Killer Law (CRM != Reality Simulator, 1-click presets and batch norm insertion).
 * - Mandate 8s: Anti-Bloat Law (Single authoritative definition, no duplicate parallel formulations).
 * - Mandate 8d item 7: Sanctity of Medical Records (Zero cartoon emojis, strictly professional clinical terminology).
 */

/**
 * Single canonical 1-click physiological norm formulation:
 * «Соматически здоров. Аллергоанамнез не отягощен. Перенесенные инфекционные заболевания со слов отрицает. Физиологическая норма.»
 */
export const CANONICAL_SOMATIC_HEALTHY_NORM_TEXT =
	"Соматически здоров. Аллергоанамнез не отягощен. Перенесенные инфекционные заболевания со слов отрицает. Физиологическая норма.";

/**
 * Extended canonical formulation with explicit infection list (Hepatitis B/C, HIV, Syphilis)
 * used in comprehensive anamnesis and clinical safety profiles.
 */
export const CANONICAL_SOMATIC_HEALTHY_NORM_WITH_INFECTIONS_TEXT =
	"Соматически здоров. Аллергоанамнез не отягощен. Перенесенные инфекционные заболевания (гепатит B/C, ВИЧ, сифилис) со слов отрицает. Физиологическая норма.";

/**
 * Compact short label for badges and toolbar pills
 */
export const CANONICAL_SOMATIC_NORM_SHORT = "Соматически здоров / норма";

/**
 * UI badge title for patient workspace and tooth drawer
 */
export const CANONICAL_SOMATIC_NORM_BADGE_LABEL = "Соматически здоров (Норма)";

/**
 * Form 043/u canonical somatic and anamnesis vitae norm preset
 */
export const CANONICAL_FORM043_SOMATIC_NORM = Object.freeze({
	allergologicalHistory:
		"Аллергологический анамнез не отягощен. Аллергии на местные анестетики (артикаин, мепивакаин), антибиотики и латекс отрицает.",
	concomitantDiseases:
		"Соматически здоров. Аллергоанамнез не отягощен. Перенесенные инфекционные заболевания со слов отрицает. Физиологическая норма.",
	currentMedications:
		"Постоянный прием лекарственных препаратов (антикоагулянтов, дезагрегантов, бисфосфонатов) отрицает.",
	pastDentalInterventions:
		"Ранее проводилось плановое терапевтическое лечение кариеса и профессиональная гигиена полости рта без осложнений.",
	pregnancyLactationStatus: "Нет",
	biteType: "orthognathic" as const,
	biteDescription:
		"Прикус ортогнатический, смыкание зубных рядов по I классу Энгля, межрезцовое перекрытие на 1/3 высоты коронки.",
});

/**
 * Structure of a Tier-1 dental contraindication badge
 */
export interface DentalContraindicationBadge {
	readonly id: string;
	readonly testId: string;
	readonly shortLabel: string;
	readonly fullLabel: string;
	readonly title: string;
	readonly severity: "critical" | "warning" | "healthy";
	readonly actionHint: string;
}

/**
 * Interface matching patient safety profile fields relevant to dental contraindications
 */
export interface SomaticProfileInput {
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
	readonly hasPacemakerExs?: boolean | null;
	readonly takesAnticoagulants?: boolean | null;
	readonly hasAnticoagulantTherapy?: boolean | null;
	readonly anticoagulantName?: string | null;
	readonly takesBisphosphonates?: boolean | null;
	readonly hasBisphosphonateTherapy?: boolean | null;
	readonly bisphosphonateName?: string | null;
	readonly hasDiabetesMellitus?: boolean | null;
	readonly diabetesType?: string | null;
	readonly pregnancyTrimester?: string | null;
	readonly hasBronchialAsthma?: boolean | null;
	readonly hasAsthma?: boolean | null;
	readonly hasEpilepsy?: boolean | null;
	readonly patientWeightKg?: number | null;
	readonly patientAgeYears?: number | null;
	readonly customAllergyNotes?: string | null;
	readonly customChronicNotes?: string | null;
}

/**
 * Evaluates whether text represents physiological norm without active contraindications.
 */
export function isSomaticTextPhysiologicalNorm(text?: string | null): boolean {
	if (!text) return true;
	const trimmed = text.trim();
	if (!trimmed) return true;

	const lower = trimmed.toLowerCase();

	// Must have positive declaration of health/norm
	const hasNormIndicator =
		lower.includes("соматически здоров") ||
		lower.includes("физиологическая норма") ||
		lower.includes("патологий не заявлено") ||
		lower.includes("аллергоанамнез не отягощен");

	// Must not have confirmed active high-risk contraindications
	const hasActiveContraindication =
		(lower.includes("аллергия") && !lower.includes("отрицает") && !lower.includes("не отягощен") && !lower.includes("не отмечен")) ||
		lower.includes("кардиостимулятор") ||
		(lower.includes("антикоагулянт") && !lower.includes("не принимает") && !lower.includes("отрицает")) ||
		(lower.includes("бисфосфонат") && !lower.includes("не принимает") && !lower.includes("отрицает")) ||
		lower.includes("сахарный диабет декомпенсированный");

	return hasNormIndicator && !hasActiveContraindication;
}

/**
 * Applies canonical somatic norm to existing notes, preserving previous entries if any.
 */
export function applySomaticNormToText(existingNotes?: string | null): string {
	const trimmed = (existingNotes ?? "").trim();
	if (!trimmed) {
		return CANONICAL_SOMATIC_HEALTHY_NORM_TEXT;
	}
	if (trimmed.includes("Соматически здоров")) {
		return trimmed;
	}
	return `${CANONICAL_SOMATIC_HEALTHY_NORM_TEXT}\n${trimmed}`;
}

/**
 * Evaluates whether an allergy text string represents absence of allergies / physiological norm
 * (e.g. "нет", "аллергий нет", "аллергии отрицает", "не отягощен", "норма", "-", "—").
 * Returns true if the statement declares NO allergies, or if it is empty/falsy.
 */
export function isNegativeAllergyStatement(text?: string | string[] | null | unknown): boolean {
	if (!text) return true;
	if (Array.isArray(text)) {
		if (text.length === 0) return true;
		return text.every((item) => isNegativeAllergyStatement(item));
	}
	if (typeof text !== "string") return true;
	const trimmed = text.trim();
	if (!trimmed) return true;
	const lower = trimmed.toLowerCase();

	// Pure punctuation or single dash / dash-like tokens
	if (/^[-—–._\s/]*$/.test(trimmed) || /^(нет|none|no|n\/a|0)$/i.test(trimmed)) {
		return true;
	}

	// If text contains positive confirmed allergens, it is NOT negative
	const hasSpecificAllergen =
		lower.includes("артикаин") ||
		lower.includes("ультракаин") ||
		lower.includes("новокаин") ||
		lower.includes("прокаин") ||
		lower.includes("лидокаин") ||
		lower.includes("мепивакаин") ||
		lower.includes("скандонест") ||
		lower.includes("септанест") ||
		lower.includes("убистезин") ||
		lower.includes("пенициллин") ||
		lower.includes("амоксициллин") ||
		lower.includes("амоксиклав") ||
		lower.includes("аугментин") ||
		lower.includes("латекс") ||
		lower.includes("нпвп") ||
		lower.includes("нпвс") ||
		lower.includes("аспирин") ||
		lower.includes("кеторол") ||
		lower.includes("кеторолак") ||
		lower.includes("ибупрофен") ||
		lower.includes("йод") ||
		lower.includes("йодоформ") ||
		lower.includes("сульфит") ||
		lower.includes("анафилакс") ||
		lower.includes("отек квинке");

	if (hasSpecificAllergen) {
		return false;
	}

	const negativePhrases = [
		"аллергий нет",
		"аллергии нет",
		"аллергия нет",
		"нет аллергии",
		"нет аллергий",
		"аллергоанамнез не отягощен",
		"аллергоанамнез не отягощён",
		"анамнез не отягощен",
		"анамнез не отягощён",
		"аллергии отрицает",
		"аллергию отрицает",
		"аллергические реакции отрицает",
		"аллергический статус без особенностей",
		"со слов отрицает",
		"без особенностей",
		"соматически здоров",
		"физиологическая норма",
		"не выявлено",
		"не установлено",
		"не отмечен",
		"не отмечено",
		"отсутствует",
		"отсутствуют",
		"патологий не заявлено",
	];

	for (const phrase of negativePhrases) {
		if (lower.includes(phrase)) {
			return true;
		}
	}

	// Exact words of negation or norm
	if (
		lower === "нет" ||
		lower === "норма" ||
		lower === "отрицает" ||
		lower === "не отягощен" ||
		lower === "не отягощён" ||
		lower === "не отмечено" ||
		lower === "не отмечен" ||
		lower === "отсутствуют" ||
		lower === "отсутствует" ||
		lower === "здоров" ||
		lower === "чисто"
	) {
		return true;
	}

	return false;
}

/**
 * Extracts Tier-1 visible red badges for dental contraindications (Mandates 8e, 8i):
 * - Allergies (local anesthetics, penicillin, NSAIDs, latex, anaphylaxis)
 * - Pacemaker (ЭКС/ИКД -> ultrasonic scaler and monopolar electrosurgery prohibition)
 * - Anticoagulants (bleeding risk)
 * - Diabetes mellitus (hypoglycemia risk, delayed wound healing)
 * - Pregnancy & lactation (gestational window, vasoconstrictor & sedation limitations)
 * - Bisphosphonates (MRONJ / osteonecrosis risk)
 */
export function extractDentalContraindicationBadges(
	profile?: SomaticProfileInput | null,
	allergyText?: string | null,
): DentalContraindicationBadge[] {
	const badges: DentalContraindicationBadge[] = [];

	// 1. Allergies (only when active allergy present, zero noise when clean per Mandate 8p)
	if (allergyText && allergyText.trim() && !isNegativeAllergyStatement(allergyText)) {
		const rawText = allergyText.trim();
		const isAnestheticOrMedAllergy =
			/артикаин|новокаин|прокаин|лидокаин|мепивакаин|ультракаин|скандонест|септанест|убистезин|пенициллин|сульфит|анестетик/i.test(
				rawText,
			);
		const fullLabel =
			isAnestheticOrMedAllergy && !rawText.toLowerCase().includes("запрет")
				? `АЛЛЕРГИЯ: ${rawText} — запрет анестетика!`
				: `АЛЛЕРГИЯ: ${rawText}`;

		badges.push({
			id: "allergy",
			testId: "visit-focus-allergy-alert",
			shortLabel: "АЛЛЕРГИЯ",
			fullLabel,
			title: `Критический стоп-фактор / аллергия пациента: ${rawText}`,
			severity: "critical",
			actionHint:
				"Исключить аллерген, подготовить противошоковую укладку (Адреналин 0.1%, Преднизолон)",
		});
	} else if (profile) {
		const specificAllergies: string[] = [];
		if (profile.hasArticaineAllergy) specificAllergies.push("Артикаин");
		if (profile.hasNovocaineAllergy || profile.hasProcaineAllergy) specificAllergies.push("Новокаин");
		if (profile.hasLidocaineAllergy) specificAllergies.push("Лидокаин");
		if (profile.hasMepivacaineAllergy) specificAllergies.push("Мепивакаин");
		if (profile.hasPenicillinAllergy) specificAllergies.push("Пенициллины");
		if (profile.hasNsaidAllergy) specificAllergies.push("НПВП");
		if (profile.hasLatexAllergy) specificAllergies.push("Латекс");
		if (profile.hasSulfitesAllergy) specificAllergies.push("Сульфиты");
		if (profile.hasIodineAllergy) specificAllergies.push("Йод");
		if (profile.hasAnaphylaxisHistory) specificAllergies.push("Анафилаксия в анамнезе");

		const hasCustomAllergy =
			profile.customAllergyNotes &&
			profile.customAllergyNotes.trim() &&
			!isNegativeAllergyStatement(profile.customAllergyNotes);

		if (specificAllergies.length > 0 || hasCustomAllergy) {
			let separator = ", ";
			if (
				specificAllergies.length === 2 &&
				specificAllergies.includes("Артикаин") &&
				specificAllergies.includes("Новокаин")
			) {
				separator = " / ";
			}
			const label =
				specificAllergies.length > 0
					? specificAllergies.join(separator)
					: (profile.customAllergyNotes || "");

			const isAnestheticMed =
				profile.hasArticaineAllergy ||
				profile.hasNovocaineAllergy ||
				profile.hasProcaineAllergy ||
				profile.hasLidocaineAllergy ||
				profile.hasMepivacaineAllergy ||
				profile.hasPenicillinAllergy ||
				profile.hasSulfitesAllergy ||
				/артикаин|новокаин|лидокаин|мепивакаин|ультракаин|пенициллин|сульфит|анестетик/i.test(label);

			const fullLabel = isAnestheticMed
				? `АЛЛЕРГИЯ: ${label} — запрет анестетика!`
				: `АЛЛЕРГИЯ: ${label}`;

			badges.push({
				id: "allergy",
				testId: "visit-focus-allergy-alert",
				shortLabel: "АЛЛЕРГИЯ",
				fullLabel,
				title: `Критический стоп-фактор / аллергия пациента: ${label}`,
				severity: "critical",
				actionHint:
					"Исключить аллерген, подготовить противошоковую укладку (Адреналин 0.1%, Преднизолон)",
			});
		}
	}

	if (!profile) return badges;

	// 2. Pacemaker (ЭКС) -> Prohibition of ultrasonic scaler and electrosurgery (Yellow / warning badge)
	if (profile.hasPacemakerExs) {
		badges.push({
			id: "pacemaker",
			testId: "visit-focus-pacemaker-alert",
			shortLabel: "ЭКС",
			fullLabel: "Кардиостимулятор: ЗАПРЕТ УЗ-скейлера и электрокоагулятора!",
			title:
				"Имплантированный кардиостимулятор (ЭКС): абсолютный запрет УЗ-скейлинга и монополярной электрокоагуляции",
			severity: "warning",
			actionHint:
				"Запрет УЗ-скейлера и электрокоагулятора! Ручной скейлинг (кюреты Грейси)",
		});
	}

	// 3. Anticoagulants -> Bleeding risk
	if (profile.takesAnticoagulants || profile.hasAnticoagulantTherapy) {
		const name = profile.anticoagulantName ? ` (${profile.anticoagulantName})` : "";
		badges.push({
			id: "anticoagulant",
			testId: "visit-focus-anticoagulant-alert",
			shortLabel: "АК",
			fullLabel: `АНТИКОАГУЛЯНТЫ${name}`,
			title: `Прием антикоагулянтов/дезагрегантов${name}: риск профузного кровотечения, местный гемостаз`,
			severity: "critical",
			actionHint: "Гемостатическая губка, шовный материал, контроль гемостаза в кресле",
		});
	}

	// 4. Diabetes Mellitus -> Hypoglycemia risk, delayed wound healing
	if (profile.hasDiabetesMellitus) {
		const typeLabel =
			profile.diabetesType && profile.diabetesType !== "unknown"
				? ` (${profile.diabetesType})`
				: "";
		badges.push({
			id: "diabetes",
			testId: "visit-focus-diabetes-alert",
			shortLabel: "ДИАБЕТ",
			fullLabel: `САХАРНЫЙ ДИАБЕТ${typeLabel}`,
			title: `Сахарный диабет${typeLabel}: риск гипогликемии, контроль витальных функций, антисептический протокол`,
			severity: "warning",
			actionHint:
				"Короткие утренние приемы, глюкоза/сок при слабости, атравматичный протокол",
		});
	}

	// 5. Pregnancy & Lactation -> Gestational limits (Yellow / warning badge)
	if (profile.pregnancyTrimester && profile.pregnancyTrimester !== "none") {
		let pregTrimesterText = "I/II/III триместр";
		if (profile.pregnancyTrimester === "trimester_1") pregTrimesterText = "I триместр (1 ТРИМ.)";
		else if (profile.pregnancyTrimester === "trimester_2") pregTrimesterText = "II триместр (2 ТРИМ.)";
		else if (profile.pregnancyTrimester === "trimester_3") pregTrimesterText = "III триместр (3 ТРИМ.)";
		else if (profile.pregnancyTrimester === "lactation") pregTrimesterText = "ГВ / ЛАКТАЦИЯ";

		badges.push({
			id: "pregnancy",
			testId: "visit-focus-pregnancy-alert",
			shortLabel: "БЕРЕМ.",
			fullLabel: `Беременность (${pregTrimesterText}) — ограничение адреналина и рентгена`,
			title: `Период гестации/лактации: ${pregTrimesterText} — ограничения на вазоконстрикторы (адреналин <= 1:200000) и рентген`,
			severity: "warning",
			actionHint:
				"Анестетик без вазоконстриктора или 1:200000, фартук при рентгене, комфортное положение",
		});
	}

	// 6. Bisphosphonates -> Osteonecrosis (MRONJ/БОНЧ) risk
	if (profile.takesBisphosphonates || profile.hasBisphosphonateTherapy) {
		const drug = profile.bisphosphonateName ? ` (${profile.bisphosphonateName})` : "";
		badges.push({
			id: "bisphosphonates",
			testId: "visit-focus-bisphosphonates-alert",
			shortLabel: "БОНЧ",
			fullLabel: `БИСФОСФОНАТЫ${drug}`,
			title: `Прием бисфосфонатов/антирезорбтивных средств${drug}: риск медикаментозного остеонекроза челюсти (MRONJ/БОНЧ)`,
			severity: "critical",
			actionHint:
				"Атравматичное удаление, отказ от костной пластики без консилиума, заживление первичным натяжением",
		});
	}

	// 7. Bronchial Asthma -> Bronchospasm risk (Yellow / warning badge)
	if (profile.hasBronchialAsthma || profile.hasAsthma) {
		badges.push({
			id: "asthma",
			testId: "visit-focus-asthma-alert",
			shortLabel: "АСТМА",
			fullLabel: "Бронхиальная астма: риск бронхоспазма, ингалятор наготове",
			title:
				"Бронхиальная астма: риск бронхоспазма, ингалятор сальбутамола наготове, исключить аспирин и сульфиты",
			severity: "warning",
			actionHint:
				"Проверить наличие собственного ингалятора (Сальбутамол), избегать аспирина и НПВП",
		});
	}

	// 8. Epilepsy -> Seizure risk (Yellow / warning badge)
	if (profile.hasEpilepsy) {
		badges.push({
			id: "epilepsy",
			testId: "visit-focus-epilepsy-alert",
			shortLabel: "ЭПИЛЕПСИЯ",
			fullLabel: "Эпилепсия: противосудорожная готовность, защита от световых триггеров",
			title:
				"Эпилепсия: риск судорожного припадка, избегать ярких световых вспышек фотополимеризатора",
			severity: "warning",
			actionHint:
				"Защитные очки при полимеризации, готовность диазепама и фиксации дыхательных путей",
		});
	}

	return badges;
}

/**
 * Green physiological norm badge when patient has 0 contraindications
 */
export const CANONICAL_SOMATIC_NORM_BADGE: DentalContraindicationBadge = Object.freeze({
	id: "somatic-norm",
	testId: "visit-somatic-norm-badge",
	shortLabel: "Норма",
	fullLabel: CANONICAL_SOMATIC_NORM_SHORT,
	title: "Соматический статус: физиологическая норма, противопоказаний не выявлено",
	severity: "healthy" as const,
	actionHint: "Патологий не выявлено. Врач правит только выявленную патологию.",
});

export interface PatientSomaticGuardStatus {
	readonly isHealthyNorm: boolean;
	readonly badges: readonly DentalContraindicationBadge[];
	readonly criticalBadges: readonly DentalContraindicationBadge[];
	readonly warningBadges: readonly DentalContraindicationBadge[];
	readonly hasCriticalAllergy: boolean;
	readonly normBadge: DentalContraindicationBadge | null;
}

/**
 * Evaluates full chairside allergo-somatic guard status for patient workspace & visit header.
 */
export function getPatientSomaticGuardStatus(
	profile?: SomaticProfileInput | null,
	allergyText?: string | null,
): PatientSomaticGuardStatus {
	const badges = extractDentalContraindicationBadges(profile, allergyText);
	const criticalBadges = badges.filter((b) => b.severity === "critical");
	const warningBadges = badges.filter((b) => b.severity === "warning");
	const isHealthyNorm = badges.length === 0;

	return {
		isHealthyNorm,
		badges,
		criticalBadges,
		warningBadges,
		hasCriticalAllergy: criticalBadges.some((b) => b.id === "allergy"),
		normBadge: isHealthyNorm ? CANONICAL_SOMATIC_NORM_BADGE : null,
	};
}

