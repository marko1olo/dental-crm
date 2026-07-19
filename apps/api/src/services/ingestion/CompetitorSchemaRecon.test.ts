import assert from "node:assert";
import { describe, test } from "node:test";
import { CompetitorSchemaRecon } from "./CompetitorSchemaRecon.js";

describe("CompetitorSchemaRecon.matchSchema", () => {
	test("successfully matches Open Dental schema", () => {
		const extractedTables = {
			patient: ["PatNum", "FName", "LName", "Birthdate", "HmPhone"],
			appointment: ["AptNum", "PatNum", "AptDateTime"],
			procedurelog: ["ProcNum", "PatNum", "ProcDate", "ProcFee", "ToothNum"],
		};
		const match = CompetitorSchemaRecon.matchSchema(extractedTables);
		assert.ok(match);
		assert.strictEqual(match?.systemName, "Open Dental");
	});

	test("successfully matches Dentrix schema", () => {
		const extractedTables = {
			Patient: ["PatID", "FirstName", "LastName", "Birthdate", "Phone"],
			Appt: ["ApptID", "PatID", "StartDateTime"],
			Ledger: ["ProcCode", "PatID", "Date", "Amount", "ToothRange"],
		};
		const match = CompetitorSchemaRecon.matchSchema(extractedTables);
		assert.ok(match);
		assert.strictEqual(match?.systemName, "Dentrix");
	});

	test("matches schema case-insensitively", () => {
		const extractedTables = {
			PaTiEnT: [], // Open Dental uses "patient", should match case-insensitive
			ApPoInTmEnT: [],
		};
		const match = CompetitorSchemaRecon.matchSchema(extractedTables);
		assert.ok(match);
		assert.strictEqual(match?.systemName, "Open Dental");
	});

	test("matches schema even if extra tables are present", () => {
		const extractedTables = {
			Patient: [], // Dentrix
			Appt: [], // Dentrix
			RandomExtraTable: [],
			AnotherTable: [],
		};
		const match = CompetitorSchemaRecon.matchSchema(extractedTables);
		assert.ok(match);
		assert.strictEqual(match?.systemName, "Dentrix");
	});

	test("returns null if missing required tables", () => {
		// Missing 'appointment' / 'Appt'
		const extractedTables = {
			patient: [],
		};
		const match = CompetitorSchemaRecon.matchSchema(extractedTables);
		assert.strictEqual(match, null);
	});

	test("returns null if no known tables match", () => {
		const extractedTables = {
			users: [],
			events: [],
		};
		const match = CompetitorSchemaRecon.matchSchema(extractedTables);
		assert.strictEqual(match, null);
	});

	test("returns null if extracted tables are empty", () => {
		const extractedTables = {};
		const match = CompetitorSchemaRecon.matchSchema(extractedTables);
		assert.strictEqual(match, null);
	});
});
