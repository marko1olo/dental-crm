import { test } from "node:test";
import assert from "node:assert/strict";
import { CompetitorSchemaRecon } from "../CompetitorSchemaRecon.js";

test("CompetitorSchemaRecon.matchSchema", async (t) => {
	await t.test("matches Open Dental", () => {
		const extractedTables = {
			patient: ["PatNum", "FName"],
			appointment: ["AptNum", "PatNum"],
			procedurelog: ["ProcNum"],
		};
		const result = CompetitorSchemaRecon.matchSchema(extractedTables);
		assert.equal(result?.systemName, "Open Dental");
	});

	await t.test("matches Dentrix", () => {
		const extractedTables = {
			Patient: ["PatID", "FirstName"],
			Appt: ["ApptID", "PatID"],
		};
		const result = CompetitorSchemaRecon.matchSchema(extractedTables);
		assert.equal(result?.systemName, "Dentrix");
	});

	await t.test("matches when additional unknown tables are present", () => {
		const extractedTables = {
			Patient: ["PatID", "FirstName"],
			Appt: ["ApptID", "PatID"],
			SomeOtherTable: ["col1"],
		};
		const result = CompetitorSchemaRecon.matchSchema(extractedTables);
		assert.equal(result?.systemName, "Dentrix");
	});

	await t.test("returns null if no match", () => {
		const extractedTables = {
			UnknownTable: ["id"],
			AnotherUnknownTable: ["id"],
		};
		const result = CompetitorSchemaRecon.matchSchema(extractedTables);
		assert.equal(result, null);
	});

	await t.test("returns null if partial match (missing visits table)", () => {
		const extractedTables = {
			Patient: ["PatID", "FirstName"],
		};
		const result = CompetitorSchemaRecon.matchSchema(extractedTables);
		assert.equal(result, null);
	});

	await t.test("returns null if input is empty object", () => {
		const extractedTables = {};
		const result = CompetitorSchemaRecon.matchSchema(extractedTables);
		assert.equal(result, null);
	});
});
