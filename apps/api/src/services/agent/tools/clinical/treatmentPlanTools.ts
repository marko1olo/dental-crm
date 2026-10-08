/**
 * @file treatmentPlanTools.ts
 * @description Layer 2: 3-tier treatment plan generator (Economy, Optimum, Premium) with Order 804n integer kopecks.
 */

import { calculateSingleTierEstimate, PLAN_TIER_CONFIGS } from "@dental/shared";
import { z } from "zod";
import type { ToolDefinition } from "../tool.js";

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
					.describe(
						"Код диагноза МКБ-10 (например, 'K02.1', 'K04.0', 'K04.5', 'K08.1', 'K05.3')",
					),
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
		.max(100)
		.optional()
		.default(0)
		.describe(
			"Процент скидки врача (0–100%, свобода скидок на переделки и персонал)",
		),
	installmentMonths: z
		.enum(["3", "6", "12", "24"])
		.optional()
		.default("6")
		.describe("Срок беспроцентной рассрочки в месяцах"),
	doctorFullName: z
		.string()
		.optional()
		.describe("ФИО лечащего врача / куратора плана"),
	patientFullName: z.string().optional().describe("ФИО пациента"),
});

export const suggestTreatmentPlanTool: ToolDefinition<
	typeof suggestTreatmentPlanSchema
> = {
	name: "suggest_treatment_plan",
	description:
		"Генератор 3-уровневого комплексного плана лечения (Эконом / Оптимум / Премиум) с разбивкой на 3 клинических этапа (Терапия, Хирургия, Ортопедия), услугами и расчетом в целочисленных копейках.",
	parameters: suggestTreatmentPlanSchema,
	permissions: ["clinical.read"],
	category: "read",
	handler: async (_ctx, args) => {
		// biome-ignore lint/suspicious/noExplicitAny: Raw item types for estimate engine
		const rawItemsEconomy: any[] = [];
		// biome-ignore lint/suspicious/noExplicitAny: Raw item types for estimate engine
		const rawItemsOptimum: any[] = [];
		// biome-ignore lint/suspicious/noExplicitAny: Raw item types for estimate engine
		const rawItemsPremium: any[] = [];

		for (const c of args.clinicalCases) {
			const toothNum =
				typeof c.toothNumber === "string"
					? parseInt(c.toothNumber, 10)
					: c.toothNumber;
			const validTooth = !Number.isNaN(toothNum) ? toothNum : 16;
			const icd = (c.icd10Code || "K02.1").trim().toUpperCase();
			const customNotes = c.notes ? ` (${c.notes})` : "";

			// 1. Stage 1: Therapy & Endodontics
			if (icd.startsWith("K04")) {
				// Economy: standard endo
				rawItemsEconomy.push({
					toothNumber: validTooth,
					code804n: "A16.07.008.001",
					nameRu: `Эндодонтическое лечение зуба ${validTooth} (гуттаперча + силер)`,
					categoryRu: "Терапевтическая стоматология",
					stageKind: "stage_1_therapy",
					tierKey: "economy",
					unitPriceKopecks: 650000,
					materialNameRu: "Гуттаперчевые штифты + эпоксидный силер",
				});

				// Optimum: ultrasonic irrigation + nanohybrid
				rawItemsOptimum.push({
					toothNumber: validTooth,
					code804n: "A16.07.008.003",
					nameRu: `Эндодонтическое лечение зуба ${validTooth} с УЗ-активацией и нанореставрацией`,
					categoryRu: "Терапевтическая стоматология",
					stageKind: "stage_1_therapy",
					tierKey: "optimum",
					unitPriceKopecks: 1250000,
					materialNameRu:
						"Ротационные Ni-Ti инструменты + биокерамический силер + нанокомпозит",
				});

				// Premium: microscopic stratigraphy + 3D obturation
				rawItemsPremium.push({
					toothNumber: validTooth,
					code804n: "A16.07.008.004",
					nameRu: `Микроскопное эндодонтическое лечение зуба ${validTooth} с 3D-обтурацией${customNotes}`,
					categoryRu: "Терапевтическая стоматология",
					stageKind: "stage_1_therapy",
					tierKey: "premium",
					unitPriceKopecks: 2150000,
					materialNameRu:
						"Операционный микроскоп, 3D термопластифицированная гуттаперча, высокоэстетичный композит",
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
					materialNameRu:
						"Антисептический гемостатический материал, шовный материал",
				});
				rawItemsEconomy.push({
					toothNumber: validTooth,
					code804n: "A16.07.054",
					nameRu: `Установка дентального имплантата (стандартный титановый ряд)`,
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
					nameRu: `Установка дентального имплантата с микротекстурированной SLA-поверхностью`,
					categoryRu: "Хирургическая стоматология",
					stageKind: "stage_2_surgery",
					tierKey: "optimum",
					unitPriceKopecks: 4200000,
					materialNameRu:
						"Имплантат с микропористой поверхностью ускоренной остеоинтеграции, формирователь десны",
					isHighCostCode02: true,
				});

				// Premium: Hydrophilic implant + bone augmentation
				rawItemsPremium.push({
					toothNumber: validTooth,
					code804n: "A16.07.054",
					nameRu: `Установка премиального гидрофильного имплантата с остеопластикой${customNotes}`,
					categoryRu: "Хирургическая стоматология",
					stageKind: "stage_2_surgery",
					tierKey: "premium",
					unitPriceKopecks: 7800000,
					materialNameRu:
						"Гидрофильный имплантат высшей категории, костнопластический остеоиндуктивный биоматериал, коллагеновая мембрана",
					isHighCostCode02: true,
				});

				// Stage 3: Orthopedics
				rawItemsEconomy.push({
					toothNumber: validTooth,
					code804n: "A16.07.004",
					nameRu: `Восстановление зуба металлокерамической коронкой на импланте`,
					categoryRu: "Ортопедическая стоматология",
					stageKind: "stage_3_orthopedics",
					tierKey: "economy",
					unitPriceKopecks: 1800000,
					materialNameRu: "Металлокерамика Co-Cr биосовместимая",
				});
				rawItemsOptimum.push({
					toothNumber: validTooth,
					code804n: "A16.07.005",
					nameRu: `Восстановление зуба цельноанатомической коронкой из диоксида циркония на импланте`,
					categoryRu: "Ортопедическая стоматология",
					stageKind: "stage_3_orthopedics",
					tierKey: "optimum",
					unitPriceKopecks: 3200000,
					materialNameRu:
						"Транслюцентный диоксид циркония / прессованная стеклокерамика",
				});
				rawItemsPremium.push({
					toothNumber: validTooth,
					code804n: "A16.07.005",
					nameRu: `Цельнокерамическая высокоэстетичная коронка на индивидуальном циркониевом абатменте CAD/CAM${customNotes}`,
					categoryRu: "Ортопедическая стоматология",
					stageKind: "stage_3_orthopedics",
					tierKey: "premium",
					unitPriceKopecks: 5400000,
					materialNameRu:
						"Многослойный высокопрозрачный диоксид циркония, индивидуальный CAD/CAM абатмент",
				});
			} else {
				// Caries / General therapy
				rawItemsEconomy.push({
					toothNumber: validTooth,
					code804n: "A16.07.002.001",
					nameRu: `Восстановление зуба ${validTooth} светоотверждаемым композитом`,
					categoryRu: "Терапевтическая стоматология",
					stageKind: "stage_1_therapy",
					tierKey: "economy",
					unitPriceKopecks: 420000,
					materialNameRu: "Микрогибридный композит светового отверждения",
				});
				rawItemsOptimum.push({
					toothNumber: validTooth,
					code804n: "A16.07.002.002",
					nameRu: `Анатомическая эстетическая реставрация зуба ${validTooth} нанокомпозитом`,
					categoryRu: "Терапевтическая стоматология",
					stageKind: "stage_1_therapy",
					tierKey: "optimum",
					unitPriceKopecks: 650000,
					materialNameRu:
						"Наногибридный реставрационный композит высокой полируемости",
				});
				rawItemsPremium.push({
					toothNumber: validTooth,
					code804n: "A16.07.003",
					nameRu: `Керамическая вкладка / накладка (Inlay/Onlay) зуба ${validTooth}${customNotes}`,
					categoryRu: "Ортопедическая стоматология",
					stageKind: "stage_3_orthopedics",
					tierKey: "premium",
					unitPriceKopecks: 1850000,
					materialNameRu:
						"Прессованная керамика высокой точности краевого прилегания",
				});
			}
		}

		const discount = args.discountPercent || 0;
		const installmentMonthsNum = (parseInt(args.installmentMonths || "6", 10) ||
			6) as 3 | 6 | 12 | 24;

		const tierEstimateEconomy = calculateSingleTierEstimate(
			"economy",
			rawItemsEconomy,
		);
		const tierEstimateOptimum = calculateSingleTierEstimate(
			"optimum",
			rawItemsOptimum,
		);
		const tierEstimatePremium = calculateSingleTierEstimate(
			"premium",
			rawItemsPremium,
		);

		const installmentEco = tierEstimateEconomy.installments[
			installmentMonthsNum
		] || {
			monthlyPaymentRu: `${Math.round(tierEstimateEconomy.totalCostKopecks / (installmentMonthsNum * 100)).toLocaleString("ru-RU")} ₽`,
			monthlyPaymentKopecks: Math.round(
				tierEstimateEconomy.totalCostKopecks / installmentMonthsNum,
			),
		};
		const installmentOpt = tierEstimateOptimum.installments[
			installmentMonthsNum
		] || {
			monthlyPaymentRu: `${Math.round(tierEstimateOptimum.totalCostKopecks / (installmentMonthsNum * 100)).toLocaleString("ru-RU")} ₽`,
			monthlyPaymentKopecks: Math.round(
				tierEstimateOptimum.totalCostKopecks / installmentMonthsNum,
			),
		};
		const installmentPrem = tierEstimatePremium.installments[
			installmentMonthsNum
		] || {
			monthlyPaymentRu: `${Math.round(tierEstimatePremium.totalCostKopecks / (installmentMonthsNum * 100)).toLocaleString("ru-RU")} ₽`,
			monthlyPaymentKopecks: Math.round(
				tierEstimatePremium.totalCostKopecks / installmentMonthsNum,
			),
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
						refundRub: Math.round(
							tierEstimateEconomy.ndflDeduction.refundKopecks / 100,
						),
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
						refundRub: Math.round(
							tierEstimateOptimum.ndflDeduction.refundKopecks / 100,
						),
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
						refundRub: Math.round(
							tierEstimatePremium.ndflDeduction.refundKopecks / 100,
						),
						formattedRefundRu: tierEstimatePremium.ndflDeduction.refundRu,
					},
					keyAdvantages: PLAN_TIER_CONFIGS.premium.keyAdvantagesRu,
				},
			},
		};
	},
};
