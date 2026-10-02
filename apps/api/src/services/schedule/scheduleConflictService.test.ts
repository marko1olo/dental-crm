import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
	FREED_APPOINTMENT_STATUSES,
	hasTimeOverlap,
} from "./scheduleConflictService.js";

describe("Schedule Conflict Service & Slot Math Invariants", () => {
	test("FREED_APPOINTMENT_STATUSES frees cancelled and no_show slots", () => {
		assert.ok(FREED_APPOINTMENT_STATUSES.includes("cancelled"));
		assert.ok(FREED_APPOINTMENT_STATUSES.includes("no_show"));
		assert.equal(FREED_APPOINTMENT_STATUSES.length, 2);
	});

	test("hasTimeOverlap correctly identifies overlapping intervals", () => {
		const t10_00 = new Date("2026-10-02T10:00:00Z").getTime();
		const t10_30 = new Date("2026-10-02T10:30:00Z").getTime();
		const t11_00 = new Date("2026-10-02T11:00:00Z").getTime();
		const t11_30 = new Date("2026-10-02T11:30:00Z").getTime();

		// Exact match
		assert.equal(hasTimeOverlap(t10_00, t11_00, t10_00, t11_00), true);

		// Partial overlap (starts during, ends after)
		assert.equal(hasTimeOverlap(t10_00, t11_00, t10_30, t11_30), true);

		// Partial overlap (starts before, ends during)
		assert.equal(hasTimeOverlap(t10_30, t11_30, t10_00, t11_00), true);

		// Complete enclosure
		assert.equal(hasTimeOverlap(t10_00, t11_30, t10_30, t11_00), true);
	});

	test("hasTimeOverlap correctly allows back-to-back adjacent slots without false conflict", () => {
		const t10_00 = new Date("2026-10-02T10:00:00Z").getTime();
		const t10_30 = new Date("2026-10-02T10:30:00Z").getTime();
		const t11_00 = new Date("2026-10-02T11:00:00Z").getTime();

		// [10:00, 10:30) and [10:30, 11:00) do NOT overlap
		assert.equal(hasTimeOverlap(t10_00, t10_30, t10_30, t11_00), false);
		// [10:30, 11:00) and [10:00, 10:30) do NOT overlap
		assert.equal(hasTimeOverlap(t10_30, t11_00, t10_00, t10_30), false);
	});

	test("hasTimeOverlap returns false for completely disjoint non-adjacent slots", () => {
		const t10_00 = new Date("2026-10-02T10:00:00Z").getTime();
		const t10_30 = new Date("2026-10-02T10:30:00Z").getTime();
		const t12_00 = new Date("2026-10-02T12:00:00Z").getTime();
		const t12_30 = new Date("2026-10-02T12:30:00Z").getTime();

		assert.equal(hasTimeOverlap(t10_00, t10_30, t12_00, t12_30), false);
		assert.equal(hasTimeOverlap(t12_00, t12_30, t10_00, t10_30), false);
	});
});
