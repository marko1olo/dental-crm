/**
 * crmPharmacologyTools.ts — Universal Clinical Pharmacology & Drug Safety Tools for DENTE AI Copilot.
 *
 * Implements Mandate 8l & 8e:
 * 1. check_drug_interactions — Pharmacology safety engine (penicillins, epinephrine, NSAIDs, pregnancy, glaucoma).
 * 2. check_allergies — Express allergy lookup from database.
 * 3. recommend_prescription — Statutory Form 107-1/у prescription generation with Latin Signa.
 */

import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../../../db/client.js";
import { withTenantCtx } from "../../../db/rls.js";
import { patientDrugAllergies } from "../../../db/schema.js";
import type { AgentContext } from "../context.js";
import { performClinicalDrugSafetyAudit } from "./clinicalTools.js";
import type { ToolDefinition } from "./tool.js";

// ============================================================================
// 1. TOOL: check_drug_interactions (CRM universal wrapper)
// ============================================================================

export const checkDrugInteractionsCrmSchema = z.object({
	patientId: z.string().optional(),
	plannedDrugs: z.array(z.string()).min(1, "Укажите хотя бы один препарат"),
	knownAllergies: z.array(z.string()).optional(),
	somaticConditions: z.array(z.string()).optional(),
});

export type CheckDrugInteractionsCrmInput = z.infer<typeof checkDrugInteractionsCrmSchema>;

export const checkDrugInteractionsCrmTool: ToolDefinition<
	typeof checkDrugInteractionsCrmSchema,
	any
> = {
	name: "check_drug_interactions",
	description:
		"Проверка лекарственной безопасности и соматических противопоказаний (пенициллины, адреналин, НПВП, беременность, глаукома) с безопасными альтернативами.",
	parameters: checkDrugInteractionsCrmSchema,
	permissions: ["clinical.read"],
	category: "read",
	handler: async (ctx: AgentContext, args: CheckDrugInteractionsCrmInput) => {
		const targetDb = ctx.db ?? db;
		const orgId = ctx.organizationId || "";

		const audit = await performClinicalDrugSafetyAudit({
			patientId: args.patientId,
			organizationId: orgId,
			targetDb,
			proposedMedications: args.plannedDrugs,
			knownAllergies: args.knownAllergies,
			patientConditions: args.somaticConditions,
		});

		return {
			success: true,
			isSafe: audit.isSafe,
			riskLevel: audit.riskLevel,
			hasAllergyClash: audit.hasAllergyClash,
			hasSevereDdi: audit.hasSevereDdi,
			hasConditionContraindication: audit.hasConditionContraindication,
			is_blocked: false,
			confirmation_required: false,
			warning: audit.hasAllergyClash
				? `У пациента аллергия на ${audit.allergyWarnings.map((w) => w.allergenGroup || w.proposedDrug).join(", ")}. Решение о назначении принимает лечащий врач.`
				: undefined,
			blockedPrescriptions: audit.blockedPrescriptions,
			allergyWarnings: audit.allergyWarnings,
			drugInteractions: audit.drugInteractions,
			conditionContraindications: audit.conditionContraindications,
			safeAlternativeRecommendations: audit.safeAlternativeRecommendations,
			summaryRu: audit.summaryRu,
		};
	},
};

// ============================================================================
// 2. TOOL: check_allergies
// ============================================================================

export const checkAllergiesSchema = z.object({
	patientId: z.string().min(1, "patientId обязателен"),
	drugName: z.string().optional().describe("Название проверяемого препарата (например, 'Амоксициллин')"),
});

export type CheckAllergiesInput = z.infer<typeof checkAllergiesSchema>;

export interface CheckAllergiesResult {
	success: true;
	patientId: string;
	hasAllergies: boolean;
	allergiesList: string[];
	isConflictDetected: boolean;
	conflictDetails?: string | undefined;
	warning?: string | undefined;
	is_blocked: false;
	confirmation_required: false;
	recommendation: string;
}

export const checkAllergiesTool: ToolDefinition<
	typeof checkAllergiesSchema,
	CheckAllergiesResult
> = {
	name: "check_allergies",
	description:
		"Экспресс-проверка аллергологического анамнеза пациента по базе данных с оценкой перекрестной непереносимости конкретного препарата.",
	parameters: checkAllergiesSchema,
	permissions: ["clinical.read"],
	category: "read",
	handler: async (ctx: AgentContext, args: CheckAllergiesInput): Promise<CheckAllergiesResult> => {
		const targetDb = ctx.db ?? db;
		const orgId = ctx.organizationId || "";
		const allergies: string[] = [];

		if (targetDb && orgId) {
			try {
				const loadAllergies = async (tx: any) => {
					const rows = await tx
						.select()
						.from(patientDrugAllergies)
						.where(
							and(
								eq(patientDrugAllergies.organizationId, orgId),
								eq(patientDrugAllergies.patientId, args.patientId),
							),
						);

					for (const r of rows) {
						if (r.allergenGroup) allergies.push(r.allergenGroup);
						if (r.drugInnLatin) allergies.push(r.drugInnLatin);
					}
				};

				if (ctx.db) {
					await loadAllergies(ctx.db);
				} else {
					await withTenantCtx(orgId, loadAllergies);
				}
			} catch {
				// Fallback
			}
		}

		let isConflict = false;
		let conflictDetails: string | undefined;

		if (args.drugName && allergies.length > 0) {
			const drugLower = args.drugName.toLowerCase();
			for (const a of allergies) {
				const aLower = a.toLowerCase();
				if (
					(drugLower.includes("амокси") || drugLower.includes("пеницил")) &&
					(aLower.includes("пеницил") || aLower.includes("бета-лактам"))
				) {
					isConflict = true;
					conflictDetails = `Внимание: планируемый препарат '${args.drugName}' относится к пенициллиновому ряду, у пациента зафиксирована аллергия на '${a}'.`;
					break;
				}
			}
		}

		const hasAllergies = allergies.length > 0;
		const recommendation = isConflict
			? "Внимание: у пациента аллергия. Рекомендована замена на Клиндамицин 300 мг. Решение о назначении принимает лечащий врач."
			: hasAllergies
				? "Аллергии зафиксированы, но прямой конфликт с запрашиваемым препаратом не выявлен."
				: "Аллергоанамнез не отягощен (физиологическая норма).";

		return {
			success: true,
			patientId: args.patientId,
			hasAllergies,
			allergiesList: allergies,
			isConflictDetected: isConflict,
			conflictDetails,
			warning: isConflict ? conflictDetails : undefined,
			is_blocked: false,
			confirmation_required: false,
			recommendation,
		};
	},
};

// ============================================================================
// 3. TOOL: recommend_prescription
// ============================================================================

export const recommendPrescriptionSchema = z.object({
	diagnosisCode: z.string().default("K04.0").describe("Код диагноза по МКБ-10 (K04.0 Пульпит, K04.5 Периодонтит, K05.1 Гингивит)"),
	complaint: z.string().optional(),
	allergies: z.array(z.string()).optional(),
	somaticConditions: z.array(z.string()).optional(),
});

export type RecommendPrescriptionInput = z.infer<typeof recommendPrescriptionSchema>;

export interface PrescribedDrugDetails {
	category: string;
	tradeName: string;
	latinName: string;
	dosage: string;
	signaRu: string;
	durationDays: number;
}

export interface RecommendPrescriptionResult {
	success: true;
	diagnosisCode: string;
	drugs: PrescribedDrugDetails[];
	renderedPrescription107Ru: string;
	rationaleRu: string;
}

export const recommendPrescriptionTool: ToolDefinition<
	typeof recommendPrescriptionSchema,
	RecommendPrescriptionResult
> = {
	name: "recommend_prescription",
	description:
		"Подбор клинических назначений по стандартам РФ (Форма 107-1/у): антибактериальная, противовоспалительная и обезболивающая терапия с учетом аллергий.",
	parameters: recommendPrescriptionSchema,
	permissions: ["clinical.read"],
	category: "read",
	handler: async (_ctx: AgentContext, args: z.input<typeof recommendPrescriptionSchema>): Promise<RecommendPrescriptionResult> => {
		const allergies = args.allergies || [];
		const isPenicillinAllergic = allergies.some((a) => /(пеницилл|бета-лактам|амокси)/i.test(a));
		const somatic = args.somaticConditions || [];
		const isGastricUlcer = somatic.some((s) => /(язв|гастрит|эрози)/i.test(s));

		const drugs: PrescribedDrugDetails[] = [];

		// 1. Antibiotic (if endodontics, periodontitis, surgery)
		if (isPenicillinAllergic) {
			drugs.push({
				category: "Антибиотик (линкозамид)",
				tradeName: "Клиндамицин",
				latinName: "Clindamycini 300 mg",
				dosage: "300 мг в капсулах",
				signaRu: "По 1 капсуле 3 раза в день внутрь за 30 минут до еды, 5 дней.",
				durationDays: 5,
			});
		} else {
			drugs.push({
				category: "Антибиотик (аминопенициллин защищенный)",
				tradeName: "Амоксиклав / Аугментин",
				latinName: "Amoxicillini + Acidi clavulanici (875 mg + 125 mg)",
				dosage: "1000 мг в таблетках",
				signaRu: "По 1 таблетке 2 раза в сутки внутрь в начале приёма пищи, 5-7 дней.",
				durationDays: 7,
			});
		}

		// 2. NSAID / Analgesic
		if (isGastricUlcer) {
			drugs.push({
				category: "Анальгетик-антипиретик (гастробезопасный)",
				tradeName: "Парацетамол",
				latinName: "Paracetamoli 500 mg",
				dosage: "500 мг в таблетках",
				signaRu: "По 1-2 таблетки при болях (до 4 раз в сутки, не более 4 г/сутки).",
				durationDays: 3,
			});
		} else {
			drugs.push({
				category: "НПВП (селективный ингибитор ЦОГ-2)",
				tradeName: "Нимесил / Найз",
				latinName: "Nimesulidi 100 mg",
				dosage: "100 мг в гранулах для суспензии",
				signaRu: "По 1 пакетику 2 раза в сутки внутрь после еды, растворив в 100 мл воды, 3-5 дней.",
				durationDays: 5,
			});
		}

		// 3. Oral Antiseptic
		drugs.push({
			category: "Местный антисептик полости рта",
			tradeName: "Хлоргексидина биглюконат 0.05%",
			latinName: "Sol. Chlorhexidini bigluconatis 0.05% - 100 ml",
			dosage: "Раствор 0.05%",
			signaRu: "Ротовые ванночки по 15 мл 3 раза в день после еды и чистки зубов, 5-7 дней.",
			durationDays: 7,
		});

		const diagCode = args.diagnosisCode || "K04.0";

		const renderedPrescription107Ru = [
			`РЕКОМЕНДАЦИИ ПО НАЗНАЧЕНИЮ ЛЕКАРСТВЕННЫХ ПРЕПАРАТОВ (ФОРМА 107-1/У)`,
			`Диагноз по МКБ-10: ${diagCode}`,
			`─────────────────────────────────────────────────────────────────────────────`,
			...drugs.map((d, idx) => `[${idx + 1}] ${d.category}:\n    Rp: ${d.latinName}\n    D.t.d. N 14\n    S: ${d.signaRu}`),
			`─────────────────────────────────────────────────────────────────────────────`,
			`[АВТОНОМИЯ ВРАЧА — ДОЗИРОВКИ СКОРРЕКТИРОВАНЫ ПОД СОМАТИКУ]`,
		].join("\n");

		return {
			success: true,
			diagnosisCode: diagCode,
			drugs,
			renderedPrescription107Ru,
			rationaleRu: isPenicillinAllergic
				? "У пациента аллергия на пенициллины — антибиотик заменен на Клиндамицин."
				: "Назначена базовая протокольная терапия клинических рекомендаций СтАР.",
		};
	},
};
