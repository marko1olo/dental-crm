/**
 * packages/shared/src/clinical/ddi/somaticRiskEvaluator.ts
 * Layer 2: Patient Somatic Profile & Allergy Cross-Reactivity Evaluator.
 * Pure domain logic checking medical history: hypertension, asthma/sulfites,
 * pregnancy III trimester, peptic ulcer, iodine, latex, pheochromocytoma,
 * thyrotoxicosis, bisphosphonates (MRONJ).
 */

import type {
	ClinicalAllergyWarning,
	ClinicalConditionContraindication,
	SafeAlternativeRecommendation,
} from "./types.js";
import { matchDrugClasses } from "./ddiRulesMatrix.js";

export interface SomaticRiskEvaluationResult {
	readonly allergyWarnings: readonly ClinicalAllergyWarning[];
	readonly conditionContraindications: readonly ClinicalConditionContraindication[];
	readonly blockedPrescriptions: ReadonlySet<string>;
	readonly safeAlternativeRecommendations: readonly SafeAlternativeRecommendation[];
}

/**
 * Evaluates proposed medications against patient somatic conditions and known allergies.
 */
export function evaluateSomaticAndAllergyRisks(params: {
	readonly proposedMedications: readonly string[];
	readonly knownAllergies?: readonly string[];
	readonly patientConditions?: readonly string[];
	readonly existingMedications?: readonly string[];
}): SomaticRiskEvaluationResult {
	const allergyWarnings: ClinicalAllergyWarning[] = [];
	const conditionContraindications: ClinicalConditionContraindication[] = [];
	const safeAlternativeRecommendations: SafeAlternativeRecommendation[] = [];
	const blockedPrescriptions = new Set<string>();

	const normalizedConditions = (params.patientConditions || []).map((c) =>
		c.toLowerCase().trim(),
	);
	const normalizedAllergies = (params.knownAllergies || []).map((a) =>
		a.toLowerCase().trim(),
	);
	const existingMeds = params.existingMedications || [];

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

	const hasPheochromocytoma = normalizedConditions.some(
		(c) =>
			c.includes("феохромоцитом") ||
			c.includes("pheochromocytoma") ||
			c.includes("c74.1") ||
			c.includes("d35.0") ||
			c.includes("опухоль надпочечников"),
	);

	const hasThyrotoxicosis = normalizedConditions.some(
		(c) =>
			c.includes("тиреотоксикоз") ||
			c.includes("гипертиреоз") ||
			c.includes("базедова") ||
			c.includes("зоб") ||
			c.includes("thyrotoxicosis") ||
			c.includes("hyperthyroidism") ||
			c.includes("e05"),
	);

	const hasIodineAllergy = normalizedAllergies.some(
		(a) =>
			a.includes("йод") ||
			a.includes("йодоформ") ||
			a.includes("повидон") ||
			a.includes("бетадин") ||
			a.includes("метапекс") ||
			a.includes("йодинол") ||
			a.includes("iodine"),
	);

	const hasEsterAnestheticsAllergy = normalizedAllergies.some(
		(a) =>
			a.includes("эфир") ||
			a.includes("новокаин") ||
			a.includes("прокаин") ||
			a.includes("бензокаин") ||
			a.includes("анестезин") ||
			a.includes("дикаин") ||
			a.includes("тетракаин") ||
			a.includes("ester"),
	);

	const hasLatexAllergy = normalizedAllergies.some(
		(a) => a.includes("латекс") || a.includes("latex"),
	);

	const hasBisphosphonateTherapy =
		normalizedConditions.some(
			(c) =>
				c.includes("бисфосфонат") ||
				c.includes("bisphosphonate") ||
				c.includes("mronj") ||
				c.includes("бронж") ||
				c.includes("остеонекроз") ||
				c.includes("зомета") ||
				c.includes("акласта") ||
				c.includes("пролиа"),
		) ||
		existingMeds.some((m) =>
			matchDrugClasses(m).includes("bisphosphonate_antiresorptive"),
		);

	// ─────────────────────────────────────────────────────────────────────────
	// PROPOSED DRUG EVALUATION (Allergy & Somatic Direct Conflicts)
	// ─────────────────────────────────────────────────────────────────────────

	for (const proposed of params.proposedMedications) {
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

		// 7. Ester Anesthetics Allergy vs Ester Local Anesthetics
		if (classes.includes("ester_anesthetic") && hasEsterAnestheticsAllergy) {
			blockedPrescriptions.add(proposed);
			allergyWarnings.push({
				allergenGroup: "Эфирные анестетики (Новокаин, Прокаин, Бензокаин, Дикаин)",
				proposedDrug: proposed,
				severity: "critical",
				manifestationsRu:
					"Истинная IgE-опосредованная аллергическая реакция на метаболит ПАБК: ангионевротический отек Квинке, контактный стоматит, анафилаксия",
				clinicalActionRu:
					"Категорически отменить эфирные анестетики и аппликационные гели на основе бензокаина (Hurricaine, Dispodent). Назначить амидные анестетики (Артикаин 4%, Мепивакаин 3%, Лидокаин 2%).",
			});
			safeAlternativeRecommendations.push({
				originalDrug: proposed,
				recommendedAlternatives: [
					"Ультракаин Д-С (Артикаин 4% с эпинефрином)",
					"Скандонест 3% (Мепивакаин без вазоконстриктора)",
					"Лидокаин-гель 2–5% для аппликационной анестезии",
				],
				rationaleRu:
					"Амидные местные анестетики не метаболизируются в парааминобензойную кислоту (ПАБК) и не дают перекрестной аллергии с новокаином/бензокаином.",
			});
		}

		// 8. Iodine Allergy vs Iodine Antiseptics & Iodoform Pastes
		if (classes.includes("iodine_antiseptic") && hasIodineAllergy) {
			blockedPrescriptions.add(proposed);
			allergyWarnings.push({
				allergenGroup: "Препараты йода и йодоформа (Бетадин, Метапекс, Альвожил)",
				proposedDrug: proposed,
				severity: "critical",
				manifestationsRu:
					"Острый токсико-аллергический дерматит/стоматит, отек слизистых полости рта, анафилактоидная реакция",
				clinicalActionRu:
					"Категорически исключить йодсодержащие антисептики, пасты для каналов (Metapex) и турунды (Alveogyl). Использовать безиодные аналоги (Хлоргексидин, Мирамистин, чистый гидроксид кальция).",
			});
			safeAlternativeRecommendations.push({
				originalDrug: proposed,
				recommendedAlternatives: [
					"Раствор Хлоргексидина биглюконата 0.05–0.2%",
					"Мирамистин 0.01% (антисептическая обработка)",
					"UltraCal XS / Calcicur (чистый гидроксид кальция для временной обтурации каналов без йодоформа)",
				],
				rationaleRu:
					"Хлоргексидин и чистый гидроксид кальция обладают широким антибактериальным спектром и абсолютно безопасны для пациентов с непереносимостью йода.",
			});
		}

		// 9. Latex Allergy vs Latex Products
		if (classes.includes("latex_material") && hasLatexAllergy) {
			blockedPrescriptions.add(proposed);
			allergyWarnings.push({
				allergenGroup: "Натуральный каучуковый латекс",
				proposedDrug: proposed,
				severity: "critical",
				manifestationsRu:
					"Контактный аллергический хейлит, крапивница, отек гортани, анафилактический шок",
				clinicalActionRu:
					"Соблюдать строгий беслатексный протокол (нитриловые перчатки, беслатексный раббердам).",
			});
		}

		// 10. Pheochromocytoma vs Epinephrine Anesthetics
		if (classes.includes("epinephrine_anesthetic") && hasPheochromocytoma) {
			blockedPrescriptions.add(proposed);
			conditionContraindications.push({
				condition: "Феохромоцитома (C74.1 / D35.0)",
				proposedDrug: proposed,
				severity: "critical",
				reasonRu:
					"Абсолютное противопоказание: гормонально-активная опухоль надпочечников. Экзогенное введение адреналина несет критический риск фатального гипертонического криза, отека легких и фибрилляции желудочков.",
				clinicalGuidanceRu:
					"Использовать исключительно анестетики без вазоконстриктора (Мепивакаин 3% / Скандонест). Плановые вмешательства отложить до хирургического лечения опухоли.",
			});
			safeAlternativeRecommendations.push({
				originalDrug: proposed,
				recommendedAlternatives: [
					"Скандонест 3% (Мепивакаин 30 мг/мл без вазоконстриктора)",
				],
				rationaleRu:
					"Мепивакаин 3% не содержит адреналина и не провоцирует катехоламиновый криз.",
			});
		}

		// 11. Thyrotoxicosis vs Epinephrine Anesthetics
		if (classes.includes("epinephrine_anesthetic") && hasThyrotoxicosis) {
			blockedPrescriptions.add(proposed);
			conditionContraindications.push({
				condition: "Декомпенсированный тиреотоксикоз / Гипертиреоз (E05)",
				proposedDrug: proposed,
				severity: "critical",
				reasonRu:
					"Абсолютное противопоказание: гипертиреоз резко сенсибилизирует миокард к катехоламинам. Введение адреналина провоцирует тиреотоксический криз, тяжелую тахиаритмию и ишемию миокарда.",
				clinicalGuidanceRu:
					"Запрещено вводить анестетики с адреналином и ретракционные нити с эпинефрином. Применять Мепивакаин 3% (Скандонест).",
			});
			safeAlternativeRecommendations.push({
				originalDrug: proposed,
				recommendedAlternatives: [
					"Скандонест 3% (Мепивакаин 30 мг/мл без вазоконстриктора)",
				],
				rationaleRu:
					"Скандонест 3% обеспечивает качественную анестезию без адреналина и не нагружает кардиоваскулярную систему.",
			});
		}

		// 12. Bisphosphonate Therapy / MRONJ risk vs NSAIDs
		if (classes.includes("nsaid") && hasBisphosphonateTherapy) {
			conditionContraindications.push({
				condition:
					"Терапия бисфосфонатами / антирезорбтивными препаратами (Риск MRONJ / БРОНЖ)",
				proposedDrug: proposed,
				severity: "high",
				reasonRu:
					"Повышенный риск гастроинтестинальной токсичности на фоне приема бисфосфонатов. В стоматологической хирургии у таких пациентов сохраняется критический риск медикаментозного остеонекроза челюстей (MRONJ).",
				clinicalGuidanceRu:
					"Назначить гастропротекцию (Омепразол 20 мг) либо заменить на Парацетамол. Хирургические манипуляции проводить максимально атравматично без скелетирования надкостницы с антибактериальной профилактикой.",
			});
			safeAlternativeRecommendations.push({
				originalDrug: proposed,
				recommendedAlternatives: [
					"Парацетамол (500–1000 мг до 4 раз/сут, безопасен для слизистой ЖКТ)",
					"Атравматичный протокол ушивания раны и антибиотикопрофилактика",
				],
				rationaleRu:
					"Парацетамол не раздражает слизистую ЖКТ и не усиливает токсичность бисфосфонатов.",
			});
		}
	}

	return {
		allergyWarnings,
		conditionContraindications,
		blockedPrescriptions,
		safeAlternativeRecommendations,
	};
}
