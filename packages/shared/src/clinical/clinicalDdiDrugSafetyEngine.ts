/**
 * clinicalDdiDrugSafetyEngine.ts
 * Clinical Drug-Drug Interaction (DDI), Allergy Cross-Reactivity & Somatic Safety Engine.
 *
 * Statutory, Pharmacological & Clinical Standards:
 * - Federal Law No. 323-FZ "On Fundamentals of Health Protection of Citizens in the Russian Federation" (Art. 64).
 * - Clinical recommendations of the Dental Association of Russia (СтАР) on pharmacotherapy of odontogenic infections and anesthesia.
 * - State Register of Medicines of the Ministry of Health of the Russian Federation (ГРЛС Минздрава РФ).
 * - Order of the Ministry of Health of the Russian Federation No. 1094n (Rules for prescribing and dispensing medicines, Form 107-1/у).
 * - National guidelines on clinical pharmacology and emergency medical care in outpatient dentistry.
 */

import { z } from "zod";

// ─────────────────────────────────────────────────────────────────────────────
// 1. ZOD SCHEMAS & CONTRACTS
// ─────────────────────────────────────────────────────────────────────────────

export const ddiSeveritySchema = z.enum([
	"critical", // Абсолютно противопоказано (угроза жизни, фатальное кровотечение, анафилаксия, криз)
	"high", // Высокий риск (требуется отмена или коррекция дозы / гастропротекция)
	"moderate", // Умеренное взаимодействие (требуется клинический мониторинг)
	"minor", // Незначительное взаимодействие
]);
export type DdiSeverity = z.infer<typeof ddiSeveritySchema>;

export const safetyRiskLevelSchema = z.enum([
	"safe", // Назначение безопасно
	"caution", // Назначение допустимо с предосторожностями
	"critical_danger", // Обнаружены критические противопоказания (назначение заблокировано)
]);
export type SafetyRiskLevel = z.infer<typeof safetyRiskLevelSchema>;

export const drugSafetyAuditInputSchema = z.object({
	patientId: z.string().optional(),
	organizationId: z.string().optional(),
	proposedMedications: z
		.array(z.string().min(1))
		.min(1, "Укажите хотя бы один назначаемый препарат"),
	existingMedications: z.array(z.string()).optional().default([]),
	patientConditions: z.array(z.string()).optional().default([]),
	knownAllergies: z.array(z.string()).optional().default([]),
	patientAgeYears: z.number().optional(),
	patientWeightKg: z.number().optional(),
});
export type DrugSafetyAuditInput = z.input<typeof drugSafetyAuditInputSchema>;

export interface ClinicalAllergyWarning {
	readonly allergenGroup: string;
	readonly proposedDrug: string;
	readonly severity: DdiSeverity;
	readonly manifestationsRu: string;
	readonly clinicalActionRu: string;
}

export interface ClinicalDdiInteraction {
	readonly primaryDrug: string;
	readonly interactingDrug: string;
	readonly severity: DdiSeverity;
	readonly effectDescriptionRu: string;
	readonly clinicalRecommendationRu: string;
}

export interface ClinicalConditionContraindication {
	readonly condition: string;
	readonly proposedDrug: string;
	readonly severity: DdiSeverity;
	readonly reasonRu: string;
	readonly clinicalGuidanceRu: string;
}

export interface SafeAlternativeRecommendation {
	readonly originalDrug: string;
	readonly recommendedAlternatives: readonly string[];
	readonly rationaleRu: string;
}

export interface ClinicalDrugSafetyAuditResult {
	readonly isSafe: boolean;
	readonly riskLevel: SafetyRiskLevel;
	readonly hasAllergyClash: boolean;
	readonly hasSevereDdi: boolean;
	readonly hasConditionContraindication: boolean;
	readonly blockedPrescriptions: readonly string[];
	readonly allergyWarnings: readonly ClinicalAllergyWarning[];
	readonly drugInteractions: readonly ClinicalDdiInteraction[];
	readonly conditionContraindications: readonly ClinicalConditionContraindication[];
	readonly safeAlternativeRecommendations: readonly SafeAlternativeRecommendation[];
	readonly summaryRu: string;
	readonly evaluatedAtIso: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. PHARMACOLOGICAL KNOWLEDGE BASE & NORMALIZERS
// ─────────────────────────────────────────────────────────────────────────────

export interface DrugClassMatcher {
	readonly classId: string;
	readonly labelRu: string;
	readonly keywords: readonly string[];
}

export const DRUG_CLASS_MATCHERS: readonly DrugClassMatcher[] = [
	{
		classId: "penicillin_beta_lactam",
		labelRu: "Пенициллины и бета-лактамы",
		keywords: [
			"amox",
			"амокс",
			"amoxicillin",
			"амоксициллин",
			"amoxiclav",
			"амоксиклав",
			"augmentin",
			"аугментин",
			"flemoxin",
			"флемоксин",
			"ampicillin",
			"ампициллин",
			"penicillin",
			"пенициллин",
			"пеницилин",
			"sultamicillin",
			"сультамициллин",
			"unasyn",
			"уназин",
			"cefal",
			"cefaz",
			"цефазолин",
			"цефалексин",
			"ceftriaxone",
			"цефтриаксон",
			"cefixime",
			"цефиксим",
			"suprax",
			"супракс",
			"бета-лактам",
			"beta_lactam",
		],
	},
	{
		classId: "nsaid",
		labelRu: "НПВС / Анальгетики-антипиретики",
		keywords: [
			"ibu",
			"ибупрофен",
			"ибуклин",
			"nurofen",
			"нурофен",
			"ketorol",
			"кеторолак",
			"ketorolac",
			"ketanov",
			"кетанов",
			"ketorol",
			"кеторол",
			"ketoprofen",
			"кетопрофен",
			"ketonal",
			"кетонал",
			"dexketoprofen",
			"декскетопрофен",
			"dexalgin",
			"дексалгин",
			"diclofenac",
			"диклофенак",
			"voltaren",
			"вольтарен",
			"nimesulide",
			"нимесулид",
			"nimesil",
			"нимесил",
			"nise",
			"найз",
			"meloxicam",
			"мелоксикам",
			"movalis",
			"мовалис",
			"aspirin",
			"аспирин",
			"ацетилсалициловая",
			"acetylsalicylic",
			"нпвс",
			"нпвп",
			"nsaid",
		],
	},
	{
		classId: "anticoagulant_antiplatelet",
		labelRu: "Антикоагулянты и дезагреганты",
		keywords: [
			"warfarin",
			"варфарин",
			"xarelto",
			"ксарелто",
			"rivaroxaban",
			"ривароксабан",
			"eliquis",
			"эликвис",
			"apixaban",
			"апиксабан",
			"pradaxa",
			"прадакса",
			"dabigatran",
			"дабигатран",
			"clopidogrel",
			"клопидогрел",
			"plavix",
			"плавикс",
			"brilinta",
			"брилинта",
			"ticagrelor",
			"тикагрелор",
			"heparin",
			"гепарин",
			"clexane",
			"клексан",
			"enoxaparin",
			"эноксапарин",
			"anticoagulant",
			"антикоагулянт",
			"дезагрегант",
			"doac",
			"поак",
		],
	},
	{
		classId: "metronidazole",
		labelRu: "Метронидазол / Нитроимидазолы",
		keywords: [
			"metron",
			"метронидазол",
			"трихопол",
			"trichopol",
			"flagyl",
			"флагил",
			"клион",
			"klion",
			"metrogyl",
			"метрогил",
		],
	},
	{
		classId: "epinephrine_anesthetic",
		labelRu: "Местные анестетики с эпинефрином (адреналином)",
		keywords: [
			"1:100",
			"1:200",
			"1:100000",
			"1:200000",
			"1:100 000",
			"1:200 000",
			"эпинефрин",
			"адреналин",
			"epinephrine",
			"adrenaline",
			"ultracain",
			"ультракаин",
			"septanest",
			"септанест",
			"ubistesin",
			"убистезин",
			"alphacaine",
			"альфакаин",
			"articaine_4_epi",
			"lidocaine_2_epi",
		],
	},
	{
		classId: "sulfite_preservative",
		labelRu: "Сульфиты / Метабисульфит натрия (E223)",
		keywords: [
			"сульфит",
			"метабисульфит",
			"дисульфит",
			"sulfite",
			"bisulfite",
			"metabisulfite",
			"e223",
		],
	},
	{
		classId: "beta_blocker_non_selective",
		labelRu: "Неселективные бета-адреноблокаторы",
		keywords: [
			"propranolol",
			"пропранолол",
			"anaprilin",
			"анаприлин",
			"sotalol",
			"соталол",
			"sotagamma",
			"сотагексал",
			"timolol",
			"тимолол",
			"non_selective_beta_blockers",
		],
	},
	{
		classId: "paracetamol",
		labelRu: "Парацетамол / Ацетаминофен",
		keywords: [
			"paracetamol",
			"парацетамол",
			"acetaminophen",
			"ацетаминофен",
			"panadol",
			"панадол",
			"efferalgan",
			"эффералган",
		],
	},
	{
		classId: "macrolide_lincosamide",
		labelRu: "Макролиды и линкозамиды",
		keywords: [
			"azithro",
			"азитромицин",
			"sumamed",
			"сумамед",
			"clindamycin",
			"клиндамицин",
			"dalacin",
			"далацин",
			"lincomycin",
			"линкомицин",
			"clarithro",
			"кларитромицин",
			"fromilid",
			"фромилид",
			"klacid",
			"клацид",
			"josamycin",
			"джозамицин",
			"vilprafen",
			"вильпрафен",
		],
	},
	{
		classId: "mepivacaine_plain",
		labelRu: "Мепивакаин без вазоконстриктора",
		keywords: [
			"mepivacaine",
			"мепивакаин",
			"scandonest",
			"скандонест",
			"mepivastesin",
			"мепивастезин",
			"mepivacaine_3_plain",
			"скандонест 3%",
		],
	},
];

/**
 * Matches a string against pharmacological class definitions.
 */
export function matchDrugClasses(text: string): string[] {
	const lower = text.toLowerCase().trim();
	const matches: string[] = [];

	for (const matcher of DRUG_CLASS_MATCHERS) {
		if (matcher.keywords.some((kw) => lower.includes(kw))) {
			matches.push(matcher.classId);
		}
	}

	return matches;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. CORE DRUG SAFETY & DDI AUDITING ALGORITHM
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Audits a proposed pharmacotherapy regimen against known patient allergies,
 * somatic conditions, and concurrent medications.
 */
export function auditClinicalDrugSafety(
	input: DrugSafetyAuditInput,
): ClinicalDrugSafetyAuditResult {
	const allergyWarnings: ClinicalAllergyWarning[] = [];
	const drugInteractions: ClinicalDdiInteraction[] = [];
	const conditionContraindications: ClinicalConditionContraindication[] = [];
	const safeAlternativeRecommendations: SafeAlternativeRecommendation[] = [];
	const blockedPrescriptions = new Set<string>();

	const normalizedConditions = (input.patientConditions || []).map((c) =>
		c.toLowerCase().trim(),
	);
	const normalizedAllergies = (input.knownAllergies || []).map((a) =>
		a.toLowerCase().trim(),
	);
	const existingMeds = input.existingMedications || [];

	// Helper flags for patient somatic profile
	const hasPenicillinAllergy =
		normalizedAllergies.some(
			(a) =>
				a.includes("пенициллин") ||
				a.includes("пеницилин") ||
				a.includes("бета-лактам") ||
				a.includes("penicillin") ||
				a.includes("amoxicillin") ||
				a.includes("амоксиклав") ||
				a.includes("аугментин"),
		);

	const hasNsaidAllergy =
		normalizedAllergies.some(
			(a) =>
				a.includes("нпвс") ||
				a.includes("нпвп") ||
				a.includes("аспирин") ||
				a.includes("nsaid") ||
				a.includes("ибупрофен") ||
				a.includes("нимесулид") ||
				a.includes("кеторолак"),
		) ||
		normalizedConditions.some(
			(c) =>
				c.includes("samter") ||
				c.includes("аспиринов") ||
				c.includes("триада"),
		);

	const hasAsthmaOrSulfiteAllergy =
		normalizedAllergies.some(
			(a) =>
				a.includes("сульфит") ||
				a.includes("метабисульфит") ||
				a.includes("дисульфит") ||
				a.includes("sulfite"),
		) ||
		normalizedConditions.some(
			(c) =>
				c.includes("asthma") ||
				c.includes("астма") ||
				c.includes("bronchial_asthma") ||
				c.includes("ба"),
		);

	const isPregnancy3rdTrimester = normalizedConditions.some(
		(c) =>
			c.includes("pregnancy_3rd_trimester") ||
			c.includes("3 триместр") ||
			c.includes("третий триместр") ||
			c.includes("беременность 3") ||
			c.includes("беременность iii"),
	);

	const hasActivePepticUlcer = normalizedConditions.some(
		(c) =>
			c.includes("peptic_ulcer") ||
			c.includes("язва") ||
			c.includes("эрозивный гастрит") ||
			c.includes("желудочное кровотечение"),
	);

	const hasSevereHypertension = normalizedConditions.some(
		(c) =>
			c.includes("гипертонический криз") ||
			c.includes("гипертония 3") ||
			c.includes("криз") ||
			c.includes("severe_hypertension"),
	);

	// ─────────────────────────────────────────────────────────────────────────
	// 3.1. PROPOSED DRUG EVALUATION (Allergy & Somatic Direct Conflicts)
	// ─────────────────────────────────────────────────────────────────────────

	for (const proposed of input.proposedMedications) {
		const classes = matchDrugClasses(proposed);

		// 1. Penicillin Allergy vs Beta-Lactams
		if (classes.includes("penicillin_beta_lactam") && hasPenicillinAllergy) {
			blockedPrescriptions.add(proposed);
			allergyWarnings.push({
				allergenGroup: "Пенициллины и бета-лактамные антибиотики",
				proposedDrug: proposed,
				severity: "critical",
				manifestationsRu:
					"Анафилактический шок, ангионевротический отек Квинке, генерализованная крапивница, синдром Стивенса-Джонсона",
				clinicalActionRu:
					"Категорически отменить препарат. Заменить на макролиды (Азитромицин) или линкозамиды (Клиндамицин).",
			});
			safeAlternativeRecommendations.push({
				originalDrug: proposed,
				recommendedAlternatives: [
					"Сумамед (Азитромицин 500 мг 1 раз/сут, 3 дня)",
					"Клиндамицин (300 мг 3-4 раза/сут, 5–7 дней)",
					"Линкомицин (500 мг 3 раза/сут)",
				],
				rationaleRu:
					"При доказанной аллергии на бета-лактамы препаратами выбора для одонтогенных инфекций являются макролиды (Азитромицин) или линкозамиды (Клиндамицин), обладающие тропностью к костной ткани челюстей.",
			});
		}

		// 2. NSAID Allergy / Samter's Triad vs NSAIDs
		if (classes.includes("nsaid") && hasNsaidAllergy) {
			blockedPrescriptions.add(proposed);
			allergyWarnings.push({
				allergenGroup: "НПВС / Салицилаты (Аспириновая триада)",
				proposedDrug: proposed,
				severity: "critical",
				manifestationsRu:
					"Тяжелый аспириновый бронхоспазм, отек гортани, анафилактоидный шок",
				clinicalActionRu:
					"Категорически отменить НПВС. Назначить Парацетамол (не угнетает ЦОГ-1 в периферических тканях).",
			});
			safeAlternativeRecommendations.push({
				originalDrug: proposed,
				recommendedAlternatives: [
					"Парацетамол (500–1000 мг до 4 раз/сут, макс 4000 мг/сут)",
					"Трамадол (50 мг перорально при некупируемом остром болевом синдроме)",
					"Местная холодовая гипотермия",
				],
				rationaleRu:
					"Парацетамол действует преимущественно на центральную нервную систему и безопасен для пациентов с непереносимостью НПВС и аспириновой астмой.",
			});
		}

		// 3. Bronchial Asthma / Sulfite Allergy vs Vasoconstrictor-containing Anesthetics
		if (classes.includes("epinephrine_anesthetic") && hasAsthmaOrSulfiteAllergy) {
			blockedPrescriptions.add(proposed);
			allergyWarnings.push({
				allergenGroup: "Сульфиты / Метабисульфит натрия (E223, антиоксидант адреналина)",
				proposedDrug: proposed,
				severity: "critical",
				manifestationsRu:
					"Острый анафилактоидный бронхоспазм, астматический статус у пациентов с бронхиальной астмой и сульфитной гиперчувствительностью",
				clinicalActionRu:
					"Запрещено вводить анестетики с вазоконстрикторами. Назначить Мепивакаин 3% (Скандонест 3% plain).",
			});
			safeAlternativeRecommendations.push({
				originalDrug: proposed,
				recommendedAlternatives: [
					"Скандонест 3% без вазоконстриктора (Мепивакаин 30 мг/мл)",
					"Мепивастезин 3% без адреналина",
					"Ультракаин Д (без консервантов и метабисульфита)",
				],
				rationaleRu:
					"Мепивакаин 3% (Скандонест) не содержит метабисульфита натрия (антиоксиданта) и обладает собственной сосудосуживающей активностью, обеспечивая надежную анестезию без риска бронхоспазма.",
			});
		}

		// 4. Pregnancy III Trimester vs NSAIDs
		if (classes.includes("nsaid") && isPregnancy3rdTrimester) {
			blockedPrescriptions.add(proposed);
			conditionContraindications.push({
				condition: "Беременность (III триместр, 28–40 недель)",
				proposedDrug: proposed,
				severity: "critical",
				reasonRu:
					"Абсолютное противопоказание: ингибирование синтеза простагландинов вызывает преждевременное закрытие артериального (Боталлова) протока плода, неонатальную легочную гипертензию, маловодие и слабость родовой деятельности.",
				clinicalGuidanceRu:
					"Категорически отменить все НПВС (ибупрофен, кеторолак, нимесулид, диклофенак). Назначить Парацетамол 500 мг (препарат выбора по данным FDA/Минздрава РФ).",
			});
			safeAlternativeRecommendations.push({
				originalDrug: proposed,
				recommendedAlternatives: [
					"Парацетамол (500 мг внутрь при боли, интервал не менее 4–6 часов)",
				],
				rationaleRu:
					"Парацетамол (FDA категория B) разрешен на всех триместрах беременности и не оказывает тератогенного или гемодинамического действия на плод.",
			});
		}

		// 5. Active Peptic Ulcer vs NSAIDs
		if (classes.includes("nsaid") && hasActivePepticUlcer && !isPregnancy3rdTrimester) {
			conditionContraindications.push({
				condition: "Язвенная болезнь желудка и 12-перстной кишки / Эрозивный гастрит",
				proposedDrug: proposed,
				severity: "high",
				reasonRu:
					"Системные НПВС блокируют ЦОГ-1 и синтез гастропротективных простагландинов, провоцируя обострение язвы и профузное желудочно-кишечное кровотечение.",
				clinicalGuidanceRu:
					"Предпочесть Парацетамол либо обязательно комбинировать НПВС с ингибитором протонной помпы (Омепразол 20 мг утром за 30 минут до еды).",
			});
		}

		// 6. Severe Hypertension vs Epinephrine Anesthetics
		if (classes.includes("epinephrine_anesthetic") && hasSevereHypertension) {
			blockedPrescriptions.add(proposed);
			conditionContraindications.push({
				condition: "Неконтролируемая артериальная гипертензия 3 степени / Гипертонический криз",
				proposedDrug: proposed,
				severity: "critical",
				reasonRu:
					"Эпинефрин провоцирует резкий спазм периферических сосудов, тахикардию и фатальный подъем АД с риском ОНМК (инсульта) и инфаркта миокарда.",
				clinicalGuidanceRu:
					"Плановое вмешательство отложить до стабилизации АД. При неотложной помощи использовать Мепивакаин 3% без вазоконстриктора.",
			});
			safeAlternativeRecommendations.push({
				originalDrug: proposed,
				recommendedAlternatives: [
					"Скандонест 3% (Мепивакаин 30 мг/мл без вазоконстриктора)",
				],
				rationaleRu:
					"Анестетики без адреналина минимизируют гемодинамическую нагрузку на миокард и сосудистое русло.",
			});
		}
	}

	// ─────────────────────────────────────────────────────────────────────────
	// 3.2. DRUG-DRUG INTERACTIONS (Proposed vs Proposed & Proposed vs Existing)
	// ─────────────────────────────────────────────────────────────────────────

	const allDrugEntries: { name: string; classes: string[]; isProposed: boolean }[] = [
		...input.proposedMedications.map((m) => ({
			name: m,
			classes: matchDrugClasses(m),
			isProposed: true,
		})),
		...existingMeds.map((m) => ({
			name: m,
			classes: matchDrugClasses(m),
			isProposed: false,
		})),
	];

	// Combine checks between all pairs where at least one is proposed
	for (let i = 0; i < allDrugEntries.length; i++) {
		for (let j = i + 1; j < allDrugEntries.length; j++) {
			const d1 = allDrugEntries[i];
			const d2 = allDrugEntries[j];
			if (!d1 || !d2) continue;

			// Only evaluate interaction if at least one is in the proposed list
			if (!d1.isProposed && !d2.isProposed) continue;

			const hasPair = (c1: string, c2: string) =>
				(d1.classes.includes(c1) && d2.classes.includes(c2)) ||
				(d1.classes.includes(c2) && d2.classes.includes(c1));

			// A. Anticoagulants + NSAIDs
			if (hasPair("anticoagulant_antiplatelet", "nsaid")) {
				const nsaidName = d1.classes.includes("nsaid") ? d1.name : d2.name;
				const acName = d1.classes.includes("anticoagulant_antiplatelet") ? d1.name : d2.name;

				blockedPrescriptions.add(nsaidName);
				drugInteractions.push({
					primaryDrug: nsaidName,
					interactingDrug: acName,
					severity: "critical",
					effectDescriptionRu:
						"НПВП в комбинации с антикоагулянтами (Варфарин, ПОАК: Ксарелто, Эликвис, Прадакса; Клопидогрел) резко повышают риск тяжелых желудочно-кишечных и постоперационных кровотечений вследствие одновременного ингибирования функции тромбоцитов и повреждения слизистой ЖКТ.",
					clinicalRecommendationRu:
						"Категорически отменить НПВП (ибупрофен, кеторолак, диклофенак). Препарат выбора для анальгезии — Парацетамол (до 2000 мг/сут) или трамадол при интенсивной боли.",
				});
				safeAlternativeRecommendations.push({
					originalDrug: nsaidName,
					recommendedAlternatives: [
						"Парацетамол (500–1000 мг до 4 раз/сут, макс 2000 мг/сут при терапии антикоагулянтами)",
						"Местный гемостаз (гемостатическая губка, швы, транексамовая кислота местно)",
					],
					rationaleRu:
						"Парацетамол в дозах до 2 г/сут не оказывает антитромбоцитарного действия и не повреждает слизистую оболочку ЖКТ.",
				});
			}

			// B. Metronidazole + Anticoagulants (Warfarin / DOACs)
			if (hasPair("metronidazole", "anticoagulant_antiplatelet")) {
				const metronName = d1.classes.includes("metronidazole") ? d1.name : d2.name;
				const acName = d1.classes.includes("anticoagulant_antiplatelet") ? d1.name : d2.name;

				blockedPrescriptions.add(metronName);
				drugInteractions.push({
					primaryDrug: metronName,
					interactingDrug: acName,
					severity: "critical",
					effectDescriptionRu:
						"Метронидазол мощно ингибирует изофермент цитохрома CYP2C9, блокируя метаболизм варфарина и прямых оральных антикоагулянтов. Происходит резкий скачок МНО и концентрации антикоагулянта в плазме с риском жизнеугрожающего кровотечения.",
					clinicalRecommendationRu:
						"Категорически исключить метронидазол. Заменить антибактериальную терапию на Амоксициллин (при отсутствии аллергии) или Клиндамицин. Обязателен контроль МНО.",
				});
				safeAlternativeRecommendations.push({
					originalDrug: metronName,
					recommendedAlternatives: [
						"Амоксициллин 500 мг 3 раза/сут (при отсутствии аллергии на пенициллины)",
						"Клиндамицин 300 мг 3 раза/сут",
					],
					rationaleRu:
						"Клиндамицин и амоксициллин не оказывают выраженного ингибирующего влияния на ферменты метаболизма антикоагулянтов CYP2C9.",
				});
			}

			// C. Epinephrine Anesthetics + Non-Selective Beta Blockers (Propranolol)
			if (hasPair("epinephrine_anesthetic", "beta_blocker_non_selective")) {
				const epiName = d1.classes.includes("epinephrine_anesthetic") ? d1.name : d2.name;
				const bbName = d1.classes.includes("beta_blocker_non_selective") ? d1.name : d2.name;

				blockedPrescriptions.add(epiName);
				drugInteractions.push({
					primaryDrug: epiName,
					interactingDrug: bbName,
					severity: "critical",
					effectDescriptionRu:
						"Блокада бета-2-адренорецепторов пропранололом/соталолом оставляет альфа-1-адреномиметическое действие эпинефрина некомпенсированным: возникает тяжелый периферический вазоспазм, злокачественный гипертонический криз и рефлекторная брадикардия (вплоть до остановки сердца).",
					clinicalRecommendationRu:
						"Категорически запрещены анестетики с адреналином. Использовать Мепивакаин 3% без вазоконстриктора (Скандонест).",
				});
				safeAlternativeRecommendations.push({
					originalDrug: epiName,
					recommendedAlternatives: [
						"Скандонест 3% (Мепивакаин 30 мг/мл без вазоконстриктора)",
						"Мепивастезин 3% без адреналина",
					],
					rationaleRu:
						"Мепивакаин не содержит эпинефрина и безопасен для пациентов, принимающих неселективные бета-блокаторы.",
				});
			}

			// D. NSAIDs + Aspirin (Cardioprotective low-dose)
			if (
				(d1.classes.includes("nsaid") && d2.name.toLowerCase().includes("aspirin")) ||
				(d2.classes.includes("nsaid") && d1.name.toLowerCase().includes("aspirin"))
			) {
				const nsaidName =
					d1.classes.includes("nsaid") && !d1.name.toLowerCase().includes("aspirin")
						? d1.name
						: d2.name;
				const aspName = d1.name.toLowerCase().includes("aspirin") ? d1.name : d2.name;

				drugInteractions.push({
					primaryDrug: nsaidName,
					interactingDrug: aspName,
					severity: "high",
					effectDescriptionRu:
						"Ибупрофен и другие неселективные НПВС обратимо конкурируют с аспирином за активный центр фермента ЦОГ-1 тромбоцитов, блокируя антиагрегантный и кардиопротективный эффект низких доз аспирина.",
					clinicalRecommendationRu:
						"Принимать НПВС не ранее чем через 2 часа после аспирина, либо предпочесть Парацетамол.",
				});
			}
		}
	}

	// ─────────────────────────────────────────────────────────────────────────
	// 3.3. DEDUPLICATION & SUMMARY AGGREGATION
	// ─────────────────────────────────────────────────────────────────────────

	const hasCriticalAllergy = allergyWarnings.some(
		(w) => w.severity === "critical",
	);
	const hasCriticalDdi = drugInteractions.some((d) => d.severity === "critical");
	const hasCriticalCondition = conditionContraindications.some(
		(c) => c.severity === "critical",
	);

	const isSafe =
		!hasCriticalAllergy && !hasCriticalDdi && !hasCriticalCondition;

	const riskLevel: SafetyRiskLevel = !isSafe
		? "critical_danger"
		: allergyWarnings.length > 0 ||
			  drugInteractions.length > 0 ||
			  conditionContraindications.length > 0
			? "caution"
			: "safe";

	const blockedArray = Array.from(blockedPrescriptions);

	let summaryRu = "";
	if (!isSafe) {
		summaryRu = `КРИТИЧЕСКАЯ ФАРМАКОТЕРАПЕВТИЧЕСКАЯ ОПАСНОСТЬ: Назначение заблокировано (${blockedArray.length} преп. заблокировано). Обнаружены абсолютные противопоказания / угроза жизни пациента.`;
	} else if (riskLevel === "caution") {
		summaryRu =
			"ПРЕДОСТЕРЕЖЕНИЕ: Обнаружены умеренные межлекарственные взаимодействия или соматические риски. Требуется соблюдение клинических рекомендаций и дозировочного режима.";
	} else {
		summaryRu =
			"ФАРМАКОЛОГИЧЕСКИЙ АУДИТ ПРОЙДЕН УСПЕШНО: Назначения полностью безопасны. Аллергических конфликтов, DDI несовместимости и соматических противопоказаний не выявлено.";
	}

	return {
		isSafe,
		riskLevel,
		hasAllergyClash: allergyWarnings.length > 0,
		hasSevereDdi: drugInteractions.length > 0,
		hasConditionContraindication: conditionContraindications.length > 0,
		blockedPrescriptions: blockedArray,
		allergyWarnings,
		drugInteractions,
		conditionContraindications,
		safeAlternativeRecommendations,
		summaryRu,
		evaluatedAtIso: new Date().toISOString(),
	};
}
