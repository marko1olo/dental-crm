import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getStandardStageTitle } from "../../visit/visitPlanStageHandoff";

describe("visitDentalLabOrderHandoff — Smoke Facade", () => {
	it("standard stage titles are available", () => {
		assert.equal(getStandardStageTitle(3), "Ортопедический этап");
	});
});
