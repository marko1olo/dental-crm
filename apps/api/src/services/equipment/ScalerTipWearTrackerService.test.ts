import { strict as assert } from "node:assert";
import { describe, test } from "node:test";
import { ScalerTipWearTrackerService } from "./ScalerTipWearTrackerService.js";

describe("ScalerTipWearTrackerService", () => {
	test("should return optimal status for 0mm wear", () => {
		const status = ScalerTipWearTrackerService.calculateStatus("ems", 0);
		assert.equal(status.efficiencyPercentage, 100);
		assert.equal(status.status, "optimal");
		assert.equal(status.recommendation, null);
	});

	test("should return warning status for 1mm wear", () => {
		const status = ScalerTipWearTrackerService.calculateStatus("acteon_satelec", 1);
		assert.equal(status.efficiencyPercentage, 75);
		assert.equal(status.status, "warning");
		assert.notEqual(status.recommendation, null);
	});

	test("should return discard_required status for 2mm wear", () => {
		const status = ScalerTipWearTrackerService.calculateStatus("woodpecker", 2);
		assert.equal(status.efficiencyPercentage, 50);
		assert.equal(status.status, "discard_required");
		assert.ok(status.recommendation?.includes("Критический износ"));
	});

	test("should return discard_required status for >2mm wear", () => {
		const status = ScalerTipWearTrackerService.calculateStatus("ems", 5);
		assert.equal(status.efficiencyPercentage, 50);
		assert.equal(status.status, "discard_required");
	});

	test("should throw error for negative wear", () => {
		assert.throws(() => ScalerTipWearTrackerService.calculateStatus("ems", -1), /Износ не может быть отрицательным/);
	});
});
