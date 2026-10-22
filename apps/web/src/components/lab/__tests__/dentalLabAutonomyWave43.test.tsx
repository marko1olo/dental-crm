import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	EXPRESS_PRESET_ZIRCONIA_CROWN,
	EXPRESS_PRESET_PFM_DUCERAM,
} from "../DentalLabOrderModal";

describe("dentalLabAutonomyWave43 — Core Smoke Check", () => {
	it("Express presets are initialized with proper turnaround days", () => {
		assert.equal(EXPRESS_PRESET_ZIRCONIA_CROWN.workingDays, 5);
		assert.equal(EXPRESS_PRESET_PFM_DUCERAM.workingDays, 7);
	});
});
