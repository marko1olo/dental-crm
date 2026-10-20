/**
 * packages/shared/src/clinical/somaticCatalog.ts
 *
 * Single Canonical SSOT Catalog for Chairside Somatic Safety, Dental Allergens & Clinical Stop-Factors.
 *
 * CONSTITUTIONAL MANDATES:
 * - Mandate 8e: Doctor Autonomy (1-click physiological norm, 0 disabled buttons, doctor edits pathology only).
 * - Mandate 8i: Ambulatory Dental Context (chairside risks: local anesthetics, antibiotics, cardiovascular,
 *   pacemaker -> ultrasonic scaler ban, anticoagulants -> bleeding risk, bisphosphonates -> MRONJ/БОНЧ,
 *   diabetes & pregnancy; zero hospital inpatient bloat).
 * - Mandate 8k: Friction-Killer Law (1-click presets, rapid 043/u text generation).
 * - Mandate 8s: Single Canonical Authority (Zero duplicate parallel definitions).
 * - Mandate 8d item 7: Sanctity of Medical Records (Zero cartoon emojis, strictly clinical nomenclature).
 */

export {
	type SomaticStopFactorDefinition,
	DENTAL_SOMATIC_STOP_FACTOR_CATALOG,
	DENTAL_SOMATIC_STOP_FACTOR_MAP,
} from "./somaticStopFactorsCatalog.js";

// =========================================================================================================
// 1. CANONICAL TEXT FORMULATIONS & PRESETS (FORM 043/u)
// =========================================================================================================

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

// =========================================================================================================
// 2. DOMAIN TYPES AND ENUMS
// =========================================================================================================

export type SomaticRiskLevel = "critical" | "warning" | "healthy";

export type AllergenCategory = "anesthetics" | "antibiotics" | "materials" | "preservatives" | "other";

export type SomaticStopCategory =
	| "allergy"
	| "cardiovascular"
	| "anticoagulants"
	| "bisphosphonates"
	| "diabetes_pregnancy"
	| "pacemaker"
	| "respiratory"
	| "neurological"
	| "infections"
	| "other";

export type SomaticPregnancyTrimester =
	| "none"
	| "trimester_1"
	| "trimester_2"
	| "trimester_3"
	| "lactation";

/**
 * Structured definition of a dental allergen
 */
export interface DentalAllergenDefinition {
	readonly id: string;
	readonly name: string;
	readonly category: AllergenCategory;
	readonly riskLevel: SomaticRiskLevel;
	readonly isCritical: boolean;
	readonly tradeNames: readonly string[];
	readonly tradeNamesHint: string;
	readonly icd10Codes: readonly string[];
	readonly prohibitions: readonly string[];
	readonly alternatives: string;
	readonly antibioticAlternative?: string | undefined;
	readonly keywords: readonly string[];
	readonly flagProperty?: string | undefined;
}

// =========================================================================================================
// 3. CANONICAL DENTAL ALLERGENS CATALOG (SSOT)
// =========================================================================================================

export const DENTAL_ALLERGEN_CATALOG: readonly DentalAllergenDefinition[] = [
	{
		id: "articaine",
		name: "Артикаин",
		category: "anesthetics",
		riskLevel: "critical",
		isCritical: true,
		tradeNames: ["Ультракаин", "Септанест", "Убистезин", "Брилокаин"],
		tradeNamesHint: "Ультракаин, Убистезин, Септанест, Брилокаин",
		icd10Codes: ["Z88.4", "T88.6"],
		prohibitions: [
			"Категорический запрет любых 4% артикаин-содержащих растворов (Ультракаин Д-С, Ультракаин Форте, Септанест, Убистезин, Брилокаин).",
		],
		alternatives:
			"Препарат выбора: Мепивакаин 3% без вазоконстриктора (Скандонест 3% / Мепивастезин) либо Лидокаин 2% при изолированной аллергии.",
		keywords: ["артикаин", "ультракаин", "септанест", "убистезин", "брилокаин"],
		flagProperty: "hasArticaineAllergy",
	},
	{
		id: "lidocaine",
		name: "Лидокаин",
		category: "anesthetics",
		riskLevel: "critical",
		isCritical: true,
		tradeNames: ["Ксилокаин", "Версатис", "Динексан"],
		tradeNamesHint: "Ксилокаин, спреи, инфильтрация",
		icd10Codes: ["Z88.4", "T88.6"],
		prohibitions: [
			"Категорический запрет инъекционного лидокаина и аппликационных аэрозолей/гелей на основе лидокаина.",
		],
		alternatives:
			"Препарат выбора: Мепивакаин 3% без вазоконстриктора (Скандонест 3%) либо Артикаин 1:200 000 (Ультракаин Д-С).",
		keywords: ["лидокаин", "ксилокаин", "спрей лидокаин"],
		flagProperty: "hasLidocaineAllergy",
	},
	{
		id: "mepivacaine",
		name: "Мепивакаин",
		category: "anesthetics",
		riskLevel: "warning",
		isCritical: false,
		tradeNames: ["Скандонест", "Мепивастезин", "Карбокаин"],
		tradeNamesHint: "Скандонест, Мепивастезин",
		icd10Codes: ["Z88.4"],
		prohibitions: [
			"Запрет растворов мепивакаина (Скандонест 3%, Мепивастезин).",
		],
		alternatives:
			"Препарат выбора: Артикаин 1:200 000 (Ультракаин Д-С) в минимальной дозировке с предварительной аспирационной пробой.",
		keywords: ["мепивакаин", "скандонест", "мепивастезин"],
		flagProperty: "hasMepivacaineAllergy",
	},
	{
		id: "novocaine",
		name: "Новокаин / Прокаин",
		category: "anesthetics",
		riskLevel: "warning",
		isCritical: false,
		tradeNames: ["Прокаин", "Дикаин", "Тетракаин", "Анестезин", "Бензокаин"],
		tradeNamesHint: "Эфирные анестетики, бензокаин, анестезин",
		icd10Codes: ["Z88.4"],
		prohibitions: [
			"Запрет применения сложных эфиров парааминобензойной кислоты (новокаин, анестезин, дикаин).",
		],
		alternatives:
			"Амидные анестетики (Артикаин 4% 1:200 000 либо Мепивакаин 3% без вазоконстриктора) безопасны ввиду отсутствия перекрестной аллергии.",
		keywords: ["новокаин", "прокаин", "дикаин", "тетракаин", "анестезин", "бензокаин"],
		flagProperty: "hasNovocaineAllergy",
	},
	{
		id: "penicillin",
		name: "Пенициллиновый ряд",
		category: "antibiotics",
		riskLevel: "critical",
		isCritical: true,
		tradeNames: ["Амоксиклав", "Аугментин", "Флемоксин", "Ампициллин", "Оксациллин"],
		tradeNamesHint: "Амоксиклав, Аугментин, Флемоксин, Солютаб",
		icd10Codes: ["Z88.0", "T88.6"],
		prohibitions: [
			"Категорический запрет назначения Амоксиклава, Аугментина, Флемоксина и других аминопенициллинов.",
			"С осторожностью применять цефалоспорины (риск перекрестной аллергии 5-10%).",
		],
		alternatives:
			"Антибиотики резерва: Клиндамицин 300 мг (линкозамиды) либо Азитромицин 500 мг / Кларитромицин 500 мг (макролиды).",
		antibioticAlternative: "Клиндамицин 300 мг (2 р/сут) или Азитромицин 500 мг (1 р/сут)",
		keywords: ["пенициллин", "амоксициллин", "амоксиклав", "аугментин", "флемоксин", "ампициллин"],
		flagProperty: "hasPenicillinAllergy",
	},
	{
		id: "macrolides",
		name: "Макролиды",
		category: "antibiotics",
		riskLevel: "warning",
		isCritical: false,
		tradeNames: ["Азитромицин", "Сумамед", "Кларитромицин", "Клацид", "Вильпрафен"],
		tradeNamesHint: "Кларитромицин, Азитромицин, Сумамед",
		icd10Codes: ["Z88.0"],
		prohibitions: ["Запрет назначения макролидных антибиотиков."],
		alternatives: "Линкозамиды (Клиндамицин 300 мг) либо Амоксиклав (при отсутствии аллергии на пенициллины).",
		keywords: ["макролид", "азитромицин", "сумамед", "кларитромицин", "клацид"],
	},
	{
		id: "lincosamides",
		name: "Линкозамиды",
		category: "antibiotics",
		riskLevel: "warning",
		isCritical: false,
		tradeNames: ["Клиндамицин", "Далацин", "Линкомицин"],
		tradeNamesHint: "Клиндамицин, Линкомицин",
		icd10Codes: ["Z88.0"],
		prohibitions: ["Запрет назначения клиндамицина и линкомицина."],
		alternatives: "Макролиды (Азитромицин 500 мг, Кларитромицин) либо защищенные пенициллины.",
		keywords: ["линкозамид", "клиндамицин", "линкомицин"],
	},
	{
		id: "latex",
		name: "Латекс",
		category: "materials",
		riskLevel: "warning",
		isCritical: false,
		tradeNames: ["Натуральный каучук", "Латексные перчатки", "Латексный коффердам"],
		tradeNamesHint: "Коффердам, перчатки — нитриловый протокол",
		icd10Codes: ["Z91.0"],
		prohibitions: [
			"Запрет использования латексных перчаток, стандартных латексных платков раббердама и латексных оттискных ложек.",
		],
		alternatives:
			"Беслатексный протокол: нитриловые перчатки, силиконовые или полиизопреновые платки коффердама (Sanctuary Non-Latex, Nic Tone Non-Latex).",
		keywords: ["латекс", "каучук", "латексный"],
		flagProperty: "hasLatexAllergy",
	},
	{
		id: "metals",
		name: "Металлы / Никель",
		category: "materials",
		riskLevel: "warning",
		isCritical: false,
		tradeNames: ["Никель-хромовый сплав (НХС)", "Кобальт-хромовый сплав (КХС)"],
		tradeNamesHint: "КХС, НХС, коронки, брекеты",
		icd10Codes: ["L23.0"],
		prohibitions: ["Запрет применения никельсодержащих сплавов в ортопедии и ортодонтии."],
		alternatives:
			"Безметалловые конструкции: диоксид циркония (ZrO2), полевошпатная керамика E.max, титановые имплантаты Grade 4/5.",
		keywords: ["никель", "металл", "нхс", "кхс"],
	},
	{
		id: "iodine",
		name: "Йод / Йодоформ",
		category: "materials",
		riskLevel: "warning",
		isCritical: false,
		tradeNames: ["Альвожил", "Метапекс", "Бетадин", "Йодоформная турунда"],
		tradeNamesHint: "Альвожил, Метапекс, Бетадин, йодоформ",
		icd10Codes: ["Z88.8"],
		prohibitions: [
			"Запрет применения антисептических повязок с йодоформом (Альвожил), паст для пломбирования каналов с йодоформом (Метапекс), растворов Бетадина.",
		],
		alternatives:
			"Альтернативный гемостаз и антисептика: гемостатическая губка с коллагеном, хлоргексидин 0.05-0.12%, гидроксид кальция без йодоформа (Каласепт, Ультракал).",
		keywords: ["йод", "йодоформ", "альвожил", "метапекс", "бетадин"],
		flagProperty: "hasIodineAllergy",
	},
	{
		id: "nsaid",
		name: "НПВП / Аспирин",
		category: "materials",
		riskLevel: "critical",
		isCritical: true,
		tradeNames: ["Аспирин", "Кеторол", "Кеторолак", "Ибупрофен", "Нимесил", "Диклофенак"],
		tradeNamesHint: "Аспириновая триада, Кеторол, Ибупрофен, Нимесил",
		icd10Codes: ["Z88.6", "T88.6"],
		prohibitions: [
			"Категорический запрет назначения аспирина, кеторолака, ибупрофена, нимесулида и классических НПВП (риск астматического статуса и тяжелого бронхоспазма!).",
		],
		alternatives:
			"Купирование боли: Парацетамол 500-1000 мг (до 4 г/сут) либо селективные ингибиторы ЦОГ-2 с осторожностью.",
		keywords: ["нпвп", "нпвс", "аспирин", "кеторол", "кеторолак", "ибупрофен", "нимесил", "диклофенак"],
		flagProperty: "hasNsaidAllergy",
	},
	{
		id: "sulfites",
		name: "Сульфиты / Консерванты вазоконстрикторов",
		category: "preservatives",
		riskLevel: "critical",
		isCritical: true,
		tradeNames: ["Метабисульфит натрия (E223)", "Пиросульфит"],
		tradeNamesHint: "E223, консервант адреналина в карпулах",
		icd10Codes: ["Z88.8", "T88.6"],
		prohibitions: [
			"СТРОГИЙ ЗАПРЕТ применения любых анестетиков с вазоконстриктором (адреналином/эпинефрином), так как стабилизатором является сульфит натрия!",
		],
		alternatives:
			"Препарат выбора: Мепивакаин 3% без вазоконстриктора (Скандонест 3% / Мепивастезин) — не содержит сульфитов и адреналина.",
		keywords: ["сульфит", "метабисульфит", "пиросульфит", "е223", "e223"],
		flagProperty: "hasSulfitesAllergy",
	},
] as const;

export const ALLERGY_REACTIONS = [
	"Крапивница / кожный зуд",
	"Отёк Квинке",
	"Анафилактический шок",
	"Бронхоспазм / удушье",
	"Местная гиперемия",
] as const;

export const DENTAL_ALLERGEN_MAP: Readonly<Record<string, DentalAllergenDefinition>> = Object.freeze(
	Object.fromEntries(DENTAL_ALLERGEN_CATALOG.map((item) => [item.id, item])),
);

// =========================================================================================================
// 4. RAPID 1-CLICK SOMATIC PROFILE & PRESETS (MANDATES 8e, 8k)
// =========================================================================================================

export interface CanonicalHealthySomaticProfile {
	readonly hasArticaineAllergy: false;
	readonly hasLidocaineAllergy: false;
	readonly hasMepivacaineAllergy: false;
	readonly hasNovocaineAllergy: false;
	readonly hasProcaineAllergy: false;
	readonly hasPenicillinAllergy: false;
	readonly hasNsaidAllergy: false;
	readonly hasLatexAllergy: false;
	readonly hasSulfitesAllergy: false;
	readonly hasIodineAllergy: false;
	readonly hasAnaphylaxisHistory: false;
	readonly hasHypertension: false;
	readonly hasHypertensiveCrisisHistory: false;
	readonly hasMyocardialInfarctionRecent: false;
	readonly hasRecentInfarction: false;
	readonly hasPacemakerExs: false;
	readonly takesAnticoagulants: false;
	readonly hasAnticoagulantTherapy: false;
	readonly anticoagulantName: "";
	readonly takesBisphosphonates: false;
	readonly hasBisphosphonateTherapy: false;
	readonly bisphosphonateName: "";
	readonly hasDiabetesMellitus: false;
	readonly isDiabetesDecompensated: false;
	readonly diabetesType: "unknown";
	readonly pregnancyTrimester: "none";
	readonly hasBronchialAsthma: false;
	readonly hasAsthma: false;
	readonly hasEpilepsy: false;
	readonly hasHepatitis: false;
	readonly hasHiv: false;
	readonly customAllergyNotes: string;
	readonly customChronicNotes: string;
	readonly isSomaticNormConfirmed: true;
}

export const DEFAULT_CANONICAL_HEALTHY_SOMATIC_PROFILE: CanonicalHealthySomaticProfile = Object.freeze({
	hasArticaineAllergy: false,
	hasLidocaineAllergy: false,
	hasMepivacaineAllergy: false,
	hasNovocaineAllergy: false,
	hasProcaineAllergy: false,
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
	hasPacemakerExs: false,
	takesAnticoagulants: false,
	hasAnticoagulantTherapy: false,
	anticoagulantName: "",
	takesBisphosphonates: false,
	hasBisphosphonateTherapy: false,
	bisphosphonateName: "",
	hasDiabetesMellitus: false,
	isDiabetesDecompensated: false,
	diabetesType: "unknown",
	pregnancyTrimester: "none",
	hasBronchialAsthma: false,
	hasAsthma: false,
	hasEpilepsy: false,
	hasHepatitis: false,
	hasHiv: false,
	customAllergyNotes: "Аллергии отрицает. Аллергоанамнез не отягощен.",
	customChronicNotes: CANONICAL_SOMATIC_HEALTHY_NORM_TEXT,
	isSomaticNormConfirmed: true,
});

export interface SomaticQuickChip {
	readonly id: string;
	readonly label: string;
	readonly category: "allergy" | "somatic";
	readonly riskLevel: SomaticRiskLevel;
	readonly testId: string;
	readonly flagProperty: string;
}

export const SOMATIC_QUICK_CHIPS: readonly SomaticQuickChip[] = [
	{ id: "penicillin", label: "Пенициллин", category: "allergy", riskLevel: "critical", testId: "toggle-allergy-penicillin", flagProperty: "hasPenicillinAllergy" },
	{ id: "lidocaine", label: "Лидокаин", category: "allergy", riskLevel: "critical", testId: "toggle-allergy-lidocaine", flagProperty: "hasLidocaineAllergy" },
	{ id: "articaine", label: "Артикаин", category: "allergy", riskLevel: "critical", testId: "toggle-allergy-articaine", flagProperty: "hasArticaineAllergy" },
	{ id: "latex", label: "Латекс", category: "allergy", riskLevel: "warning", testId: "toggle-allergy-latex", flagProperty: "hasLatexAllergy" },
	{ id: "iodine", label: "Йод (Альвожил)", category: "allergy", riskLevel: "warning", testId: "toggle-allergy-iodine", flagProperty: "hasIodineAllergy" },
	{ id: "hypertension", label: "Гипертония (АД)", category: "somatic", riskLevel: "warning", testId: "toggle-hypertension", flagProperty: "hasHypertension" },
	{ id: "pacemaker", label: "ЭКС (Запрет УЗ)", category: "somatic", riskLevel: "critical", testId: "toggle-pacemaker", flagProperty: "hasPacemakerExs" },
	{ id: "anticoagulants", label: "Антикоагулянты", category: "somatic", riskLevel: "critical", testId: "toggle-anticoagulants", flagProperty: "takesAnticoagulants" },
	{ id: "bisphosphonates", label: "Бисфосфонаты (БОНЧ)", category: "somatic", riskLevel: "critical", testId: "toggle-bisphosphonates", flagProperty: "takesBisphosphonates" },
] as const;

// =========================================================================================================
// 5. CANONICAL VALIDATORS & DETECTION HELPERS
// =========================================================================================================

export function isNegativeAllergyOrSomaticStatement(text?: string | string[] | null | unknown): boolean {
	if (!text) return true;
	if (Array.isArray(text)) {
		if (text.length === 0) return true;
		return text.every((item) => isNegativeAllergyOrSomaticStatement(item));
	}
	if (typeof text !== "string") return true;
	const trimmed = text.trim();
	if (!trimmed) return true;
	const lower = trimmed.toLowerCase();

	if (/^[-—–._\s/]*$/.test(trimmed) || /^(нет|none|no|n\/a|0)$/i.test(trimmed)) {
		return true;
	}

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

export function isSomaticTextPhysiologicalNorm(text?: string | null): boolean {
	if (!text) return true;
	const trimmed = text.trim();
	if (!trimmed) return true;
	const lower = trimmed.toLowerCase();

	const hasNormIndicator =
		lower.includes("соматически здоров") ||
		lower.includes("физиологическая норма") ||
		lower.includes("патологий не заявлено") ||
		lower.includes("аллергоанамнез не отягощен");

	const hasActiveContraindication =
		(lower.includes("аллергия") &&
			!lower.includes("отрицает") &&
			!lower.includes("не отягощен") &&
			!lower.includes("не отмечен")) ||
		lower.includes("кардиостимулятор") ||
		(lower.includes("антикоагулянт") &&
			!lower.includes("не принимает") &&
			!lower.includes("отрицает")) ||
		(lower.includes("бисфосфонат") &&
			!lower.includes("не принимает") &&
			!lower.includes("отрицает")) ||
		lower.includes("сахарный диабет декомпенсированный");

	return hasNormIndicator && !hasActiveContraindication;
}
