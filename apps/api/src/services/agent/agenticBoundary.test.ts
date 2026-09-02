/**
 * agenticBoundary.test.ts — Unit & Integration tests for Agentic Boundary, B2C Medical Translator, and Deterministic Patient Scoring.
 *
 * Tests:
 * 1. Strict Agentic Boundary & Deterministic Math (estimateTool):
 *    - Absence of LLM arithmetic / 100% deterministic code calculations.
 *    - Automatic base price resolution when basePriceRub is omitted.
 *    - 3-tier parallel pricing (Economy 0.85x, Optimum 1.0x, Premium 1.4x).
 *    - 13% NDFL tax deduction per FNS Form KND 1151156 (Code 01 social limit 150k vs Code 02 expensive).
 *    - 0% installment plans for 3, 6, 12, 24 months with exact Decimal.js precision.
 * 2. B2C Medical Translator (b2cTranslator):
 *    - 804n nomenclature translation to patient-friendly Russian.
 *    - Heuristic clinical term and FDI tooth localization translation.
 * 3. Deterministic Patient Scoring (patientScoring):
 *    - Exact LTV and average check calculation.
 *    - No-show and cancellation rate (%).
 *    - Compliance index (0–100).
 *    - 4-tier sentiment status ("🟢 VIP / Лояльный", "🔵 Стандартный", "🟡 Внимание: Риск отмены", "🔴 Осторожно: Требуется строгое ИДС").
 */

import assert from "node:assert";
import { describe, test } from "node:test";
import {
	formatFdiToothLocalization,
	translateClinicalTermToB2c,
	translateTreatmentItemToRichStep,
	translateTreatmentPlanToPatientLanguage,
} from "./b2cTranslator.js";
import type { AgentContext } from "./context.js";
import {
	calculatePatientScoring,
	type PatientScoringRawData,
} from "./patientScoring.js";
import { registerClinicalTools } from "./tools/clinicalTools.js";
import {
	calculateTier,
	calculateTreatmentEstimateTool,
	resolveStandardCatalogPrice,
} from "./tools/estimateTool.js";
import { ToolRegistry } from "./tools/registry.js";

const ORG_ID = "00000000-0000-7000-8000-000000000001";
const CLINIC_ID = "00000000-0000-7000-8000-000000000002";
const USER_ID = "00000000-0000-7000-8000-000000000003";

function createMockContext(overrides: Partial<AgentContext> = {}): AgentContext {
	const registry = new ToolRegistry();
	registerClinicalTools(registry, "clinical");

	return {
		organizationId: ORG_ID,
		clinicId: CLINIC_ID,
		userId: USER_ID,
		sessionId: `test-session-${Math.random().toString(36).slice(2)}`,
		mode: "autonomous",
		permissions: [
			"patients.read",
			"clinical.read",
			"clinical.write",
			"billing.read",
			"billing.write",
		],
		tools: registry,
		db: null,
		...overrides,
	};
}

// ───────────────────────────────────────────────────────────────────────────
// 1. AGENTIC BOUNDARY & ESTIMATE TOOL TESTS
// ───────────────────────────────────────────────────────────────────────────

describe("Agentic Boundary: estimateTool & Deterministic Math", () => {
	test("automatically resolves base prices from standard 804n catalog when basePriceRub is omitted", async () => {
		const ctx = createMockContext();

		// Items without basePriceRub passed (simulating LLM requesting calculation without inventing price)
		const items = [
			{
				toothCode: 16,
				serviceName: "Восстановление зуба пломбой",
				nomenclatureCode: "A16.07.002",
				quantity: 1,
			},
			{
				toothCode: 46,
				serviceName: "Внутрикостная дентальная имплантация",
				nomenclatureCode: "A16.07.054",
				quantity: 1,
			},
			{
				toothCode: 46,
				serviceName: "Восстановление зуба коронкой постоянной",
				nomenclatureCode: "A16.07.004",
				quantity: 1,
			},
		];

		// biome-ignore lint/suspicious/noExplicitAny: Handler test output inspection
		const result = (await calculateTreatmentEstimateTool.handler(ctx, {
			items,
			discountPercent: 0,
		})) as any;

		assert.strictEqual(result.itemsCount, 3);

		// Optimum Tier: A16.07.002 (10,000 ₽) + A16.07.054 (50,000 ₽) + A16.07.004 (40,000 ₽) = 100,000 ₽
		const optimum = result.tiers.optimum;
		assert.strictEqual(optimum.grossTotalRub, 100000);
		assert.strictEqual(optimum.totalRub, 100000);
		assert.strictEqual(optimum.totalKopecks, 10000000);

		// Economy Tier: 100,000 * 0.85 = 85,000 ₽
		const economy = result.tiers.economy;
		assert.strictEqual(economy.grossTotalRub, 85000);
		assert.strictEqual(economy.totalRub, 85000);
		assert.strictEqual(economy.totalKopecks, 8500000);

		// Premium Tier: 100,000 * 1.40 = 140,000 ₽
		const premium = result.tiers.premium;
		assert.strictEqual(premium.grossTotalRub, 140000);
		assert.strictEqual(premium.totalRub, 140000);
		assert.strictEqual(premium.totalKopecks, 14000000);
	});

	test("calculates exact Decimal.js math for discounts, labor/materials, 13% NDFL, and installments", () => {
		const rawItems = [
			{
				toothCode: 26,
				serviceName: "Лечение кариеса",
				nomenclatureCode: "A16.07.002",
				basePriceRub: 12500.5,
				category: "Терапия",
				quantity: 2,
			},
		];

		// Total base = 12500.50 * 2 = 25001.00 ₽
		// 15% discount
		const optimum = calculateTier("optimum", rawItems, 15);

		// Gross: 25001 ₽
		assert.strictEqual(optimum.grossTotalRub, 25001);
		// Discount: 25001 * 0.15 = 3750.15 ₽
		assert.strictEqual(optimum.discountRub, 3750.15);
		// Net: 25001 - 3750.15 = 21250.85 ₽
		assert.strictEqual(optimum.totalRub, 21250.85);
		assert.strictEqual(optimum.totalKopecks, 2125085);

		// Items kopecks exactness (1 item with quantity = 2)
		assert.strictEqual(optimum.items.length, 1);
		assert.strictEqual(optimum.items[0]!.grossKopecks, 2500100);
		assert.strictEqual(optimum.items[0]!.discountKopecks, 375015);
		assert.strictEqual(optimum.items[0]!.netKopecks, 2125085);

		// Stages kopecks exactness
		const therapyStage = optimum.stages[0]!;
		assert.strictEqual(therapyStage.grossKopecks, 2500100);
		assert.strictEqual(therapyStage.discountKopecks, 375015);
		assert.strictEqual(therapyStage.netKopecks, 2125085);

		// Labor vs Materials split (laborRatio = 0.60 for optimum)
		// 21250.85 * 0.60 = 12750.51 ₽
		assert.strictEqual(optimum.laborRub, 12750.51);
		// 21250.85 - 12750.51 = 8500.34 ₽
		assert.strictEqual(optimum.materialsRub, 8500.34);
		assert.strictEqual(optimum.laborRub + optimum.materialsRub, 21250.85);

		// Tax deduction (Code 01 under 150k limit): 21250.85 * 0.13 = 2762.61 ₽
		assert.strictEqual(optimum.taxDeduction.code01RefundRub, 2762.61);
		assert.strictEqual(optimum.taxDeduction.totalTaxRefundRub, 2762.61);
		assert.strictEqual(optimum.taxDeduction.netCostAfterTaxRefundRub, 18488.24);

		// 0% Installments division
		assert.strictEqual(optimum.installments.months3.months, 3);
		assert.strictEqual(optimum.installments.months3.monthlyPaymentRub, 7083.62); // 21250.85 / 3 = 7083.6166... -> 7083.62
		assert.strictEqual(optimum.installments.months6.monthlyPaymentRub, 3541.81); // 21250.85 / 6 = 3541.8083... -> 3541.81
		assert.strictEqual(optimum.installments.months12.monthlyPaymentRub, 1770.9); // 21250.85 / 12 = 1770.9041... -> 1770.90
		assert.strictEqual(optimum.installments.months24.monthlyPaymentRub, 885.45); // 21250.85 / 24 = 885.4520... -> 885.45
	});

	test("correctly applies Code 01 social limit vs Code 02 expensive unlimited NDFL deduction", () => {
		const expensiveItems = [
			{
				toothCode: 36,
				serviceName: "Внутрикостная дентальная имплантация",
				nomenclatureCode: "A16.07.054", // High cost Code 02
				basePriceRub: 300000,
				category: "Имплантация",
				quantity: 1,
			},
			{
				toothCode: 11,
				serviceName: "Лечение кариеса",
				nomenclatureCode: "A16.07.002", // Standard Code 01
				basePriceRub: 200000,
				category: "Терапия",
				quantity: 1,
			},
		];

		const optimum = calculateTier("optimum", expensiveItems, 0);

		// Code 01 Base = 200,000 ₽ (Exceeds 150,000 ₽ limit -> Capped at 150,000 ₽ -> Refund = 19,500 ₽)
		assert.strictEqual(optimum.taxDeduction.code01StandardBaseRub, 200000);
		assert.strictEqual(optimum.taxDeduction.code01CappedEligibleBaseRub, 150000);
		assert.strictEqual(optimum.taxDeduction.code01RefundRub, 19500);

		// Code 02 Base = 300,000 ₽ (Unlimited -> Refund = 300,000 * 0.13 = 39,000 ₽)
		assert.strictEqual(optimum.taxDeduction.code02ExpensiveBaseRub, 300000);
		assert.strictEqual(optimum.taxDeduction.code02RefundRub, 39000);

		// Total refund = 19,500 + 39,000 = 58,500 ₽
		assert.strictEqual(optimum.taxDeduction.totalTaxRefundRub, 58500);
		assert.strictEqual(optimum.taxDeduction.netCostAfterTaxRefundRub, 500000 - 58500);
	});

	test("resolves catalog price by clinical keyword matching", () => {
		const resImpl = resolveStandardCatalogPrice(undefined, "Установка импланта Osstem");
		assert.ok(resImpl);
		assert.strictEqual(resImpl.code, "A16.07.054");
		assert.strictEqual(resImpl.priceRub, 50000);

		const resCrown = resolveStandardCatalogPrice(undefined, "Керамическая коронка e.max");
		assert.ok(resCrown);
		assert.strictEqual(resCrown.code, "A16.07.004");
		assert.strictEqual(resCrown.priceRub, 40000);

		const resHyg = resolveStandardCatalogPrice(undefined, "Профессиональная чистка зубов AirFlow");
		assert.ok(resHyg);
		assert.strictEqual(resHyg.code, "A16.07.051");
		assert.strictEqual(resHyg.priceRub, 7000);
	});
});

// ───────────────────────────────────────────────────────────────────────────
// 2. B2C MEDICAL TRANSLATOR TESTS
// ───────────────────────────────────────────────────────────────────────────

describe("B2C Medical Translator: translateTreatmentPlanToPatientLanguage", () => {
	test("translates 804n nomenclature codes into patient-friendly Russian with tooth localization", async () => {
		const items = [
			{
				code: "A16.07.002",
				title: "Восстановление зуба пломбой I, II, III класс по Блэку",
				toothCode: 16,
			},
			{
				code: "A16.07.054",
				title: "Внутрикостная дентальная имплантация системы Dentium",
				toothCode: 46,
			},
			{
				code: "A16.07.051",
				title: "Профессиональная гигиена полости рта и зубов",
			},
		];

		const translated = await translateTreatmentPlanToPatientLanguage(items);

		assert.strictEqual(translated.length, 3);

		const step0 = translated[0]!;
		const step1 = translated[1]!;
		const step2 = translated[2]!;

		// Step 1: Caries treatment on tooth 16
		assert.ok(step0.stepName.includes("Лечение кариеса"));
		assert.ok(step0.stepName.includes("Зуб 16"));
		assert.ok(step0.stepName.includes("верхний правый первый моляр"));
		assert.ok(step0.patientDescription.includes("Деликатное очищение зуба"));
		assert.ok(step0.patientDescription.includes("светоотверждаемым нанокомпозитом"));

		// Step 2: Implant on tooth 46
		assert.ok(step1.stepName.includes("Установка дентального имплантата"));
		assert.ok(step1.stepName.includes("Зуб 46"));
		assert.ok(
			step1.stepName.includes("нижний правый первый моляр") ||
			step1.stepName.includes("правый нижний первый моляр")
		);
		assert.ok(step1.patientDescription.includes("титанового биосовместимого имплантата"));

		// Step 3: Hygiene
		assert.ok(step2.stepName.includes("Комплексная профессиональная гигиена"));
		assert.ok(step2.patientDescription.includes("ультразвуковое удаление"));
		assert.ok(step2.patientDescription.includes("AirFlow"));
	});

	test("translates custom clinical terms via heuristic fallback", () => {
		const term1 = translateClinicalTermToB2c("Сложное депульпирование и лечение периодонтита", "Эндодонтия");
		assert.strictEqual(term1.stepName, "Лечение корневых каналов зуба (эндодонтия)");
		assert.ok(term1.patientDescription.includes("корневых каналов"));

		const term2 = translateClinicalTermToB2c("Синус-лифтинг открытый с мембраной Bio-Gide", "Хирургия");
		assert.strictEqual(term2.stepName, "Наращивание костной ткани (синус-лифтинг / остеопластика)");
		assert.ok(term2.patientDescription.includes("объема") && term2.patientDescription.includes("кости"));

		const term3 = translateClinicalTermToB2c("Фиксация керамического винира E.max", "Ортопедия");
		assert.strictEqual(term3.stepName, "Установка эстетического винира / керамической вкладки");
		assert.ok(term3.patientDescription.includes("тонкой керамической накладки"));

		// Critical precedence tests: removals and consultations MUST NOT be hijacked by noun keywords
		const crownRemoval = translateClinicalTermToB2c("Снятие старой коронки и распил", "Ортопедия");
		assert.strictEqual(crownRemoval.stepName, "Снятие старой ортопедической конструкции");
		assert.ok(crownRemoval.patientDescription.includes("снятие изношенной или негерметичной коронки"));

		const sutureRemoval = translateClinicalTermToB2c("Снятие послеоперационных швов", "Хирургия");
		assert.strictEqual(sutureRemoval.stepName, "Снятие послеоперационных швов");

		const implantConsult = translateClinicalTermToB2c("Первичная консультация по имплантации и протезированию", "Консультация");
		assert.strictEqual(implantConsult.stepName, "Консультация и клиническая диагностика");
	});

	test("formats FDI tooth localization across quadrants and primary teeth correctly", () => {
		assert.strictEqual(formatFdiToothLocalization(11), "Зуб 11 (верхний правый центральный резец — зона улыбки)");
		assert.strictEqual(formatFdiToothLocalization(21), "Зуб 21 (верхний левый центральный резец — зона улыбки)");
		assert.strictEqual(formatFdiToothLocalization(36), "Зуб 36 (нижний левый первый моляр)");
		assert.strictEqual(formatFdiToothLocalization(48), "Зуб 48 (нижний правый третий моляр / зуб мудрости)");
		assert.strictEqual(formatFdiToothLocalization(55), "Временный (молочный) зуб 55");
		assert.strictEqual(formatFdiToothLocalization(null), "Полость рта / общий этап");
	});

	test("generates rich step structure with tips, category, and visit count", () => {
		const rich = translateTreatmentItemToRichStep({
			code: "A16.07.004",
			title: "Восстановление зуба коронкой постоянной",
			toothCode: 21,
			category: "Ортопедия",
		});

		assert.strictEqual(rich.category, "Ортопедия");
		assert.strictEqual(rich.estimatedVisits, 2);
		assert.ok(rich.tipsForPatient?.includes("временную защиту"));
		assert.strictEqual(rich.nomenclatureCode, "A16.07.004");
		assert.ok(rich.stepName.includes("Установка защитной коронки"));
		assert.ok(rich.stepName.includes("Зуб 21"));
	});
});

// ───────────────────────────────────────────────────────────────────────────
// 3. DETERMINISTIC PATIENT SCORING TESTS
// ───────────────────────────────────────────────────────────────────────────

describe("Deterministic Patient Scoring & Sentiment Engine", () => {
	test("identifies 🟢 VIP / Лояльный patient with high LTV, high compliance, and zero debt", () => {
		const raw: PatientScoringRawData = {
			patientId: "patient-vip-001",
			appointments: [
				{ id: "a1", status: "completed", startsAt: "2026-06-01T10:00:00Z" },
				{ id: "a2", status: "completed", startsAt: "2026-07-01T10:00:00Z" },
				{ id: "a3", status: "completed", startsAt: "2026-08-01T10:00:00Z" },
			],
			payments: [
				{ id: "p1", amountRub: 45000, status: "paid", paidAt: "2026-06-01T11:00:00Z" },
				{ id: "p2", amountRub: 65000, status: "paid", paidAt: "2026-07-01T11:00:00Z" },
				{ id: "p3", amountRub: 35000, status: "paid", paidAt: "2026-08-01T11:00:00Z" },
			],
			visits: [
				{ id: "v1", status: "signed", createdAt: "2026-06-01T10:30:00Z" },
				{ id: "v2", status: "signed", createdAt: "2026-07-01T10:30:00Z" },
			],
			treatmentPlans: [
				{ id: "tp1", status: "completed", totalPriceRub: 145000 },
			],
			hasSignedConsents: true,
			outstandingDebtRub: 0,
		};

		const scoring = calculatePatientScoring(raw);

		// LTV = 45,000 + 65,000 + 35,000 = 145,000 ₽
		assert.strictEqual(scoring.ltvRub, 145000);
		assert.strictEqual(scoring.ltvKopecks, 14500000);
		assert.strictEqual(scoring.metrics.averageCheckRub, 48333.33); // 145000 / 3

		// 0 cancellations -> no-show rate = 0%
		assert.strictEqual(scoring.noShowRate, 0);

		// Compliance index = 100 + 9 (3 completed) + 5 (1 plan) + 5 (LTV > 50k) = clamped to 100
		assert.strictEqual(scoring.complianceIndex, 100);

		// Sentiment status
		assert.strictEqual(scoring.sentimentStatus, "🟢 VIP / Лояльный");
		assert.strictEqual(scoring.riskFactors.length, 0);
		assert.ok(scoring.recommendationsForStaff.some((r) => r.includes("персонального куратора") || r.includes("приоритетное бронирование")));
	});

	test("identifies 🟡 Внимание: Риск отмены when cancellation rate is high", () => {
		const raw: PatientScoringRawData = {
			patientId: "patient-cancel-002",
			appointments: [
				{ id: "a1", status: "completed", startsAt: "2026-05-01T10:00:00Z" },
				{ id: "a2", status: "cancelled", startsAt: "2026-06-01T10:00:00Z" },
				{ id: "a3", status: "cancelled", startsAt: "2026-07-01T10:00:00Z" },
				{ id: "a4", status: "cancelled", startsAt: "2026-08-01T10:00:00Z" },
			],
			payments: [
				{ id: "p1", amountRub: 5000, status: "paid", paidAt: "2026-05-01T11:00:00Z" },
			],
			outstandingDebtRub: 2500,
		};

		const scoring = calculatePatientScoring(raw);

		// Total evaluated = 1 completed + 3 cancelled = 4
		// No-show / cancellation rate = (3 / 4) * 100 = 75%
		assert.strictEqual(scoring.noShowRate, 75);

		// Compliance score = 100 - (3 * 8 cancelled = 24) - (8 debt) = 68
		assert.strictEqual(scoring.sentimentStatus, "🟡 Внимание: Риск отмены");
		assert.ok(scoring.riskFactors.some((rf) => rf.includes("75%")));
		assert.ok(scoring.recommendationsForStaff.some((rec) => rec.includes("звонок-подтверждение")));
	});

	test("identifies 🔴 Осторожно: Требуется строгое ИДС for high-risk or legal conflict patients", () => {
		const raw: PatientScoringRawData = {
			patientId: "patient-risk-003",
			appointments: [
				{ id: "a1", status: "no_show", startsAt: "2026-06-01T10:00:00Z" },
				{ id: "a2", status: "no_show", startsAt: "2026-07-01T10:00:00Z" },
				{ id: "a3", status: "cancelled", startsAt: "2026-08-01T10:00:00Z" },
			],
			payments: [],
			visits: [
				{ id: "v1", status: "voided", createdAt: "2026-06-01T11:00:00Z" },
			],
			hasLegalConflicts: true,
			outstandingDebtRub: 15000,
		};

		const scoring = calculatePatientScoring(raw);

		assert.strictEqual(scoring.sentimentStatus, "🔴 Осторожно: Требуется строгое ИДС");
		assert.ok(scoring.riskFactors.some((rf) => rf.includes("разногласия")));
		assert.ok(scoring.recommendationsForStaff.some((rec) => rec.includes("расширенное ИДС")));
		assert.ok(scoring.recommendationsForStaff.some((rec) => rec.includes("предоплате")));
	});

	test("identifies 🔵 Стандартный patient with normal attendance", () => {
		const raw: PatientScoringRawData = {
			patientId: "patient-standard-004",
			appointments: [
				{ id: "a1", status: "completed", startsAt: "2026-07-15T14:00:00Z" },
				{ id: "a2", status: "completed", startsAt: "2026-08-15T14:00:00Z" },
			],
			payments: [
				{ id: "p1", amountRub: 12000, status: "paid", paidAt: "2026-07-15T15:00:00Z" },
				{ id: "p2", amountRub: 8000, status: "paid", paidAt: "2026-08-15T15:00:00Z" },
			],
			hasSignedConsents: true,
			outstandingDebtRub: 0,
		};

		const scoring = calculatePatientScoring(raw);

		assert.strictEqual(scoring.ltvRub, 20000);
		assert.strictEqual(scoring.noShowRate, 0);
		assert.strictEqual(scoring.sentimentStatus, "🔵 Стандартный");
		assert.strictEqual(scoring.metrics.totalAppointmentsCount, 2);
		assert.strictEqual(scoring.metrics.completedAppointmentsCount, 2);
	});
});
