/**
 * clinicalTools.ts — Clinical agent tools for EMR exploration, 043/у visit diary protocol generation,
 * statutory prescription Form 107-1/у generation, 3-tier treatment plans (Order 804n integer kopecks),
 * drug-drug interaction (DDI) & allergy safety auditing, scheduling, staff tasks, and preventive recalls.
 */

import {
	calculateNextRecallDueMonth,
	checkDentalMedicationInteractions,
	type DentalDrugInteractionRule,
	RECALL_INTERVAL_MONTHS,
	generateEmrAutopilotPlan,
	synthesizeClinicalDiary,
	validateForm043uCompliance,
	type VisitDiaryEntry043,
	type SoapVisitDiary,
	type EmrAutopilotResult,
	DENTAL_PRESCRIPTION_DRUG_CATALOG,
	PRESCRIPTION_DOSAGE_FORMS_CATALOG,
	PRESCRIPTION_ADMINISTRATION_ROUTES_CATALOG,
	form107_1uPayloadSchema,
	type Form107_1uPayload,
	type PrescriptionDrugItem,
	buildMultiOptionTreatmentPlan,
	calculateSingleTierEstimate,
	PLAN_TIER_CONFIGS,
	PLAN_STAGE_METADATA,
	getOrder804nServicesForClinicalCase,
	calculateOrder804nBillingEstimate,
	type PlanTierKey,
	type PlanStageKind,
	type ToothSurface,
	type Kopecks,
} from "@dental/shared";
import { and, desc, eq, gte, ilike, lte, ne, or, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../../db/client.js";
import {
	appointments,
	chairs,
	communicationTasks,
	familyGroups,
	labOrders,
	patientDrugAllergies,
	patientTaskTickets,
	patients,
	payments,
	treatmentPlans,
	users,
	visits,
} from "../../../db/schema.js";
import {
	Icd10ClinicalValidator,
	VALID_FDI_PERMANENT_TEETH,
	VALID_FDI_PRIMARY_TEETH,
} from "../../clinical/Icd10ClinicalValidator.js";
import type { ToolRegistry } from "./registry.js";
import type { ToolDefinition } from "./tool.js";
import { autoFillCancellationGapTool } from "./cancellationTool.js";
import { generateInformedConsentTool } from "./consentTool.js";
import { calculateTreatmentEstimateTool } from "./estimateTool.js";
import { draftLabWorkOrderTool } from "./labOrderTool.js";
import {
	recordSterilizationTestTool,
	registerSanpinTools,
	verifyKraftPackTool,
} from "./sanpinTools.js";
import { analyzeRadiographVisionTool } from "./visionTool.js";
import { searchPatientHistoryTool } from "../rag/patientHistoryMemory.js";

// ─── 0. CLINICAL RENDERING & SAFETY HELPERS ─────────────────────────────────

export function render043Text(autopilot: EmrAutopilotResult): string {
	const d = autopilot.diaryEntry;
	return [
		`═══════════════════════════════════════════════════════════════════════════`,
		`ДНЕВНИК ПРИЁМА ВРАЧА-СТОМАТОЛОГА (ФОРМА № 043/У, ПРИКАЗ МИНЗДРАВА № 834Н)`,
		`═══════════════════════════════════════════════════════════════════════════`,
		`Дата и время приёма: ${d.entryDate} ${d.entryTime || ""}`.trim(),
		`Зуб (FDI): ${d.toothNumber || "—"} | Диагноз МКБ-10: ${d.assessmentIcd10Code} (${d.assessmentDiagnosisText})`,
		`Лечащий врач: ${d.doctorFullName} (${d.doctorSpecialty || "Врач-стоматолог"})`,
		`─────────────────────────────────────────────────────────────────────────────`,
		`S (Subjective / Жалобы и анамнез):`,
		`  ${d.subjectiveComplaints}`,
		`─────────────────────────────────────────────────────────────────────────────`,
		`O (Objective / Объективный статус и Status Localis):`,
		`  ${d.objectiveStatusLocalis}`,
		`  • Перкуссия вертикальная: ${d.percussionVertical === "negative" ? "безболезненная (-)" : d.percussionVertical === "positive_sharp" ? "резко болезненная (++)" : "слабо чувствительная (+)"}`,
		`  • Зондирование: ${d.probingTenderness || "безболезненное"}`,
		`  • Термометрия: ${d.thermalTestResponse || "индифферентная"}`,
		d.eodMicroamperes ? `  • ЭОД: ${d.eodMicroamperes} мкА` : null,
		`─────────────────────────────────────────────────────────────────────────────`,
		`A (Assessment / Клинический диагноз):`,
		`  ${d.assessmentDiagnosisText} [МКБ-10: ${d.assessmentIcd10Code}]`,
		`─────────────────────────────────────────────────────────────────────────────`,
		`P (Plan & Procedure / Протокол проведенного лечения):`,
		`  ${d.procedureProtocol}`,
		d.anesthesiaDetails ? `  • Анестезия: ${d.anesthesiaDetails}` : null,
		d.appliedMaterials ? `  • Материалы: ${d.appliedMaterials}` : null,
		`─────────────────────────────────────────────────────────────────────────────`,
		`Рекомендации и назначения на дом:`,
		`  ${d.homeCareRecommendations || "Соблюдение гигиены полости рта, щадящая диета 2-3 дня, плановый осмотр через 6 месяцев."}`,
		`─────────────────────────────────────────────────────────────────────────────`,
		`Расчет стоимости по Номенклатуре Минздрава 804н: ${autopilot.billingEstimate.formattedTotal} (${autopilot.billingEstimate.totalKopecks} коп.)`,
		`Подпись лечащего врача: ${d.doctorFullName} ____________________`,
		`═══════════════════════════════════════════════════════════════════════════`,
	]
		.filter(Boolean)
		.join("\n");
}

export function renderPrescription107Text(payload: Form107_1uPayload): string {
	const stampLines = [
		`Министерство здравоохранения РФ`,
		`Медицинская организация: ${payload.clinicLegalName}`,
		payload.clinicAddress ? `Адрес: ${payload.clinicAddress}` : null,
		payload.clinicPhone ? `Тел.: ${payload.clinicPhone}` : null,
		payload.clinicOgrn
			? `ОГРН: ${payload.clinicOgrn} | ИНН: ${payload.clinicInn || "—"}`
			: null,
		payload.medicalLicenseNumber
			? `Лицензия: № ${payload.medicalLicenseNumber}`
			: null,
	]
		.filter(Boolean)
		.join("\n");

	const drugLines = payload.items
		.map((item, idx) => {
			return [
				`[${idx + 1}] ${item.latinName}`,
				`    ${item.dispenseLatin}`,
				`    ${item.signaRussian}`,
				`    (Торговое наименование: ${item.tradeName}, форма: ${item.form}, дозировка: ${item.dosage})`,
			].join("\n");
		})
		.join("\n\n");

	const validityText =
		payload.validityDays === "365"
			? "До 1 года (По специальному назначению)"
			: `${payload.validityDays} дней (со дня выписывания)`;

	return [
		`═══════════════════════════════════════════════════════════════════════════`,
		`МИНИСТЕРСТВО ЗДРАВООХРАНЕНИЯ РОССИЙСКОЙ ФЕДЕРАЦИИ`,
		`Медицинская документация: Форма № 107-1/у (Приказ Минздрава России № 1094н)`,
		`═══════════════════════════════════════════════════════════════════════════`,
		`ШТАМП ОРГАНИЗАЦИИ:`,
		stampLines,
		`─────────────────────────────────────────────────────────────────────────────`,
		`РЕЦЕПТ Серия: ${payload.prescriptionSeriesNumber} от ${payload.prescriptionDate}`,
		`Срок действия рецепта: ${validityText}`,
		payload.isChronicSpecialCare
			? `Пометка: ПО СПЕЦИАЛЬНОМУ НАЗНАЧЕНИЮ (периодичность: ${payload.chronicPeriodicity || "ежемесячно"})`
			: null,
		`─────────────────────────────────────────────────────────────────────────────`,
		`Пациент: ${payload.patientFullName}`,
		`Дата рождения: ${payload.patientBirthDate}${payload.patientAgeYears !== undefined && payload.patientAgeYears !== null ? ` (Возраст: ${payload.patientAgeYears} лет)` : ""}`,
		`Медицинская карта №: ${payload.medicalCardNumber}`,
		payload.diagnosisIcd10Code
			? `Диагноз по МКБ-10: ${payload.diagnosisIcd10Code}`
			: null,
		`─────────────────────────────────────────────────────────────────────────────`,
		`НАЗНАЧЕНИЯ (Rp: / D.t.d. / S.):`,
		drugLines,
		`─────────────────────────────────────────────────────────────────────────────`,
		`Врач: ${payload.doctorFullName} (${payload.doctorSpecialty || "Врач-стоматолог"})`,
		`Подпись и личная печать врача: ____________________ [ М.П. ]`,
		`═══════════════════════════════════════════════════════════════════════════`,
	]
		.filter(Boolean)
		.join("\n");
}

export interface DrugSafetyAuditParams {
	patientId?: string | undefined;
	organizationId?: string | undefined;
	// biome-ignore lint/suspicious/noExplicitAny: Database instance
	targetDb?: any;
	proposedMedications: string[];
	existingMedications?: string[] | undefined;
	patientConditions?: string[] | undefined;
	knownAllergies?: string[] | undefined;
}

export interface DrugSafetyAuditResult {
	isSafe: boolean;
	riskLevel: "safe" | "caution" | "critical_danger";
	hasAllergyClash: boolean;
	hasSevereDdi: boolean;
	hasConditionContraindication: boolean;
	blockedPrescriptions: string[];
	allergyWarnings: {
		allergenGroup: string;
		proposedDrug: string;
		severity: string;
		manifestations: string;
	}[];
	drugInteractions: {
		primaryDrug: string;
		interactingDrug: string;
		severity: "critical" | "high" | "moderate" | "minor";
		effectDescriptionRu: string;
		clinicalRecommendationRu: string;
	}[];
	conditionContraindications: {
		condition: string;
		proposedDrug: string;
		severity: "critical" | "high" | "warning";
		reasonRu: string;
		clinicalGuidanceRu: string;
	}[];
	safeAlternativeRecommendations: {
		originalDrug: string;
		recommendedAlternatives: string[];
		rationaleRu: string;
	}[];
	summaryRu: string;
}

export async function performClinicalDrugSafetyAudit(
	params: DrugSafetyAuditParams,
): Promise<DrugSafetyAuditResult> {
	const allergyWarnings: {
		allergenGroup: string;
		proposedDrug: string;
		severity: string;
		manifestations: string;
	}[] = [];

	const blockedPrescriptions: Set<string> = new Set();
	const conditionContraindications: {
		condition: string;
		proposedDrug: string;
		severity: "critical" | "high" | "warning";
		reasonRu: string;
		clinicalGuidanceRu: string;
	}[] = [];
	const safeAlternativeRecommendations: {
		originalDrug: string;
		recommendedAlternatives: string[];
		rationaleRu: string;
	}[] = [];

	const unifiedConditions = (params.patientConditions || []).map((c) =>
		c.toLowerCase(),
	);
	const unifiedAllergies = (params.knownAllergies || []).map((a) =>
		a.toLowerCase(),
	);

	// 1. If patientId and DB are available, fetch patientDrugAllergies & patient record
	if (params.patientId && params.organizationId && params.targetDb) {
		try {
			const dbAllergies = await params.targetDb
				.select()
				.from(patientDrugAllergies)
				.where(
					and(
						eq(patientDrugAllergies.organizationId, params.organizationId),
						eq(patientDrugAllergies.patientId, params.patientId),
					),
				);

			for (const a of dbAllergies) {
				if (a.allergenGroup)
					unifiedAllergies.push(a.allergenGroup.toLowerCase());
				if (a.drugInnLatin) unifiedAllergies.push(a.drugInnLatin.toLowerCase());
				if (a.hasSamterTriad) unifiedConditions.push("samter_triad");
			}

			const [patientRecord] = await params.targetDb
				.select({ notes: patients.notes, profile: patients.administrativeProfile })
				.from(patients)
				.where(
					and(
						eq(patients.organizationId, params.organizationId),
						eq(patients.id, params.patientId),
					),
				)
				.limit(1);

			if (patientRecord?.notes) {
				const notesLower = patientRecord.notes.toLowerCase();
				if (notesLower.includes("беременн")) unifiedConditions.push("pregnancy");
				if (notesLower.includes("3 триместр") || notesLower.includes("третий триместр")) {
					unifiedConditions.push("pregnancy_3rd_trimester");
				}
				if (notesLower.includes("астма")) unifiedConditions.push("bronchial_asthma");
				if (notesLower.includes("язва")) unifiedConditions.push("peptic_ulcer");
				if (notesLower.includes("почечн") || notesLower.includes("хпн")) {
					unifiedConditions.push("renal_failure");
				}
			}
		} catch {
			// Fail-safe fallback if DB tables unavailable in isolated test execution
		}
	}

	// 2. Allergy & Cross-Reactivity Auditing
	for (const proposed of params.proposedMedications) {
		const propLower = proposed.toLowerCase();

		// Beta-lactams / Penicillins
		const isBetaLactam =
			propLower.includes("amox") ||
			propLower.includes("penicil") ||
			propLower.includes("амоксициллин") ||
			propLower.includes("амоксиклав") ||
			propLower.includes("аугментин") ||
			propLower.includes("флемоксин") ||
			propLower.includes("ампициллин") ||
			propLower.includes("цефалоспорин") ||
			propLower.includes("цефтриаксон");

		const hasPenicillinAllergy = unifiedAllergies.some(
			(a) =>
				a.includes("пенициллин") ||
				a.includes("пеницилин") ||
				a.includes("бета-лактам") ||
				a.includes("penicillin") ||
				a.includes("amoxicillin") ||
				a.includes("амоксиклав"),
		);

		if (isBetaLactam && hasPenicillinAllergy) {
			blockedPrescriptions.add(proposed);
			allergyWarnings.push({
				allergenGroup: "Пенициллины и бета-лактамные антибиотики",
				proposedDrug: proposed,
				severity: "critical",
				manifestations: "Анафилактический шок, ангионевротический отек Квинке, генерализованная крапивница",
			});
			safeAlternativeRecommendations.push({
				originalDrug: proposed,
				recommendedAlternatives: [
					"Сумамед (Азитромицин 500 мг 1 раз/сут, 3 дня)",
					"Клиндамицин (300 мг 3 раза/сут, 5–7 дней)",
					"Линкомицин (500 мг 3 раза/сут)",
				],
				rationaleRu: "При аллергии на пенициллины препаратами выбора являются макролиды или линкозамиды.",
			});
		}

		// NSAIDs / Aspirin (Samter's Triad)
		const isNsaid =
			propLower.includes("ibu") ||
			propLower.includes("nimesul") ||
			propLower.includes("ketorol") ||
			propLower.includes("ketoprophen") ||
			propLower.includes("diclofen") ||
			propLower.includes("aspirin") ||
			propLower.includes("ибупрофен") ||
			propLower.includes("нимесил") ||
			propLower.includes("нимесулид") ||
			propLower.includes("кетанов") ||
			propLower.includes("кеторолак") ||
			propLower.includes("кетонал") ||
			propLower.includes("дексалгин") ||
			propLower.includes("дескетопрофен") ||
			propLower.includes("аспирин") ||
			propLower.includes("диклофенак");

		const hasNsaidAllergy =
			unifiedAllergies.some(
				(a) =>
					a.includes("нпвс") ||
					a.includes("аспирин") ||
					a.includes("nsaid") ||
					a.includes("ибупрофен") ||
					a.includes("нимесулид"),
			) ||
			unifiedConditions.some(
				(c) =>
					c.includes("samter") ||
					c.includes("аспиринов") ||
					c.includes("триада"),
			);

		if (isNsaid && hasNsaidAllergy) {
			blockedPrescriptions.add(proposed);
			allergyWarnings.push({
				allergenGroup: "НПВС / Салицилаты (Аспириновая триада)",
				proposedDrug: proposed,
				severity: "critical",
				manifestations: "Тяжелый бронхоспазм (аспириновая астма), отек гортани, анафилаксия",
			});
			safeAlternativeRecommendations.push({
				originalDrug: proposed,
				recommendedAlternatives: [
					"Парацетамол (500–1000 мг до 3 раз/сут)",
					"Трамадол (50 мг внутрь при выраженной постоперационной боли)",
					"Местная холодовая гипотермия",
				],
				rationaleRu: "Парацетамол не ингибирует периферический синтез простагландинов и безопасен при аспириновой астме.",
			});
		}

		// Sulfites (Vasoconstrictor stabilizers in Local Anesthetics)
		const hasVasoconstrictor =
			propLower.includes("1:100") ||
			propLower.includes("1:200") ||
			propLower.includes("эпинефрин") ||
			propLower.includes("адреналин") ||
			propLower.includes("ultracain") ||
			propLower.includes("ультракаин дс") ||
			propLower.includes("septanest") ||
			propLower.includes("септанест") ||
			propLower.includes("ubistesin") ||
			propLower.includes("убистезин");

		const hasSulfiteAllergy =
			unifiedAllergies.some(
				(a) =>
					a.includes("сульфит") ||
					a.includes("метабисульфит") ||
					a.includes("sulfite"),
			) ||
			unifiedConditions.some(
				(c) =>
					c.includes("asthma") ||
					c.includes("астма") ||
					c.includes("bronchial_asthma"),
			);

		if (hasVasoconstrictor && hasSulfiteAllergy) {
			blockedPrescriptions.add(proposed);
			allergyWarnings.push({
				allergenGroup: "Сульфиты / Метабисульфит натрия (стабилизатор адреналина)",
				proposedDrug: proposed,
				severity: "critical",
				manifestations: "Острый анафилактоидный бронхоспазм у пациентов с астмой/сульфитной гиперчувствительностью",
			});
			safeAlternativeRecommendations.push({
				originalDrug: proposed,
				recommendedAlternatives: [
					"Скандонест 3% без вазоконстриктора (Мепивакаин 30 мг/мл)",
					"Мепивастезин 3% без адреналина",
					"Ультракаин Д (без консервантов и сульфитов)",
				],
				rationaleRu: "Мепивакаин не содержит метабисульфита натрия и обладает собственной умеренной вазоконстрикторной активностью.",
			});
		}
	}

	// 3. Somatic & Pregnancy Contraindication Audits
	for (const proposed of params.proposedMedications) {
		const propLower = proposed.toLowerCase();
		const isNsaid =
			propLower.includes("ibu") ||
			propLower.includes("nimesul") ||
			propLower.includes("ketorol") ||
			propLower.includes("ketoprophen") ||
			propLower.includes("diclofen") ||
			propLower.includes("ибупрофен") ||
			propLower.includes("нимесил") ||
			propLower.includes("нимесулид") ||
			propLower.includes("кетанов") ||
			propLower.includes("кеторолак") ||
			propLower.includes("кетонал") ||
			propLower.includes("дексалгин");

		// Pregnancy 3rd Trimester
		const isPregnancy3rd = unifiedConditions.some(
			(c) =>
				c.includes("pregnancy_3rd_trimester") ||
				c.includes("3 триместр") ||
				c.includes("третий триместр"),
		);

		if (isNsaid && isPregnancy3rd) {
			blockedPrescriptions.add(proposed);
			conditionContraindications.push({
				condition: "Беременность (III триместр)",
				proposedDrug: proposed,
				severity: "critical",
				reasonRu: "Абсолютное противопоказание: риск преждевременного закрытия артериального протока (ductus arteriosus) у плода, легочной гипертензии и маловодия.",
				clinicalGuidanceRu: "Категорически отменить НПВС. Назначить Парацетамол 500 мг (максимально безопасный анальгетик при беременности).",
			});
			safeAlternativeRecommendations.push({
				originalDrug: proposed,
				recommendedAlternatives: ["Парацетамол 500 мг внутрь"],
				rationaleRu: "Парацетамол разрешен на всех сроках беременности.",
			});
		}

		// Peptic Ulcer Active
		const hasPepticUlcer = unifiedConditions.some(
			(c) =>
				c.includes("peptic_ulcer") ||
				c.includes("язва") ||
				c.includes("эрозивный гастрит"),
		);

		if (isNsaid && hasPepticUlcer) {
			conditionContraindications.push({
				condition: "Язвенная болезнь желудка и 12-перстной кишки / Эрозивный гастрит",
				proposedDrug: proposed,
				severity: "high",
				reasonRu: "Системные НПВС ингибируют ЦОГ-1 и гастропротективные простагландины, провоцируя рецидив язвенного кровотечения.",
				clinicalGuidanceRu: "Заменить на Парацетамол либо обязательно комбинировать НПВС с ингибитором протонной помпы (Омепразол 20 мг утром за 30 мин до еды).",
			});
		}
	}

	// 4. Drug-Drug Interactions (DDI) via Formulary Engine & Pattern Matching
	const allDrugs = [
		...params.proposedMedications,
		...(params.existingMedications || []),
		...unifiedConditions,
	];
	const rawInteractions: DentalDrugInteractionRule[] =
		checkDentalMedicationInteractions(allDrugs);

	const formattedDdi: {
		primaryDrug: string;
		interactingDrug: string;
		severity: "critical" | "high" | "moderate" | "minor";
		effectDescriptionRu: string;
		clinicalRecommendationRu: string;
	}[] = rawInteractions.map((i) => ({
		primaryDrug: i.drugAId,
		interactingDrug: i.drugBId,
		severity:
			i.severity === "critical"
				? "critical"
				: i.severity === "warning"
					? "high"
					: "moderate",
		effectDescriptionRu: i.riskDescriptionRu,
		clinicalRecommendationRu: i.clinicalRecommendationRu,
	}));

	// Pattern-based DDI checks across proposed and existing medications
	const allMedStrings = [
		...params.proposedMedications.map((m) => ({ name: m, lower: m.toLowerCase(), isProposed: true })),
		...(params.existingMedications || []).map((m) => ({ name: m, lower: m.toLowerCase(), isProposed: false })),
	];

	// Check NSAID + Anticoagulants
	const nsaidItems = allMedStrings.filter(
		(m) =>
			m.lower.includes("ibu") ||
			m.lower.includes("nimesul") ||
			m.lower.includes("ketorol") ||
			m.lower.includes("ketoprophen") ||
			m.lower.includes("diclofen") ||
			m.lower.includes("aspirin") ||
			m.lower.includes("ибупрофен") ||
			m.lower.includes("нимесил") ||
			m.lower.includes("нимесулид") ||
			m.lower.includes("кетанов") ||
			m.lower.includes("кеторолак") ||
			m.lower.includes("кетонал") ||
			m.lower.includes("дексалгин") ||
			m.lower.includes("диклофенак") ||
			m.lower.includes("аспирин"),
	);

	const anticoags = allMedStrings.filter(
		(m) =>
			m.lower.includes("warfarin") ||
			m.lower.includes("варфарин") ||
			m.lower.includes("xarelto") ||
			m.lower.includes("ксарелто") ||
			m.lower.includes("rivaroxaban") ||
			m.lower.includes("ривароксабан") ||
			m.lower.includes("eliquis") ||
			m.lower.includes("эликвис") ||
			m.lower.includes("apixaban") ||
			m.lower.includes("апиксабан") ||
			m.lower.includes("pradaxa") ||
			m.lower.includes("прадакса") ||
			m.lower.includes("dabigatran") ||
			m.lower.includes("дабигатран") ||
			m.lower.includes("clopidogrel") ||
			m.lower.includes("клопидогрел") ||
			m.lower.includes("plavix") ||
			m.lower.includes("плавикс") ||
			m.lower.includes("anticoagulant") ||
			m.lower.includes("антикоагулянт") ||
			m.lower.includes("doac"),
	);

	if (nsaidItems.length > 0 && anticoags.length > 0) {
		for (const nsaid of nsaidItems) {
			for (const ac of anticoags) {
				if (nsaid.name !== ac.name) {
					if (!formattedDdi.some((d) => d.primaryDrug === nsaid.name && d.interactingDrug === ac.name)) {
						formattedDdi.push({
							primaryDrug: nsaid.name,
							interactingDrug: ac.name,
							severity: "critical",
							effectDescriptionRu: "НПВП в комбинации с антикоагулянтами резко повышают риск желудочно-кишечных и постоперационных кровотечений",
							clinicalRecommendationRu: "Заменить НПВП на парацетамол (до 2000 мг/сут). Избегать кеторолака и аспирина.",
						});
					}
				}
			}
		}
	}

	// Check Epinephrine + Non-selective beta blockers
	const epiItems = allMedStrings.filter(
		(m) =>
			m.lower.includes("1:100") ||
			m.lower.includes("1:200") ||
			m.lower.includes("эпинефрин") ||
			m.lower.includes("адреналин") ||
			m.lower.includes("ultracain") ||
			m.lower.includes("septanest") ||
			m.lower.includes("ubistesin"),
	);

	const betaBlockers = allMedStrings.filter(
		(m) =>
			m.lower.includes("propranolol") ||
			m.lower.includes("пропранолол") ||
			m.lower.includes("анаприлин") ||
			m.lower.includes("sotalol") ||
			m.lower.includes("соталол") ||
			m.lower.includes("non_selective_beta_blockers"),
	);

	if (epiItems.length > 0 && betaBlockers.length > 0) {
		for (const epi of epiItems) {
			for (const bb of betaBlockers) {
				if (!formattedDdi.some((d) => d.primaryDrug === epi.name && d.interactingDrug === bb.name)) {
					formattedDdi.push({
						primaryDrug: epi.name,
						interactingDrug: bb.name,
						severity: "critical",
						effectDescriptionRu: "Эпинефрин на фоне неселективных бета-блокаторов (пропранолол) вызывает тяжелый гипертонический криз с рефлекторной брадикардией",
						clinicalRecommendationRu: "Использовать местный анестетик БЕЗ вазоконстриктора (Мепивакаин 3%).",
					});
				}
			}
		}
	}

	for (const i of formattedDdi) {
		if (i.severity === "critical" || i.severity === "high") {
			blockedPrescriptions.add(i.primaryDrug);
			blockedPrescriptions.add(i.interactingDrug);
		}
	}

	const hasCriticalAllergy = allergyWarnings.some(
		(w) => w.severity === "critical",
	);
	const hasCriticalDdi = formattedDdi.some((d) => d.severity === "critical");
	const hasCriticalCondition = conditionContraindications.some(
		(c) => c.severity === "critical",
	);

	const isSafe =
		!hasCriticalAllergy && !hasCriticalDdi && !hasCriticalCondition;
	const riskLevel: "safe" | "caution" | "critical_danger" = !isSafe
		? "critical_danger"
		: allergyWarnings.length > 0 ||
			  formattedDdi.length > 0 ||
			  conditionContraindications.length > 0
			? "caution"
			: "safe";

	const summaryRu = !isSafe
		? `ВНИМАНИЕ! Обнаружены критические противопоказания / несовместимость (${blockedPrescriptions.size} препаратов заблокировано). Назначение опасно для жизни пациента.`
		: riskLevel === "caution"
			? `Препараты назначены с предосторожностями (выявлены умеренные взаимодействия или соматические ограничения). Требуется учет рекомендаций.`
			: `Фармакотерапевтический аудит пройден успешно: аллергических конфликтов, DDI несовместимости и противопоказаний не выявлено.`;

	return {
		isSafe,
		riskLevel,
		hasAllergyClash: allergyWarnings.length > 0,
		hasSevereDdi: formattedDdi.length > 0,
		hasConditionContraindication: conditionContraindications.length > 0,
		blockedPrescriptions: Array.from(blockedPrescriptions),
		allergyWarnings,
		drugInteractions: formattedDdi,
		conditionContraindications,
		safeAlternativeRecommendations,
		summaryRu,
	};
}

// ─── 1. find_patient ────────────────────────────────────────────────────────

const findPatientSchema = z.object({
	query: z
		.string()
		.min(1, "Поисковый запрос не может быть пустым")
		.describe("ФИО, номер телефона или дата рождения пациента"),
	limit: z
		.number()
		.int()
		.min(1)
		.max(50)
		.optional()
		.default(10)
		.describe("Максимальное количество возвращаемых записей"),
});

export const findPatientTool: ToolDefinition<typeof findPatientSchema> = {
	name: "find_patient",
	description:
		"Поиск пациентов клиники по ФИО, номеру телефона или дате рождения с соблюдением тенантной изоляции.",
	parameters: findPatientSchema,
	permissions: ["patients.read"],
	category: "read",
	handler: async (ctx, args) => {
		const targetDb = ctx.db ?? db;
		const query = args.query.trim();
		const pattern = `%${query}%`;

		const matches = await targetDb
			.select({
				id: patients.id,
				fullName: patients.fullName,
				phone: patients.phone,
				birthDate: patients.birthDate,
				status: patients.status,
				notes: patients.notes,
				createdAt: patients.createdAt,
			})
			.from(patients)
			.where(
				and(
					eq(patients.organizationId, ctx.organizationId),
					or(
						ilike(patients.fullName, pattern),
						ilike(patients.phone, pattern),
						ilike(patients.birthDate, pattern),
					),
				),
			)
			.limit(args.limit);

		return {
			count: matches.length,
			patients: matches,
		};
	},
};

// ─── 2. get_emr_card ────────────────────────────────────────────────────────

const getEmrCardSchema = z.object({
	patientId: z
		.string()
		.uuid("Некорректный UUID пациента")
		.describe("Уникальный идентификатор пациента"),
	includeVisits: z
		.boolean()
		.optional()
		.default(true)
		.describe("Включать ли историю приемов и дневников 043/у"),
	includeTreatmentPlans: z
		.boolean()
		.optional()
		.default(true)
		.describe("Включать ли планы лечения"),
	includeAllergies: z
		.boolean()
		.optional()
		.default(true)
		.describe("Включать ли аллергологический анамнез"),
});

export const getEmrCardTool: ToolDefinition<typeof getEmrCardSchema> = {
	name: "get_emr_card",
	description:
		"Получение полной электронной медицинской карты (ЭМК 043/у): профиль, визиты, диагнозы МКБ-10, аллергии и активные планы лечения.",
	parameters: getEmrCardSchema,
	permissions: ["clinical.read"],
	category: "read",
	handler: async (ctx, args) => {
		const targetDb = ctx.db ?? db;

		const [patient] = await targetDb
			.select()
			.from(patients)
			.where(
				and(
					eq(patients.organizationId, ctx.organizationId),
					eq(patients.id, args.patientId),
				),
			)
			.limit(1);

		if (!patient) {
			throw new Error(`Пациент с ID ${args.patientId} не найден`);
		}

		let patientAllergies: unknown[] = [];
		if (args.includeAllergies) {
			patientAllergies = await targetDb
				.select()
				.from(patientDrugAllergies)
				.where(
					and(
						eq(patientDrugAllergies.organizationId, ctx.organizationId),
						eq(patientDrugAllergies.patientId, args.patientId),
					),
				);
		}

		let patientVisits: unknown[] = [];
		if (args.includeVisits) {
			patientVisits = await targetDb
				.select({
					id: visits.id,
					status: visits.status,
					complaint: visits.complaint,
					anamnesis: visits.anamnesis,
					objectiveStatus: visits.objectiveStatus,
					diagnosis: visits.diagnosis,
					treatmentPlan: visits.treatmentPlan,
					doctorSummary: visits.doctorSummary,
					signedAt: visits.signedAt,
					createdAt: visits.createdAt,
				})
				.from(visits)
				.where(
					and(
						eq(visits.organizationId, ctx.organizationId),
						eq(visits.patientId, args.patientId),
					),
				)
				.orderBy(desc(visits.createdAt))
				.limit(10);
		}

		let activePlans: unknown[] = [];
		if (args.includeTreatmentPlans) {
			activePlans = await targetDb
				.select()
				.from(treatmentPlans)
				.where(
					and(
						eq(treatmentPlans.organizationId, ctx.organizationId),
						eq(treatmentPlans.patientId, args.patientId),
					),
				)
				.limit(5);
		}

		return {
			patient: {
				id: patient.id,
				fullName: patient.fullName,
				phone: patient.phone,
				birthDate: patient.birthDate,
				status: patient.status,
				notes: patient.notes,
				administrativeProfile: patient.administrativeProfile,
			},
			allergies: patientAllergies,
			recentVisits: patientVisits,
			treatmentPlans: activePlans,
		};
	},
};

// ─── 3. suggest_icd10_plan ──────────────────────────────────────────────────

const suggestIcd10PlanSchema = z.object({
	complaint: z
		.string()
		.min(1, "Жалобы обязательны для подбора диагноза")
		.describe("Клинические жалобы пациента (например, 'острая боль при накусывании')"),
	toothNumber: z
		.number()
		.int()
		.optional()
		.describe("Номер зуба по международной формуле FDI (11–48 или 51–85)"),
	anamnesis: z
		.string()
		.optional()
		.describe("Анамнез заболевания и перенесенные вмешательства"),
	objectiveStatus: z
		.string()
		.optional()
		.describe("Данные объективного осмотра и зондирования"),
});

export const suggestIcd10PlanTool: ToolDefinition<
	typeof suggestIcd10PlanSchema
> = {
	name: "suggest_icd10_plan",
	description:
		"Клинический валидатор и подборщик планов лечения по МКБ-10 с проверкой привязки к зубам FDI (ISO 3950).",
	parameters: suggestIcd10PlanSchema,
	permissions: ["clinical.read"],
	category: "read",
	handler: async (_ctx, args) => {
		const complaintLower = args.complaint.toLowerCase();
		const objLower = (args.objectiveStatus || "").toLowerCase();

		if (args.toothNumber !== undefined) {
			const isPermanent = VALID_FDI_PERMANENT_TEETH.has(args.toothNumber);
			const isPrimary = VALID_FDI_PRIMARY_TEETH.has(args.toothNumber);
			if (!isPermanent && !isPrimary) {
				throw new Error(
					`Некорректный номер зуба FDI: ${args.toothNumber}. Допустимы 11–48 (постоянный прикус) или 51–85 (молочный прикус).`,
				);
			}
		}

		interface DiagnosisProposal {
			code: string;
			title: string;
			stages: { stageName: string; description: string }[];
			warnings?: string[];
		}

		const proposals: DiagnosisProposal[] = [];

		if (
			complaintLower.includes("пульпит") ||
			complaintLower.includes("ночн") ||
			complaintLower.includes("самопроизвольн") ||
			complaintLower.includes("пульсирующ")
		) {
			proposals.push({
				code: "K04.0",
				title: "Пульпит (острый / хронический)",
				stages: [
					{
						stageName: "Анестезия и изоляция",
						description: "Проводниковая/инфильтрационная анестезия, наложение коффердама",
					},
					{
						stageName: "Препарирование и экстирпация",
						description: "Раскрытие полости зуба, механическая и медикаментозная обработка каналов",
					},
					{
						stageName: "Обтурация каналов",
						description: "Пломбирование корневых каналов гуттаперчей с силером под рентген-контролем",
					},
					{
						stageName: "Восстановление коронки",
						description: "Постоянная композитная реставрация или культевая вкладка под коронку",
					},
				],
				warnings: ["Обязателен прицельный снимок до и после обтурации"],
			});
		}

		if (
			complaintLower.includes("периодонтит") ||
			complaintLower.includes("накусыван") ||
			complaintLower.includes("выросший зуб")
		) {
			proposals.push({
				code: "K04.5",
				title: "Хронический апикальный периодонтит",
				stages: [
					{
						stageName: "Анестезия и эндодонтический доступ",
						description: "Анестезия, коффердам, распломбировка/обработка каналов",
					},
					{
						stageName: "Временное пломбирование каналов",
						description: "Внесение лечебной пасты на основе гидроксида кальция на 10-14 дней",
					},
					{
						stageName: "Постоянная обтурация и реставрация",
						description: "Пломбирование каналов и восстановление коронковой части",
					},
				],
			});
		}

		if (
			complaintLower.includes("кариес") ||
			complaintLower.includes("сладк") ||
			complaintLower.includes("дырк") ||
			complaintLower.includes("полость") ||
			objLower.includes("дефект")
		) {
			proposals.push({
				code: "K02.1",
				title: "Кариес дентина (средний / глубокий)",
				stages: [
					{
						stageName: "Анестезия",
						description: "Инфильтрационная/проводниковая анестезия",
					},
					{
						stageName: "Препарирование полости",
						description: "Некрэктомия кариозного дентина под контролем кариес-маркера",
					},
					{
						stageName: "Пломбирование",
						description: "Адгезивный протокол, послойная реставрация светоотверждаемым композитом",
					},
					{
						stageName: "Финишная обработка",
						description: "Шлифовка, полировка, проверка окклюзионных контактов",
					},
				],
			});
		}

		if (
			complaintLower.includes("десн") ||
			complaintLower.includes("кровоточив") ||
			complaintLower.includes("налет") ||
			complaintLower.includes("камень")
		) {
			proposals.push({
				code: "K05.1",
				title: "Хронический гингивит",
				stages: [
					{
						stageName: "Профессиональная гигиена",
						description: "Ультразвуковое снятие наддесневых и поддесневых зубных отложений",
					},
					{
						stageName: "Air-Flow полировка",
						description: "Удаление пигментированного налета порошком на основе глицина/эритритола",
					},
					{
						stageName: "Антисептическая обработка и фторирование",
						description: "Аппликация противовоспалительного геля и ремотерапия",
					},
				],
			});
		}

		if (proposals.length === 0) {
			proposals.push({
				code: "K00.9",
				title: "Нарушение развития и прорезывания зубов неуточненное / Консультация",
				stages: [
					{
						stageName: "Клинический осмотр и диагностика",
						description: "Осмотр полости рта, дентальная фотосъемка, назначение КЛКТ / ОПТГ",
					},
				],
			});
		}

		const validatedProposals = proposals.map((p) => {
			const validation = Icd10ClinicalValidator.validate(
				p.code,
				args.toothNumber !== undefined ? String(args.toothNumber) : undefined,
			);
			return {
				...p,
				validation,
			};
		});

		return {
			toothNumber: args.toothNumber ?? null,
			suggestedDiagnoses: validatedProposals,
		};
	},
};

// ─── 4. generate_visit_diary (Form 043/у) ───────────────────────────────────

const generateVisitDiarySchema = z.object({
	patientId: z
		.string()
		.uuid("Некорректный UUID пациента")
		.optional()
		.describe("ID пациента (если указан, данные пациента и аллергоанамнез подтягиваются из базы)"),
	toothNumber: z
		.union([z.number().int(), z.string()])
		.describe("Номер зуба по международной формуле FDI (11–48 или 51–85)"),
	icd10Code: z
		.string()
		.min(1, "Код МКБ-10 обязателен")
		.describe("Код диагноза по МКБ-10 (например, 'K02.1', 'K04.0', 'K04.5', 'K08.1', 'K05.3')"),
	complaint: z
		.string()
		.optional()
		.describe("Жалобы пациента (если не указаны, генерируются автоматически по протоколу МКБ-10)"),
	anamnesis: z
		.string()
		.optional()
		.describe("Анамнез заболевания и жизни"),
	objectiveStatus: z
		.string()
		.optional()
		.describe("Данные объективного осмотра и зондирования (Status localis)"),
	procedureProtocol: z
		.string()
		.optional()
		.describe("Протокол проведенного лечения"),
	surfaces: z
		.array(z.enum(["occlusal", "vestibular", "oral", "mesial", "distal"]))
		.optional()
		.describe("Пораженные поверхности зуба (окклюзионная, вестибулярная, оральная, медиальная, дистальная)"),
	anestheticDrug: z
		.string()
		.optional()
		.describe("Препарат местной анестезии (например, 'septanest_1_100000', 'ultracain_ds_forte', 'scandonest_3_plain')"),
	anesthesiaCarpules: z
		.number()
		.positive()
		.optional()
		.default(1)
		.describe("Количество карпул анестетика"),
	anesthesiaTechnique: z
		.enum(["infiltration", "mandibular", "torus", "tuberal", "palatal", "intraligamentary"])
		.optional()
		.describe("Метод анестезии"),
	materials: z
		.array(z.string())
		.optional()
		.describe("Примененные стоматологические материалы"),
	recommendations: z
		.string()
		.optional()
		.describe("Клинические рекомендации и назначения на дом"),
	doctorFullName: z
		.string()
		.optional()
		.describe("ФИО лечащего врача"),
	doctorSpecialty: z
		.string()
		.optional()
		.describe("Специальность врача (терапевт, хирург, ортопед, пародонтолог, эндодонтист)"),
	saveToDatabase: z
		.boolean()
		.optional()
		.default(false)
		.describe("Сохранить ли сгенерированный дневник в таблицу визитов базы данных"),
	appointmentId: z
		.string()
		.uuid()
		.optional()
		.describe("ID записи на прием для привязки создаваемого визита"),
});

export const generateVisitDiaryTool: ToolDefinition<
	typeof generateVisitDiarySchema
> = {
	name: "generate_visit_diary",
	description:
		"Генератор протокола приёма врача-стоматолога по форме 043/у (Приказ Минздрава № 834н): Жалобы, Анамнез, Объективный статус по зубу FDI, Диагноз МКБ-10, Лечение, Рекомендации и расчет номенклатуры 804н.",
	parameters: generateVisitDiarySchema,
	permissions: ["clinical.read", "clinical.write"],
	category: "write",
	handler: async (ctx, args) => {
		const targetDb = ctx.db ?? db;

		let patientName = "Пациент";
		let medicalCardNum = "ЭМК-043";
		let allergyNotes = "Аллергологический анамнез спокойный, непереносимости анестетиков не отмечает.";

		if (args.patientId && ctx.organizationId) {
			try {
				const [p] = await targetDb
					.select({ id: patients.id, fullName: patients.fullName, notes: patients.notes })
					.from(patients)
					.where(
						and(
							eq(patients.organizationId, ctx.organizationId),
							eq(patients.id, args.patientId),
						),
					)
					.limit(1);

				if (p) {
					patientName = p.fullName;
					medicalCardNum = `ЭМК-${p.id.substring(0, 8)}`;
				}

				const allergies = await targetDb
					.select()
					.from(patientDrugAllergies)
					.where(
						and(
							eq(patientDrugAllergies.organizationId, ctx.organizationId),
							eq(patientDrugAllergies.patientId, args.patientId),
						),
					);

				if (allergies.length > 0) {
					allergyNotes = allergies
						.map(
							(a: typeof patientDrugAllergies.$inferSelect) =>
								`${a.allergenGroup || a.drugInnLatin} (${a.reactionSeverity || "аллергия"}: ${a.clinicalManifestations || "реакция"})`,
						)
						.join("; ");
				}
			} catch {
				// Non-blocking fallback if running outside live database pool
			}
		}

		const autopilot = generateEmrAutopilotPlan({
			toothNumber: args.toothNumber,
			icd10Code: args.icd10Code,
			surfaces: (args.surfaces as readonly ToothSurface[]) ?? null,
			doctorFullName: args.doctorFullName || "Врач-стоматолог",
			doctorSpecialty: args.doctorSpecialty ?? null,
			customComplaints: args.complaint ?? null,
			customObjective: args.objectiveStatus ?? null,
			customProtocol: args.procedureProtocol ?? null,
			customMaterials: args.materials ?? null,
			anestheticDrug: (args.anestheticDrug as any) ?? null,
			anesthesiaCarpules: args.anesthesiaCarpules ?? 1,
			patientFullName: patientName,
			medicalCardNumber: medicalCardNum,
			allergologicalHistory: allergyNotes,
		});

		let savedVisitId: string | null = null;
		if (args.saveToDatabase && args.patientId && ctx.organizationId) {
			try {
				const [created] = await targetDb
					.insert(visits)
					.values({
						organizationId: ctx.organizationId,
						patientId: args.patientId,
						appointmentId: args.appointmentId ?? null,
						status: "draft",
						complaint: autopilot.diaryEntry.subjectiveComplaints,
						anamnesis:
							args.anamnesis ||
							"Анамнез заболевания без особенностей. Ранее проводилось плановое терапевтическое лечение.",
						objectiveStatus: autopilot.diaryEntry.objectiveStatusLocalis,
						diagnosis: autopilot.diaryEntry.assessmentDiagnosisText,
						treatmentPlan: autopilot.diaryEntry.procedureProtocol,
						doctorSummary: autopilot.diaryEntry.homeCareRecommendations,
						metadata: {
							toothNumber: args.toothNumber,
							icd10Code: args.icd10Code,
							order804nServices: autopilot.order804nServices,
							totalKopecks: autopilot.billingEstimate.totalKopecks,
							appliedMaterials: autopilot.diaryEntry.appliedMaterials,
						},
					})
					.returning();
				if (created) savedVisitId = created.id;
			} catch {
				// DB write error handling
			}
		}

		return {
			success: true,
			form043: {
				toothNumber: String(args.toothNumber),
				icd10Code: args.icd10Code,
				clinicalDiagnosis: autopilot.diaryEntry.assessmentDiagnosisText,
				complaint: autopilot.diaryEntry.subjectiveComplaints,
				anamnesis:
					args.anamnesis ||
					"Анамнез заболевания без особенностей. Аллергологический статус спокоен.",
				objectiveStatus: autopilot.diaryEntry.objectiveStatusLocalis,
				percussionVertical: autopilot.diaryEntry.percussionVertical,
				percussionHorizontal: autopilot.diaryEntry.percussionHorizontal,
				probingTenderness: autopilot.diaryEntry.probingTenderness,
				thermalTestResponse: autopilot.diaryEntry.thermalTestResponse,
				eodMicroamperes: autopilot.diaryEntry.eodMicroamperes,
				treatment: autopilot.diaryEntry.procedureProtocol,
				anesthesiaDetails: autopilot.diaryEntry.anesthesiaDetails,
				appliedMaterials: autopilot.diaryEntry.appliedMaterials,
				recommendations: autopilot.diaryEntry.homeCareRecommendations,
				doctorFullName: autopilot.diaryEntry.doctorFullName,
				doctorSpecialty: autopilot.diaryEntry.doctorSpecialty,
				renderedText: render043Text(autopilot),
			},
			complianceReport: autopilot.complianceAudit,
			order804nServices: autopilot.order804nServices,
			estimate: {
				totalKopecks: autopilot.billingEstimate.totalKopecks,
				totalRub: autopilot.billingEstimate.totalRub,
				formattedTotal: autopilot.billingEstimate.formattedTotal,
			},
			savedVisitId,
		};
	},
};

// ─── 5. create_prescription_107 (Form 107-1/у, Order 1094n) ─────────────────

const createPrescription107Schema = z.object({
	patientId: z
		.string()
		.uuid("Некорректный UUID пациента")
		.optional()
		.describe("ID пациента (если указан, данные пациента подтягиваются из базы)"),
	patientFullName: z
		.string()
		.optional()
		.describe("ФИО пациента"),
	patientBirthDate: z
		.string()
		.optional()
		.describe("Дата рождения пациента (ДД.ММ.ГГГГ или ГГГГ-ММ-ДД)"),
	patientAgeYears: z
		.number()
		.int()
		.min(0)
		.max(130)
		.optional()
		.describe("Возраст пациента (полных лет)"),
	medicalCardNumber: z
		.string()
		.optional()
		.describe("Номер медицинской карты 043/у"),
	doctorFullName: z
		.string()
		.optional()
		.describe("ФИО врача"),
	doctorSpecialty: z
		.string()
		.optional()
		.default("Врач-стоматолог")
		.describe("Специальность врача"),
	items: z
		.array(
			z.object({
				presetId: z
					.string()
					.optional()
					.describe("ID типового препарата из каталога DENTE (например, 'nimesulide_100', 'amoxiclav_875_125', 'amoxicillin_500', 'ibuprofen_400', 'chlorhexidine_005', 'metrogyl_denta', 'cholisal_gel', 'omeprazole_20', 'loratadine_10', 'tranexamic_acid_500')"),
				latinName: z
					.string()
					.optional()
					.describe("Латинское наименование по МНН (например, 'Rp.: Nimesulidi 100 mg')"),
				tradeName: z
					.string()
					.optional()
					.describe("Торговое наименование (например, 'Нимесил')"),
				form: z
					.string()
					.optional()
					.describe("Форма выпуска (например, 'гранулы для приготовления суспензии')"),
				dosage: z
					.string()
					.optional()
					.describe("Дозировка (например, '100 мг')"),
				quantity: z
					.string()
					.optional()
					.describe("Количество единиц (например, 'N. 10')"),
				dispenseLatin: z
					.string()
					.optional()
					.describe("Сигнатура отпуска на латыни (например, 'D.t.d. N 10 in gran.')"),
				signaRussian: z
					.string()
					.optional()
					.describe("Способ применения на русском языке (S. Внутрь по 1 пакетику 2 раза в день после еды...)"),
				category: z
					.enum([
						"nsaid",
						"antibiotic",
						"controlled_pku",
						"antihistamine",
						"antiseptic",
						"corticosteroid",
						"hemostatic",
						"gastroprotective",
						"preferential_somatic",
						"other",
					])
					.optional()
					.default("nsaid"),
			}),
		)
		.min(1, "Укажите хотя бы один препарат для выписки рецепта")
		.max(3, "На одном бланке 107-1/у разрешено выписывать не более 3 препаратов"),
	validityDays: z
		.enum(["15", "30", "60", "365"])
		.optional()
		.default("60")
		.describe("Срок действия рецепта (по умолчанию 60 дней per Приказ 1094н)"),
	isChronicSpecialCare: z
		.boolean()
		.optional()
		.default(false)
		.describe("Пометка 'По специальному назначению' (для хронических больных со сроком до 1 года)"),
	chronicPeriodicity: z
		.string()
		.optional()
		.describe("Периодичность отпуска для хронических больных (ежемесячно / каждые 2 месяца)"),
	diagnosisIcd10Code: z
		.string()
		.optional()
		.describe("Код диагноза по МКБ-10"),
	clinicLegalName: z
		.string()
		.optional()
		.describe("Наименование медицинской организации для штампа"),
});

export const createPrescription107Tool: ToolDefinition<
	typeof createPrescription107Schema
> = {
	name: "create_prescription_107",
	description:
		"Генерация официального рецептурного бланка по форме № 107-1/у (Приказ Минздрава России № 1094н) с латинской прописью Rp:, D.t.d. и русской сигнатурой S.",
	parameters: createPrescription107Schema,
	permissions: ["clinical.read", "clinical.write"],
	category: "write",
	handler: async (ctx, args) => {
		const targetDb = ctx.db ?? db;

		let patientName = args.patientFullName || "Пациент";
		let birthDate = args.patientBirthDate || "01.01.1990";
		let cardNum = args.medicalCardNumber || "КАРТА-043-001";
		let patientAge = args.patientAgeYears;

		if (args.patientId && ctx.organizationId) {
			try {
				const [p] = await targetDb
					.select()
					.from(patients)
					.where(
						and(
							eq(patients.organizationId, ctx.organizationId),
							eq(patients.id, args.patientId),
						),
					)
					.limit(1);

				if (p) {
					patientName = p.fullName;
					birthDate = p.birthDate || birthDate;
					cardNum = `ЭМК-${p.id.substring(0, 8)}`;
					if (p.birthDate && !patientAge) {
						const birthYear = new Date(p.birthDate).getFullYear();
						if (!Number.isNaN(birthYear)) {
							patientAge = Math.max(0, new Date().getFullYear() - birthYear);
						}
					}
				}
			} catch {
				// Fallback
			}
		}

		// Resolve items
		const resolvedItems: PrescriptionDrugItem[] = args.items.map((item, idx) => {
			if (item.presetId) {
				const found = DENTAL_PRESCRIPTION_DRUG_CATALOG.find(
					(d) => d.id === item.presetId,
				);
				if (found) {
					return {
						id: `item-${idx + 1}-${found.id}`,
						latinName: found.latinRp,
						tradeName: found.tradeNameRu,
						form: found.formRu,
						dosage: found.dosageRu,
						quantity: found.quantityLabel,
						dispenseLatin: found.dispenseLatin,
						signaRussian: found.signaRu,
						category: found.category,
					};
				}
			}

			const latinRaw = item.latinName || `Rp.: ${item.tradeName || "Medicamentum"} ${item.dosage || "100 mg"}`;
			const latin = latinRaw.startsWith("Rp.:") ? latinRaw : `Rp.: ${latinRaw}`;
			const dispenseRaw = item.dispenseLatin || `D.t.d. ${item.quantity || "N. 10"} in tab.`;
			const dispense = dispenseRaw.startsWith("D.t.d.") ? dispenseRaw : `D.t.d. ${dispenseRaw}`;
			const signaRaw = item.signaRussian || "S. Принимать внутрь по указанию лечащего врача.";
			const signa = signaRaw.startsWith("S.") ? signaRaw : `S. ${signaRaw}`;

			return {
				id: `item-${idx + 1}`,
				latinName: latin,
				tradeName: item.tradeName || "Препарат",
				form: item.form || "таблетки",
				dosage: item.dosage || "стандартная",
				quantity: item.quantity || "N. 10",
				dispenseLatin: dispense,
				signaRussian: signa,
				category: item.category || "nsaid",
			};
		});

		const seriesNumber = `107-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
		const prescriptionDate = new Date().toLocaleDateString("ru-RU");

		const payload: Form107_1uPayload = {
			formNumber: "107-1/у",
			clinicLegalName: args.clinicLegalName || "ООО «Стоматологическая клиника ДЕНТЕ»",
			clinicAddress: "г. Москва, ул. Медицинская, д. 10",
			clinicPhone: "+7 (495) 123-45-67",
			clinicOgrn: "1237700000000",
			clinicInn: "7700000000",
			medicalLicenseNumber: "ЛО41-01137-77/00123456",
			prescriptionSeriesNumber: seriesNumber,
			prescriptionDate,
			patientFullName: patientName,
			patientBirthDate: birthDate,
			patientAgeYears: patientAge ?? null,
			medicalCardNumber: cardNum,
			doctorFullName: args.doctorFullName || "Врач-стоматолог",
			doctorSpecialty: args.doctorSpecialty || "Врач-стоматолог",
			validityDays: args.validityDays || "60",
			isChronicSpecialCare: args.isChronicSpecialCare || false,
			chronicPeriodicity: args.chronicPeriodicity ?? null,
			items: resolvedItems,
			diagnosisIcd10Code: args.diagnosisIcd10Code ?? null,
			notes: null,
			ukepSignature: null,
		};

		const formattedPrintText = renderPrescription107Text(payload);

		return {
			success: true,
			formNumber: "107-1/у",
			statutoryOrder: "Приказ Минздрава России от 24.11.2021 № 1094н",
			prescriptionSeriesNumber: seriesNumber,
			prescriptionDate,
			validityDays: payload.validityDays,
			isChronicSpecialCare: payload.isChronicSpecialCare,
			patient: {
				fullName: payload.patientFullName,
				birthDate: payload.patientBirthDate,
				ageYears: payload.patientAgeYears,
				medicalCardNumber: payload.medicalCardNumber,
			},
			doctor: {
				fullName: payload.doctorFullName,
				specialty: payload.doctorSpecialty,
			},
			itemsCount: payload.items.length,
			items: payload.items,
			formattedPrintText,
		};
	},
};

// ─── 6. suggest_treatment_plan (3 Tiers, Order 804n, Exact Kopecks) ─────────

const suggestTreatmentPlanSchema = z.object({
	patientId: z
		.string()
		.uuid("Некорректный UUID пациента")
		.optional()
		.describe("ID пациента (если указан, данные подтягиваются из базы)"),
	clinicalCases: z
		.array(
			z.object({
				toothNumber: z
					.union([z.number().int(), z.string()])
					.describe("Номер зуба по FDI (11–48 или 51–85)"),
				icd10Code: z
					.string()
					.min(1)
					.describe("Код диагноза МКБ-10 (например, 'K02.1', 'K04.0', 'K04.5', 'K08.1', 'K05.3')"),
				surfaces: z
					.array(z.string())
					.optional()
					.describe("Пораженные поверхности зуба"),
				clinicalCanalCount: z
					.number()
					.int()
					.min(1)
					.max(4)
					.optional()
					.describe("Количество корневых каналов"),
				stagePreference: z
					.enum(["stage_1_therapy", "stage_2_surgery", "stage_3_orthopedics"])
					.optional()
					.describe("Предпочтительный этап лечения"),
				notes: z.string().optional().describe("Клинические примечания"),
			}),
		)
		.min(1, "Укажите хотя бы один клинический случай для формирования плана"),
	discountPercent: z
		.number()
		.min(0)
		.max(50)
		.optional()
		.default(0)
		.describe("Процент скидки клиники (0–50%)"),
	installmentMonths: z
		.enum(["3", "6", "12", "24"])
		.optional()
		.default("6")
		.describe("Срок беспроцентной рассрочки в месяцах"),
	doctorFullName: z
		.string()
		.optional()
		.describe("ФИО лечащего врача / куратора плана"),
	patientFullName: z
		.string()
		.optional()
		.describe("ФИО пациента"),
});

export const suggestTreatmentPlanTool: ToolDefinition<
	typeof suggestTreatmentPlanSchema
> = {
	name: "suggest_treatment_plan",
	description:
		"Генератор 3-уровневого комплексного плана лечения (Эконом / Оптимум / Премиум) с разбивкой на 3 клинических этапа (Терапия, Хирургия, Ортопедия), номенклатурой 804н и расчетом в целочисленных копейках.",
	parameters: suggestTreatmentPlanSchema,
	permissions: ["clinical.read"],
	category: "read",
	handler: async (_ctx, args) => {
		const rawItemsEconomy: any[] = [];
		const rawItemsOptimum: any[] = [];
		const rawItemsPremium: any[] = [];

		for (const c of args.clinicalCases) {
			const toothNum = typeof c.toothNumber === "string" ? parseInt(c.toothNumber, 10) : c.toothNumber;
			const validTooth = !Number.isNaN(toothNum) ? toothNum : 16;
			const icd = (c.icd10Code || "K02.1").trim().toUpperCase();

			// 1. Stage 1: Therapy & Endodontics
			if (icd.startsWith("K04")) {
				// Economy: standard endo
				rawItemsEconomy.push({
					toothNumber: validTooth,
					code804n: "A16.07.008.001",
					nameRu: `Эндодонтическое лечение зуба ${validTooth} (базовый протокол)`,
					categoryRu: "Терапевтическая стоматология",
					stageKind: "stage_1_therapy",
					tierKey: "economy",
					unitPriceKopecks: 650000,
					materialNameRu: "Гуттаперча + эпоксидный силер AH Plus",
				});

				// Optimum: ultrasonic irrigation + nanohybrid
				rawItemsOptimum.push({
					toothNumber: validTooth,
					code804n: "A16.07.008.003",
					nameRu: `Эндодонтическое лечение зуба ${validTooth} с УЗ-ирригацией и адгезивной реставрацией`,
					categoryRu: "Терапевтическая стоматология",
					stageKind: "stage_1_therapy",
					tierKey: "optimum",
					unitPriceKopecks: 1250000,
					materialNameRu: "WaveOne Gold + биокерамический силер BioRoot RCS + Filtek Ultimate",
				});

				// Premium: microscopic stratigraphy + 3D obturation
				rawItemsPremium.push({
					toothNumber: validTooth,
					code804n: "A16.07.008.004",
					nameRu: `Микроскопное эндодонтическое лечение зуба ${validTooth} под увеличением Carl Zeiss`,
					categoryRu: "Терапевтическая стоматология",
					stageKind: "stage_1_therapy",
					tierKey: "premium",
					unitPriceKopecks: 2150000,
					materialNameRu: "Дентальный микроскоп Carl Zeiss, горячая гуттаперча Calamus, Estelite Asteria",
				});
			} else if (icd === "K08.1") {
				// Stage 2: Surgery & Implantology
				// Economy: simple extraction + standard implant
				rawItemsEconomy.push({
					toothNumber: validTooth,
					code804n: "A16.07.001.001",
					nameRu: `Атравматичное удаление зуба ${validTooth}`,
					categoryRu: "Хирургическая стоматология",
					stageKind: "stage_2_surgery",
					tierKey: "economy",
					unitPriceKopecks: 350000,
					materialNameRu: "Альвостаз, шовный материал",
				});
				rawItemsEconomy.push({
					toothNumber: validTooth,
					code804n: "A16.07.054",
					nameRu: `Установка дентального имплантата (стандартный ряд)`,
					categoryRu: "Хирургическая стоматология",
					stageKind: "stage_2_surgery",
					tierKey: "economy",
					unitPriceKopecks: 2800000,
					materialNameRu: "Имплантат титановый стандартный",
					isHighCostCode02: true,
				});

				// Optimum: surgery + premium implant
				rawItemsOptimum.push({
					toothNumber: validTooth,
					code804n: "A16.07.054",
					nameRu: `Установка дентального имплантата Hiossen / Osstem с ускоренной остеоинтеграцией`,
					categoryRu: "Хирургическая стоматология",
					stageKind: "stage_2_surgery",
					tierKey: "optimum",
					unitPriceKopecks: 4200000,
					materialNameRu: "Имплантат Osstem/Hiossen SLA, формирователь десны",
					isHighCostCode02: true,
				});

				// Premium: Straumann / Nobel Biocare + PRF membrane
				rawItemsPremium.push({
					toothNumber: validTooth,
					code804n: "A16.07.054",
					nameRu: `Установка премиального гидрофильного имплантата Straumann BLX / Nobel Active`,
					categoryRu: "Хирургическая стоматология",
					stageKind: "stage_2_surgery",
					tierKey: "premium",
					unitPriceKopecks: 7800000,
					materialNameRu: "Швейцарский имплантат Straumann SLActive, костный матрикс Bio-Oss, мембрана Bio-Gide",
					isHighCostCode02: true,
				});

				// Stage 3: Orthopedics
				rawItemsEconomy.push({
					toothNumber: validTooth,
					code804n: "A16.07.004",
					nameRu: `Восстановление зуба металлокерамической коронкой Co-Cr на импланте`,
					categoryRu: "Ортопедическая стоматология",
					stageKind: "stage_3_orthopedics",
					tierKey: "economy",
					unitPriceKopecks: 1800000,
					materialNameRu: "Металлокерамика Co-Cr Duceram",
				});
				rawItemsOptimum.push({
					toothNumber: validTooth,
					code804n: "A16.07.005",
					nameRu: `Восстановление зуба коронкой из диоксида циркония / IPS e.max CAD на импланте`,
					categoryRu: "Ортопедическая стоматология",
					stageKind: "stage_3_orthopedics",
					tierKey: "optimum",
					unitPriceKopecks: 3200000,
					materialNameRu: "Диоксид циркония Prettau / IPS e.max CAD",
				});
				rawItemsPremium.push({
					toothNumber: validTooth,
					code804n: "A16.07.005",
					nameRu: `Цельнокерамическая коронка премиум на индивидуальном циркониевом абатменте CAD/CAM`,
					categoryRu: "Ортопедическая стоматология",
					stageKind: "stage_3_orthopedics",
					tierKey: "premium",
					unitPriceKopecks: 5400000,
					materialNameRu: "Мультилеер цирконий Katana HTML Plus, индивидуальный абатмент CAD/CAM",
				});
			} else {
				// Caries / General therapy
				rawItemsEconomy.push({
					toothNumber: validTooth,
					code804n: "A16.07.002.001",
					nameRu: `Восстановление зуба ${validTooth} микрогибридным композитом`,
					categoryRu: "Терапевтическая стоматология",
					stageKind: "stage_1_therapy",
					tierKey: "economy",
					unitPriceKopecks: 420000,
					materialNameRu: "Микрогибридный композит светового отверждения",
				});
				rawItemsOptimum.push({
					toothNumber: validTooth,
					code804n: "A16.07.002.002",
					nameRu: `Анатомическая реставрация зуба ${validTooth} нанокомпозитом Estelite / Filtek`,
					categoryRu: "Терапевтическая стоматология",
					stageKind: "stage_1_therapy",
					tierKey: "optimum",
					unitPriceKopecks: 650000,
					materialNameRu: "Нанокомпозит Filtek Ultimate / Estelite Asteria",
				});
				rawItemsPremium.push({
					toothNumber: validTooth,
					code804n: "A16.07.003",
					nameRu: `Керамическая вкладка / накладка (Inlay/Onlay) IPS e.max CAD зуба ${validTooth}`,
					categoryRu: "Ортопедическая стоматология",
					stageKind: "stage_3_orthopedics",
					tierKey: "premium",
					unitPriceKopecks: 1850000,
					materialNameRu: "Прессованная керамика IPS e.max Press / CAD",
				});
			}
		}

		const discount = args.discountPercent || 0;
		const installmentMonthsNum = (parseInt(args.installmentMonths || "6", 10) || 6) as 3 | 6 | 12 | 24;

		const tierEstimateEconomy = calculateSingleTierEstimate("economy", rawItemsEconomy);
		const tierEstimateOptimum = calculateSingleTierEstimate("optimum", rawItemsOptimum);
		const tierEstimatePremium = calculateSingleTierEstimate("premium", rawItemsPremium);

		const installmentEco = tierEstimateEconomy.installments[installmentMonthsNum] || {
			monthlyPaymentRu: `${Math.round(tierEstimateEconomy.totalCostKopecks / (installmentMonthsNum * 100)).toLocaleString("ru-RU")} ₽`,
			monthlyPaymentKopecks: Math.round(tierEstimateEconomy.totalCostKopecks / installmentMonthsNum),
		};
		const installmentOpt = tierEstimateOptimum.installments[installmentMonthsNum] || {
			monthlyPaymentRu: `${Math.round(tierEstimateOptimum.totalCostKopecks / (installmentMonthsNum * 100)).toLocaleString("ru-RU")} ₽`,
			monthlyPaymentKopecks: Math.round(tierEstimateOptimum.totalCostKopecks / installmentMonthsNum),
		};
		const installmentPrem = tierEstimatePremium.installments[installmentMonthsNum] || {
			monthlyPaymentRu: `${Math.round(tierEstimatePremium.totalCostKopecks / (installmentMonthsNum * 100)).toLocaleString("ru-RU")} ₽`,
			monthlyPaymentKopecks: Math.round(tierEstimatePremium.totalCostKopecks / installmentMonthsNum),
		};

		return {
			success: true,
			planId: `plan-${Date.now()}`,
			clinicalCasesCount: args.clinicalCases.length,
			discountPercent: discount,
			installmentMonths: installmentMonthsNum,
			doctorFullName: args.doctorFullName || "Врач-стоматолог",
			patientFullName: args.patientFullName || "Пациент",
			tiers: {
				economy: {
					tierKey: "economy",
					tierNameRu: PLAN_TIER_CONFIGS.economy.tierNameRu,
					isRecommended: false,
					warrantyYears: PLAN_TIER_CONFIGS.economy.warrantyYears,
					totalCostKopecks: tierEstimateEconomy.totalCostKopecks,
					totalCostRub: Math.round(tierEstimateEconomy.totalCostKopecks / 100),
					formattedTotal: tierEstimateEconomy.totalCostRu,
					laborKopecks: tierEstimateEconomy.laborKopecks,
					materialsKopecks: tierEstimateEconomy.materialsKopecks,
					discountKopecks: tierEstimateEconomy.discountKopecks,
					stages: tierEstimateEconomy.stages.map((s) => ({
						stageKind: s.stageKind,
						titleRu: s.titleRu,
						itemCount: s.itemCount,
						stageCostKopecks: s.stageCostKopecks,
						formattedStageCost: `${(s.stageCostKopecks / 100).toLocaleString("ru-RU")} ₽`,
						items: s.items,
					})),
					installment: {
						months: installmentMonthsNum,
						monthlyPaymentRu: installmentEco.monthlyPaymentRu,
						monthlyPaymentKopecks: installmentEco.monthlyPaymentKopecks,
					},
					ndflDeduction: {
						refundKopecks: tierEstimateEconomy.ndflDeduction.refundKopecks,
						refundRub: Math.round(tierEstimateEconomy.ndflDeduction.refundKopecks / 100),
						formattedRefundRu: tierEstimateEconomy.ndflDeduction.refundRu,
					},
					keyAdvantages: PLAN_TIER_CONFIGS.economy.keyAdvantagesRu,
				},
				optimum: {
					tierKey: "optimum",
					tierNameRu: PLAN_TIER_CONFIGS.optimum.tierNameRu,
					isRecommended: true,
					warrantyYears: PLAN_TIER_CONFIGS.optimum.warrantyYears,
					totalCostKopecks: tierEstimateOptimum.totalCostKopecks,
					totalCostRub: Math.round(tierEstimateOptimum.totalCostKopecks / 100),
					formattedTotal: tierEstimateOptimum.totalCostRu,
					laborKopecks: tierEstimateOptimum.laborKopecks,
					materialsKopecks: tierEstimateOptimum.materialsKopecks,
					discountKopecks: tierEstimateOptimum.discountKopecks,
					stages: tierEstimateOptimum.stages.map((s) => ({
						stageKind: s.stageKind,
						titleRu: s.titleRu,
						itemCount: s.itemCount,
						stageCostKopecks: s.stageCostKopecks,
						formattedStageCost: `${(s.stageCostKopecks / 100).toLocaleString("ru-RU")} ₽`,
						items: s.items,
					})),
					installment: {
						months: installmentMonthsNum,
						monthlyPaymentRu: installmentOpt.monthlyPaymentRu,
						monthlyPaymentKopecks: installmentOpt.monthlyPaymentKopecks,
					},
					ndflDeduction: {
						refundKopecks: tierEstimateOptimum.ndflDeduction.refundKopecks,
						refundRub: Math.round(tierEstimateOptimum.ndflDeduction.refundKopecks / 100),
						formattedRefundRu: tierEstimateOptimum.ndflDeduction.refundRu,
					},
					keyAdvantages: PLAN_TIER_CONFIGS.optimum.keyAdvantagesRu,
				},
				premium: {
					tierKey: "premium",
					tierNameRu: PLAN_TIER_CONFIGS.premium.tierNameRu,
					isRecommended: false,
					warrantyYears: PLAN_TIER_CONFIGS.premium.warrantyYears,
					totalCostKopecks: tierEstimatePremium.totalCostKopecks,
					totalCostRub: Math.round(tierEstimatePremium.totalCostKopecks / 100),
					formattedTotal: tierEstimatePremium.totalCostRu,
					laborKopecks: tierEstimatePremium.laborKopecks,
					materialsKopecks: tierEstimatePremium.materialsKopecks,
					discountKopecks: tierEstimatePremium.discountKopecks,
					stages: tierEstimatePremium.stages.map((s) => ({
						stageKind: s.stageKind,
						titleRu: s.titleRu,
						itemCount: s.itemCount,
						stageCostKopecks: s.stageCostKopecks,
						formattedStageCost: `${(s.stageCostKopecks / 100).toLocaleString("ru-RU")} ₽`,
						items: s.items,
					})),
					installment: {
						months: installmentMonthsNum,
						monthlyPaymentRu: installmentPrem.monthlyPaymentRu,
						monthlyPaymentKopecks: installmentPrem.monthlyPaymentKopecks,
					},
					ndflDeduction: {
						refundKopecks: tierEstimatePremium.ndflDeduction.refundKopecks,
						refundRub: Math.round(tierEstimatePremium.ndflDeduction.refundKopecks / 100),
						formattedRefundRu: tierEstimatePremium.ndflDeduction.refundRu,
					},
					keyAdvantages: PLAN_TIER_CONFIGS.premium.keyAdvantagesRu,
				},
			},
		};
	},
};

// ─── 7. check_drug_interaction (DDI, Allergies, Pregnancy, Anticoagulants) ──

const checkDrugInteractionSchema = z.object({
	patientId: z
		.string()
		.uuid("Некорректный UUID пациента")
		.optional()
		.describe("ID пациента (если указан, данные аллергий подтягиваются из базы)"),
	proposedMedications: z
		.array(z.string())
		.min(1, "Укажите хотя бы один планируемый препарат")
		.describe("Список назначаемых препаратов (названия или ID: 'amoxiclav', 'nimesulide', 'articaine', 'ibuprofen', 'metronidazole', 'ketorolac', 'lidocaine')"),
	existingMedications: z
		.array(z.string())
		.optional()
		.default([])
		.describe("Препараты постоянной терапии пациента (например: 'warfarin', 'aspirin', 'clopidogrel', 'rivaroxaban', 'dabigatran', 'bisoprolol', 'metformin')"),
	patientConditions: z
		.array(z.string())
		.optional()
		.default([])
		.describe("Сопутствующие соматические состояния (например: 'pregnancy_1st_trimester', 'pregnancy_3rd_trimester', 'lactation', 'bronchial_asthma', 'samter_triad', 'peptic_ulcer', 'renal_failure', 'hypertension')"),
	knownAllergies: z
		.array(z.string())
		.optional()
		.default([])
		.describe("Аллергии со слов пациента (например: 'пенициллин', 'нпвс', 'сульфиты', 'новокаин', 'лидокаин')"),
});

export const checkDrugInteractionTool: ToolDefinition<
	typeof checkDrugInteractionSchema
> = {
	name: "check_drug_interaction",
	description:
		"Клинический аудит фармакобезопасности: проверка межлекарственных взаимодействий (DDI), перекрестных аллергий (пенициллины, НПВС, сульфиты) и соматических противопоказаний (беременность III триместр, антикоагулянты, язва, ХПН).",
	parameters: checkDrugInteractionSchema,
	permissions: ["clinical.read"],
	category: "read",
	handler: async (ctx, args) => {
		const targetDb = ctx.db ?? db;

		const audit = await performClinicalDrugSafetyAudit({
			patientId: args.patientId,
			organizationId: ctx.organizationId,
			targetDb,
			proposedMedications: args.proposedMedications,
			existingMedications: args.existingMedications,
			patientConditions: args.patientConditions,
			knownAllergies: args.knownAllergies,
		});

		return audit;
	},
};

// Backward compatibility alias for checkDrugInteractions
const checkDrugInteractionsLegacySchema = z.object({
	patientId: z
		.string()
		.uuid("Некорректный UUID пациента")
		.describe("ID пациента для проверки индивидуальных аллергий"),
	proposedMedicationIds: z
		.array(z.string())
		.min(1, "Укажите хотя бы один планируемый препарат")
		.describe("Идентификаторы препаратов из формуляра DENTE (например, 'med_amox_500', 'med_metron_500', 'med_art_epi_100k', 'med_ibu_400')"),
	existingMedicationIds: z
		.array(z.string())
		.optional()
		.default([])
		.describe("Препараты, постоянно принимаемые пациентом"),
	patientConditions: z
		.array(z.string())
		.optional()
		.default([])
		.describe("Клинические сопутствующие состояния"),
});

export const checkDrugInteractionsTool: ToolDefinition<
	typeof checkDrugInteractionsLegacySchema
> = {
	name: "check_drug_interactions",
	description:
		"Клинический аудит безопасности фармакотерапии: проверяет непереносимость и аллергический статус пациента, а также нежелательные межлекарственные взаимодействия.",
	parameters: checkDrugInteractionsLegacySchema,
	permissions: ["clinical.read"],
	category: "read",
	handler: async (ctx, args) => {
		const targetDb = ctx.db ?? db;

		const audit = await performClinicalDrugSafetyAudit({
			patientId: args.patientId,
			organizationId: ctx.organizationId,
			targetDb,
			proposedMedications: args.proposedMedicationIds,
			existingMedications: args.existingMedicationIds,
			patientConditions: args.patientConditions,
		});

		return {
			isSafe: audit.isSafe,
			hasAllergyClash: audit.hasAllergyClash,
			allergyWarnings: audit.allergyWarnings,
			drugInteractionsCount: audit.drugInteractions.length,
			drugInteractions: audit.drugInteractions.map((i) => ({
				...i,
				drugAId: i.primaryDrug,
				drugBId: i.interactingDrug,
			})),
			contraindications: audit.conditionContraindications,
			blockedPrescriptions: audit.blockedPrescriptions,
			safeAlternativeRecommendations: audit.safeAlternativeRecommendations,
			summaryRu: audit.summaryRu,
		};
	},
};

// ─── 8. get_patient_timeline ────────────────────────────────────────────────

const getPatientTimelineSchema = z.object({
	patientId: z
		.string()
		.uuid("Некорректный UUID пациента")
		.describe("ID пациента для построения таймлайна"),
	limit: z
		.number()
		.int()
		.min(1)
		.max(100)
		.optional()
		.default(30)
		.describe("Максимальное количество событий в таймлайне"),
});

export interface TimelineEvent {
	readonly id: string;
	readonly type: "visit" | "treatment_plan" | "payment" | "lab_order";
	readonly title: string;
	readonly date: string;
	readonly details: Record<string, unknown>;
}

export const getPatientTimelineTool: ToolDefinition<
	typeof getPatientTimelineSchema
> = {
	name: "get_patient_timeline",
	description:
		"Извлечение единой хронологической истории пациента: приемы (дневники 043/у, жалобы, диагнозы), планы лечения, финансовые транзакции и заказы зуботехнической лаборатории.",
	parameters: getPatientTimelineSchema,
	permissions: ["clinical.read"],
	category: "read",
	handler: async (ctx, args) => {
		const targetDb = ctx.db ?? db;
		const events: TimelineEvent[] = [];

		const pastVisits = await targetDb
			.select({
				id: visits.id,
				complaint: visits.complaint,
				diagnosis: visits.diagnosis,
				doctorSummary: visits.doctorSummary,
				status: visits.status,
				signedAt: visits.signedAt,
				createdAt: visits.createdAt,
			})
			.from(visits)
			.where(
				and(
					eq(visits.organizationId, ctx.organizationId),
					eq(visits.patientId, args.patientId),
				),
			)
			.orderBy(desc(visits.createdAt))
			.limit(args.limit);

		for (const v of pastVisits) {
			events.push({
				id: v.id,
				type: "visit",
				title: `Прием врача: ${v.diagnosis || "Консультация"}`,
				date: (v.signedAt ?? v.createdAt).toISOString(),
				details: {
					status: v.status,
					complaint: v.complaint,
					diagnosis: v.diagnosis,
					doctorSummary: v.doctorSummary,
					isSigned: v.signedAt !== null,
				},
			});
		}

		const plans = await targetDb
			.select({
				id: treatmentPlans.id,
				name: treatmentPlans.name,
				title: treatmentPlans.title,
				status: treatmentPlans.status,
				totalPriceRub: treatmentPlans.totalPriceRub,
				totalPrice: treatmentPlans.totalPrice,
				createdAt: treatmentPlans.createdAt,
			})
			.from(treatmentPlans)
			.where(
				and(
					eq(treatmentPlans.organizationId, ctx.organizationId),
					eq(treatmentPlans.patientId, args.patientId),
				),
			)
			.orderBy(desc(treatmentPlans.createdAt))
			.limit(args.limit);

		for (const p of plans) {
			events.push({
				id: p.id,
				type: "treatment_plan",
				title: `План лечения: ${p.name || p.title || "Комплексный план"}`,
				date: p.createdAt.toISOString(),
				details: {
					status: p.status,
					totalPriceRub: p.totalPriceRub ?? p.totalPrice,
				},
			});
		}

		const patientPayments = await targetDb
			.select({
				id: payments.id,
				amountRub: payments.amountRub,
				method: payments.method,
				status: payments.status,
				createdAt: payments.createdAt,
			})
			.from(payments)
			.where(
				and(
					eq(payments.organizationId, ctx.organizationId),
					eq(payments.patientId, args.patientId),
				),
			)
			.orderBy(desc(payments.createdAt))
			.limit(args.limit);

		for (const pay of patientPayments) {
			events.push({
				id: pay.id,
				type: "payment",
				title: `Оплата: ${pay.amountRub} ₽ (${pay.method})`,
				date: pay.createdAt.toISOString(),
				details: {
					amountRub: pay.amountRub,
					method: pay.method,
					status: pay.status,
				},
			});
		}

		const orders = await targetDb
			.select({
				id: labOrders.id,
				toothFdi: labOrders.toothFdi,
				material: labOrders.material,
				colorVita: labOrders.colorVita,
				status: labOrders.status,
				dueDate: labOrders.dueDate,
				clinicalNotes: labOrders.clinicalNotes,
				createdAt: labOrders.createdAt,
			})
			.from(labOrders)
			.where(
				and(
					eq(labOrders.organizationId, ctx.organizationId),
					eq(labOrders.patientId, args.patientId),
				),
			)
			.orderBy(desc(labOrders.createdAt))
			.limit(args.limit);

		for (const o of orders) {
			events.push({
				id: o.id,
				type: "lab_order",
				title: `Заказ ЗТЛ: зуб ${o.toothFdi || "—"}, ${o.material || "протез"}`,
				date: o.createdAt.toISOString(),
				details: {
					toothFdi: o.toothFdi,
					material: o.material,
					colorVita: o.colorVita,
					status: o.status,
					dueDate: o.dueDate?.toISOString() ?? null,
					clinicalNotes: o.clinicalNotes,
				},
			});
		}

		events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

		return {
			patientId: args.patientId,
			totalEventsCount: events.length,
			timeline: events.slice(0, args.limit),
		};
	},
};

// ─── 9. get_lab_orders ──────────────────────────────────────────────────────

const getLabOrdersSchema = z.object({
	patientId: z
		.string()
		.uuid("Некорректный UUID пациента")
		.describe("ID пациента для поиска лабораторных нарядов ЗТЛ"),
	statusFilter: z
		.enum(["all", "active", "completed", "cancelled"])
		.optional()
		.default("all")
		.describe("Фильтр статуса заказов (active включает draft, sent, in_progress, shipped, received, refitting)"),
});

export const getLabOrdersTool: ToolDefinition<typeof getLabOrdersSchema> = {
	name: "get_lab_orders",
	description:
		"Мониторинг заказов зуботехнической лаборатории (ЗТЛ): отслеживание готовности коронок/протезов, сроков (ETA), оттенка по шкале VITA и статуса примерки.",
	parameters: getLabOrdersSchema,
	permissions: ["clinical.read"],
	category: "read",
	handler: async (ctx, args) => {
		const targetDb = ctx.db ?? db;

		const baseQuery = and(
			eq(labOrders.organizationId, ctx.organizationId),
			eq(labOrders.patientId, args.patientId),
		);

		let filterClause = baseQuery;
		if (args.statusFilter === "active") {
			filterClause = and(
				baseQuery,
				or(
					eq(labOrders.status, "draft"),
					eq(labOrders.status, "sent"),
					eq(labOrders.status, "in_progress"),
					eq(labOrders.status, "shipped"),
					eq(labOrders.status, "received"),
					eq(labOrders.status, "refitting"),
				),
			);
		} else if (args.statusFilter === "completed") {
			filterClause = and(baseQuery, eq(labOrders.status, "completed"));
		} else if (args.statusFilter === "cancelled") {
			filterClause = and(baseQuery, eq(labOrders.status, "cancelled"));
		}

		const orders = await targetDb
			.select({
				id: labOrders.id,
				doctorName: labOrders.doctorName,
				toothFdi: labOrders.toothFdi,
				material: labOrders.material,
				colorVita: labOrders.colorVita,
				status: labOrders.status,
				dueDate: labOrders.dueDate,
				clinicalNotes: labOrders.clinicalNotes,
				labComments: labOrders.labComments,
				priceRub: labOrders.priceRub,
				sentAt: labOrders.sentAt,
				completedAt: labOrders.completedAt,
				createdAt: labOrders.createdAt,
			})
			.from(labOrders)
			.where(filterClause)
			.orderBy(desc(labOrders.createdAt));

		return {
			patientId: args.patientId,
			count: orders.length,
			orders,
		};
	},
};

// ─── 10. get_family_balance ─────────────────────────────────────────────────

const getFamilyBalanceSchema = z.object({
	patientId: z
		.string()
		.uuid("Некорректный UUID пациента")
		.describe("ID пациента для проверки семейного баланса и связанных карт"),
});

export const getFamilyBalanceTool: ToolDefinition<
	typeof getFamilyBalanceSchema
> = {
	name: "get_family_balance",
	description:
		"Запрос агрегированного семейного баланса, состава семьи и родственных связей (Head-пациент, дети, супруги) для совместной оплаты лечения.",
	parameters: getFamilyBalanceSchema,
	permissions: ["patients.read"],
	category: "read",
	handler: async (ctx, args) => {
		const targetDb = ctx.db ?? db;

		const [patient] = await targetDb
			.select({
				id: patients.id,
				fullName: patients.fullName,
				phone: patients.phone,
				familyGroupId: patients.familyGroupId,
			})
			.from(patients)
			.where(
				and(
					eq(patients.organizationId, ctx.organizationId),
					eq(patients.id, args.patientId),
				),
			)
			.limit(1);

		if (!patient) {
			throw new Error(`Пациент с ID ${args.patientId} не найден`);
		}

		if (!patient.familyGroupId) {
			return {
				hasFamilyAccount: false,
				patientId: patient.id,
				patientName: patient.fullName,
				message: "Пациент не привязан к семейной группе",
			};
		}

		const [group] = await targetDb
			.select({
				id: familyGroups.id,
				name: familyGroups.name,
				groupName: familyGroups.groupName,
				headPatientId: familyGroups.headPatientId,
				balance: familyGroups.balance,
			})
			.from(familyGroups)
			.where(
				and(
					eq(familyGroups.organizationId, ctx.organizationId),
					eq(familyGroups.id, patient.familyGroupId),
				),
			)
			.limit(1);

		if (!group) {
			return {
				hasFamilyAccount: false,
				patientId: patient.id,
				patientName: patient.fullName,
				message: "Семейная группа не найдена в базе данных",
			};
		}

		const members = await targetDb
			.select({
				id: patients.id,
				fullName: patients.fullName,
				phone: patients.phone,
				birthDate: patients.birthDate,
				status: patients.status,
			})
			.from(patients)
			.where(
				and(
					eq(patients.organizationId, ctx.organizationId),
					eq(patients.familyGroupId, patient.familyGroupId),
				),
			);

		const enrichedMembers = members.map((m: typeof patients.$inferSelect) => ({
			...m,
			isHead: m.id === group.headPatientId,
		}));

		return {
			hasFamilyAccount: true,
			familyGroupId: group.id,
			groupName: group.name || group.groupName || "Семейный счет",
			headPatientId: group.headPatientId,
			balanceRub: group.balance,
			membersCount: enrichedMembers.length,
			members: enrichedMembers,
		};
	},
};

// ─── 11. book_visit ─────────────────────────────────────────────────────────

const bookVisitSchema = z.object({
	patientId: z
		.string()
		.uuid("Некорректный UUID пациента")
		.describe("ID пациента для записи"),
	doctorUserId: z
		.string()
		.uuid("Некорректный UUID врача")
		.describe("ID лечащего врача"),
	chairId: z
		.string()
		.uuid("Некорректный UUID кресла")
		.optional()
		.describe("ID стоматологической установки / кабинета"),
	startsAt: z
		.string()
		.datetime({ offset: true })
		.describe("Время начала приема в ISO 8601"),
	endsAt: z
		.string()
		.datetime({ offset: true })
		.describe("Время окончания приема в ISO 8601"),
	reason: z
		.string()
		.min(1, "Причина записи обязательна")
		.describe("Причина обращения / планируемая процедура"),
	comment: z
		.string()
		.optional()
		.describe("Дополнительные примечания к записи"),
});

export const bookVisitTool: ToolDefinition<typeof bookVisitSchema> = {
	name: "book_visit",
	description:
		"Создание брони / записи на прием в расписании клиники. Требует подтверждения в режиме supervised.",
	parameters: bookVisitSchema,
	permissions: ["schedule.write"],
	category: "write",
	handler: async (ctx, args) => {
		const targetDb = ctx.db ?? db;

		const startTime = new Date(args.startsAt);
		const endTime = new Date(args.endsAt);

		if (Number.isNaN(startTime.getTime()) || Number.isNaN(endTime.getTime())) {
			throw new Error("Некорректный формат даты/времени начала или окончания приема");
		}

		if (startTime >= endTime) {
			throw new Error("Время начала приема должно быть строго раньше времени окончания");
		}

		const [created] = await targetDb
			.insert(appointments)
			.values({
				organizationId: ctx.organizationId,
				patientId: args.patientId,
				doctorUserId: args.doctorUserId,
				chairId: args.chairId ?? null,
				status: "planned",
				startsAt: startTime,
				endsAt: endTime,
				reason: args.reason,
				comment: args.comment ?? null,
			})
			.returning();

		return {
			success: true,
			appointmentId: created.id,
			patientId: created.patientId,
			doctorUserId: created.doctorUserId,
			startsAt: created.startsAt,
			endsAt: created.endsAt,
			status: created.status,
			reason: created.reason,
		};
	},
};

// ─── 12. reschedule_appointment ─────────────────────────────────────────────

const rescheduleAppointmentSchema = z.object({
	appointmentId: z
		.string()
		.uuid("Некорректный UUID записи")
		.describe("ID существующей записи приема"),
	newStartsAt: z
		.string()
		.datetime({ offset: true })
		.describe("Новое время начала приема в ISO 8601"),
	newEndsAt: z
		.string()
		.datetime({ offset: true })
		.describe("Новое время окончания приема в ISO 8601"),
	reason: z
		.string()
		.optional()
		.describe("Причина переноса записи приема"),
});

export const rescheduleAppointmentTool: ToolDefinition<
	typeof rescheduleAppointmentSchema
> = {
	name: "reschedule_appointment",
	description:
		"Перенос существующей записи приема на другое время с проверкой пересечений и занятости врача/кресла. Требует подтверждения (supervised/write).",
	parameters: rescheduleAppointmentSchema,
	permissions: ["schedule.write"],
	category: "write",
	handler: async (ctx, args) => {
		const targetDb = ctx.db ?? db;

		const newStart = new Date(args.newStartsAt);
		const newEnd = new Date(args.newEndsAt);

		if (Number.isNaN(newStart.getTime()) || Number.isNaN(newEnd.getTime())) {
			throw new Error("Некорректный формат даты/времени начала или окончания приема");
		}

		if (newStart >= newEnd) {
			throw new Error("Новое время начала приема должно быть строго раньше времени окончания");
		}

		const [currentApp] = await targetDb
			.select()
			.from(appointments)
			.where(
				and(
					eq(appointments.organizationId, ctx.organizationId),
					eq(appointments.id, args.appointmentId),
				),
			)
			.limit(1);

		if (!currentApp) {
			throw new Error(`Запись приема с ID ${args.appointmentId} не найдена`);
		}

		if (currentApp.status === "cancelled") {
			throw new Error("Нельзя перенести ранее отмененную запись приема");
		}

		if (currentApp.doctorUserId || currentApp.chairId) {
			const conflictConditions = [
				...(currentApp.doctorUserId
					? [eq(appointments.doctorUserId, currentApp.doctorUserId)]
					: []),
				...(currentApp.chairId
					? [eq(appointments.chairId, currentApp.chairId)]
					: []),
			];

			if (conflictConditions.length > 0) {
				const conflicts = await targetDb
					.select({
						id: appointments.id,
						startsAt: appointments.startsAt,
						endsAt: appointments.endsAt,
					})
					.from(appointments)
					.where(
						and(
							eq(appointments.organizationId, ctx.organizationId),
							ne(appointments.id, args.appointmentId),
							ne(appointments.status, "cancelled"),
							or(...conflictConditions),
							sql`${appointments.startsAt} < ${newEnd} AND ${appointments.endsAt} > ${newStart}`,
						),
					)
					.limit(1);

				if (conflicts.length > 0) {
					throw new Error(
						`Конфликт расписания: выбранный интервал (${args.newStartsAt} — ${args.newEndsAt}) пересекается с другой записью врача или кресла.`,
					);
				}
			}
		}

		const updateNote = args.reason
			? `[Перенесено]: ${args.reason}`
			: `[Перенесено с ${currentApp.startsAt.toISOString()}]`;

		const newComment = currentApp.comment
			? `${currentApp.comment}\n${updateNote}`
			: updateNote;

		const [updated] = await targetDb
			.update(appointments)
			.set({
				startsAt: newStart,
				endsAt: newEnd,
				comment: newComment,
			})
			.where(
				and(
					eq(appointments.organizationId, ctx.organizationId),
					eq(appointments.id, args.appointmentId),
				),
			)
			.returning();

		return {
			success: true,
			appointmentId: updated.id,
			patientId: updated.patientId,
			doctorUserId: updated.doctorUserId,
			chairId: updated.chairId,
			previousStartsAt: currentApp.startsAt.toISOString(),
			previousEndsAt: currentApp.endsAt.toISOString(),
			newStartsAt: updated.startsAt.toISOString(),
			newEndsAt: updated.endsAt.toISOString(),
			status: updated.status,
		};
	},
};

// ─── 13. cancel_appointment ─────────────────────────────────────────────────

const cancelAppointmentSchema = z.object({
	appointmentId: z
		.string()
		.uuid("Некорректный UUID записи")
		.describe("ID отменяемой записи приема"),
	cancellationReason: z
		.string()
		.min(1, "Укажите причину отмены приема")
		.describe("Причина отмены приема (пациент заболел, передумал, форс-мажор врача)"),
});

export const cancelAppointmentTool: ToolDefinition<
	typeof cancelAppointmentSchema
> = {
	name: "cancel_appointment",
	description:
		"Отмена записи на прием в расписании клиники с фиксацией причины отмены. Требует подтверждения (supervised/write).",
	parameters: cancelAppointmentSchema,
	permissions: ["schedule.write"],
	category: "write",
	handler: async (ctx, args) => {
		const targetDb = ctx.db ?? db;

		const [currentApp] = await targetDb
			.select()
			.from(appointments)
			.where(
				and(
					eq(appointments.organizationId, ctx.organizationId),
					eq(appointments.id, args.appointmentId),
				),
			)
			.limit(1);

		if (!currentApp) {
			throw new Error(`Запись приема с ID ${args.appointmentId} не найдена`);
		}

		if (currentApp.status === "cancelled") {
			return {
				success: true,
				appointmentId: currentApp.id,
				status: "cancelled",
				message: "Запись приема уже была отменена ранее",
			};
		}

		const cancelNote = `[Отменено]: ${args.cancellationReason}`;
		const newComment = currentApp.comment
			? `${currentApp.comment}\n${cancelNote}`
			: cancelNote;

		const [updated] = await targetDb
			.update(appointments)
			.set({
				status: "cancelled",
				comment: newComment,
			})
			.where(
				and(
					eq(appointments.organizationId, ctx.organizationId),
					eq(appointments.id, args.appointmentId),
				),
			)
			.returning();

		return {
			success: true,
			appointmentId: updated.id,
			patientId: updated.patientId,
			doctorUserId: updated.doctorUserId,
			status: "cancelled",
			cancellationReason: args.cancellationReason,
			cancelledAt: new Date().toISOString(),
		};
	},
};

// ─── 14. get_doctor_schedule ────────────────────────────────────────────────

const getDoctorScheduleSchema = z.object({
	doctorUserId: z
		.string()
		.uuid("Некорректный UUID врача")
		.describe("ID врача для получения расписания и занятости"),
	dateFrom: z
		.string()
		.datetime({ offset: true })
		.describe("Начало временного интервала в ISO 8601"),
	dateTo: z
		.string()
		.datetime({ offset: true })
		.describe("Конец временного интервала в ISO 8601"),
});

export const getDoctorScheduleTool: ToolDefinition<
	typeof getDoctorScheduleSchema
> = {
	name: "get_doctor_schedule",
	description:
		"Запрос рабочего расписания врача, занятых слотов и свободной емкости в заданном временном диапазоне.",
	parameters: getDoctorScheduleSchema,
	permissions: ["schedule.read"],
	category: "read",
	handler: async (ctx, args) => {
		const targetDb = ctx.db ?? db;

		const fromDate = new Date(args.dateFrom);
		const toDate = new Date(args.dateTo);

		if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
			throw new Error("Некорректный формат диапазона дат dateFrom / dateTo");
		}

		if (fromDate >= toDate) {
			throw new Error("dateFrom должно быть строго раньше dateTo");
		}

		const doctorApps = await targetDb
			.select({
				id: appointments.id,
				patientId: appointments.patientId,
				patientName: patients.fullName,
				chairId: appointments.chairId,
				status: appointments.status,
				startsAt: appointments.startsAt,
				endsAt: appointments.endsAt,
				reason: appointments.reason,
				comment: appointments.comment,
			})
			.from(appointments)
			.leftJoin(patients, eq(patients.id, appointments.patientId))
			.where(
				and(
					eq(appointments.organizationId, ctx.organizationId),
					eq(appointments.doctorUserId, args.doctorUserId),
					ne(appointments.status, "cancelled"),
					sql`${appointments.startsAt} < ${toDate} AND ${appointments.endsAt} > ${fromDate}`,
				),
			)
			.orderBy(appointments.startsAt);

		let totalBookedMinutes = 0;
		const slots = doctorApps.map((a: {
			id: string;
			patientId: string;
			patientName: string | null;
			chairId: string | null;
			status: string;
			startsAt: Date;
			endsAt: Date;
			reason: string;
			comment: string | null;
		}) => {
			const startMs = Math.max(a.startsAt.getTime(), fromDate.getTime());
			const endMs = Math.min(a.endsAt.getTime(), toDate.getTime());
			const durationMin = Math.round((endMs - startMs) / 60000);
			if (durationMin > 0) {
				totalBookedMinutes += durationMin;
			}

			return {
				appointmentId: a.id,
				patientId: a.patientId,
				patientName: a.patientName || "Пациент",
				chairId: a.chairId,
				status: a.status,
				startsAt: a.startsAt.toISOString(),
				endsAt: a.endsAt.toISOString(),
				durationMinutes: durationMin,
				reason: a.reason,
			};
		});

		const totalRangeMinutes = Math.round(
			(toDate.getTime() - fromDate.getTime()) / 60000,
		);
		const freeCapacityMinutes = Math.max(
			0,
			totalRangeMinutes - totalBookedMinutes,
		);

		return {
			doctorUserId: args.doctorUserId,
			dateFrom: args.dateFrom,
			dateTo: args.dateTo,
			totalAppointmentsCount: doctorApps.length,
			totalBookedMinutes,
			freeCapacityMinutes,
			bookedSlots: slots,
		};
	},
};

// ─── 15. create_staff_task ──────────────────────────────────────────────────

const createStaffTaskSchema = z.object({
	patientId: z
		.string()
		.uuid("Некорректный UUID пациента")
		.describe("ID пациента, к которому привязана задача"),
	title: z
		.string()
		.min(1, "Название задачи обязательно")
		.describe("Заголовок задачи (например, 'Перезвонить по поводу плана лечения')"),
	description: z
		.string()
		.optional()
		.describe("Подробное описание задачи для сотрудника"),
	priority: z
		.enum(["low", "normal", "high", "urgent"])
		.optional()
		.default("normal")
		.describe("Приоритет задачи"),
	assignedRole: z
		.enum(["admin", "nurse", "doctor", "receptionist", "call_center", "hygienist"])
		.optional()
		.default("admin")
		.describe("Роль ответственного исполнителя"),
	dueDate: z
		.string()
		.datetime({ offset: true })
		.optional()
		.describe("Срок исполнения задачи в ISO 8601 (по умолчанию +24 часа)"),
});

export const createStaffTaskTool: ToolDefinition<typeof createStaffTaskSchema> = {
	name: "create_staff_task",
	description:
		"Создание внутреннего поручения / задачи сотрудникам клиники (администратору, медсестре, врачу) с привязкой к пациенту и сроку выполнения. Требует подтверждения (supervised/write).",
	parameters: createStaffTaskSchema,
	permissions: ["clinical.write", "tasks.write"],
	category: "write",
	handler: async (ctx, args) => {
		const targetDb = ctx.db ?? db;

		const [patient] = await targetDb
			.select({
				id: patients.id,
				fullName: patients.fullName,
			})
			.from(patients)
			.where(
				and(
					eq(patients.organizationId, ctx.organizationId),
					eq(patients.id, args.patientId),
				),
			)
			.limit(1);

		if (!patient) {
			throw new Error(`Пациент с ID ${args.patientId} не найден`);
		}

		const dueTimestamp = args.dueDate
			? new Date(args.dueDate)
			: new Date(Date.now() + 24 * 60 * 60 * 1000);

		if (Number.isNaN(dueTimestamp.getTime())) {
			throw new Error("Некорректный формат срока dueDate");
		}

		const [created] = await targetDb
			.insert(communicationTasks)
			.values({
				organizationId: ctx.organizationId,
				clinicId: ctx.clinicId ?? null,
				patientId: args.patientId,
				assignedRole: args.assignedRole,
				channel: "phone",
				intent: "general",
				status: "needs_call",
				priority: args.priority,
				dueAt: dueTimestamp,
				title: args.title,
				body: args.description || args.title,
			})
			.returning();

		return {
			success: true,
			taskId: created.id,
			patientId: created.patientId,
			patientName: patient.fullName,
			title: created.title,
			description: created.body,
			assignedRole: created.assignedRole,
			priority: created.priority,
			status: created.status,
			dueAt: created.dueAt.toISOString(),
			createdAt: created.createdAt.toISOString(),
		};
	},
};

// ─── 16. get_patient_recalls ────────────────────────────────────────────────

const getPatientRecallsSchema = z.object({
	patientId: z
		.string()
		.uuid("Некорректный UUID пациента")
		.describe("ID пациента для поиска назначенных и рекомендуемых вызовов (recalls)"),
	statusFilter: z
		.enum(["all", "pending", "due_now", "overdue"])
		.optional()
		.default("all")
		.describe("Фильтр по статусу вызова (all, pending, due_now, overdue)"),
});

export const getPatientRecallsTool: ToolDefinition<
	typeof getPatientRecallsSchema
> = {
	name: "get_patient_recalls",
	description:
		"Запрос истории и текущего статуса профилактических вызовов (recalls) пациента: профгигиена, осмотр имплантов, ортодонтический контроль, санация.",
	parameters: getPatientRecallsSchema,
	permissions: ["clinical.read", "communications.read"],
	category: "read",
	handler: async (ctx, args) => {
		const targetDb = ctx.db ?? db;

		const existingRecalls = await targetDb
			.select({
				id: communicationTasks.id,
				title: communicationTasks.title,
				body: communicationTasks.body,
				channel: communicationTasks.channel,
				status: communicationTasks.status,
				priority: communicationTasks.priority,
				dueAt: communicationTasks.dueAt,
				createdAt: communicationTasks.createdAt,
			})
			.from(communicationTasks)
			.where(
				and(
					eq(communicationTasks.organizationId, ctx.organizationId),
					eq(communicationTasks.patientId, args.patientId),
					eq(communicationTasks.intent, "recall"),
				),
			)
			.orderBy(desc(communicationTasks.dueAt));

		const nowMs = Date.now();
		const fourteenDaysMs = 14 * 24 * 60 * 60 * 1000;

		const enrichedRecalls = existingRecalls.map((r: typeof communicationTasks.$inferSelect) => {
			const dueMs = r.dueAt.getTime();
			let urgency: "upcoming" | "due_now" | "overdue" = "upcoming";
			if (dueMs < nowMs - fourteenDaysMs) {
				urgency = "overdue";
			} else if (dueMs <= nowMs + fourteenDaysMs) {
				urgency = "due_now";
			}

			return {
				id: r.id,
				title: r.title,
				notes: r.body,
				channel: r.channel,
				status: r.status,
				priority: r.priority,
				urgency,
				dueAt: r.dueAt.toISOString(),
				createdAt: r.createdAt.toISOString(),
			};
		});

		const [lastVisit] = await targetDb
			.select({
				id: visits.id,
				diagnosis: visits.diagnosis,
				treatmentPlan: visits.treatmentPlan,
				signedAt: visits.signedAt,
				createdAt: visits.createdAt,
			})
			.from(visits)
			.where(
				and(
					eq(visits.organizationId, ctx.organizationId),
					eq(visits.patientId, args.patientId),
				),
			)
			.orderBy(desc(visits.createdAt))
			.limit(1);

		const recommendedRecalls: {
			reason: string;
			title: string;
			recommendedIntervalMonths: number;
			calculatedDueMonth: string;
		}[] = [];

		if (lastVisit) {
			const visitDate = lastVisit.signedAt ?? lastVisit.createdAt;
			const diagLower = (lastVisit.diagnosis || "").toLowerCase();

			recommendedRecalls.push({
				reason: "hygiene",
				title: "Профессиональная гигиена и ремотерапия (каждые 6 мес)",
				recommendedIntervalMonths: RECALL_INTERVAL_MONTHS.hygiene ?? 6,
				calculatedDueMonth: calculateNextRecallDueMonth(visitDate, "hygiene"),
			});

			if (diagLower.includes("имплант") || diagLower.includes("операц")) {
				recommendedRecalls.push({
					reason: "implant_review",
					title: "Контрольный осмотр дентальных имплантатов и ISQ (6 мес)",
					recommendedIntervalMonths: RECALL_INTERVAL_MONTHS.implant_review ?? 6,
					calculatedDueMonth: calculateNextRecallDueMonth(visitDate, "implant_review"),
				});
			}
		}

		let filteredRecalls = enrichedRecalls;
		if (args.statusFilter === "due_now") {
			filteredRecalls = enrichedRecalls.filter((r: { urgency: string }) => r.urgency === "due_now");
		} else if (args.statusFilter === "overdue") {
			filteredRecalls = enrichedRecalls.filter((r: { urgency: string }) => r.urgency === "overdue");
		} else if (args.statusFilter === "pending") {
			filteredRecalls = enrichedRecalls.filter(
				(r: { status: string }) =>
					r.status === "queued" || r.status === "scheduled" || r.status === "needs_call",
			);
		}

		return {
			patientId: args.patientId,
			totalActiveRecallsCount: enrichedRecalls.length,
			recalls: filteredRecalls,
			medicalRecommendations: recommendedRecalls,
		};
	},
};

// ─── 17. schedule_recall ────────────────────────────────────────────────────

const scheduleRecallSchema = z.object({
	patientId: z
		.string()
		.uuid("Некорректный UUID пациента")
		.describe("ID пациента для планирования recall"),
	recallReason: z
		.enum([
			"hygiene",
			"implant_review",
			"ortho_review",
			"checkup",
			"treatment_followup",
			"preventive",
		])
		.default("hygiene")
		.describe("Клиническая причина профилактического вызова"),
	dueAt: z
		.string()
		.datetime({ offset: true })
		.describe("Плановая дата/время recall в ISO 8601"),
	channel: z
		.enum(["whatsapp", "sms", "phone", "telegram", "email"])
		.optional()
		.default("whatsapp")
		.describe("Канал первичной коммуникации"),
	priority: z
		.enum(["low", "normal", "high", "urgent"])
		.optional()
		.default("normal")
		.describe("Приоритет вызова"),
	assignedRole: z
		.string()
		.optional()
		.default("admin")
		.describe("Роль ответственного сотрудника (admin/hygienist)"),
	notes: z
		.string()
		.optional()
		.describe("Клинические примечания к вызову"),
});

export const scheduleRecallTool: ToolDefinition<typeof scheduleRecallSchema> = {
	name: "schedule_recall",
	description:
		"Планирование профилактического вызова (recall) пациента на профгигиену, плановый осмотр или контроль лечения. Требует подтверждения (supervised/write).",
	parameters: scheduleRecallSchema,
	permissions: ["clinical.write", "communications.write"],
	category: "write",
	handler: async (ctx, args) => {
		const targetDb = ctx.db ?? db;

		const [patient] = await targetDb
			.select({
				id: patients.id,
				fullName: patients.fullName,
			})
			.from(patients)
			.where(
				and(
					eq(patients.organizationId, ctx.organizationId),
					eq(patients.id, args.patientId),
				),
			)
			.limit(1);

		if (!patient) {
			throw new Error(`Пациент с ID ${args.patientId} не найден`);
		}

		const dueTimestamp = new Date(args.dueAt);
		if (Number.isNaN(dueTimestamp.getTime())) {
			throw new Error("Некорректный формат даты dueAt");
		}

		const titleByReason: Record<string, string> = {
			hygiene: "Профгигиена полости рта и ремотерапия (Recall)",
			implant_review: "Контрольный осмотр имплантов и прикуса (Recall)",
			ortho_review: "Ортодонтический контроль и активация аппарата (Recall)",
			checkup: "Плановый профилактический осмотр стоматолога (Recall)",
			treatment_followup: "Контроль после сложного эндодонтического/хирургического лечения (Recall)",
			preventive: "Профилактический диспансерный осмотр (Recall)",
		};

		const reasonKey = args.recallReason || "hygiene";
		const taskTitle = titleByReason[reasonKey] || "Профилактический осмотр (Recall)";
		const taskBody = args.notes ? `${taskTitle}. Примечания: ${args.notes}` : taskTitle;

		const [created] = await targetDb
			.insert(communicationTasks)
			.values({
				organizationId: ctx.organizationId,
				clinicId: ctx.clinicId ?? null,
				patientId: args.patientId,
				assignedRole: args.assignedRole || "admin",
				// biome-ignore lint/suspicious/noExplicitAny: Enum cast
				channel: (args.channel || "whatsapp") as any,
				intent: "recall",
				status: "queued",
				priority: args.priority || "normal",
				dueAt: dueTimestamp,
				title: taskTitle,
				body: taskBody,
			})
			.returning();

		return {
			success: true,
			recallTaskId: created.id,
			patientId: created.patientId,
			patientName: patient.fullName,
			recallReason: args.recallReason,
			title: created.title,
			channel: created.channel,
			dueAt: created.dueAt.toISOString(),
			priority: created.priority,
			status: created.status,
			createdAt: created.createdAt.toISOString(),
		};
	},
};

/**
 * Registers all clinical, scheduling, staff task, and recall tools into the specified ToolRegistry.
 */
export function registerClinicalTools(
	registry: ToolRegistry,
	moduleName = "clinical",
): void {
	// 1. Exploration & Diagnostic Tools
	registry.register(findPatientTool, moduleName);
	registry.register(getEmrCardTool, moduleName);
	registry.register(suggestIcd10PlanTool, moduleName);
	registry.register(getPatientTimelineTool, moduleName);
	registry.register(checkDrugInteractionsTool, moduleName);
	registry.register(getLabOrdersTool, moduleName);
	registry.register(getFamilyBalanceTool, moduleName);

	// 2. Clinical Copilot Tools (Form 043/у Diary, Prescription 107-1/у, 3-Tier Plans, DDI Safety)
	registry.register(generateVisitDiaryTool, moduleName);
	registry.register(createPrescription107Tool, moduleName);
	registry.register(suggestTreatmentPlanTool, moduleName);
	registry.register(checkDrugInteractionTool, moduleName);

	// 3. Interactive Schedule Tools (READ & WRITE with confirmation)
	registry.register(bookVisitTool, moduleName);
	registry.register(rescheduleAppointmentTool, moduleName);
	registry.register(cancelAppointmentTool, moduleName);
	registry.register(getDoctorScheduleTool, moduleName);

	// 4. Staff Tasks & Preventive Recalls Tools
	registry.register(createStaffTaskTool, moduleName);
	registry.register(getPatientRecallsTool, moduleName);
	registry.register(scheduleRecallTool, moduleName);

	// 5. Vision AI & Radiograph Diagnostic Analysis
	registry.register(analyzeRadiographVisionTool, moduleName);

	// 6. Treatment Estimates & Dental Laboratory Tools
	registry.register(calculateTreatmentEstimateTool, moduleName);
	registry.register(draftLabWorkOrderTool, moduleName);

	// 7. Cancellation Gap Auto-Fill & Informed Consent Tools
	registry.register(autoFillCancellationGapTool, moduleName);
	registry.register(generateInformedConsentTool, moduleName);

	// 8. SanPiN 3.3686-21 Sterilization & Infection Control Tools
	registry.register(verifyKraftPackTool, moduleName);
	registry.register(recordSterilizationTestTool, moduleName);

	// 9. 5-Year Patient EHR Semantic Memory & RAG Search Tool
	registry.register(searchPatientHistoryTool, moduleName);
}

export {
	analyzeRadiographVisionTool,
	autoFillCancellationGapTool,
	calculateTreatmentEstimateTool,
	draftLabWorkOrderTool,
	generateInformedConsentTool,
	recordSterilizationTestTool,
	registerSanpinTools,
	searchPatientHistoryTool,
	verifyKraftPackTool,
};
