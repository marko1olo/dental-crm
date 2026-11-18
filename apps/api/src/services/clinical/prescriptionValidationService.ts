/**
 * apps/api/src/services/clinical/prescriptionValidationService.ts
 *
 * Сервис валидации рецептов, оценки соматических аллергий и пассивной безопасности врача.
 * Мандаты 8e (Автономия врача), 8y (Пассивные предупреждения, ноль фарм-паранойи, кнопки никогда не disabled).
 * PHR-03 / PHR-04: Сквозная проверка аллергий, DDI и стоматологических диагнозов МКБ-10.
 */

import {
	checkDrugDrugInteractions,
	evaluateSomaticAndAllergyRisks,
	matchDrugClasses,
	type ClinicalAllergyWarning,
	type ClinicalDdiInteraction,
	type SafeAlternativeRecommendation,
} from "@dental/shared";

export interface PrescriptionValidationParams {
	readonly proposedDrugs: readonly string[];
	readonly patientAllergies?: readonly string[] | string | null | undefined;
	readonly patientConditions?: readonly string[] | null | undefined;
	readonly existingMedications?: readonly string[] | null | undefined;
}

export interface PrescriptionValidationResult {
	readonly isValid: boolean;
	readonly safetyAuditPassed: boolean;
	readonly hasAllergyWarning: boolean;
	readonly hasDdiWarning: boolean;
	readonly passiveWarnings: readonly string[];
	readonly allergyWarnings: readonly ClinicalAllergyWarning[];
	readonly drugInteractions: readonly ClinicalDdiInteraction[];
	readonly safeAlternativeRecommendations: readonly SafeAlternativeRecommendation[];
	readonly isDoctorAutonomyPermitted: true; // Мандат 8e: Кнопка выписки НИКОГДА не блокируется
	readonly evaluatedAt: string;
}

const PENICILLIN_KEYWORDS = [
	"пенициллин",
	"пеницилин",
	"бета-лактам",
	"penicillin",
	"amoxicillin",
	"амоксициллин",
	"амоксиклав",
	"аугментин",
	"ампициллин",
	"флемоксин",
	"оксациллин",
];

const NSAID_KEYWORDS = [
	"нпвс",
	"нпвп",
	"аспирин",
	"nsaid",
	"ибупрофен",
	"нимесулид",
	"нимесил",
	"кеторолак",
	"кетанов",
	"диклофенак",
	"кетопрофен",
	"дексалгин",
	"мелоксикам",
	"аспириновая триада",
	"триада самтера",
];

const ANESTHETIC_KEYWORDS = [
	"лидокаин",
	"артикаин",
	"ультракаин",
	"новокаин",
	"прокаин",
	"мепивакаин",
	"скандонест",
	"анестетик",
	"anesthetic",
];

export function extractPatientAllergyTerms(raw: unknown): string[] {
	if (!raw) return [];
	if (Array.isArray(raw)) {
		return raw
			.map((item) => (typeof item === "string" ? item : String(item)))
			.map((s) => s.trim())
			.filter(Boolean);
	}
	if (typeof raw === "string") {
		return raw
			.split(/[,;\n\r]+/)
			.map((s) => s.trim())
			.filter(Boolean);
	}
	return [];
}

/**
 * Формирует лаконичное пассивное предупреждение в строгом соответствии с клиническим протоколом.
 * Требование Создателя (1:1 Verbatim):
 * «⚠️ Внимание: в карте отмечена непереносимость пенициллинов. Назначен: Амоксициллин. Альтернатива: Клиндамицин 300 мг»
 */
export function formatPassiveAllergyAlert(
	conflictType: "penicillin" | "nsaid" | "anesthetic" | string,
	drugName: string,
	recommendedAlternative?: string,
): string {
	if (conflictType === "penicillin") {
		const alt = recommendedAlternative || "Клиндамицин 300 мг (или Азитромицин 500 мг)";
		return `⚠️ Внимание: в карте отмечена непереносимость пенициллинов. Назначен: ${drugName}. Альтернатива: ${alt}`;
	}
	if (conflictType === "nsaid") {
		const alt = recommendedAlternative || "Парацетамол 500 мг";
		return `⚠️ Внимание: в карте отмечена непереносимость НПВП/аспирина. Назначен: ${drugName}. Альтернатива: ${alt}`;
	}
	if (conflictType === "anesthetic") {
		const alt = recommendedAlternative || "Мепивакаин 3% без вазоконстриктора";
		return `⚠️ Внимание: в карте отмечена непереносимость местных анестетиков. Назначен: ${drugName}. Альтернатива: ${alt}`;
	}
	const alt = recommendedAlternative ? `. Альтернатива: ${recommendedAlternative}` : "";
	return `⚠️ Внимание: в карте отмечена непереносимость группы препаратов. Назначен: ${drugName}${alt}`;
}

export function validatePrescriptionAllergiesAndSafety(
	params: PrescriptionValidationParams,
): PrescriptionValidationResult {
	const proposed = params.proposedDrugs.filter(Boolean);
	const allergies = extractPatientAllergyTerms(params.patientAllergies);
	const conditions = (params.patientConditions || []).filter(Boolean);
	const existingMeds = (params.existingMedications || []).filter(Boolean);

	const normalizedAllergiesText = allergies.join(" ").toLowerCase();

	const hasPenicillinAllergy = PENICILLIN_KEYWORDS.some((kw) =>
		normalizedAllergiesText.includes(kw),
	);
	const hasNsaidAllergy = NSAID_KEYWORDS.some((kw) =>
		normalizedAllergiesText.includes(kw),
	);
	const hasAnestheticAllergy = ANESTHETIC_KEYWORDS.some((kw) =>
		normalizedAllergiesText.includes(kw),
	);

	const passiveWarnings: string[] = [];
	const customAllergyWarnings: ClinicalAllergyWarning[] = [];
	const customAlternatives: SafeAlternativeRecommendation[] = [];

	// 1. Проверяем каждый назначаемый препарат на совпадение с аллергоанамнезом
	for (const drug of proposed) {
		const drugLower = drug.toLowerCase();
		const classes = matchDrugClasses(drug);

		// А. Пенициллины / Бета-лактамы
		const isPenicillinDrug =
			classes.includes("penicillin_beta_lactam") ||
			PENICILLIN_KEYWORDS.some((kw) => drugLower.includes(kw));

		if (isPenicillinDrug && hasPenicillinAllergy) {
			const alt = "Клиндамицин 300 мг (или Азитромицин 500 мг)";
			passiveWarnings.push(
				formatPassiveAllergyAlert("penicillin", drug, alt),
			);
			customAllergyWarnings.push({
				allergenGroup: "Пенициллины и бета-лактамные антибиотики",
				proposedDrug: drug,
				severity: "critical",
				manifestationsRu:
					"Риск анафилаксии, отека Квинке, генерализованной крапивницы при непереносимости бета-лактамов",
				clinicalActionRu:
					"Пассивное предупреждение врача. Рекомендуется назначить Клиндамицин 300 мг или Азитромицин 500 мг.",
			});
			customAlternatives.push({
				originalDrug: drug,
				recommendedAlternatives: [
					"Клиндамицин 300 мг 3 раза/сут (5–7 дней)",
					"Азитромицин (Сумамед) 500 мг 1 раз/сут (3 дня)",
				],
				rationaleRu:
					"Линкозамиды (Клиндамицин) и макролиды не дают перекрестной аллергии с пенициллинами и тропны к костной ткани челюсти.",
			});
		}

		// Б. НПВП / Салицилаты
		const isNsaidDrug =
			classes.includes("nsaid") ||
			NSAID_KEYWORDS.some((kw) => drugLower.includes(kw));

		if (isNsaidDrug && hasNsaidAllergy) {
			const alt = "Парацетамол 500 мг";
			passiveWarnings.push(
				formatPassiveAllergyAlert("nsaid", drug, alt),
			);
			customAllergyWarnings.push({
				allergenGroup: "НПВС / Аспирин / Салицилаты",
				proposedDrug: drug,
				severity: "critical",
				manifestationsRu:
					"Риск аспиринового бронхоспазма, отека Квинке, ангионевротического отека",
				clinicalActionRu:
					"Пассивное предупреждение врача. Рекомендуется назначить Парацетамол 500 мг.",
			});
			customAlternatives.push({
				originalDrug: drug,
				recommendedAlternatives: [
					"Парацетамол 500–1000 мг (до 4 раз/сут, макс 4000 мг/сут)",
				],
				rationaleRu:
					"Парацетамол не ингибирует периферический ЦОГ-1 и безопасен при аллергии на НПВП.",
			});
		}

		// В. Местные анестетики
		const isAnestheticDrug =
			classes.includes("epinephrine_anesthetic") ||
			classes.includes("ester_anesthetic") ||
			ANESTHETIC_KEYWORDS.some((kw) => drugLower.includes(kw));

		if (isAnestheticDrug && hasAnestheticAllergy) {
			const alt = "Мепивакаин 3% без вазоконстриктора";
			passiveWarnings.push(
				formatPassiveAllergyAlert("anesthetic", drug, alt),
			);
			customAllergyWarnings.push({
				allergenGroup: "Местные анестетики",
				proposedDrug: drug,
				severity: "critical",
				manifestationsRu: "Токсико-аллергическая реакция, крапивница, бронхоспазм",
				clinicalActionRu: "Назначить Мепивакаин 3% (Скандонест) без адреналина и сульфитов.",
			});
			customAlternatives.push({
				originalDrug: drug,
				recommendedAlternatives: ["Мепивакаин 3% (Скандонест 3% plain)"],
				rationaleRu: "Мепивакаин без вазоконстриктора не содержит метабисульфита натрия.",
			});
		}
	}

	// 2. Оценка соматических рисков и межлекарственных взаимодействий (DDI)
	const somaticResult = evaluateSomaticAndAllergyRisks({
		proposedMedications: proposed,
		knownAllergies: allergies,
		patientConditions: conditions,
		existingMedications: existingMeds,
	});

	const ddiResult = checkDrugDrugInteractions(proposed, existingMeds);

	// 3. Консолидация результатов
	const allAllergyWarnings: ClinicalAllergyWarning[] = [
		...customAllergyWarnings,
		...somaticResult.allergyWarnings.filter(
			(sw) => !customAllergyWarnings.some((cw) => cw.proposedDrug === sw.proposedDrug && cw.allergenGroup === sw.allergenGroup),
		),
	];

	const allAlternatives: SafeAlternativeRecommendation[] = [
		...customAlternatives,
		...somaticResult.safeAlternativeRecommendations.filter(
			(sa) => !customAlternatives.some((ca) => ca.originalDrug === sa.originalDrug),
		),
		...ddiResult.safeAlternativeRecommendations.filter(
			(da) => !customAlternatives.some((ca) => ca.originalDrug === da.originalDrug),
		),
	];

	const hasAllergyWarning = allAllergyWarnings.length > 0;
	const hasDdiWarning = ddiResult.drugInteractions.length > 0;

	// Если есть аллергия или DDI — safetyAuditPassed = false, но выписка разрешена (Мандат 8e)
	const safetyAuditPassed = !hasAllergyWarning && !hasDdiWarning;

	return {
		isValid: true,
		safetyAuditPassed,
		hasAllergyWarning,
		hasDdiWarning,
		passiveWarnings,
		allergyWarnings: allAllergyWarnings,
		drugInteractions: ddiResult.drugInteractions,
		safeAlternativeRecommendations: allAlternatives,
		isDoctorAutonomyPermitted: true,
		evaluatedAt: new Date().toISOString(),
	};
}
