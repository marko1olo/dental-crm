import assert from "node:assert";
import { describe, test } from "node:test";
import {
	calculateExpectedDeliveryDate,
	canTransitionLabOrderStatus,
	isLabOrderDelayed,
	type LabOrder,
} from "../lab/labOrders.js";
import {
	checkDentalMedicationInteractions,
	DENTAL_MEDICATION_FORMULARY,
} from "../emr/medicationCatalog.js";
import {
	sanitizeAuditPayload,
} from "../logging/auditJournal.js";
import {
	calculateClinicOverhead,
	type ClinicExpenseItem,
} from "../finance/clinicExpenses.js";

describe("Dentalpin Mining: Lab Orders Engine", () => {
	test("calculates expected delivery date skipping weekends", () => {
		// Friday 2026-08-28 + 7 business days -> Tuesday 2026-09-08
		const sent = new Date("2026-08-28T09:00:00Z");
		const expected = calculateExpectedDeliveryDate(sent, "crown", 7);
		assert.strictEqual(expected.getDay() !== 0 && expected.getDay() !== 6, true);
		assert.strictEqual(expected.toISOString().slice(0, 10), "2026-09-08");
	});

	test("flags delayed lab order accurately", () => {
		const order: LabOrder = {
			organizationId: "11111111-1111-1111-1111-111111111111",
			patientId: "22222222-2222-2222-2222-222222222222",
			labContactId: "33333333-3333-3333-3333-333333333333",
			orderNumber: "LAB-2026-001",
			workType: "bridge",
			shade: "A2",
			status: "sent",
			sentDate: "2026-08-01",
			expectedDate: "2026-08-10",
			costKopecks: 1500000,
			isRemake: false,
		};

		const now = new Date("2026-08-15T10:00:00Z");
		assert.strictEqual(isLabOrderDelayed(order, now), true);

		// Completed order is never flagged delayed
		const completedOrder: LabOrder = { ...order, status: "completed" };
		assert.strictEqual(isLabOrderDelayed(completedOrder, now), false);
	});

	test("enforces valid lab order state transitions", () => {
		assert.strictEqual(canTransitionLabOrderStatus("draft", "sent"), true);
		assert.strictEqual(canTransitionLabOrderStatus("sent", "in_progress"), true);
		assert.strictEqual(canTransitionLabOrderStatus("in_progress", "ready"), true);
		assert.strictEqual(canTransitionLabOrderStatus("ready", "received"), true);
		assert.strictEqual(canTransitionLabOrderStatus("received", "fitted"), true);
		assert.strictEqual(canTransitionLabOrderStatus("fitted", "completed"), true);
		assert.strictEqual(canTransitionLabOrderStatus("draft", "completed"), false);
	});
});

describe("Dentalpin Mining: Medication Catalog & Interactions", () => {
	test("provides 56 canonical dental medications", () => {
		assert.strictEqual(DENTAL_MEDICATION_FORMULARY.length >= 10, true);
		const amox = DENTAL_MEDICATION_FORMULARY.find((m) => m.id === "med_amox_500");
		assert.ok(amox);
		assert.strictEqual(amox?.therapeuticClass, "antibiotic");
		assert.strictEqual(amox?.pregnancyCategory, "B");
	});

	test("detects critical drug-drug interaction (Metronidazole + Warfarin)", () => {
		const patientDrugs = ["med_metron_500", "warfarin", "med_paracetamol_500"];
		const warnings = checkDentalMedicationInteractions(patientDrugs);
		assert.strictEqual(warnings.length, 1);
		assert.strictEqual(warnings[0]?.severity, "critical");
		assert.strictEqual(warnings[0]?.drugAId, "med_metron_500");
	});
});

describe("Dentalpin Mining: Activity Journal Sanitizer", () => {
	test("sanitizes sensitive tokens and passwords recursively", () => {
		const payload = {
			action: "login",
			user: "doctor1@clinic.ru",
			password: "SuperSecretPassword123",
			authPayload: {
				token: "jwt.token.abc",
				refreshToken: "refresh.token.xyz",
				safeMeta: "ok",
			},
		};

		const sanitized = sanitizeAuditPayload(payload);
		assert.strictEqual(sanitized["password"], "[REDACTED]");
		const sub = sanitized["authPayload"] as Record<string, unknown>;
		assert.strictEqual(sub["token"], "[REDACTED]");
		assert.strictEqual(sub["refreshToken"], "[REDACTED]");
		assert.strictEqual(sub["safeMeta"], "ok");
	});
});

describe("Dentalpin Mining: Clinic Overhead & Expenses Engine", () => {
	test("aggregates overhead and calculates hourly chair capacity cost", () => {
		const expenses: ClinicExpenseItem[] = [
			{
				organizationId: "11111111-1111-1111-1111-111111111111",
				category: "rent",
				costNature: "fixed",
				amountKopecks: 20000000, // 200,000 RUB
				expenseDate: "2026-08-01",
				isRecurring: true,
			},
			{
				organizationId: "11111111-1111-1111-1111-111111111111",
				category: "salaries",
				costNature: "fixed",
				amountKopecks: 50000000, // 500,000 RUB
				expenseDate: "2026-08-01",
				isRecurring: true,
			},
			{
				organizationId: "11111111-1111-1111-1111-111111111111",
				category: "supplies",
				costNature: "variable",
				amountKopecks: 10000000, // 100,000 RUB
				expenseDate: "2026-08-15",
				isRecurring: false,
			},
		];

		// 3 operatories * 160 hours = 480 chair hours
		const summary = calculateClinicOverhead(expenses, 160, 3);
		assert.strictEqual(summary.totalExpensesKopecks, 80000000); // 800,000 RUB
		assert.strictEqual(summary.fixedExpensesKopecks, 70000000);
		assert.strictEqual(summary.variableExpensesKopecks, 10000000);
		// 80,000,000 / 480 = 166,667 kopecks = ~1666.67 RUB per chair hour
		assert.strictEqual(summary.hourlyOperatoryOverheadKopecks, 166667);
	});
});
