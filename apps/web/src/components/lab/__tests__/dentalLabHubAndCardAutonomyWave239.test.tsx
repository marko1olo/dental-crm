import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createDentalLabOrder } from "../dentalLabWorkflowEngine";

describe("dentalLabHubAndCardAutonomyWave239 — Core Smoke Check", () => {
	it("Orders hub orders instantiate properly", () => {
		const order = createDentalLabOrder({
			patientId: "pat-smoke-239",
			doctorId: "doc-01",
			doctorName: "Д-р Смирнов",
			patientName: "Пациент 239",
			workTypeId: "crown_emax",
			selectedTeeth: [26],
		});
		assert.equal(order.workTypeId, "crown_emax");
	});
});
