import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	DEFAULT_RECALL_CANDIDATES,
	cleanPhoneDigits,
	extractPatientFirstName,
} from "../index";

describe("Patient Recall Manager: Master Suite", () => {
	it("verifies empty candidate pool", () => {
		assert.deepStrictEqual(DEFAULT_RECALL_CANDIDATES, []);
	});

	it("verifies name and phone sanitizers", () => {
		assert.strictEqual(extractPatientFirstName("Иванов Иван"), "Иван");
		assert.strictEqual(cleanPhoneDigits("+7 (999) 111-22-33"), "79991112233");
	});
});
