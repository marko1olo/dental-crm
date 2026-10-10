/**
 * pharmacologyActionHandlers.ts — Clinical Drug Safety, Allergy Interaction, and Anesthetic Dosage Engine.
 *
 * Implements:
 * - Mandate 8e: Doctor Autonomy (unhindered clinical execution, non-blocking drug warnings)
 * - Mandate 8l: Action Engine
 * - Mandate 8z: Clean human medical language without bureaucratic ciphers
 */

import { useAppStore } from "../../../store/appStore";
import { usePatientStore } from "../../../store/patientStore";
import {
	parseSafetyProfileFromText,
	isNegativeAllergyStatement,
} from "../../../components/patients/safetyMath";
import type { CRMActionResult } from "./types.js";

export function handlePharmacologyAction(
	shortName: string,
	name: string,
	args: Record<string, unknown>,
	callId: string,
): CRMActionResult | null {
	// 11. Clinical Drug Safety & Allergy Interaction Engine (Mandates 8e, 8l, 8z)
	if (
		shortName === "check_drug_interactions" ||
		shortName === "check_allergies" ||
		shortName === "check_medication_safety"
	) {
		const activePatId = String(
			args.patientId ||
			useAppStore.getState().activePatientId ||
			usePatientStore.getState().selectedPatientId ||
			"",
		);
		const patientDraft = usePatientStore.getState().patientCoreDraft;
		const patientNotes = patientDraft?.notes || "";

		// Извлекаем проверяемые препараты
		const rawDrugs =
			args.plannedDrugs ||
			args.proposedMedications ||
			args.proposedDrugs ||
			args.drugs ||
			args.drug ||
			args.medication ||
			args.drugName ||
			args.plannedMedications;
		const plannedDrugs: string[] = Array.isArray(rawDrugs)
			? rawDrugs.map(String)
			: rawDrugs
				? [String(rawDrugs)]
				: ["Артикаин 4% с эпинефрином 1:100 000"];

		// Извлекаем известные аллергии и соматические патологии
		const extraAllergies = Array.isArray(args.knownAllergies)
			? args.knownAllergies.map(String)
			: args.knownAllergies
				? [String(args.knownAllergies)]
				: [];
		const extraConditions = Array.isArray(args.somaticConditions)
			? args.somaticConditions.map(String)
			: args.somaticConditions
				? [String(args.somaticConditions)]
				: [];

		// Объединенный контекст пациента
		const combinedPatientContext = [
			patientNotes,
			...extraAllergies,
			...extraConditions,
		]
			.join(" ")
			.trim();

		const safety = parseSafetyProfileFromText(combinedPatientContext);
		const lowerCombined = combinedPatientContext.toLowerCase();
		const hasNegativeAllergy = isNegativeAllergyStatement(lowerCombined);

		const allergyWarnings: Array<{
			allergenGroup: string;
			proposedDrug: string;
			reactionRisk: string;
			safeAlternative: string;
		}> = [];

		const conditionContraindications: Array<{
			condition: string;
			proposedDrug: string;
			clinicalRisk: string;
			recommendation: string;
		}> = [];

		const drugInteractions: Array<{
			drugA: string;
			drugB: string;
			risk: string;
			actionRequired: string;
		}> = [];

		for (const drug of plannedDrugs) {
			const dLower = drug.toLowerCase();

			// 1. Пенициллины (Амоксициллин, Аугментин, Амоксиклав, Флемоксин)
			const isPenicillin =
				dLower.includes("амоксициллин") ||
				dLower.includes("аугментин") ||
				dLower.includes("амоксиклав") ||
				dLower.includes("пенициллин") ||
				dLower.includes("флемоксин") ||
				dLower.includes("ампициллин");

			if (isPenicillin && (safety.hasPenicillinAllergy || (!hasNegativeAllergy && lowerCombined.includes("пенициллин")))) {
				allergyWarnings.push({
					allergenGroup: "Пенициллины",
					proposedDrug: drug,
					reactionRisk: "Анафилаксия, ангионевротический отёк, крапивница (IgE-опосредованная реакция)",
					safeAlternative: "Кларитромицин 500 мг или Клиндамицин 300 мг каждые 8 часов (курс 5–7 дней)",
				});
			}

			// 2. Местные анестетики — Артикаин (Ультракаин, Убистезин, Септанест)
			const isArticaine =
				dLower.includes("артикаин") ||
				dLower.includes("ультракаин") ||
				dLower.includes("убистезин") ||
				dLower.includes("септанест");

			if (
				isArticaine &&
				(safety.hasArticaineAllergy ||
					safety.hasAnestheticAllergy ||
					(!hasNegativeAllergy &&
						(lowerCombined.includes("артикаин") ||
							lowerCombined.includes("ультракаин") ||
							lowerCombined.includes("убистезин") ||
							lowerCombined.includes("анестетик"))))
			) {
				allergyWarnings.push({
					allergenGroup: "Артикаин (амидные анестетики)",
					proposedDrug: drug,
					reactionRisk: "Аллергическая реакция, бронхоспазм, риск анафилактического шока",
					safeAlternative: "Мепивакаин 3% без вазоконстриктора (Скандонест 3% plain) / анестетик без консервантов (сульфитов)",
				});
			}

			// 3. Местные анестетики — Лидокаин
			const isLidocaine = dLower.includes("лидокаин") || dLower.includes("ксилокаин");
			if (
				isLidocaine &&
				(safety.hasLidocaineAllergy ||
					safety.hasAnestheticAllergy ||
					(!hasNegativeAllergy && lowerCombined.includes("лидокаин")))
			) {
				allergyWarnings.push({
					allergenGroup: "Лидокаин",
					proposedDrug: drug,
					reactionRisk: "Аллергическая реакция немедленного типа на лидокаин / парабены",
					safeAlternative: "Мепивакаин 3% без вазоконстриктора (Скандонест) или Артикаин 4% без парабенов",
				});
			}

			// 4. Сульфиты / консерванты в карпулах с адреналином (при Бронхиальной астме)
			const hasAdrenaline =
				dLower.includes("адреналин") ||
				dLower.includes("эпинефрин") ||
				dLower.includes("1:100 000") ||
				dLower.includes("1:100000") ||
				dLower.includes("1:200 000") ||
				dLower.includes("1:200000") ||
				dLower.includes("форте");

			if (
				hasAdrenaline &&
				(safety.hasBronchialAsthma ||
					safety.hasSulfiteAllergy ||
					lowerCombined.includes("астма") ||
					lowerCombined.includes("сульфит"))
			) {
				allergyWarnings.push({
					allergenGroup: "Сульфиты / метабисульфит E223 (консервант вазоконстриктора)",
					proposedDrug: drug,
					reactionRisk: "Тяжелый бронхоспазм у пациентов с аспириновой триадой и бронхиальной астмой",
					safeAlternative: "Мепивакаин 3% без вазоконстриктора (Скандонест 3% plain — не содержит сульфитов)",
				});
			}

			// 5. Адреналин 1:100 000 при гипертонической болезни / ССЗ / глаукоме
			const isHighAdrenaline =
				dLower.includes("1:100 000") ||
				dLower.includes("1:100000") ||
				dLower.includes("форте") ||
				(!dLower.includes("1:200") && isArticaine && !dLower.includes("без"));

			if (
				isHighAdrenaline &&
				(safety.hasHypertension ||
					safety.hasCardiovascularDisease ||
					safety.hasIhd ||
					safety.hasArrhythmia ||
					lowerCombined.includes("гипертон") ||
					lowerCombined.includes("давлен") ||
					lowerCombined.includes("ибс") ||
					lowerCombined.includes("глауком"))
			) {
				conditionContraindications.push({
					condition: "Артериальная гипертензия / ССЗ / глаукома",
					proposedDrug: drug,
					clinicalRisk: "Резкий подъем АД, тахикардия, риск гипертонического криза и приступа закрытоугольной глаукомы",
					recommendation: "Рекомендован Мепивакаин 3% без вазоконстриктора или Артикаин 1:200 000 (предел адреналина 0.04 мг / 2 карпулы)",
				});
			}

			// 6. НПВП (Кеторолак, Ибупрофен, Нимесулид) при приеме антикоагулянтов
			const isNsaid =
				dLower.includes("кеторол") ||
				dLower.includes("ибупрофен") ||
				dLower.includes("нимесил") ||
				dLower.includes("нимесулид") ||
				dLower.includes("кетопрофен") ||
				dLower.includes("аспирин") ||
				dLower.includes("нпвп");

			if (
				isNsaid &&
				(safety.takesAnticoagulants ||
					safety.hasAnticoagulantTherapy ||
					lowerCombined.includes("антикоагулянт") ||
					lowerCombined.includes("варфарин") ||
					lowerCombined.includes("ксарелто") ||
					lowerCombined.includes("эликвис"))
			) {
				drugInteractions.push({
					drugA: drug,
					drugB: "Антикоагулянтная терапия пациента",
					risk: "Синергическое угнетение тромбоцитарного гемостаза: высокий риск профузного луночкового кровотечения и эрозий ЖКТ",
					actionRequired: "Заменить НПВП на Парацетамол 500–1000 мг (до 2 г/сут). При хирургии: гемостатическая губка, ушивание лунки.",
				});
			}

			// 7. Беременность / лактация
			if (
				hasAdrenaline &&
				((safety.pregnancyTrimester && safety.pregnancyTrimester !== "none") ||
					lowerCombined.includes("беременн") ||
					lowerCombined.includes("лактац") ||
					lowerCombined.includes("триместр"))
			) {
				conditionContraindications.push({
					condition: "Беременность / период лактации",
					proposedDrug: drug,
					clinicalRisk: "Маточно-плацентарная вазоконстрикция при высокой концентрации эпинефрина (1:100 000)",
					recommendation: "Применять Артикаин с разведением адреналина 1:200 000 или Мепивакаин 3% без вазоконстриктора",
				});
			}
		}

		const hasAllergyClash = allergyWarnings.length > 0;
		const hasSevereDdi = drugInteractions.length > 0;
		const hasConditionContraindication = conditionContraindications.length > 0;
		const isSafe = !hasAllergyClash && !hasSevereDdi && !hasConditionContraindication;

		let summaryRu = "Клиническая безопасность подтверждена: противопоказаний и лекарственных конфликтов не выявлено.";
		if (hasAllergyClash) {
			const allergens = allergyWarnings.map((w) => w.allergenGroup).join(", ");
			const alternatives = allergyWarnings.map((w) => w.safeAlternative).join("; ");
			summaryRu = `ВНИМАНИЕ: У пациента выявлена аллергия на ${allergens}! Рекомендована безопасная замена: ${alternatives}.`;
		} else if (hasConditionContraindication) {
			const conds = conditionContraindications.map((c) => c.condition).join(", ");
			summaryRu = `Предостережение: У пациента соматическая патология (${conds}). Требуется коррекция вазоконстриктора.`;
		} else if (hasSevereDdi) {
			summaryRu = "Предостережение: Обнаружено лекарственное взаимодействие с антикоагулянтной терапией.";
		}

		return {
			success: true,
			callId,
			actionName: name,
			category: "pharmacology",
			message: summaryRu,
			data: {
				patientId: activePatId,
				isSafe,
				riskLevel: isSafe ? "low" : hasAllergyClash ? "critical" : "moderate",
				hasAllergyClash,
				hasSevereDdi,
				hasConditionContraindication,
				is_blocked: false,
				doctorAutonomyBlocked: false,
				allergyWarnings,
				conditionContraindications,
				drugInteractions,
				safeAlternativeRecommendations: [
					...allergyWarnings.map((w) => w.safeAlternative),
					...conditionContraindications.map((c) => c.recommendation),
					...drugInteractions.map((d) => d.actionRequired),
				],
				summaryRu,
			},
		};
	}

	// 12. Clinical Anesthetic Dosage & Carpule Calculator (StAR & Order 804n)
	if (
		shortName === "calculate_anesthetic_dosage" ||
		shortName === "calculate_anesthesia_dose"
	) {
		const activePatId = String(
			args.patientId ||
			useAppStore.getState().activePatientId ||
			usePatientStore.getState().selectedPatientId ||
			"",
		);
		const patientDraft = usePatientStore.getState().patientCoreDraft;
		const patientNotes = patientDraft?.notes || "";

		const weight = Number(args.patientWeightKg || args.weightKg || args.weight || 70);
		const plannedCarpules = Number(args.plannedCarpules || args.carpules || 1);
		const requestedType = String(args.anestheticType || args.type || "auto");

		const extraConditions = Array.isArray(args.somaticConditions)
			? args.somaticConditions.map(String)
			: args.somaticConditions
				? [String(args.somaticConditions)]
				: [];
		const combinedContext = [patientNotes, ...extraConditions].join(" ").toLowerCase();
		const safety = parseSafetyProfileFromText(combinedContext);

		const isCardiovascularRisk =
			safety.hasHypertension ||
			safety.hasCardiovascularDisease ||
			safety.hasIhd ||
			safety.hasArrhythmia ||
			combinedContext.includes("гипертон") ||
			combinedContext.includes("давлен") ||
			combinedContext.includes("ибс") ||
			combinedContext.includes("аритми") ||
			combinedContext.includes("глауком");

		const isPregnancy =
			(safety.pregnancyTrimester && safety.pregnancyTrimester !== "none") ||
			combinedContext.includes("беременн") ||
			combinedContext.includes("лактац") ||
			combinedContext.includes("триместр");

		const isArticaineAllergy =
			safety.hasArticaineAllergy ||
			safety.hasSulfiteAllergy ||
			combinedContext.includes("артикаин") ||
			combinedContext.includes("ультракаин") ||
			combinedContext.includes("сульфит");

		// Автоподбор анестетика
		let drugKey = requestedType;
		if (drugKey === "auto") {
			if (isArticaineAllergy || isCardiovascularRisk) {
				drugKey = "mepivacaine_3_plain";
			} else if (isPregnancy) {
				drugKey = "articaine_1_200000";
			} else {
				drugKey = "articaine_1_100000";
			}
		}

		let drugName = "Артикаин 4% с эпинефрином 1:100 000";
		let tradeNameSample = "Ультракаин® Д-С форте / Септанест 1:100 000";
		let concentrationPercent = 4;
		let vasoconstrictorRatio: string | null = "1:100 000";
		let mgPerCarpule = 68; // 40 mg/ml * 1.7 ml
		let epinephrineMcgPerCarpule = 17; // 10 mcg/ml * 1.7 ml
		let maxDoseMg = Math.min(weight * 7.0, 500); // MRD 7.0 mg/kg, max 500 mg
		let maxSafeEpinephrineMcg = isCardiovascularRisk ? 40 : 200;

		if (drugKey === "mepivacaine_3_plain") {
			drugName = "Мепивакаин 3% без вазоконстриктора";
			tradeNameSample = "Скандонест 3% plain / Мепивакаин 3%";
			concentrationPercent = 3;
			vasoconstrictorRatio = null;
			mgPerCarpule = 51; // 30 mg/ml * 1.7 ml
			epinephrineMcgPerCarpule = 0;
			maxDoseMg = Math.min(weight * 4.4, 300); // MRD 4.4 mg/kg, max 300 mg
			maxSafeEpinephrineMcg = 0;
		} else if (drugKey === "articaine_1_200000") {
			drugName = "Артикаин 4% с эпинефрином 1:200 000";
			tradeNameSample = "Ультракаин® Д-С / Убистезин 1:200 000";
			concentrationPercent = 4;
			vasoconstrictorRatio = "1:200 000";
			mgPerCarpule = 68;
			epinephrineMcgPerCarpule = 8.5; // 5 mcg/ml * 1.7 ml
			maxDoseMg = Math.min(weight * 7.0, 500);
			maxSafeEpinephrineMcg = isCardiovascularRisk ? 40 : 200;
		}

		const maxCarpules = Math.max(1, Math.floor(maxDoseMg / mgPerCarpule));
		const recommendedCarpules = Math.min(plannedCarpules, maxCarpules);
		const totalEpinephrineMcg = epinephrineMcgPerCarpule * plannedCarpules;

		const isOverdose = plannedCarpules > maxCarpules;
		const isEpiExcess =
			maxSafeEpinephrineMcg > 0 && totalEpinephrineMcg > maxSafeEpinephrineMcg;

		let warning: string | null = null;
		if (isOverdose) {
			warning = `Превышение предельной дозы! Запланировано ${plannedCarpules} карпул (${plannedCarpules * mgPerCarpule} мг). Для массы ${weight} кг максимум ${maxCarpules} карпул (${maxDoseMg} мг).`;
		} else if (isEpiExcess) {
			warning = `Превышение кардио-безопасной дозы адреналина (${totalEpinephrineMcg} мкг > ${maxSafeEpinephrineMcg} мкг). Рекомендовано не более ${Math.floor(maxSafeEpinephrineMcg / epinephrineMcgPerCarpule)} карпул.`;
		}

		const formattedSummary = `Анестетик: ${drugName} (${tradeNameSample}). Масса: ${weight} кг. Максимум: ${maxCarpules} карпул (${maxDoseMg} мг). Планируется: ${plannedCarpules} карпула. ${
			isCardiovascularRisk ? "Кардио-протокол активен." : ""
		}`;

		return {
			success: true,
			callId,
			actionName: name,
			category: "pharmacology",
			message: warning ? `⚠️ ${warning}` : `Расчет дозы анестетика: ${formattedSummary}`,
			data: {
				patientId: activePatId,
				anestheticType: drugKey,
				drugKey,
				drugName,
				tradeNameSample,
				concentrationPercent,
				vasoconstrictorRatio,
				patientWeightKg: weight,
				maxDoseMg,
				mgPerCarpule,
				maxCarpules,
				maxSafeCarpules: maxCarpules,
				recommendedCarpules,
				plannedCarpules,
				epinephrineMcgPerCarpule,
				totalEpinephrineMcg,
				maxSafeEpinephrineMcg,
				isCardiovascularRisk,
				isPregnancy,
				isOverdose,
				isExceeded: isOverdose || isEpiExcess,
				warning,
				safeToProceed: true,
				doctorAutonomyBlocked: false,
				formattedSummary,
				quickDisposalReady: true,
			},
		};
	}

	return null;
}
