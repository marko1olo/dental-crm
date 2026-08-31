/**
 * estimateAndLabOrderTool.test.ts — Unit and Integration tests for Treatment Estimate and Dental Lab Order Tools.
 */

import assert from "node:assert";
import { describe, test } from "node:test";
import type { AgentContext } from "./context.js";
import { ToolRegistry } from "./tools/registry.js";
import { calculateTreatmentEstimateTool } from "./tools/estimateTool.js";
import { draftLabWorkOrderTool } from "./tools/labOrderTool.js";
import { registerClinicalTools } from "./tools/clinicalTools.js";

const ORG_ID = "00000000-0000-7000-8000-000000000001";
const CLINIC_ID = "00000000-0000-7000-8000-000000000002";
const USER_ID = "00000000-0000-7000-8000-000000000003";
const PATIENT_ID = "00000000-0000-7000-8000-000000000004";

function createMockContext(overrides: Partial<AgentContext> = {}): AgentContext {
	const registry = new ToolRegistry();
	registerClinicalTools(registry, "clinical");

	return {
		organizationId: ORG_ID,
		clinicId: CLINIC_ID,
		userId: USER_ID,
		sessionId: "test-session-" + Math.random().toString(36).slice(2),
		mode: "autonomous",
		permissions: [
			"patients.read",
			"clinical.read",
			"clinical.write",
			"schedule.read",
			"schedule.write",
			"billing.read",
			"tasks.write",
			"communications.read",
			"communications.write",
		],
		tools: registry,
		db: null,
		...overrides,
	};
}

describe("estimateTool (clinical.calculate_treatment_estimate)", () => {
	test("calculates 3 parallel tiers with exact multipliers, warranties, and stages", async () => {
		const ctx = createMockContext();

		const items = [
			{
				toothCode: 16,
				serviceName: "Лечение глубокого кариеса нанокомпозитом",
				nomenclatureCode: "A16.07.002",
				basePriceRub: 10000,
				category: "Терапия",
				quantity: 1,
			},
			{
				toothCode: 46,
				serviceName: "Внутрикостная дентальная имплантация",
				nomenclatureCode: "A16.07.054",
				basePriceRub: 50000,
				category: "Имплантация",
				quantity: 1,
			},
			{
				toothCode: 46,
				serviceName: "Восстановление зуба коронкой постоянной",
				nomenclatureCode: "A16.07.004",
				basePriceRub: 40000,
				category: "Ортопедия",
				quantity: 1,
			},
		];

		const result = (await calculateTreatmentEstimateTool.handler(ctx, {
			items,
			discountPercent: 10, // 10% discount
		})) as any;

		assert.strictEqual(result.itemsCount, 3);
		assert.strictEqual(result.discountPercent, 10);
		assert.strictEqual(result.recommendedTier, "optimum");

		// 1. Economy Tier (0.85x multiplier, 1 year warranty)
		const economy = result.tiers.economy;
		assert.strictEqual(economy.tierKey, "economy");
		assert.strictEqual(economy.warrantyRu, "1 год официальной гарантии");
		// Gross: (10000 + 50000 + 40000) * 0.85 = 100000 * 0.85 = 85000 ₽
		assert.strictEqual(economy.grossTotalRub, 85000);
		// Discount: 85000 * 0.10 = 8500 ₽
		assert.strictEqual(economy.discountRub, 8500);
		// Net Total: 85000 - 8500 = 76500 ₽
		assert.strictEqual(economy.totalRub, 76500);
		assert.strictEqual(economy.totalKopecks, 7650000);
		assert.strictEqual(economy.laborRub + economy.materialsRub, 76500);

		// 2. Optimum Tier (1.0x multiplier, 2 years warranty)
		const optimum = result.tiers.optimum;
		assert.strictEqual(optimum.tierKey, "optimum");
		assert.strictEqual(optimum.warrantyRu, "2 года расширенной гарантии");
		assert.strictEqual(optimum.isRecommended, true);
		// Gross: 100000 ₽
		assert.strictEqual(optimum.grossTotalRub, 100000);
		// Discount: 10000 ₽
		assert.strictEqual(optimum.discountRub, 10000);
		// Net Total: 90000 ₽
		assert.strictEqual(optimum.totalRub, 90000);
		assert.strictEqual(optimum.totalKopecks, 9000000);

		// 3. Premium Tier (1.40x multiplier, lifetime warranty)
		const premium = result.tiers.premium;
		assert.strictEqual(premium.tierKey, "premium");
		assert.strictEqual(premium.warrantyRu, "Пожизненная гарантия на конструкции и титановые опоры");
		// Gross: 100000 * 1.40 = 140000 ₽
		assert.strictEqual(premium.grossTotalRub, 140000);
		// Discount: 14000 ₽
		assert.strictEqual(premium.discountRub, 14000);
		// Net Total: 126000 ₽
		assert.strictEqual(premium.totalRub, 126000);
		assert.strictEqual(premium.totalKopecks, 12600000);

		// Stages breakdown check
		assert.strictEqual(optimum.stages.length, 3);
		assert.strictEqual(optimum.stages[0].stageKind, "stage_1_therapy");
		assert.strictEqual(optimum.stages[1].stageKind, "stage_2_surgery");
		assert.strictEqual(optimum.stages[2].stageKind, "stage_3_orthopedics");

		// Installments check
		assert.ok(optimum.installments.months3.monthlyPaymentRub > 0);
		assert.ok(optimum.installments.months12.monthlyPaymentRub > 0);
	});

	test("calculates 13% NDFL tax deduction distinguishing Code 01 social limit vs Code 02 expensive treatment", async () => {
		const ctx = createMockContext();

		// Case 1: Expensive treatment (Code 02, e.g. Implant + Bone graft = 200,000 ₽)
		// Code 02 has NO LIMIT! 13% of 200,000 = 26,000 ₽ refund
		const expensiveItems = [
			{
				toothCode: 46,
				serviceName: "Внутрикостная дентальная имплантация Straumann",
				nomenclatureCode: "A16.07.054",
				basePriceRub: 200000,
				category: "Имплантация",
				quantity: 1,
			},
		];

		const resExpensive = (await calculateTreatmentEstimateTool.handler(ctx, {
			items: expensiveItems,
			discountPercent: 0,
		})) as any;

		const optExpTax = resExpensive.tiers.optimum.taxDeduction;
		assert.strictEqual(optExpTax.code01StandardBaseRub, 0);
		assert.strictEqual(optExpTax.code02ExpensiveBaseRub, 200000);
		assert.strictEqual(optExpTax.code02RefundRub, 26000); // 200,000 * 0.13 = 26,000 ₽
		assert.strictEqual(optExpTax.totalTaxRefundRub, 26000);
		assert.strictEqual(optExpTax.netCostAfterTaxRefundRub, 174000); // 200,000 - 26,000 = 174,000 ₽

		// Case 2: Standard treatment (Code 01, e.g. 10 fillings = 250,000 ₽)
		// Code 01 is capped at 150,000 ₽ statutory limit, refund is capped at 19,500 ₽!
		const standardItems = [
			{
				toothCode: 11,
				serviceName: "Лечение кариеса дентина",
				nomenclatureCode: "A16.07.002",
				basePriceRub: 250000,
				category: "Терапия",
				quantity: 1,
			},
		];

		const resStandard = (await calculateTreatmentEstimateTool.handler(ctx, {
			items: standardItems,
			discountPercent: 0,
		})) as any;

		const optStdTax = resStandard.tiers.optimum.taxDeduction;
		assert.strictEqual(optStdTax.code01StandardBaseRub, 250000);
		assert.strictEqual(optStdTax.code01AnnualLimitRub, 150000);
		assert.strictEqual(optStdTax.code01CappedEligibleBaseRub, 150000);
		assert.strictEqual(optStdTax.code01RefundRub, 19500); // 150,000 * 0.13 = 19,500 ₽ max!
		assert.strictEqual(optStdTax.code02ExpensiveBaseRub, 0);
		assert.strictEqual(optStdTax.totalTaxRefundRub, 19500);
		assert.strictEqual(optStdTax.netCostAfterTaxRefundRub, 230500); // 250,000 - 19,500 = 230,500 ₽

		// Case 3: Mixed treatment (Code 01 = 100,000 ₽ + Code 02 = 100,000 ₽)
		// Code 01 (100,000 <= 150,000): 13,000 ₽
		// Code 02 (100,000): 13,000 ₽
		// Total refund: 26,000 ₽
		const mixedItems = [
			{
				toothCode: 11,
				serviceName: "Лечение пульпита",
				nomenclatureCode: "A16.07.002",
				basePriceRub: 100000,
				category: "Терапия",
			},
			{
				toothCode: 36,
				serviceName: "Дентальная имплантация",
				nomenclatureCode: "A16.07.054",
				basePriceRub: 100000,
				category: "Имплантация",
			},
		];

		const resMixed = (await calculateTreatmentEstimateTool.handler(ctx, {
			items: mixedItems,
			discountPercent: 0,
		})) as any;

		const optMixTax = resMixed.tiers.optimum.taxDeduction;
		assert.strictEqual(optMixTax.code01StandardBaseRub, 100000);
		assert.strictEqual(optMixTax.code01RefundRub, 13000);
		assert.strictEqual(optMixTax.code02ExpensiveBaseRub, 100000);
		assert.strictEqual(optMixTax.code02RefundRub, 13000);
		assert.strictEqual(optMixTax.totalTaxRefundRub, 26000);
	});

	test("persists draft treatment plan in database when createDraftPlan is true", async () => {
		const mockDb = {
			select: () => ({
				from: () => ({
					where: () => ({
						limit: async () => [
							{
								id: PATIENT_ID,
								fullName: "Барабаш Сергей Владимирович",
							},
						],
					}),
				}),
			}),
			insert: () => ({
				values: (val: any) => ({
					returning: async () => [
						{
							id: "plan-new-123",
							...val,
						},
					],
				}),
			}),
		};

		const ctx = createMockContext({ db: mockDb });

		const result = (await calculateTreatmentEstimateTool.handler(ctx, {
			patientId: PATIENT_ID,
			items: [
				{
					toothCode: 16,
					serviceName: "Профгигиена полости рта",
					nomenclatureCode: "A16.07.050",
					basePriceRub: 8000,
				},
			],
			createDraftPlan: true,
		})) as any;

		assert.strictEqual(result.patientId, PATIENT_ID);
		assert.strictEqual(result.patientFullName, "Барабаш Сергей Владимирович");
		assert.strictEqual(result.savedPlanId, "plan-new-123");
	});
});

describe("labOrderTool (clinical.draft_lab_work_order)", () => {
	test("draft_lab_work_order validates FDI tooth formula and creates real lab order record", async () => {
		let insertedValues: any = null;

		const mockDb = {
			select: () => ({
				from: () => ({
					where: () => ({
						limit: async () => [
							{
								id: PATIENT_ID,
								fullName: "Смирнова Елена Алексеевна",
							},
						],
					}),
				}),
			}),
			insert: () => ({
				values: (val: any) => {
					insertedValues = val;
					return {
						returning: async () => [
							{
								id: "lab-order-999",
								...val,
								createdAt: new Date("2026-08-31T10:00:00Z"),
							},
						],
					};
				},
			}),
		};

		const ctx = createMockContext({ db: mockDb });

		const result = (await draftLabWorkOrderTool.handler(ctx, {
			patientId: PATIENT_ID,
			toothCodes: [16, 17],
			workType: "Коронка постоянная",
			material: "Диоксид циркония (ZrO2)",
			vitaShade: "A2",
			dueDate: "2026-09-15T18:00:00Z",
			laboratoryName: "Дентал-Лаб Центр",
			notes: "Уступ 0.5 мм по кругу, гирлянда отсутствует",
			priceRub: 18000,
		})) as any;

		assert.strictEqual(result.success, true);
		assert.strictEqual(result.orderId, "lab-order-999");
		assert.strictEqual(result.organizationId, ORG_ID);
		assert.strictEqual(result.patientId, PATIENT_ID);
		assert.strictEqual(result.patientFullName, "Смирнова Елена Алексеевна");
		assert.deepStrictEqual(result.toothCodes, [16, 17]);
		assert.strictEqual(result.toothFdi, "16, 17");
		assert.strictEqual(result.workType, "Коронка постоянная");
		assert.strictEqual(result.material, "Диоксид циркония (ZrO2)");
		assert.strictEqual(result.colorVita, "A2");
		assert.strictEqual(result.status, "draft");
		assert.strictEqual(result.priceRub, 18000);
		assert.ok(result.secureToken.length > 20);
		assert.match(result.portalUrl, /\/lab-portal\?token=/);

		// Verify database insertion payload
		assert.strictEqual(insertedValues.organizationId, ORG_ID);
		assert.strictEqual(insertedValues.patientId, PATIENT_ID);
		assert.strictEqual(insertedValues.toothFdi, "16, 17");
		assert.strictEqual(insertedValues.status, "draft");
		assert.match(insertedValues.clinicalNotes, /Уступ 0\.5 мм/);
		assert.match(insertedValues.clinicalNotes, /Дентал-Лаб Центр/);
	});

	test("draft_lab_work_order rejects invalid FDI tooth number", async () => {
		const ctx = createMockContext();

		await assert.rejects(
			() =>
				draftLabWorkOrderTool.handler(ctx, {
					patientId: PATIENT_ID,
					toothCodes: [99], // Invalid tooth
					workType: "Коронка",
					material: "E.max",
					vitaShade: "A1",
					dueDate: "2026-09-15T18:00:00Z",
				}),
			/Некорректный номер зуба FDI: 99/,
		);
	});

	test("draft_lab_work_order is registered in ToolRegistry under clinical module with category write", async () => {
		const registry = new ToolRegistry();
		registerClinicalTools(registry, "clinical");

		const estimateDef = registry.get("clinical.calculate_treatment_estimate");
		assert.ok(estimateDef, "clinical.calculate_treatment_estimate must be registered");
		assert.strictEqual(estimateDef.category, "read");

		const labOrderDef = registry.get("clinical.draft_lab_work_order");
		assert.ok(labOrderDef, "clinical.draft_lab_work_order must be registered");
		assert.strictEqual(labOrderDef.category, "write");
	});
});
