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
	readonly severity: "critical" | "warning";
	readonly actionHint: string;
}

/**
 * Interface matching patient safety profile fields relevant to dental contraindications
 */
export interface SomaticProfileInput {
	readonly hasArticaineAllergy?: boolean | null;
	readonly hasLidocaineAllergy?: boolean | null;
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

	// 1. Allergies
	if (allergyText && allergyText.trim()) {
		badges.push({
			id: "allergy",
			testId: "visit-focus-allergy-alert",
			shortLabel: "АЛЛЕРГИЯ",
			fullLabel: `АЛЛЕРГИЯ: ${allergyText.trim()}`,
			title: `Критический стоп-фактор / аллергия пациента: ${allergyText.trim()}`,
			severity: "critical",
			actionHint: "Исключить аллерген, подготовить антигистаминную/противошоковую укладку",
		});
	} else if (profile) {
		const specificAllergies: string[] = [];
		if (profile.hasArticaineAllergy) specificAllergies.push("Артикаин");
		if (profile.hasLidocaineAllergy) specificAllergies.push("Лидокаин");
		if (profile.hasMepivacaineAllergy) specificAllergies.push("Мепивакаин");
		if (profile.hasPenicillinAllergy) specificAllergies.push("Пенициллины");
		if (profile.hasNsaidAllergy) specificAllergies.push("НПВП");
		if (profile.hasLatexAllergy) specificAllergies.push("Латекс");
		if (profile.hasSulfitesAllergy) specificAllergies.push("Сульфиты");
		if (profile.hasIodineAllergy) specificAllergies.push("Йод");
		if (profile.hasAnaphylaxisHistory) specificAllergies.push("Анафилаксия в анамнезе");

		if (specificAllergies.length > 0 || (profile.customAllergyNotes && profile.customAllergyNotes.trim())) {
			const label = specificAllergies.length > 0 ? specificAllergies.join(", ") : (profile.customAllergyNotes || "");
			badges.push({
				id: "allergy",
				testId: "visit-focus-allergy-alert",
				shortLabel: "АЛЛЕРГИЯ",
				fullLabel: `АЛЛЕРГИЯ: ${label}`,
				title: `Критический стоп-фактор / аллергия пациента: ${label}`,
				severity: "critical",
				actionHint: "Исключить аллерген, подготовить антигистаминную/противошоковую укладку",
			});
		}
	}

	if (!profile) return badges;

	// 2. Pacemaker (ЭКС) -> Prohibition of ultrasonic scaler
	if (profile.hasPacemakerExs) {
		badges.push({
			id: "pacemaker",
			testId: "visit-focus-pacemaker-alert",
			shortLabel: "ЭКС",
			fullLabel: "ЭКС: ЗАПРЕТ УЗ",
			title: "Имплантированный кардиостимулятор (ЭКС): абсолютный запрет УЗ-скейлинга и монополярной электрокоагуляции",
			severity: "critical",
			actionHint: "Ручной скейлинг (кюреты Грейси), запрет ультразвуковых генераторов",
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
		const typeLabel = profile.diabetesType && profile.diabetesType !== "unknown" ? ` (${profile.diabetesType})` : "";
		badges.push({
			id: "diabetes",
			testId: "visit-focus-diabetes-alert",
			shortLabel: "ДИАБЕТ",
			fullLabel: `САХАРНЫЙ ДИАБЕТ${typeLabel}`,
			title: `Сахарный диабет${typeLabel}: риск гипогликемии, контроль витальных функций, антисептический протокол`,
			severity: "warning",
			actionHint: "Короткие утренние приемы, глюкоза/сок при слабости, атравматичный протокол",
		});
	}

	// 5. Pregnancy & Lactation -> Gestational limits
	if (profile.pregnancyTrimester && profile.pregnancyTrimester !== "none") {
		const pregLabel =
			profile.pregnancyTrimester === "lactation"
				? "ГВ / ЛАКТАЦИЯ"
				: `БЕРЕМЕННОСТЬ (${profile.pregnancyTrimester === "trimester_1" ? "1 ТРИМ." : profile.pregnancyTrimester === "trimester_3" ? "3 ТРИМ." : "2 ТРИМ."})`;
		badges.push({
			id: "pregnancy",
			testId: "visit-focus-pregnancy-alert",
			shortLabel: "БЕРЕМ.",
			fullLabel: pregLabel,
			title: `Период гестации/лактации: ${pregLabel} — ограничения на вазоконстрикторы (адреналин <= 1:200000) и рентген`,
			severity: "warning",
			actionHint: "Анестетик без вазоконстриктора или 1:200000, фартук при рентгене, комфортное положение",
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
			actionHint: "Атравматичное удаление, отказ от костной пластики без консилиума, заживление первичным натяжением",
		});
	}

	return badges;
}
