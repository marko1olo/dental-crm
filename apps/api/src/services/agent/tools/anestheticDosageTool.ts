/**
 * anestheticDosageTool.ts — Anesthetic Dosage & Carpule Calculation Tool for DENTE AI Agent.
 *
 * Implements Russian clinical dentistry standards (StAR, Order 804n, Form 043/u):
 * 1. Articaine 4% with Epinephrine 1:100,000 (Ультракаин Д-С форте / Септанест 1:100 000):
 *    - 40 mg/ml articaine (68 mg per 1.7 ml carpule). Epinephrine: 10 mcg/ml (17 mcg/carpule).
 *    - Maximum recommended dose (MRD): 7.0 mg/kg (absolute maximum 500 mg).
 *    - For healthy adults (70 kg): max 7 carpules.
 * 2. Articaine 4% with Epinephrine 1:200,000 (Ультракаин Д-С / Убистезин 1:200 000):
 *    - 40 mg/ml articaine (68 mg per 1.7 ml carpule). Epinephrine: 5 mcg/ml (8.5 mcg/carpule).
 *    - MRD: 7.0 mg/kg (absolute maximum 500 mg).
 *    - Indicated for moderate risk, elderly, and pregnancy (2nd trimester).
 * 3. Mepivacaine 3% without vasoconstrictor (Скандонест 3% / Мепивакаин 3%):
 *    - 30 mg/ml mepivacaine (51 mg per 1.7 ml carpule). Epinephrine: 0 mcg.
 *    - Indicated for cardiac patients: ischemic heart disease (ИБС), arterial hypertension (АГ),
 *      cardiac arrhythmias, closed-angle glaucoma, hyperthyroidism, MAOI/tricyclic medication.
 *    - MRD: 4.4 mg/kg (absolute maximum 300 mg). Max for 70 kg: 5 carpules.
 *
 * Invariants:
 * - Mandate 8e: Doctor Autonomy (isBlocking: false, doctorAutonomyBlocked: false).
 * - Soft warning instead of hard lock.
 * - 1-click carpule disposal ready.
 */

import { z } from "zod";
import type { AgentContext } from "../context.js";
import type { ToolDefinition } from "./tool.js";

// ─── ZOD PARAMETER SCHEMA ───────────────────────────────────────────────────

export const calculateAnestheticDosageSchema = z.object({
	patientWeightKg: z
		.number()
		.positive("Масса тела пациента должна быть больше 0")
		.max(300, "Масса тела превышает 300 кг")
		.default(70)
		.optional()
		.describe("Масса тела пациента в килограммах (по умолчанию 70 кг)"),
	anestheticType: z
		.enum(["articaine_1_100000", "articaine_1_200000", "mepivacaine_3_plain", "auto"])
		.default("auto")
		.optional()
		.describe("Тип анестетика: articaine_1_100000, articaine_1_200000, mepivacaine_3_plain или auto"),
	somaticConditions: z
		.array(z.string())
		.default([])
		.optional()
		.describe("Список соматических патологий (гипертония, ИБС, глаукома, беременность)"),
	plannedCarpules: z
		.number()
		.positive("Количество карпул должно быть > 0")
		.max(20)
		.default(1)
		.optional()
		.describe("Планируемое врачом количество карпул для введения"),
	procedureCategory: z
		.string()
		.optional()
		.describe("Категория вмешательства: therapy, endodontics, surgery, hygiene"),
});

export type CalculateAnestheticDosageInput = z.infer<typeof calculateAnestheticDosageSchema>;

export interface CalculateAnestheticDosageResult {
	readonly success: true;
	readonly drugName: string;
	readonly tradeNameSample: string;
	readonly concentrationPercent: number;
	readonly vasoconstrictorRatio: string | null;
	readonly patientWeightKg: number;
	readonly maxDoseMg: number;
	readonly mgPerCarpule: number;
	readonly maxCarpules: number;
	readonly recommendedCarpules: number;
	readonly plannedCarpules: number;
	readonly epinephrineMcgPerCarpule: number;
	readonly totalEpinephrineMcg: number;
	readonly maxSafeEpinephrineMcg: number;
	readonly isCardiovascularRisk: boolean;
	readonly isPregnancy: boolean;
	readonly warning: string | null;
	readonly safeToProceed: true;
	readonly doctorAutonomyBlocked: false;
	readonly formattedSummary: string;
	readonly quickDisposalReady: true;
}

// ─── TOOL DEFINITION ────────────────────────────────────────────────────────

export const calculateAnestheticDosageTool: ToolDefinition<
	typeof calculateAnestheticDosageSchema,
	CalculateAnestheticDosageResult
> = {
	name: "calculate_anesthetic_dosage",
	description:
		"Расчет предельно допустимой и рекомендуемой дозировки местного анестетика по массе тела пациента с проверкой соматического статуса (артикаин 4% 1:100000 / 1:200000, мепивакаин 3% без вазоконстриктора для пациентов с сердечно-сосудистой патологией). Соответствует клиническим протоколам СтАР и Приказу 804н.",
	parameters: calculateAnestheticDosageSchema,
	permissions: ["clinical.read"],
	category: "read",
	handler: async (_ctx: AgentContext, args: CalculateAnestheticDosageInput): Promise<CalculateAnestheticDosageResult> => {
		const weightKg = args.patientWeightKg ?? 70;
		const somatics = (args.somaticConditions ?? []).map((s) => s.toLowerCase());
		const planned = args.plannedCarpules ?? 1;

		// 1. Cardiovascular / Somatic Risk Evaluation
		const hasCardioRisk = somatics.some((s) =>
			/гипертенз|гипертон|\bаг\b|\bгб\b|ибс|ишемич|стенокард|аритми|инфаркт|давлен|глауком|тиреотоксикоз|тахикард|сердечн|\bхсн\b/i.test(
				s,
			),
		);
		const isPregnancy = somatics.some((s) => /беремен/i.test(s));

		// 2. Select appropriate drug
		let selectedType = args.anestheticType ?? "auto";
		let warning: string | null = null;

		if (selectedType === "auto") {
			if (hasCardioRisk) {
				selectedType = "mepivacaine_3_plain";
			} else if (isPregnancy) {
				selectedType = "articaine_1_200000";
			} else {
				selectedType = "articaine_1_100000";
			}
		} else if (hasCardioRisk && selectedType === "articaine_1_100000") {
			warning =
				"ВНИМАНИЕ: У пациента зафиксирована сердечно-сосудистая патология. Рекомендовано переключение на Мепивакаин 3% без вазоконстриктора (Скандонест) либо снижение концентрации адреналина до 1:200 000 (макс. 0.04 мг адреналина / 2 карпулы). Мандат 8e: действие не блокируется.";
		} else if (isPregnancy && selectedType === "articaine_1_100000") {
			warning =
				"ПРЕДОСТЕРЕЖЕНИЕ: Беременность. Рекомендован Артикаин 4% с пониженным содержанием адреналина 1:200 000 (Ультракаин Д-С). Избегать высоких доз вазоконстрикторов.";
		}

		// 3. Drug Pharmacological Constants
		let drugName = "Артикаин 4% с эпинефрином 1:100 000";
		let tradeNameSample = "Ультракаин Д-С форте (1.7 мл)";
		let concentrationPercent = 4;
		let vasoconstrictorRatio: string | null = "1:100 000";
		let mrdMgPerKg = 7.0; // mg/kg
		let absoluteMaxMg = 500; // mg
		let mgPerCarpule = 68; // 40 mg/ml * 1.7 ml
		let epinephrineMcgPerCarpule = 17; // 10 mcg/ml * 1.7 ml
		let maxSafeEpinephrineMcg = hasCardioRisk ? 40 : 200; // 0.04 mg for cardio, 0.2 mg for healthy

		if (selectedType === "articaine_1_200000") {
			drugName = "Артикаин 4% с эпинефрином 1:200 000";
			tradeNameSample = "Ультракаин Д-С / Убистезин (1.7 мл)";
			concentrationPercent = 4;
			vasoconstrictorRatio = "1:200 000";
			mrdMgPerKg = 7.0;
			absoluteMaxMg = 500;
			mgPerCarpule = 68;
			epinephrineMcgPerCarpule = 8.5; // 5 mcg/ml * 1.7 ml
		} else if (selectedType === "mepivacaine_3_plain") {
			drugName = "Мепивакаин 3% без вазоконстриктора";
			tradeNameSample = "Скандонест 3% / Мепивастезин (1.7 мл)";
			concentrationPercent = 3;
			vasoconstrictorRatio = null;
			mrdMgPerKg = 4.4;
			absoluteMaxMg = 300;
			mgPerCarpule = 51; // 30 mg/ml * 1.7 ml
			epinephrineMcgPerCarpule = 0;
			maxSafeEpinephrineMcg = 0;
		}

		// 4. Mathematical Dosage Calculation
		const maxDoseMg = Math.min(Math.round(weightKg * mrdMgPerKg), absoluteMaxMg);
		const maxCarpulesByAnesthetic = Math.floor(maxDoseMg / mgPerCarpule);

		// Epinephrine limit check if vasoconstrictor present
		let maxCarpulesByEpinephrine = 999;
		if (epinephrineMcgPerCarpule > 0 && maxSafeEpinephrineMcg > 0) {
			maxCarpulesByEpinephrine = Math.floor(maxSafeEpinephrineMcg / epinephrineMcgPerCarpule);
		}

		const maxCarpules = Math.max(1, Math.min(maxCarpulesByAnesthetic, maxCarpulesByEpinephrine));
		const recommendedCarpules = Math.min(planned, maxCarpules);
		const totalEpinephrineMcg = recommendedCarpules * epinephrineMcgPerCarpule;

		if (planned > maxCarpules && !warning) {
			warning = `Запланированная доза (${planned} карп.) превышает безопасный предел по массе тела (${maxCarpules} карп. для ${weightKg} кг). Рекомендовано ограничиться ${maxCarpules} карп.`;
		}

		const formattedSummary = [
			`Анестезиологическое пособие: ${drugName}.`,
			`Масса тела: ${weightKg} кг. Предельная доза: ${maxDoseMg} мг (${maxCarpules} карп. по 1.7 мл).`,
			`Рекомендовано к введению: ${recommendedCarpules} карп. (${recommendedCarpules * mgPerCarpule} мг активного вещества).`,
			epinephrineMcgPerCarpule > 0
				? `Адреналин: ${totalEpinephrineMcg} мкг (предел: ${maxSafeEpinephrineMcg} мкг).`
				: `Без вазоконстриктора (кардио-безопасно).`,
			warning ? `ОСОБЫЕ ОТМЕТКИ: ${warning}` : "Соматических противопоказаний нет.",
		].join(" ");

		return {
			success: true,
			drugName,
			tradeNameSample,
			concentrationPercent,
			vasoconstrictorRatio,
			patientWeightKg: weightKg,
			maxDoseMg,
			mgPerCarpule,
			maxCarpules,
			recommendedCarpules,
			plannedCarpules: planned,
			epinephrineMcgPerCarpule,
			totalEpinephrineMcg,
			maxSafeEpinephrineMcg,
			isCardiovascularRisk: hasCardioRisk,
			isPregnancy,
			warning,
			safeToProceed: true,
			doctorAutonomyBlocked: false,
			formattedSummary,
			quickDisposalReady: true,
		};
	},
};
