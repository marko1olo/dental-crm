import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildLabOrderMessengerSummary } from "../DentalLabOrderModal";

describe("dentalLabAutonomyWave52 — Core Smoke Check", () => {
	it("Messenger summary generator formats standard order correctly", () => {
		const text = buildLabOrderMessengerSummary({
			clinicName: "Клиника",
			gostOrderNumber: "ЗТЛ-1",
			patientName: "Пациент",
			doctorName: "Врач",
			teethOrJaw: "16",
			constructionTypeTitle: "Коронка",
			materialTitle: "Цирконий",
			shade: "A2",
			dueDate: "10.10.2026",
		});
		assert.ok(text.includes("Заказ-наряд"));
		assert.ok(text.includes("Пациент"));
	});
});
