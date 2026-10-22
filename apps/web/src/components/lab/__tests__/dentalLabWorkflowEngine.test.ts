import assert from "node:assert/strict";
import test, { describe } from "node:test";
import {
	createDentalLabOrder,
	advanceLabOrderStage,
} from "../dentalLabWorkflowEngine";

describe("dentalLabWorkflowEngine — Core Smoke & Sanity Check", () => {
	test("Workflow lifecycle runs smoothly across canonical clinical stages", () => {
		const order = createDentalLabOrder({
			patientId: "pat-smoke-1",
			patientName: "Тестовый Пациент",
			doctorId: "doc-1",
			doctorName: "Д-р Орлов",
			workTypeId: "crown_zirconia",
			selectedTeeth: [16],
			initialStatus: "draft",
		});

		assert.equal(order.currentStage, "draft");
		const sent = advanceLabOrderStage(order, "sent_to_lab", "Админ", "Отправлено");
		assert.equal(sent.currentStage, "sent_to_lab");
		const fitted = advanceLabOrderStage(sent, "fitting_scheduled", "Врач", "Примерка");
		assert.equal(fitted.currentStage, "fitting_scheduled");
		const done = advanceLabOrderStage(fitted, "installed_completed", "Врач", "Сдано");
		assert.equal(done.currentStage, "installed_completed");
	});
});
