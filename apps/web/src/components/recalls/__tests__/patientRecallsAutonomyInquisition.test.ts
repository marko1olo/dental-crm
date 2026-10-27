import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	DEFAULT_RECALL_CANDIDATES,
	calculateSmsSegments,
	formatSmsSummary,
} from "../patientRecallEngine";
import { mapRecallCandidateToRecord } from "../PatientRecallsHubModal";

describe("Patient Recalls Autonomy Inquisition: Master Verification", () => {
	it("verifies default candidate pool is clean zero-mock array", () => {
		assert.deepStrictEqual(DEFAULT_RECALL_CANDIDATES, []);
	});

	it("verifies SMS segment calculations for short Cyrillic texts", () => {
		const calc = calculateSmsSegments("Тест напоминания");
		assert.strictEqual(calc.encoding, "UCS-2");
		assert.strictEqual(calc.segmentCount, 1);
		const summary = formatSmsSummary(calc);
		assert.ok(summary.includes("1 SMS"));
	});

	it("verifies candidate adapter maps PostgreSQL record properly", () => {
		const rec = mapRecallCandidateToRecord({
			patientId: "pat-123",
			fullName: "Иванов Иван",
			phone: "+79001112233",
			lastCompletedAt: "2026-01-01T10:00:00.000Z",
			monthsSinceLastVisit: 6,
			band: "due",
		});
		assert.strictEqual(rec.id, "pat-123");
		assert.strictEqual(rec.dueDate, "2026-07-01");
	});
});
