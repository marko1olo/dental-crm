/**
 * treatmentPlanRedTeamInquisition.test.ts
 *
 * RED TEAM ИНКВИЗИЦИОННЫЙ ТЕСТ: TREATMENT PLANS, PRICING & COMMERCIAL ESTIMATES
 *
 * Проверяемые инварианты (The Hammer Master Prompt & Mandates 8c, 8e, 8k, 8n):
 * 1. Изоляция Dual-Mode (Mandates 8c & 8k):
 *    - При пустой одонтограмме в production (!isDemoShowcaseMode()) генератор этапов
 *      возвращает честные пустые этапы без подмешивания синтетических кариесов 16/26.
 *    - В demo режиме (isDemoShowcaseMode(true)) формируется полный 3-уровневый клинический showcase.
 * 2. Копеечно-точная математика и финансовые расчеты (Мандаты 8b, 8e, 8n):
 *    - Расчет социального вычета 13% НДФЛ: лимит 150 000 ₽ (макс 19 500 ₽) для кода 01
 *      и неограниченный вычет для кода 02 (дорогостоящее лечение).
 *    - Расчет 0% рассрочки (3, 6, 12, 24 мес): деление без потери копеек,
 *      сумма долей строго равна исходной сумме до копейки.
 *    - Применение скидки врача (0-100%): при 100% скидке цена обнуляется.
 * 3. Отсутствие мультяшных эмодзи в медицинских и печатных формах (Святость бланков):
 *    - В файлах компонентов планов лечения отсутствуют запрещенные эмодзи (💡, 📋, ⭐, etc.).
 * 4. Персистенция и гидратация этапов (Mandate 8f):
 *    - buildStagesFromPlanItems корректно восстанавливает клинические этапы из плоских
 *      записей БД (PostgreSQL 18 treatment_plan_items), группирует по phase и сохраняет копейки.
 */

import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { type Kopecks, parseKopecks, sumKopecks } from "@dental/shared";
import type { ToothData } from "../components/odontogram/ToothChart";
import {
	generateTierPlanStages,
	getDefaultClinicalPresetStages,
} from "../components/treatment-plans/treatmentPlanTierStagesGenerator";
import {
	calculateChairsideInstallments,
	calculateChairsideTaxDeduction,
	applyDoctorDiscountToStages,
	calculateStageTotals,
	calculatePlanStagesTotals,
} from "../components/treatment-plans/treatmentPlanMath";
import { buildStagesFromPlanItems } from "../components/treatment-plans/treatmentPlanPersistenceEngine";
import type { TreatmentPlanStage } from "../components/treatment-plans/types";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("Treatment Plan Red Team Inquisition (8c, 8e, 8k, 8n)", () => {
	describe("1. Dual-Mode Isolation (Mandates 8c & 8k)", () => {
		it("in production mode without tooth defects, generates clean empty stages without synthetic bleed", () => {
			const healthyTeeth: ToothData[] = [
				{ toothNumber: 11, state: "Healthy" },
				{ toothNumber: 12, state: "Healthy" },
				{ toothNumber: 16, state: "Healthy" },
				{ toothNumber: 26, state: "Healthy" },
			];

			// options.isDemoMode = false (Production mode)
			const stages = generateTierPlanStages("standard", healthyTeeth, undefined, 0, { isDemoMode: false });

			expect(stages).toHaveLength(3);
			// В проде при отсутствии патологий все этапы должны быть пустыми (0 процедур)
			const totalProcedures = stages.reduce((acc, s) => acc + s.items.length, 0);
			expect(totalProcedures).toBe(0);

			for (const stage of stages) {
				expect(stage.items).toEqual([]);
				expect(stage.totalRub).toBe(0);
				expect(stage.totalKopecks).toBe(0);
			}
		});

		it("in demo showcase mode without tooth defects, generates rich 3-tier clinical showcase", () => {
			const emptyTeeth: ToothData[] = [];

			// options.isDemoMode = true (Demo mode)
			const stages = generateTierPlanStages("standard", emptyTeeth, undefined, 0, { isDemoMode: true });

			expect(stages).toHaveLength(3);
			const totalProcedures = stages.reduce((acc, s) => acc + s.items.length, 0);
			expect(totalProcedures).toBeGreaterThan(0);

			// Должна присутствовать гигиена и диагностика
			const itemNames = stages.flatMap((s) => s.items.map((p) => p.name));
			expect(itemNames.some((t) => t.toLowerCase().includes("гигиен") || t.toLowerCase().includes("кт"))).toBe(true);
		});

		it("supports all 3 tiers in demo presets (economy, standard, optimal)", () => {
			const eco = getDefaultClinicalPresetStages("economy", undefined, 0, { isDemoMode: true });
			const std = getDefaultClinicalPresetStages("standard", undefined, 0, { isDemoMode: true });
			const opt = getDefaultClinicalPresetStages("optimum", undefined, 0, { isDemoMode: true });

			expect(eco).toHaveLength(3);
			expect(std).toHaveLength(3);
			expect(opt).toHaveLength(3);

			const ecoRub = eco.reduce((acc, s) => acc + s.totalRub, 0);
			const optRub = opt.reduce((acc, s) => acc + s.totalRub, 0);

			// Оптимальный (премиум) всегда технологичнее и дороже эконома
			expect(optRub).toBeGreaterThan(ecoRub);
		});
	});

	describe("2. Kopeck-Exact Financial Math & Deductions (Mandates 8b, 8e, 8n)", () => {
		it("calculates 13% NDFL tax deduction with strict 150 000 ₽ limit for Code 01", () => {
			// Лечение на 200 000 ₽ (20 000 000 коп)
			const costKopecks = (200000 * 100) as Kopecks;
			const deductionStandard = calculateChairsideTaxDeduction(costKopecks, false);

			// База должна быть ограничена 150 000 ₽ (15 000 000 коп)
			expect(deductionStandard.code).toBe("01");
			expect(deductionStandard.baseKopecks).toBe(15000000);
			expect(deductionStandard.annualLimitRub).toBe(150000);
			// 13% от 150 000 = 19 500 ₽
			expect(deductionStandard.refundRub).toBe(19500);
			expect(deductionStandard.isHighCostCode02).toBe(false);
		});

		it("calculates 13% NDFL tax deduction without cap for Code 02 (high-cost surgery/implants)", () => {
			// Дорогостоящее лечение на 600 000 ₽ (60 000 000 коп)
			const costKopecks = (600000 * 100) as Kopecks;
			const deductionHighCost = calculateChairsideTaxDeduction(costKopecks, true);

			// База равна всей сумме без ограничений
			expect(deductionHighCost.code).toBe("02");
			expect(deductionHighCost.baseKopecks).toBe(60000000);
			expect(deductionHighCost.annualLimitRub).toBeUndefined();
			// 13% от 600 000 = 78 000 ₽
			expect(deductionHighCost.refundRub).toBe(78000);
			expect(deductionHighCost.isHighCostCode02).toBe(true);
		});

		it("calculates 0% chairside installments across 3, 6, 12, 24 months with exact sum preservation", () => {
			// Неделимая нацело сумма: 100 000.17 ₽ (10 000 017 коп)
			const oddTotalKopecks = 10000017 as Kopecks;
			const plans = calculateChairsideInstallments(oddTotalKopecks);

			const monthsList = [3, 6, 12, 24] as const;
			for (const months of monthsList) {
				const plan = plans[months];
				expect(plan.months).toBe(months);
				expect(plan.partsKopecks).toHaveLength(months);

				// Сумма долей обязана строго равняться исходной сумме до копейки
				const sumParts = sumKopecks(plan.partsKopecks);
				expect(sumParts).toBe(oddTotalKopecks);
			}
		});

		it("applies doctor discount (0-100%) cleanly with full doctor autonomy (Mandate 8e)", () => {
			const mockStages: TreatmentPlanStage[] = [
				{
					stageNumber: 1,
					stageKind: "stage_1_therapy",
					title: "Терапия",
					subtitle: "Санация",
					clinicalGoal: "Санация",
					totalKopecks: 1000000 as Kopecks,
					totalRub: 10000,
					estimatedWeeks: 1,
					estimatedVisits: 1,
					order804nCodes: ["A16.07.002"],
					items: [
						{
							id: "item-1",
							name: "Пломба",
							category: "Терапия",
							code804n: "A16.07.002",
							unitPriceRub: 10000,
							quantity: 1,
							discountRub: 0,
							priceRub: 10000,
							phase: 1,
							stageKind: "stage_1_therapy",
							fromCatalog: true,
							status: "planned",
						},
					],
				},
			];

			// 20% скидка
			const discounted20 = applyDoctorDiscountToStages(mockStages, 20);
			expect(discounted20[0]!.items[0]!.discountRub).toBe(2000);
			expect(discounted20[0]!.items[0]!.priceRub).toBe(8000);
			expect(discounted20[0]!.totalRub).toBe(8000);

			// 100% скидка (клиническая гарантия)
			const discounted100 = applyDoctorDiscountToStages(mockStages, 100);
			expect(discounted100[0]!.items[0]!.discountRub).toBe(10000);
			expect(discounted100[0]!.items[0]!.priceRub).toBe(0);
			expect(discounted100[0]!.totalRub).toBe(0);
		});
	});

	describe("3. Zero Cartoon Emojis In Medical & Print Forms (UI Sanity)", () => {
		it("ensures critical treatment-plans UI files do not contain forbidden cartoon emojis", () => {
			const targetFiles = [
				"TreatmentPlanPresenterModal.tsx",
				"TreatmentPlanPresenterPrintView.tsx",
				"TreatmentPlanPresenterAiAuditTab.tsx",
				"TreatmentPlan3TierComparison.tsx",
				"TreatmentPlan3TierToolbar.tsx",
				"TreatmentPlanRoadmap.tsx",
			];

			const basePath = path.resolve(__dirname, "../components/treatment-plans");
			const forbiddenEmojiRegex = /[\u{1F300}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

			for (const file of targetFiles) {
				const fullPath = path.join(basePath, file);
				if (!fs.existsSync(fullPath)) continue;

				const content = fs.readFileSync(fullPath, "utf8");
				// Разрешенные глифы (символы типографики): ✓ (U+2713), ₽ (U+20BD), • (U+2022)
				const sanitizedContent = content
					.replace(/✓/g, "")
					.replace(/₽/g, "")
					.replace(/•/g, "")
					.replace(/—/g, "")
					.replace(/–/g, "");

				const match = sanitizedContent.match(forbiddenEmojiRegex);
				expect(match).toBeNull();
			}
		});
	});

	describe("4. Persistence & Hydration Parity (Mandate 8f)", () => {
		it("reconstitutes structured stages and kopecks from flat PostgreSQL treatment_plan_items", () => {
			const rawDbItems = [
				{
					id: "db-1",
					phase: 1,
					code804n: "A16.07.002",
					name: "Восстановление зуба пломбой",
					unitPriceRub: 5000,
					quantity: 1,
					discountRub: 500,
					toothNumber: 16,
					isCompleted: true,
				},
				{
					id: "db-2",
					phase: 2,
					code804n: "A16.07.006",
					name: "Установка дентального имплантата",
					unitPriceRub: 35000,
					quantity: 1,
					discountRub: 0,
					toothNumber: 26,
					isCompleted: false,
				},
			];

			const stages = buildStagesFromPlanItems(rawDbItems);
			expect(stages).toHaveLength(2);

			// Этап 1: Терапия
			expect(stages[0]!.stageNumber).toBe(1);
			expect(stages[0]!.stageKind).toBe("stage_1_therapy");
			expect(stages[0]!.items).toHaveLength(1);
			expect(stages[0]!.items[0]!.priceRub).toBe(4500); // 5000 - 500
			expect(stages[0]!.totalKopecks).toBe(450000);
			expect(stages[0]!.totalRub).toBe(4500);
			expect(stages[0]!.status).toBe("completed");

			// Этап 2: Хирургия
			expect(stages[1]!.stageNumber).toBe(2);
			expect(stages[1]!.stageKind).toBe("stage_2_surgery");
			expect(stages[1]!.items).toHaveLength(1);
			expect(stages[1]!.items[0]!.priceRub).toBe(35000);
			expect(stages[1]!.totalKopecks).toBe(3500000);
			expect(stages[1]!.totalRub).toBe(35000);
			expect(stages[1]!.status).toBe("agreed");
		});

		it("handles empty database records safely", () => {
			expect(buildStagesFromPlanItems([])).toEqual([]);
			expect(buildStagesFromPlanItems(undefined as any)).toEqual([]);
		});
	});
});
