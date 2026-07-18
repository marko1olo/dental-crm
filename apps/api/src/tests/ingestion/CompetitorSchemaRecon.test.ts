import assert from "node:assert";
import { describe, test } from "node:test";
import { CompetitorSchemaRecon } from "../../services/ingestion/CompetitorSchemaRecon.js";

describe("CompetitorSchemaRecon", () => {
	describe("matchSchema", () => {
		test("matches Open Dental schema exactly", () => {
			const extracted = {
				patient: ["PatNum", "FName"],
				appointment: ["AptNum"],
				procedurelog: ["ProcNum"],
			};
			const result = CompetitorSchemaRecon.matchSchema(extracted);
			assert.notStrictEqual(result, null);
			assert.strictEqual(result?.systemName, "Open Dental");
		});

		test("matches Dentrix schema with different casing", () => {
			const extracted = {
				PATIENT: ["PatID"],
				APPT: ["ApptID"],
			};
			const result = CompetitorSchemaRecon.matchSchema(extracted);
			assert.notStrictEqual(result, null);
			assert.strictEqual(result?.systemName, "Dentrix");
		});

		test("returns null for partial match (missing visits table)", () => {
			const extracted = {
				patient: ["PatNum"],
			};
			const result = CompetitorSchemaRecon.matchSchema(extracted);
			assert.strictEqual(result, null);
		});

		test("returns null for empty input", () => {
			const extracted = {};
			const result = CompetitorSchemaRecon.matchSchema(extracted);
			assert.strictEqual(result, null);
		});

		test("returns null for completely unrecognized tables", () => {
			const extracted = {
				users: ["id"],
				meetings: ["id"],
			};
			const result = CompetitorSchemaRecon.matchSchema(extracted);
			assert.strictEqual(result, null);
		});
	});
});
