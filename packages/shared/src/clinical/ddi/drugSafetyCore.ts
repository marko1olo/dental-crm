/**
 * packages/shared/src/clinical/ddi/drugSafetyCore.ts
 * Layer 3: Drug-Drug Interaction (DDI) & Clinical Drug Safety Engine Core.
 * Evaluates pairwise pharmacology interactions, consolidates somatic and allergy
 * warnings, and computes statutory patient risk metrics.
 */

import type {
	ClinicalDdiInteraction,
	ClinicalDrugSafetyAuditResult,
	DrugSafetyAuditInput,
	SafeAlternativeRecommendation,
	SafetyRiskLevel,
} from "./types.js";
import { matchDrugClasses } from "./ddiRulesMatrix.js";
import { evaluateSomaticAndAllergyRisks } from "./somaticRiskEvaluator.js";

export interface DrugDrugInteractionCheckResult {
	readonly drugInteractions: readonly ClinicalDdiInteraction[];
	readonly blockedPrescriptions: ReadonlySet<string>;
	readonly safeAlternativeRecommendations: readonly SafeAlternativeRecommendation[];
}

/**
 * Evaluates pairwise drug-drug interactions between proposed and concurrent medications.
 */
export function checkDrugDrugInteractions(
	proposedMedications: readonly string[],
	existingMedications: readonly string[] = [],
): DrugDrugInteractionCheckResult {
	const drugInteractions: ClinicalDdiInteraction[] = [];
	const safeAlternativeRecommendations: SafeAlternativeRecommendation[] = [];
	const blockedPrescriptions = new Set<string>();

	const allDrugEntries: { name: string; classes: string[]; isProposed: boolean }[] = [
		...proposedMedications.map((m) => ({
			name: m,
			classes: matchDrugClasses(m),
			isProposed: true,
		})),
		...existingMedications.map((m) => ({
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

			// E. Fluoroquinolones + NSAIDs (Seizure Risk)
			if (hasPair("fluoroquinolone", "nsaid")) {
				const fqName = d1.classes.includes("fluoroquinolone") ? d1.name : d2.name;
				const nsaidName = d1.classes.includes("nsaid") ? d1.name : d2.name;

				drugInteractions.push({
					primaryDrug: fqName,
					interactingDrug: nsaidName,
					severity: "high",
					effectDescriptionRu:
						"Совместный прием фторхинолонов (Ципрофлоксацин, Офлоксацин, Левофлоксацин) с НПВС усиливает возбуждающее действие на ЦНС и повышает риск генерализованного судорожного синдрома.",
					clinicalRecommendationRu:
						"Заменить антибиотик на защищенный пенициллин (Амоксиклав) или линкозамид (Клиндамицин), либо заменить НПВС на Парацетамол.",
				});
				safeAlternativeRecommendations.push({
					originalDrug: fqName,
					recommendedAlternatives: [
						"Амоксиклав (875/125 мг 2 раза/сут при отсутствии аллергии)",
						"Клиндамицин (300 мг 3 раза/сут)",
					],
					rationaleRu:
						"Бета-лактамы и линкозамиды не потенцируют судорожное действие НПВП.",
				});
			}

			// F. Opioids + Benzodiazepines / Sedatives (Black Box Warning: Respiratory Depression)
			if (hasPair("opioid_analgesic", "benzodiazepine_sedative")) {
				const opName = d1.classes.includes("opioid_analgesic") ? d1.name : d2.name;
				const bzName = d1.classes.includes("benzodiazepine_sedative") ? d1.name : d2.name;

				blockedPrescriptions.add(opName);
				if (d1.isProposed && d1.name === bzName) blockedPrescriptions.add(bzName);
				if (d2.isProposed && d2.name === bzName) blockedPrescriptions.add(bzName);

				drugInteractions.push({
					primaryDrug: opName,
					interactingDrug: bzName,
					severity: "critical",
					effectDescriptionRu:
						"Комбинация опиоидного анальгетика (Трамадол) и бензодиазепина (Диазепам, Феназепам) — Black Box Warning FDA/Минздрава: взаимное синергическое угнетение дыхательного центра, глубокая седация, гиповентиляция, кома и летальный исход.",
					clinicalRecommendationRu:
						"Категорически запрещено одновременное амбулаторное назначение. При умеренной/сильной боли предпочесть НПВС или Парацетамол без седативных.",
				});
				safeAlternativeRecommendations.push({
					originalDrug: opName,
					recommendedAlternatives: [
						"Кеторолак 10 мг (при отсутствии противопоказаний со стороны ЖКТ и гемостаза)",
						"Парацетамол 1000 мг",
					],
					rationaleRu:
						"Неопиоидные анальгетики не угнетают дыхательный центр при сопутствующей седации.",
				});
			}

			// G. Metronidazole + Alcohol / Ethanol (Disulfiram-like Reaction)
			if (hasPair("metronidazole", "alcohol_ethanol")) {
				const metronName = d1.classes.includes("metronidazole") ? d1.name : d2.name;
				const alcName = d1.classes.includes("alcohol_ethanol") ? d1.name : d2.name;

				blockedPrescriptions.add(metronName);
				drugInteractions.push({
					primaryDrug: metronName,
					interactingDrug: alcName,
					severity: "critical",
					effectDescriptionRu:
						"Метронидазол блокирует фермент ацетальдегиддегидрогеназу, приводя к накоплению токсичного ацетальдегида: мучительная тошнота, неукротимая рвота, коллапс, резкое падение АД, тахикардия (дисульфирамоподобный синдром).",
					clinicalRecommendationRu:
						"Категорический запрет на прием алкоголя и спиртосодержащих лекарственных капель во время курса метронидазола и в течение 48 часов после его окончания.",
				});
			}

			// H. Clarithromycin (CYP3A4 Inhibitor) + Anticoagulants (Rivaroxaban / Apixaban / Warfarin)
			if (hasPair("macrolide_cyp3a4_inhibitor", "anticoagulant_antiplatelet")) {
				const clarithroName = d1.classes.includes("macrolide_cyp3a4_inhibitor") ? d1.name : d2.name;
				const acName = d1.classes.includes("anticoagulant_antiplatelet") ? d1.name : d2.name;

				blockedPrescriptions.add(clarithroName);
				drugInteractions.push({
					primaryDrug: clarithroName,
					interactingDrug: acName,
					severity: "high",
					effectDescriptionRu:
						"Кларитромицин и эритромицин являются мощными ингибиторами изофермента цитохрома CYP3A4 и P-гликопротеина, нарушая клиренс ПОАК (Ксарелто / Ривароксабан, Эликвис / Апиксабан) и варфарина. Концентрация антикоагулянта возрастает в 2–3 раза с высоким риском тяжелых кровотечений.",
					clinicalRecommendationRu:
						"Заменить макролид на Амоксициллин (при отсутствии аллергии), Азитромицин или Клиндамицин (не оказывают клинически значимого ингибирования CYP3A4).",
				});
				safeAlternativeRecommendations.push({
					originalDrug: clarithroName,
					recommendedAlternatives: [
						"Амоксициллин 500 мг (при отсутствии аллергии)",
						"Азитромицин 500 мг (Сумамед — минимальное влияние на CYP3A4)",
						"Клиндамицин 300 мг (не ингибирует CYP3A4)",
					],
					rationaleRu:
						"Азитромицин и клиндамицин безопасны для пациентов, получающих современные прямые оральные антикоагулянты (ПОАК).",
				});
			}

			// I. Duplicate NSAID + NSAID
			if (d1.classes.includes("nsaid") && d2.classes.includes("nsaid") && d1.name.toLowerCase() !== d2.name.toLowerCase()) {
				const n1 = d1.name;
				const n2 = d2.name;
				drugInteractions.push({
					primaryDrug: n1,
					interactingDrug: n2,
					severity: "high",
					effectDescriptionRu:
						"Одновременный прием двух и более системных НПВП (например, Нимесулид + Кеторолак или Ибупрофен) не усиливает обезболивающий эффект, но многократно повышает риск эрозивно-язвенных поражений ЖКТ, перфораций, кровотечений и токсической нефропатии.",
					clinicalRecommendationRu:
						"Отменить дублирующий НПВП. Использовать монотерапию одним НПВП в минимально эффективной дозе под прикрытием ИПП (Омепразол 20 мг).",
				});
			}

			// J. Bisphosphonates / Antiresorptives + NSAIDs (GI Toxicity & MRONJ Alert)
			if (hasPair("bisphosphonate_antiresorptive", "nsaid")) {
				const bisName = d1.classes.includes("bisphosphonate_antiresorptive")
					? d1.name
					: d2.name;
				const nsaidName = d1.classes.includes("nsaid") ? d1.name : d2.name;

				drugInteractions.push({
					primaryDrug: nsaidName,
					interactingDrug: bisName,
					severity: "high",
					effectDescriptionRu:
						"Совместное применение системных НПВП с бисфосфонатами (Золедронат, Акласта, Зомета, Алендронат, Бонвива) или Деносумабом (Пролиа, Эксджива) увеличивает риск эрозивно-язвенных поражений ЖКТ и токсической нефропатии. В амбулаторной хирургии на фоне антирезорбтивной терапии имеется высокий риск медикаментозного остеонекроза челюсти (MRONJ/БРОНЖ).",
					clinicalRecommendationRu:
						"Применять НПВП кратковременным курсом с обязательной гастропротекцией (ИПП) либо предпочесть Парацетамол. В стоматологической хирургии соблюдать атравматичный протокол без отслойки надкостницы и периоперационную антибиотикопрофилактику.",
				});
				safeAlternativeRecommendations.push({
					originalDrug: nsaidName,
					recommendedAlternatives: [
						"Парацетамол (500–1000 мг до 4 раз/сут, макс 2000–3000 мг/сут)",
						"Атравматичный протокол ушивания раны",
					],
					rationaleRu:
						"Парацетамол не повреждает слизистую оболочку желудка и является анальгетиком выбора при сопутствующей антирезорбтивной терапии.",
				});
			}
		}
	}

	return {
		drugInteractions,
		blockedPrescriptions,
		safeAlternativeRecommendations,
	};
}

/**
 * Audits a proposed pharmacotherapy regimen against known patient allergies,
 * somatic conditions, and concurrent medications.
 */
export function auditClinicalDrugSafety(
	input: DrugSafetyAuditInput,
): ClinicalDrugSafetyAuditResult {
	// 1. Evaluate somatic and allergy profile
	const somaticResult = evaluateSomaticAndAllergyRisks({
		proposedMedications: input.proposedMedications,
		knownAllergies: input.knownAllergies,
		patientConditions: input.patientConditions,
		existingMedications: input.existingMedications,
	});

	// 2. Evaluate drug-drug interactions
	const ddiResult = checkDrugDrugInteractions(
		input.proposedMedications,
		input.existingMedications,
	);

	// 3. Merge blocked prescriptions and recommendations
	const blockedPrescriptions = new Set<string>([
		...somaticResult.blockedPrescriptions,
		...ddiResult.blockedPrescriptions,
	]);

	const safeAlternativeRecommendations: SafeAlternativeRecommendation[] = [
		...somaticResult.safeAlternativeRecommendations,
		...ddiResult.safeAlternativeRecommendations,
	];

	const allergyWarnings = [...somaticResult.allergyWarnings];
	const conditionContraindications = [...somaticResult.conditionContraindications];
	const drugInteractions = [...ddiResult.drugInteractions];

	// 4. Determine overall risk level and safety
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

/**
 * Functional alias matching domain terminology.
 */
export const evaluateDrugSafety = auditClinicalDrugSafety;
