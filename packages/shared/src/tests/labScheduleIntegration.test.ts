import assert from "node:assert";
import { describe, test } from "node:test";
import {
	evaluateAppointmentLabStatus,
	getPatientActiveLabStatus,
	type MinimalLabOrderForSchedule,
} from "../lab/labScheduleIntegration.js";
import {
	VITA_CLASSICAL_PLUS_BLEACH_PALETTE,
	VITA_SHADE_HEX_MAP,
	getVitaShadeHex,
	CANONICAL_LAB_WORK_TYPES,
	getLabWorkTypeById,
} from "../lab/vitaPalette.js";

describe("labScheduleIntegration — Клиническая связка ЗТЛ с расписанием и визитами", () => {
	const refDate = new Date("2026-10-15T12:00:00Z");

	test("1. Статус «Поступил в клинику» (зеленый / ready_in_clinic)", () => {
		const order: MinimalLabOrderForSchedule = {
			id: "ord-101",
			orderNumber: "ЗТЛ-00101",
			patientId: "pat-1",
			toothFdi: "16",
			workType: "Коронка ZrO2",
			material: "Prettau Zirconia",
			colorVita: "A2",
			status: "ready_in_clinic",
			dueDate: "2026-10-18T00:00:00Z",
		};

		const result = evaluateAppointmentLabStatus(order, refDate);
		assert.ok(result);
		assert.strictEqual(result.state, "ready_in_clinic");
		assert.strictEqual(result.labelRu, "Поступил в клинику");
		assert.strictEqual(result.shortLabelRu, "В клинике");
		assert.strictEqual(result.isOverdue, false);
		assert.strictEqual(result.daysOverdue, 0);
		assert.ok(result.badgeClass.includes("emerald"));
	});

	test("2. Статус «Поступил в клинику» по наличию receivedDate", () => {
		const order: MinimalLabOrderForSchedule = {
			id: "ord-102",
			status: "in_progress",
			receivedDate: "2026-10-14T10:00:00Z",
			dueDate: "2026-10-16T00:00:00Z",
		};

		const result = evaluateAppointmentLabStatus(order, refDate);
		assert.ok(result);
		assert.strictEqual(result.state, "ready_in_clinic");
	});

	test("3. Статус «Просрочен» (красный / overdue с точным числом дней)", () => {
		// Дедлайн был 2026-10-10, референс 2026-10-15 => просрочен на 5 дней
		const order: MinimalLabOrderForSchedule = {
			id: "ord-103",
			orderNumber: "ЗТЛ-00103",
			patientId: "pat-2",
			toothFdi: "21",
			status: "in_progress",
			dueDate: "2026-10-10T00:00:00Z",
		};

		const result = evaluateAppointmentLabStatus(order, refDate);
		assert.ok(result);
		assert.strictEqual(result.state, "overdue");
		assert.strictEqual(result.isOverdue, true);
		assert.strictEqual(result.daysOverdue, 5);
		assert.strictEqual(result.labelRu, "Просрочен на 5 дн. (не поступил из ЗТЛ)");
		assert.ok(result.badgeClass.includes("rose"));
	});

	test("4. Статус «В лаборатории» (желтый / in_lab в пределах срока)", () => {
		// Дедлайн 2026-10-20, референс 2026-10-15 => в работе
		const order: MinimalLabOrderForSchedule = {
			id: "ord-104",
			status: "in_progress",
			dueDate: "2026-10-20T00:00:00Z",
			colorVita: "A3",
		};

		const result = evaluateAppointmentLabStatus(order, refDate);
		assert.ok(result);
		assert.strictEqual(result.state, "in_lab");
		assert.strictEqual(result.isOverdue, false);
		assert.strictEqual(result.shortLabelRu, "В ЗТЛ");
		assert.ok(result.badgeClass.includes("amber"));
	});

	test("5. Закрытые наряды (completed, delivered_to_patient) не выводятся в расписании", () => {
		const orderCompleted: MinimalLabOrderForSchedule = {
			status: "completed",
			dueDate: "2026-10-10T00:00:00Z",
		};
		assert.strictEqual(evaluateAppointmentLabStatus(orderCompleted, refDate), null);

		const orderDelivered: MinimalLabOrderForSchedule = {
			status: "delivered_to_patient",
			dueDate: "2026-10-10T00:00:00Z",
		};
		assert.strictEqual(evaluateAppointmentLabStatus(orderDelivered, refDate), null);
	});

	test("6. getPatientActiveLabStatus выбирает самый критический наряд (overdue > ready > in_lab)", () => {
		const orders: MinimalLabOrderForSchedule[] = [
			{
				id: "ord-inlab",
				patientId: "pat-multi",
				status: "in_progress",
				dueDate: "2026-10-20T00:00:00Z",
			},
			{
				id: "ord-overdue",
				patientId: "pat-multi",
				status: "in_progress",
				dueDate: "2026-10-12T00:00:00Z", // просрочен на 3 дня
			},
			{
				id: "ord-ready",
				patientId: "pat-multi",
				status: "ready_in_clinic",
				dueDate: "2026-10-18T00:00:00Z",
			},
		];

		const best = getPatientActiveLabStatus(orders, "pat-multi", refDate);
		assert.ok(best);
		assert.strictEqual(best.orderId, "ord-overdue");
		assert.strictEqual(best.state, "overdue");
		assert.strictEqual(best.daysOverdue, 3);
	});
});

describe("VITA Palette — 20 эталонных тонов из DentTechnician vita_palette.json", () => {
	test("1. Палитра содержит ровно 20 оттенков (16 Classical + 4 Bleach)", () => {
		assert.strictEqual(VITA_CLASSICAL_PLUS_BLEACH_PALETTE.length, 20);
	});

	test("2. Точные HEX-коды VITA Classical соответствуют эталону", () => {
		assert.strictEqual(getVitaShadeHex("A1"), "#F3E2C8");
		assert.strictEqual(getVitaShadeHex("A2"), "#EBD7BB");
		assert.strictEqual(getVitaShadeHex("A3"), "#E2CBAE");
		assert.strictEqual(getVitaShadeHex("A3.5"), "#D8C2A4");
		assert.strictEqual(getVitaShadeHex("A4"), "#CFA98F");

		assert.strictEqual(getVitaShadeHex("B1"), "#F1E6CF");
		assert.strictEqual(getVitaShadeHex("B2"), "#E6D9BE");
		assert.strictEqual(getVitaShadeHex("B3"), "#DACAAE");
		assert.strictEqual(getVitaShadeHex("B4"), "#CDBA9C");

		assert.strictEqual(getVitaShadeHex("C1"), "#E9DEC6");
		assert.strictEqual(getVitaShadeHex("C2"), "#E0D2B8");
		assert.strictEqual(getVitaShadeHex("C3"), "#D6C6AA");
		assert.strictEqual(getVitaShadeHex("C4"), "#C7B596");

		assert.strictEqual(getVitaShadeHex("D2"), "#E7DCC6");
		assert.strictEqual(getVitaShadeHex("D3"), "#DACDB5");
		assert.strictEqual(getVitaShadeHex("D4"), "#CBBCA2");
	});

	test("3. Точные HEX-коды VITA Bleach соответствуют эталону", () => {
		assert.strictEqual(getVitaShadeHex("BL1"), "#FFF7EE");
		assert.strictEqual(getVitaShadeHex("BL2"), "#FEF1E3");
		assert.strictEqual(getVitaShadeHex("BL3"), "#FDEAD6");
		assert.strictEqual(getVitaShadeHex("BL4"), "#FBE1C6");
	});

	test("4. Регистронезависимость поиска getVitaShadeHex", () => {
		assert.strictEqual(getVitaShadeHex("a2"), "#EBD7BB");
		assert.strictEqual(getVitaShadeHex("bl1"), "#FFF7EE");
		assert.strictEqual(getVitaShadeHex("  c3  "), "#D6C6AA");
		assert.strictEqual(getVitaShadeHex(null), undefined);
		assert.strictEqual(getVitaShadeHex("UNKNOWN"), undefined);
	});
});

describe("Каталог 17 канонических изделий ЗТЛ из DentTechnician (wt_001..wt_017)", () => {
	test("1. Содержит ровно 17 уникальных видов работ", () => {
		assert.strictEqual(CANONICAL_LAB_WORK_TYPES.length, 17);
		const ids = new Set(CANONICAL_LAB_WORK_TYPES.map((w) => w.id));
		assert.strictEqual(ids.size, 17);
	});

	test("2. Первые 6 изделий включают металлокерамику, цельнолитые и циркониевые/e.max конструкции", () => {
		assert.strictEqual(getLabWorkTypeById("wt_001")?.titleRu, "Коронка металлокерамическая");
		assert.strictEqual(getLabWorkTypeById("wt_002")?.titleRu, "Коронка цельнолитая");
		assert.strictEqual(getLabWorkTypeById("wt_003")?.titleRu, "Коронка ZrO2");
		assert.strictEqual(getLabWorkTypeById("wt_004")?.titleRu, "Винир ZrO2");
		assert.strictEqual(getLabWorkTypeById("wt_005")?.titleRu, "Коронка e.MAX");
		assert.strictEqual(getLabWorkTypeById("wt_006")?.titleRu, "Винир e.MAX");
	});

	test("3. Съемное протезирование и имплантаты корректно категоризированы", () => {
		assert.strictEqual(getLabWorkTypeById("wt_007")?.titleRu, "Бюгель металлический");
		assert.strictEqual(getLabWorkTypeById("wt_007")?.category, "removable_prosthetics");

		assert.strictEqual(getLabWorkTypeById("wt_013")?.titleRu, "Коронка металлокерамическая на импланте");
		assert.strictEqual(getLabWorkTypeById("wt_013")?.category, "implant_prosthetics");

		assert.strictEqual(getLabWorkTypeById("wt_015")?.titleRu, "Индивидуальная слепочная ложка");
		assert.strictEqual(getLabWorkTypeById("wt_015")?.category, "auxiliary");
	});
});
