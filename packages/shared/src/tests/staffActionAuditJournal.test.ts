import { describe, it } from "node:test";
import assert from "node:assert";
import {
	staffActionTypeSchema,
	staffActionAuditEntrySchema,
	staffActionBatchSchema,
	sanitizeAuditPayload,
} from "../logging/auditJournal.js";

describe("Staff Action Audit Journal & 152-FZ Sanitizer (@dental/shared)", () => {
	it("validates all mandatory staff action types across clinical and admin workflows", () => {
		const expectedActions = [
			"emr_open",
			"diagnosis_change",
			"service_add",
			"service_remove",
			"discount_apply",
			"payment_receive",
			"payment_refund",
			"shift_open",
			"shift_close",
			"appointment_cancel",
			"document_print",
			"document_export",
			"custom_action",
			"appointment_create",
			"appointment_reschedule",
			"appointment_delete",
			"diary_revision",
			"auth_login",
			"auth_logout",
			"material_adjustment",
		] as const;

		for (const action of expectedActions) {
			const parsed = staffActionTypeSchema.parse(action);
			assert.strictEqual(parsed, action);
		}
	});

	it("validates staffActionAuditEntrySchema with before/after state diffs and kopecks", () => {
		const entry = {
			organizationId: "11111111-1111-1111-1111-111111111111",
			actorUserId: "22222222-2222-2222-2222-222222222222",
			actorRole: "doctor",
			actorName: "Д-р Иванов И.И.",
			actionType: "diagnosis_change",
			entityType: "emr_record",
			entityId: "rec-994",
			patientId: "33333333-3333-3333-3333-333333333333",
			details: {
				oldState: { icdCode: "K02.1", name: "Кариес дентина" },
				newState: { icdCode: "K04.0", name: "Начальный пульпит" },
				toothNumber: 46,
				reason: "Глубокое поражение с реакцией на холод",
			},
			reason: "Уточнение диагноза после препарирования",
			clientTimestamp: "2026-10-02T12:00:00.000Z",
		};

		const parsed = staffActionAuditEntrySchema.parse(entry);
		assert.strictEqual(parsed.actionType, "diagnosis_change");
		assert.strictEqual(parsed.entityId, "rec-994");
		assert.deepStrictEqual((parsed.details as any).newState.icdCode, "K04.0");
	});

	it("validates batch schema with multiple actions", () => {
		const batch = {
			events: [
				{
					organizationId: "11111111-1111-1111-1111-111111111111",
					actionType: "shift_open",
					entityType: "cash_shift",
					entityId: "shift-01",
					details: { shiftNumber: "1", openingCashKopecks: 500000 },
				},
				{
					organizationId: "11111111-1111-1111-1111-111111111111",
					actionType: "payment_receive",
					entityType: "invoice_bill",
					entityId: "bill-505",
					details: { amountKopecks: 1250000, paymentMethod: "card" },
				},
			],
		};

		const parsed = staffActionBatchSchema.parse(batch);
		assert.strictEqual(parsed.events.length, 2);
		assert.strictEqual(parsed.events[0]?.actionType, "shift_open");
		assert.strictEqual(parsed.events[1]?.actionType, "payment_receive");
	});

	it("sanitizes sensitive auth credentials, passwords, tokens, CVV, and credit card numbers", () => {
		const rawPayload = {
			password: "super_secret_admin_pass",
			token: "jwt.secret.token",
			cvv: "999",
			pin: "1234",
			cardNumber: "4276123456789012",
			sessionSecret: "session_secret_cookie_data",
			subPayload: {
				apiKey: "api_key_hidden",
				refreshToken: "refresh_token_hidden",
				safeClinicalField: "Кариес зуба 46",
				nestedArray: [
					{
						secret: "do_not_leak_in_array",
						priceKopecks: 450000,
						pan: "5536911122223333",
					},
					"Some string with eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozG6t raw jwt",
					"Authorization: Bearer my_secret_token_value",
				],
			},
			medicalDiagnosis: "K02.1 Кариес дентина",
			amountKopecks: 1500000,
		};

		const sanitized = sanitizeAuditPayload(rawPayload);

		// Credentials must be redacted
		assert.strictEqual(sanitized["password"], "[REDACTED]");
		assert.strictEqual(sanitized["token"], "[REDACTED]");
		assert.strictEqual(sanitized["cvv"], "[REDACTED]");
		assert.strictEqual(sanitized["pin"], "[REDACTED]");
		assert.strictEqual(sanitized["cardNumber"], "[REDACTED]");
		assert.strictEqual(sanitized["sessionSecret"], "[REDACTED]");

		// Nested object sanitization
		const sub = sanitized["subPayload"] as Record<string, unknown>;
		assert.strictEqual(sub["apiKey"], "[REDACTED]");
		assert.strictEqual(sub["refreshToken"], "[REDACTED]");
		assert.strictEqual(sub["safeClinicalField"], "Кариес зуба 46");

		// Array sanitization
		const arr = sub["nestedArray"] as any[];
		assert.strictEqual(arr[0]["secret"], "[REDACTED]");
		assert.strictEqual(arr[0]["priceKopecks"], 450000);
		assert.strictEqual(arr[0]["pan"], "[REDACTED]");
		assert.ok(typeof arr[1] === "string");
		assert.ok(!arr[1].includes("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"));
		assert.ok(arr[1].includes("[REDACTED_JWT]"));
		assert.ok(typeof arr[2] === "string");
		assert.ok(!arr[2].includes("my_secret_token_value"));
		assert.ok(arr[2].includes("Bearer [REDACTED_TOKEN]"));

		// Clinical and financial data must remain intact!
		assert.strictEqual(sanitized["medicalDiagnosis"], "K02.1 Кариес дентина");
		assert.strictEqual(sanitized["amountKopecks"], 1500000);
	});
});
