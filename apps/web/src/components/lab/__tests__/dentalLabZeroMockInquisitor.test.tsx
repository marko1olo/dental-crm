import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CANONICAL_6_ORTHOPEDIC_LIFECYCLE_STAGES } from "../dentalLabOrderEngine";

describe("dentalLabZeroMockInquisitor — Smoke Facade", () => {
	it("6-stage orthopedic lifecycle has 6 stages", () => {
		assert.equal(CANONICAL_6_ORTHOPEDIC_LIFECYCLE_STAGES.length, 6);
	});
});
