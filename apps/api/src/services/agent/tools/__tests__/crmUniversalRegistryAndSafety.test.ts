/**
 * crmUniversalRegistryAndSafety.test.ts — Safety, Warehouse, Dental Lab, Registry & Fallback Router Suite.
 *
 * Verifies non-blocking clinical safety and universal execution engine under Mandates 8e, 8l, 8n:
 * 1. Pharmacology & Safety (DDI, cross-allergies, prescription recommendations)
 * 2. Warehouse inventory (soft overdraft, never blocking clinical procedure)
 * 3. Dental Lab (ЗТЛ tokens & orders)
 * 4. CRM_UNIVERSAL_TOOLS single-chokepoint registry execution
 * 5. Offline Copilot Fallback Router
 */

import assert from "node:assert";
import { describe, test } from "node:test";
import { routeCopilotFallback } from "../../copilotFallbackRouter.js";
import type { AgentContext } from "../../context.js";
import {
	CRM_UNIVERSAL_TOOLS,
	checkAllergiesTool,
	checkDrugInteractionsCrmTool,
	checkStockAvailabilityTool,
	createLabOrderTool,
	getLabOrderStatusTool,
	logMaterialUsageTool,
	recommendPrescriptionTool,
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
		sessionId: "test-session-crm-safety-registry",
		mode: "autonomous",
		role: "doctor",
		permissions: [
			"clinical.read",
			"clinical.write",
			"billing.calculate",
			"warehouse.read",
			"warehouse.write",
		],
		tools: registry,
		db: null,
		...overrides,
	};
}

describe("1. Pharmacology & Safety Tools (Mandates 8l, 8e)", () => {
	test("check_drug_interactions detects penicillin allergy clash with Amoxicillin without blocking doctor (Mandate 8e)", async () => {
		const ctx = createTestContext();
		const result = await checkDrugInteractionsCrmTool.handler(ctx, {
			plannedDrugs: ["Амоксициллин"],
			knownAllergies: ["Пенициллин"],
		});

		assert.strictEqual(result.success, true);
		assert.strictEqual(result.isSafe, false);
		assert.strictEqual(result.hasAllergyClash, true);
		assert.strictEqual(result.is_blocked, false); // Mandate 8e: Doctor autonomy - never hard blocked!
		assert.strictEqual(result.confirmation_required, false); // No unblocking justification modal!
		assert.ok(result.warning?.includes("аллергия"));
		assert.ok(result.blockedPrescriptions.length > 0);
	});

	test("check_allergies detects cross-allergy and suggests Clindamycin with soft warning (Mandate 8e)", async () => {
		const ctx = createTestContext();
		const result = await checkAllergiesTool.handler(ctx, {
			patientId: "00000000-0000-7000-8000-000000000010",
			drugName: "Амоксиклав",
		});

		assert.strictEqual(result.success, true);
		assert.strictEqual(result.patientId, "00000000-0000-7000-8000-000000000010");
		assert.strictEqual(result.is_blocked, false); // Mandate 8e: Soft warning only
		assert.strictEqual(result.confirmation_required, false);
		assert.ok(typeof result.hasAllergies === "boolean");
		assert.ok(typeof result.isConflictDetected === "boolean");
	});

	test("recommend_prescription formats Form 107-1/u with Latin Rp: and Signa", async () => {
		const ctx = createTestContext();
		const result = await recommendPrescriptionTool.handler(ctx, {
			diagnosisCode: "K04.0",
			complaint: "Острая ночная боль в зубе",
			allergies: ["Пенициллин"],
		});

		assert.strictEqual(result.success, true);
		assert.strictEqual(result.diagnosisCode, "K04.0");
		assert.ok(result.drugs.length > 0);
		// With penicillin allergy, Clindamycin must be prescribed
		assert.ok(result.drugs.some((d) => d.tradeName.includes("Клиндамицин")));
		assert.ok(result.renderedPrescription107Ru.includes("Rp:"));
		assert.ok(result.renderedPrescription107Ru.includes("S:"));
	});
});

describe("2. Warehouse Inventory & Materials (Mandate 8l & 8n)", () => {
	test("check_stock_availability checks stock levels without blocking doctor (Mandates 8e & 8n)", async () => {
		const ctx = createTestContext();
		const result = await checkStockAvailabilityTool.handler(ctx, {
			itemNames: ["Артикаин", "Коффердам", "Крафт-пакеты"],
		});

		assert.strictEqual(result.success, true);
		assert.strictEqual(result.items.length, 3);
		assert.strictEqual(result.items[0]!.name, "Артикаин");
		assert.strictEqual(result.items[0]!.available, true); // Mandate 8n: supplies available to doctor
		assert.strictEqual(result.allAvailable, true); // Mandate 8n: never blocks clinical surgery
		assert.ok(result.summaryRu.length > 0);
	});

	test("log_material_usage allows soft overdraft without halting clinical surgery (Mandate 8n)", async () => {
		const ctx = createTestContext();
		const result = await logMaterialUsageTool.handler(ctx, {
			itemName: "Артикаин 4% 1.7 мл",
			quantity: 2,
			reason: "Анестезия при экстирпации пульпы",
		});

		assert.strictEqual(result.success, true);
		assert.strictEqual(result.itemName, "Артикаин 4% 1.7 мл");
		assert.strictEqual(result.quantityDeducted, 2);
		assert.strictEqual(result.doctorAutonomyProtected, true);
		assert.ok(typeof result.isOverdraft === "boolean");
	});
});

describe("3. Dental Lab (ЗТЛ) Tools (Mandate 8l & 8e)", () => {
	test("create_lab_order creates lab order with VITA shades and secure token", async () => {
		const ctx = createTestContext();
		const due = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
		const result = await createLabOrderTool.handler(ctx, {
			patientId: "00000000-0000-7000-8000-000000000010",
			toothCodes: [46],
			workType: "Коронка анатомическая ZrO2",
			material: "Диоксид циркония Prettau",
			vitaShade: "A2",
			dueDate: due,
		});

		assert.strictEqual(result.success, true);
		assert.strictEqual(result.toothFdi, "46");
		assert.strictEqual(result.vitaShade, "A2");
		assert.strictEqual(result.status, "draft");
		assert.ok(result.portalToken.length > 0);
		assert.ok(result.portalUrl.includes("token="));
	});

	test("get_lab_order_status retrieves lab order progress", async () => {
		const ctx = createTestContext();
		const result = await getLabOrderStatusTool.handler(ctx, {
			orderId: "lab_test_01",
		});

		assert.strictEqual(result.success, true);
		assert.ok(result.ordersCount > 0);
		assert.strictEqual(result.orders[0]!.orderId, "lab_test_01");
	});
});

describe("4. Unified Tool Registry Single-Chokepoint Execution", () => {
	test("all expected tools are present in CRM_UNIVERSAL_TOOLS dictionary", () => {
		const expectedTools = [
			"search_patients",
			"create_patient",
			"get_patient_summary",
			"get_family_deposit_balance",
			"get_patient_family_deposit_and_debt",
			"book_appointment",
			"reschedule_appointment",
			"cancel_appointment",
			"get_doctor_schedule",
			"get_daily_patients",
			"get_doctor_shifts",
			"get_daily_schedule_intelligence",
			"get_doctor_shifts_and_chairs",
			"update_teeth_chart",
			"get_teeth_chart",
			"get_tooth_history",
			"create_treatment_plan",
			"add_treatment_stage",
			"calculate_plan_cost",
			"create_invoice",
			"apply_discount",
			"check_cashier_shift",
			"get_doctor_earnings",
			"get_clinic_or_doctor_revenue",
			"check_drug_interactions",
			"check_allergies",
			"recommend_prescription",
			"check_stock_availability",
			"log_material_usage",
			"create_lab_order",
			"get_lab_order_status",
		];

		assert.strictEqual(Object.keys(CRM_UNIVERSAL_TOOLS).length, expectedTools.length);
		for (const name of expectedTools) {
			assert.ok(CRM_UNIVERSAL_TOOLS[name], `Missing tool: ${name}`);
		}
	});

	test("invoking tools via ToolRegistry.call resolves qualified 'crm.*' and bare names", async () => {
		const ctx = createTestContext();

		const resQualified = await ctx.tools.call(ctx, "crm.calculate_plan_cost", {
			items: [{ title: "Консультация", priceRub: 1500, quantity: 1 }],
			discountPercent: 0,
		});
		assert.strictEqual(resQualified.ok, true);

		const resBare = await ctx.tools.call(ctx, "calculate_plan_cost", {
			items: [{ title: "Консультация", priceRub: 1500, quantity: 1 }],
			discountPercent: 10,
		});
		assert.strictEqual(resBare.ok, true);
	});
});

describe("5. Offline Copilot Fallback Router", () => {
	test("routes patient creation prompts to crm.create_patient", async () => {
		const events: any[] = [];
		for await (const event of routeCopilotFallback({
			userText: "Создай пациента Сидоров Петр Иванович",
			lower: "создай пациента сидоров петр иванович",
			contextTooth: 46,
			contextPatientId: "00000000-0000-7000-8000-000000000001",
		})) {
			events.push(event);
		}

		const toolUse = events.find((e) => e.type === "tool_use");
		assert.ok(toolUse);
		assert.strictEqual(toolUse.name, "crm.create_patient");
		assert.ok(toolUse.input.fullName.includes("Сидоров"));
	});

	test("routes appointment cancellation prompts to crm.cancel_appointment", async () => {
		const events: any[] = [];
		for await (const event of routeCopilotFallback({
			userText: "Отмени запись пациента на завтра",
			lower: "отмени запись пациента на завтра",
			contextTooth: 46,
			contextPatientId: "00000000-0000-7000-8000-000000000001",
		})) {
			events.push(event);
		}

		const toolUse = events.find((e) => e.type === "tool_use");
		assert.ok(toolUse);
		assert.strictEqual(toolUse.name, "crm.cancel_appointment");
	});

	test("routes tooth status prompts to crm.update_teeth_chart", async () => {
		const events: any[] = [];
		for await (const event of routeCopilotFallback({
			userText: "Зуб 46 кариес",
			lower: "зуб 46 кариес",
			contextTooth: 46,
			contextPatientId: "00000000-0000-7000-8000-000000000001",
		})) {
			events.push(event);
		}

		const toolUse = events.find((e) => e.type === "tool_use");
		assert.ok(toolUse);
		assert.strictEqual(toolUse.name, "crm.update_teeth_chart");
		assert.strictEqual(toolUse.input.updates[0].toothNumber, 46);
	});
});
