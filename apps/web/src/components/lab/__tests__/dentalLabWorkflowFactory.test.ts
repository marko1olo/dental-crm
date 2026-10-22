import assert from "node:assert/strict";
import test, { describe } from "node:test";
import {
	createDentalLabOrder,
	advanceLabOrderStage,
	generateOdontogramSvg,
	generateBarcodeSvg,
	generateQrCodeSvg,
} from "../dentalLabWorkflowEngine";

describe("6. Lab Order Factory & 4-Stage Transitions", () => {
	test("createDentalLabOrder создает наряд со всеми полями, fittingDate и appointmentId", () => {
		const order = createDentalLabOrder({
			patientId: "pat-1",
			patientName: "Смирнова Е. А.",
			patientChartNumber: "МК-100",
			doctorId: "doc-1",
			doctorName: "Д-р Ковалев С. П.",
			clinicName: "Клиника DENTE",
			labName: "CAD/CAM Центр",
			workTypeId: "crown_emax",
			selectedTeeth: [11, 21],
			shadeCode: "A2",
			stumpShadeCode: "ND2",
			pricePerUnitRub: 24000,
			costPerUnitRub: 8000,
			doctorPercent: 25,
			fittingDate: "2026-09-05",
			appointmentId: "appt-9901",
			initialStatus: "draft",
		});

		assert.ok(order.id.startsWith("ztl-ord-"));
		assert.ok(order.orderNumber.startsWith("ЗТЛ-"));
		assert.equal(order.patientName, "Смирнова Е. А.");
		assert.equal(order.workTypeId, "crown_emax");
		assert.deepEqual(order.selectedTeeth, [11, 21]);
		assert.equal(order.currentStage, "draft");
		assert.equal(order.fittingDate, "2026-09-05");
		assert.equal(order.appointmentId, "appt-9901");
		assert.equal(order.stageHistory.length, 1);
		assert.equal(order.financials.unitsCount, 2);
		assert.equal(order.financials.labCostKopecks, 1600000);
		assert.equal(order.financials.patientPriceTotalRub, 48000);
		assert.equal(order.financials.labCostTotalRub, 16000);
		assert.equal(typeof order.isDelayedAlert, "boolean");
	});

	test("advanceLabOrderStage переводит наряд по 4 клиническим статусам", () => {
		const order = createDentalLabOrder({
			patientId: "pat-1",
			patientName: "Смирнова Е. А.",
			doctorId: "doc-1",
			doctorName: "Д-р Ковалев",
			workTypeId: "crown_emax",
			selectedTeeth: [11],
			initialStatus: "draft",
		});

		assert.equal(order.currentStage, "draft");

		const s2 = advanceLabOrderStage(order, "sent_to_lab", "Курьер ЗТЛ", "Передано в лабораторию");
		assert.equal(s2.currentStage, "sent_to_lab");
		assert.equal(s2.stageHistory.length, 2);

		const s3 = advanceLabOrderStage(s2, "fitting_scheduled", "Администратор", "Назначена примерка на 05.09.2026");
		assert.equal(s3.currentStage, "fitting_scheduled");
		assert.equal(s3.stageHistory.length, 3);

		const s4 = advanceLabOrderStage(s3, "installed_completed", "Д-р Ковалев", "Коронка зафиксирована на RelyX U200");
		assert.equal(s4.currentStage, "installed_completed");
		assert.equal(s4.stageHistory.length, 4);
		assert.equal(s4.isDelayedAlert, false);
	});
});

describe("7. Vector SVG Generators (Одонтограмма, Barcode, QR)", () => {
	test("generateOdontogramSvg генерирует SVG с выбранными зубами", () => {
		const svg = generateOdontogramSvg([11, 21, 46]);
		assert.ok(svg.includes("<svg"), "Должен быть тег svg");
		assert.ok(svg.includes("11"), "Должен содержать зуб 11");
		assert.ok(svg.includes("21"), "Должен содержать зуб 21");
		assert.ok(svg.includes("46"), "Должен содержать зуб 46");
		assert.ok(svg.includes("fill=\"#0d9488\""), "Выбранные зубы должны подсвечиваться teal");
	});

	test("generateBarcodeSvg генерирует векторный штрихкод Code128", () => {
		const svg = generateBarcodeSvg("ЗТЛ-2026/08-1042", 240, 50);
		assert.ok(svg.includes("<svg"));
		assert.ok(svg.includes("<rect"));
		assert.ok(svg.includes("ЗТЛ-2026/08-1042"));
	});

	test("generateQrCodeSvg генерирует матричный QR-код", () => {
		const svg = generateQrCodeSvg("DENTE-ZTL:1042", 90);
		assert.ok(svg.includes("<svg"));
		assert.ok(svg.includes("viewBox="));
		assert.ok(svg.includes('width="90"'));
		assert.ok(svg.includes("<rect"));
	});
});
