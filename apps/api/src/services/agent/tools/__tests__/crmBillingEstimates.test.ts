/**
 * crmBillingEstimates.test.ts — Treatment Plans, Billing, Discounts & Fiscal Shifts Test Suite.
 *
 * Verifies financial and billing tools under Mandate 8e (Doctor Autonomy) and Mandate 8ap:
 * 1. create_treatment_plan (exact integer kopecks, discount autonomy)
 * 2. add_treatment_stage
 * 3. calculate_plan_cost (exact math, zero float drift)
 * 4. create_invoice (100% warranty act vs partial discount fiscal receipt)
 * 5. apply_discount (doctor discount autonomy)
 * 6. check_cashier_shift (54-FZ shift monitoring)
 * 7. get_doctor_earnings (gross revenue & piecework)
 */

import assert from "node:assert";
import { describe, test } from "node:test";
import { formatKopecksRu } from "@dental/shared";
import type { AgentContext } from "../../context.js";
import {
	addTreatmentStageTool,
	applyDiscountTool,
	calculatePlanCostTool,
	checkCashierShiftTool,
	createInvoiceTool,
	createTreatmentPlanTool,
	getDoctorEarningsTool,
	registerCrmUniversalTools,
} from "../crmUniversalTools.js";
import { ToolRegistry } from "../registry.js";

const ORG_ID = "00000000-0000-7000-8000-000000000001";
const CLINIC_ID = "00000000-0000-7000-8000-000000000002";
const DOCTOR_ID = "00000000-0000-7000-8000-000000000003";

function createTestContext(overrides: Partial<AgentContext> = {}): AgentContext {
	const registry = new ToolRegistry();
	registerCrmUniversalTools(registry, "crm");

	return {
		organizationId: ORG_ID,
		clinicId: CLINIC_ID,
		userId: DOCTOR_ID,
		sessionId: "test-session-crm-billing",
		mode: "autonomous",
		role: "doctor",
		permissions: [
			"clinical.read",
			"clinical.write",
			"billing.write",
			"billing.calculate",
			"finance.read",
		],
		tools: registry,
		db: null,
		...overrides,
	};
}

describe("1. Treatment Plan & Cost Tools (Mandates 8l, 8e)", () => {
	test("create_treatment_plan calculates integer kopecks and doctor discount autonomy", async () => {
		const ctx = createTestContext();
		const result = await createTreatmentPlanTool.handler(ctx, {
			patientId: "00000000-0000-7000-8000-000000000010",
			title: "План терапевтического лечения",
			discountPercent: 10,
			initialStages: [
				{ title: "Анестезия", priceRub: 1000, quantity: 1, serviceCode: "A16.07.030" },
				{ title: "Пломба", priceRub: 5000, quantity: 1, serviceCode: "A16.07.002" },
			],
		});

		assert.strictEqual(result.success, true);
		assert.strictEqual(result.subtotalRub, 6000);
		assert.strictEqual(result.discountPercent, 10);
		assert.strictEqual(result.totalPriceRub, 5400);
		assert.strictEqual(result.totalPriceKopecks, 540000);
		assert.strictEqual(result.doctorAutonomyApplied, true);
	});

	test("add_treatment_stage appends stage to existing plan", async () => {
		const ctx = createTestContext();
		const result = await addTreatmentStageTool.handler(ctx, {
			planId: "plan_test_01",
			serviceTitle: "КТ сегмента челюсти",
			priceRub: 2500,
			serviceCode: "A06.07.013",
			phase: 2,
		});

		assert.strictEqual(result.success, true);
		assert.strictEqual(result.planId, "plan_test_01");
		assert.strictEqual(result.totalLineKopecks, 250000);
		assert.strictEqual(result.phase, 2);
	});

	test("calculate_plan_cost computes exact service pricing math", async () => {
		const ctx = createTestContext();
		const result = await calculatePlanCostTool.handler(ctx, {
			items: [
				{ title: "Удаление зуба сложное", priceRub: 4500, quantity: 1 },
				{ title: "Наложение швов", priceRub: 1200, quantity: 2 },
			],
			discountPercent: 20,
		});

		// 4500 + 2400 = 6900; 20% discount = 1380; total = 5520
		assert.strictEqual(result.success, true);
		assert.strictEqual(result.subtotalRub, 6900);
		assert.strictEqual(result.discountPercent, 20);
		assert.strictEqual(result.discountRub, 1380);
		assert.strictEqual(result.totalRub, 5520);
		assert.strictEqual(result.totalKopecks, 552000);
		assert.strictEqual(result.formattedTotal, formatKopecksRu(552000));
	});
});

describe("2. Billing, Discounts & 54-FZ (Mandates 8l, 8e)", () => {
	test("create_invoice with 100% discount creates warranty act without 54-FZ fiscal receipt", async () => {
		const ctx = createTestContext();
		const result = await createInvoiceTool.handler(ctx, {
			patientId: "00000000-0000-7000-8000-000000000010",
			items: [{ title: "Гарантийная переделка пломбы", priceRub: 4500, quantity: 1 }],
			discountPercent: 100,
			note: "Гарантийный случай",
		});

		assert.strictEqual(result.success, true);
		assert.strictEqual(result.totalRub, 0);
		assert.strictEqual(result.totalKopecks, 0);
		assert.strictEqual(result.fiscalReceiptRequired, false); // FFD 1.2 zero ruble rule!
		assert.ok(result.message.includes("гарантийного обслуживания"));
	});

	test("create_invoice with partial discount requires fiscal receipt", async () => {
		const ctx = createTestContext();
		const result = await createInvoiceTool.handler(ctx, {
			patientId: "00000000-0000-7000-8000-000000000010",
			items: [{ title: "Профессиональная гигиена", priceRub: 6000, quantity: 1 }],
			discountPercent: 15,
		});

		assert.strictEqual(result.success, true);
		assert.strictEqual(result.subtotalRub, 6000);
		assert.strictEqual(result.discountPercent, 15);
		assert.strictEqual(result.totalRub, 5100);
		assert.strictEqual(result.fiscalReceiptRequired, true);
	});

	test("apply_discount supports 0-100% doctor discount autonomy", async () => {
		const ctx = createTestContext();
		const result = await applyDiscountTool.handler(ctx, {
			planId: "plan_test_01",
			discountPercent: 25,
			reason: "Семейная скидка",
		});

		assert.strictEqual(result.success, true);
		assert.strictEqual(result.targetType, "treatment_plan");
		assert.strictEqual(result.appliedDiscountPercent, 25);
		assert.strictEqual(result.doctorAutonomyPreserved, true);
	});

	test("check_cashier_shift monitors 54-FZ 24h limit", async () => {
		const ctx = createTestContext();
		const result = await checkCashierShiftTool.handler(ctx, {});

		assert.strictEqual(result.success, true);
		assert.strictEqual(result.isShiftOpen, true);
		assert.strictEqual(typeof result.durationHours, "number");
		assert.strictEqual(typeof result.isShiftOver24Hours, "boolean");
	});

	test("get_doctor_earnings calculates revenue and piecework percentage", async () => {
		const ctx = createTestContext();
		const result = (await getDoctorEarningsTool.handler(ctx, {
			period: "today",
		})) as any;

		assert.strictEqual(result.success, true);
		assert.ok(result.grossRevenueRub > 0);
		assert.ok(result.calculatedPieceworkRub > 0);
		assert.strictEqual(result.pieceworkPercent, 25);
		assert.ok(result.summaryRu.includes("ФИНАНСОВЫЕ ИТОГИ"));
	});
});
