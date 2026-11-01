/**
 * crmOdontogramPatients.test.ts — Patient Records, Odontogram & Dental History Test Suite.
 *
 * Verifies clinical odontogram and patient tools under Mandate 8e (Doctor Autonomy & 1-Click Norm):
 * 1. search_patients
 * 2. create_patient (physiological norm defaults)
 * 3. get_patient_summary (clinical & financial brief)
 * 4. update_teeth_chart (FDI 11..48 & surfaces)
 * 5. get_teeth_chart (full 32-tooth formula with default norm)
 * 6. get_tooth_history (per-tooth clinical timeline)
 * 7. get_family_deposit_balance (family wallet balance)
 */

import assert from "node:assert";
import { describe, test } from "node:test";
import type { AgentContext } from "../../context.js";
import {
	createPatientTool,
	getFamilyDepositBalanceTool,
	getPatientSummaryTool,
	getTeethChartTool,
	getToothHistoryTool,
	registerCrmUniversalTools,
	searchPatientsTool,
	updateTeethChartTool,
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
		sessionId: "test-session-crm-odontogram",
		mode: "autonomous",
		role: "doctor",
		permissions: [
			"patients.read",
			"patients.write",
			"clinical.read",
			"clinical.write",
			"finance.read",
		],
		tools: registry,
		db: null,
		...overrides,
	};
}

describe("1. Patient Management Tools (Mandate 8l & 8e)", () => {
	test("search_patients returns matched patients or fallback fixture", async () => {
		const ctx = createTestContext();
		const result = await searchPatientsTool.handler(ctx, {
			query: "Смирнов",
			limit: 5,
		});

		assert.strictEqual(result.success, true);
		assert.strictEqual(result.query, "Смирнов");
		assert.ok(result.patients.length > 0);
		assert.ok(result.patients[0]?.fullName.includes("Смирнов"));
	});

	test("create_patient registers patient with 1-click physiological norm defaults (Mandate 8e)", async () => {
		const ctx = createTestContext();
		const randomSuffix = Math.floor(100000 + Math.random() * 900000);
		const result = await createPatientTool.handler(ctx, {
			fullName: "Ковалев Дмитрий Сергеевич",
			phone: `+7 (916) ${randomSuffix.toString().slice(0, 3)}-${randomSuffix.toString().slice(3, 5)}-${randomSuffix.toString().slice(5)}`,
			birthDate: "1994-08-20",
		});

		assert.strictEqual(result.success, true);
		assert.strictEqual(result.fullName, "Ковалев Дмитрий Сергеевич");
		assert.strictEqual(result.isPhysiologicalNorm, true);
		assert.ok(result.card043Number.startsWith("043/у-"));
		assert.ok(result.patientId.length > 0);
	});

	test("get_patient_summary generates complete clinical & financial briefing", async () => {
		const ctx = createTestContext();
		const result = await getPatientSummaryTool.handler(ctx, {
			patientId: "00000000-0000-7000-8000-000000000010",
		});

		assert.strictEqual(result.success, true);
		assert.strictEqual(result.id, "00000000-0000-7000-8000-000000000010");
		assert.ok(result.card043Number.includes("043/у-"));
		assert.ok(result.renderedBriefRu.includes("КАРТОЧКА ПАЦИЕНТА"));
	});

	test("get_family_deposit_balance returns family balance and spending permissions", async () => {
		const ctx = createTestContext();
		const result = (await getFamilyDepositBalanceTool.handler(ctx, {
			patientId: "00000000-0000-7000-8000-000000000001",
		})) as any;

		assert.strictEqual(result.success, true);
		assert.strictEqual(result.hasFamilyAccount, true);
		assert.ok(result.familyBalanceRub > 0);
		assert.strictEqual(result.canSpendFamilyWallet, true);
		assert.ok(result.summaryRu.includes("СЕМЕЙНЫЙ ДЕПОЗИТ"));
	});
});

describe("2. Odontogram & Teeth Chart Tools (Mandate 8l & 8e)", () => {
	test("update_teeth_chart validates FDI teeth and MODVLI surfaces", async () => {
		const ctx = createTestContext();
		const result = await updateTeethChartTool.handler(ctx, {
			patientId: "00000000-0000-7000-8000-000000000010",
			updates: [
				{
					toothNumber: 46,
					status: "Кариес",
					surfaces: ["O", "D"],
					diagnosisText: "K02.1 Кариес дентина",
				},
				{
					toothNumber: 26,
					status: "Пломба",
					surfaces: ["M", "O"],
				},
			],
		});

		assert.strictEqual(result.success, true);
		assert.strictEqual(result.totalUpdated, 2);
		assert.ok(result.updatedTeeth[0]!.fdiFormatted.includes("46"));
		assert.strictEqual(result.updatedTeeth[0]!.statusCode, "C");
		assert.ok(result.updatedTeeth[1]!.fdiFormatted.includes("26"));
		assert.strictEqual(result.updatedTeeth[1]!.statusCode, "Pl");
	});

	test("get_teeth_chart returns full 32-tooth formula with default norm (Mandate 8e)", async () => {
		const ctx = createTestContext();
		const result = await getTeethChartTool.handler(ctx, {
			patientId: "00000000-0000-7000-8000-000000000010",
		});

		assert.strictEqual(result.success, true);
		assert.strictEqual(result.totalTeeth, 32);
		assert.strictEqual((result.teeth as any)[11]?.state, "Norm");
		assert.ok((result.teeth as any)[46]?.fdiFormatted.includes("46"));
		assert.ok((result.teeth as any)[48]?.fdiFormatted.includes("48"));
	});

	test("get_tooth_history returns full timeline for tooth 36 by FDI", async () => {
		const ctx = createTestContext();
		const result = (await getToothHistoryTool.handler(ctx, {
			patientId: "00000000-0000-7000-8000-000000000001",
			toothNumber: 36,
		})) as any;

		assert.strictEqual(result.success, true);
		assert.strictEqual(result.toothNumber, 36);
		assert.ok(result.eventsCount > 0);
		assert.ok(result.summaryRu.includes("КЛИНИЧЕСКАЯ ИСТОРИЯ ЗУБА"));
	});
});
