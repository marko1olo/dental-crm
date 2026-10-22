import assert from "node:assert/strict";
import test, { describe } from "node:test";
import {
	createDentalLabOrder,
	generateDentalLabOrderA4PrintBlank,
	exportDentalLabOrdersToCsv,
} from "../dentalLabWorkflowEngine";

describe("8. A4 Printable Blank for Courier & CSV Export", () => {
	const sampleOrder = createDentalLabOrder({
		patientId: "pat-1",
		patientName: "Барабаш Сергей Владимирович",
		patientChartNumber: "МК-7711",
		doctorId: "doc-1",
		doctorName: "Д-р Ковалев С. П.",
		clinicName: "Клиника DENTE",
		labName: "CAD/CAM Центр Дентал-Мастер",
		workTypeId: "crown_emax",
		selectedTeeth: [11, 21],
		shadeCode: "A2",
		stumpShadeCode: "ND2",
		pricePerUnitRub: 24000,
		costPerUnitRub: 8000,
		fittingDate: "2026-09-04",
		appointmentId: "appt-7701",
		clinicalNotes: "Индивидуальный придесневой контур",
	});

	test("generateDentalLabOrderA4PrintBlank генерирует полный валидный HTML бланк А4 для курьера", () => {
		const html = generateDentalLabOrderA4PrintBlank(sampleOrder);
		const normalizedHtml = html.replace(/[\u00a0\u202f]/g, " ");
		assert.ok(html.includes("<!DOCTYPE html>"), "Должен быть DOCTYPE html");
		assert.ok(html.includes("Наряд-заказ"), "Должен быть заголовок");
		assert.ok(html.includes(sampleOrder.orderNumber), "Должен содержать номер наряда");
		assert.ok(html.includes("Барабаш Сергей Владимирович"), "Должен содержать имя пациента");
		assert.ok(html.includes("Д-р Ковалев С. П."), "Должен содержать врача");
		assert.ok(html.includes("CAD/CAM Центр Дентал-Мастер"), "Должен содержать лабораторию");
		assert.ok(normalizedHtml.includes("48 000 ₽"), "Должен содержать общую стоимость");
		assert.ok(normalizedHtml.includes("16 000 ₽"), "Должен содержать себестоимость ЗТЛ");
		assert.ok(html.includes("Индивидуальный придесневой контур"), "Должен содержать примечания");
		assert.ok(html.includes("Курьер (Принял / Передал)"), "Должен содержать блок подписи курьера");
		assert.ok(html.includes("Примерка"), "Должен содержать статус примерки");
	});

	test("exportDentalLabOrdersToCsv генерирует корректный CSV с BOM и колонками примерки и себестоимости", () => {
		const csv = exportDentalLabOrdersToCsv([sampleOrder]);
		assert.ok(csv.startsWith("\uFEFF"), "Должен начинаться с UTF-8 BOM");
		assert.ok(csv.includes("Номер наряда;Пациент;№ Медкарты;Врач-ортопед;Лаборатория"));
		assert.ok(csv.includes("Дата примерки;ID Приема"));
		assert.ok(csv.includes(sampleOrder.orderNumber));
		assert.ok(csv.includes("Барабаш Сергей Владимирович"));
		assert.ok(csv.includes("CAD/CAM Центр Дентал-Мастер"));
		assert.ok(csv.includes("48000"));
		assert.ok(csv.includes("16000"));
	});
});
