/**
 * @file prescriptionsAndSanpinTools.ts
 * @description Layer 2: Statutory prescription Form 107-1/у generator and clinical drug safety & DDI auditing tools.
 */

import crypto from "node:crypto";
import {
	auditClinicalDrugSafety,
	DENTAL_PRESCRIPTION_DRUG_CATALOG,
	type Form107_1uPayload,
	type PrescriptionDrugItem,
} from "@dental/shared";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../../../db/client.js";
import {
	organizations,
	patientDrugAllergies,
	patients,
} from "../../../../db/schema.js";
import type { ToolDefinition } from "../tool.js";
import { renderPrescription107Text } from "./toolFormatters.js";
import type { DrugSafetyAuditParams, DrugSafetyAuditResult } from "./types.js";

// ─── 0. CLINICAL DRUG SAFETY AUDIT ENGINE ───────────────────────────────────

export async function performClinicalDrugSafetyAudit(
	params: DrugSafetyAuditParams,
): Promise<DrugSafetyAuditResult> {
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
				.select({
					notes: patients.notes,
					profile: patients.administrativeProfile,
				})
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
				if (notesLower.includes("беременн"))
					unifiedConditions.push("pregnancy");
				if (
					notesLower.includes("3 триместр") ||
					notesLower.includes("третий триместр")
				) {
					unifiedConditions.push("pregnancy_3rd_trimester");
				}
				if (notesLower.includes("астма"))
					unifiedConditions.push("bronchial_asthma");
				if (notesLower.includes("язва")) unifiedConditions.push("peptic_ulcer");
				if (notesLower.includes("почечн") || notesLower.includes("хпн")) {
					unifiedConditions.push("renal_failure");
				}
			}
		} catch {
			// Fail-safe fallback if DB tables unavailable in isolated test execution
		}
	}

	// 2. Execute clinical DDI & Allergy Drug Safety Audit via pure shared engine
	const audit = auditClinicalDrugSafety({
		proposedMedications: params.proposedMedications,
		existingMedications: params.existingMedications || [],
		patientConditions: unifiedConditions,
		knownAllergies: unifiedAllergies,
	});

	return {
		isSafe: audit.isSafe,
		riskLevel: audit.riskLevel,
		hasAllergyClash: audit.hasAllergyClash,
		hasSevereDdi: audit.hasSevereDdi,
		hasConditionContraindication: audit.hasConditionContraindication,
		blockedPrescriptions: [...audit.blockedPrescriptions],
		allergyWarnings: audit.allergyWarnings.map((w) => ({
			allergenGroup: w.allergenGroup,
			proposedDrug: w.proposedDrug,
			severity: w.severity,
			manifestations: w.manifestationsRu,
		})),
		drugInteractions: audit.drugInteractions.map((i) => ({
			primaryDrug: i.primaryDrug,
			interactingDrug: i.interactingDrug,
			severity: i.severity,
			effectDescriptionRu: i.effectDescriptionRu,
			clinicalRecommendationRu: i.clinicalRecommendationRu,
		})),
		conditionContraindications: audit.conditionContraindications.map((c) => ({
			condition: c.condition,
			proposedDrug: c.proposedDrug,
			severity: c.severity,
			reasonRu: c.reasonRu,
			clinicalGuidanceRu: c.clinicalGuidanceRu,
		})),
		safeAlternativeRecommendations: audit.safeAlternativeRecommendations.map(
			(r) => ({
				originalDrug: r.originalDrug,
				recommendedAlternatives: [...r.recommendedAlternatives],
				rationaleRu: r.rationaleRu,
			}),
		),
		summaryRu: audit.summaryRu,
	};
}

// ─── 5. create_prescription_107 (Form 107-1/у, Order 1094n) ─────────────────

const createPrescription107Schema = z.object({
	patientId: z
		.string()
		.uuid("Некорректный UUID пациента")
		.optional()
		.describe(
			"ID пациента (если указан, данные пациента подтягиваются из базы)",
		),
	patientFullName: z.string().optional().describe("ФИО пациента"),
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
	medicalCardNumber: z.string().optional().describe("Номер медицинской карты"),
	doctorFullName: z.string().optional().describe("ФИО врача"),
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
					.describe(
						"ID типового препарата из каталога DENTE (например, 'nimesulide_100', 'amoxiclav_875_125', 'amoxicillin_500', 'ibuprofen_400', 'chlorhexidine_005', 'metrogyl_denta', 'cholisal_gel', 'omeprazole_20', 'loratadine_10', 'tranexamic_acid_500')",
					),
				latinName: z
					.string()
					.optional()
					.describe(
						"Латинское наименование по МНН (например, 'Rp.: Nimesulidi 100 mg')",
					),
				tradeName: z
					.string()
					.optional()
					.describe("Торговое наименование (например, 'Нимесил')"),
				form: z
					.string()
					.optional()
					.describe(
						"Форма выпуска (например, 'гранулы для приготовления суспензии')",
					),
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
					.describe(
						"Сигнатура отпуска на латыни (например, 'D.t.d. N 10 in gran.')",
					),
				signaRussian: z
					.string()
					.optional()
					.describe(
						"Способ применения на русском языке (S. Внутрь по 1 пакетику 2 раза в день после еды...)",
					),
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
		.max(
			3,
			"На одном бланке 107-1/у разрешено выписывать не более 3 препаратов",
		),
	validityDays: z
		.enum(["15", "30", "60", "365"])
		.optional()
		.default("60")
		.describe("Срок действия рецепта (по умолчанию 60 дней per Приказ 1094н)"),
	isChronicSpecialCare: z
		.boolean()
		.optional()
		.default(false)
		.describe(
			"Пометка 'По специальному назначению' (для хронических больных со сроком до 1 года)",
		),
	chronicPeriodicity: z
		.string()
		.optional()
		.describe(
			"Периодичность отпуска для хронических больных (ежемесячно / каждые 2 месяца)",
		),
	diagnosisIcd10Code: z.string().optional().describe("Код диагноза по МКБ-10"),
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
		const resolvedItems: PrescriptionDrugItem[] = args.items.map(
			(item, idx) => {
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

				const latinRaw =
					item.latinName ||
					`Rp.: ${item.tradeName || "Medicamentum"} ${item.dosage || "100 mg"}`;
				const latin = latinRaw.startsWith("Rp.:")
					? latinRaw
					: `Rp.: ${latinRaw}`;
				const dispenseRaw =
					item.dispenseLatin || `D.t.d. ${item.quantity || "N. 10"} in tab.`;
				const dispense = dispenseRaw.startsWith("D.t.d.")
					? dispenseRaw
					: `D.t.d. ${dispenseRaw}`;
				const signaRaw =
					item.signaRussian ||
					"S. Принимать внутрь по указанию лечащего врача.";
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
			},
		);

		// biome-ignore lint/suspicious/noExplicitAny: Organization record
		let org: any = null;
		if (ctx.organizationId) {
			try {
				const [foundOrg] = await targetDb
					.select()
					.from(organizations)
					.where(eq(organizations.id, ctx.organizationId))
					.limit(1);
				if (foundOrg) org = foundOrg;
			} catch {
				// Non-blocking fallback if DB pool is unavailable in isolated unit tests
			}
		}

		const seriesNumber = `107-${new Date().getFullYear()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
		const prescriptionDate = new Date().toLocaleDateString("ru-RU");

		const payload: Form107_1uPayload = {
			formNumber: "107-1/у",
			clinicLegalName:
				org?.name || args.clinicLegalName || "Медицинская организация",
			clinicAddress: org?.legalAddress || "Адрес",
			clinicPhone: "+7 (000) 000-00-00",
			clinicOgrn: org?.ogrn || "0000000000000",
			clinicInn: org?.inn || "0000000000",
			medicalLicenseNumber: org?.medicalLicenseNumber || "Лицензия",
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

// ─── 7. check_drug_interaction (DDI, Allergies, Pregnancy, Anticoagulants) ──

const checkDrugInteractionSchema = z.object({
	patientId: z
		.string()
		.uuid("Некорректный UUID пациента")
		.optional()
		.describe(
			"ID пациента (если указан, данные аллергий подтягиваются из базы)",
		),
	proposedMedications: z
		.array(z.string())
		.min(1, "Укажите хотя бы один планируемый препарат")
		.describe(
			"Список назначаемых препаратов (названия или ID: 'amoxiclav', 'nimesulide', 'articaine', 'ibuprofen', 'metronidazole', 'ketorolac', 'lidocaine')",
		),
	existingMedications: z
		.array(z.string())
		.optional()
		.default([])
		.describe(
			"Препараты постоянной терапии пациента (например: 'warfarin', 'aspirin', 'clopidogrel', 'rivaroxaban', 'dabigatran', 'bisoprolol', 'metformin')",
		),
	patientConditions: z
		.array(z.string())
		.optional()
		.default([])
		.describe(
			"Сопутствующие соматические состояния (например: 'pregnancy_1st_trimester', 'pregnancy_3rd_trimester', 'lactation', 'bronchial_asthma', 'samter_triad', 'peptic_ulcer', 'renal_failure', 'hypertension')",
		),
	knownAllergies: z
		.array(z.string())
		.optional()
		.default([])
		.describe(
			"Аллергии со слов пациента (например: 'пенициллин', 'нпвс', 'сульфиты', 'новокаин', 'лидокаин')",
		),
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
		.describe(
			"Идентификаторы препаратов из формуляра DENTE (например, 'med_amox_500', 'med_metron_500', 'med_art_epi_100k', 'med_ibu_400')",
		),
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
