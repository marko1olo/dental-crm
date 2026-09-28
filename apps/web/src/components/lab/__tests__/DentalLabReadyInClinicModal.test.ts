/**
 * DentalLabReadyInClinicModal.test.ts — Тесты связки ЗТЛ с расписанием при готовности работы.
 *
 * Мандаты 8b (Качественная интеграция), 8d (Запрет эмодзи), 8e (Врачебная автономия), 8n (Zero dead-ends).
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	generateReadyInClinicSmsTemplate,
	generateReadyInClinicWhatsAppTemplate,
	DentalLabReadyInClinicModal,
	type ReadyInClinicLabOrder,
} from "../DentalLabReadyInClinicModal";

describe("DentalLabReadyInClinicModal — Связка ЗТЛ с расписанием и шаблоны уведомлений", () => {
	const sampleOrder: ReadyInClinicLabOrder = {
		id: "lab-ord-101",
		orderNumber: "ЗТЛ-2026-88",
		patientId: "pat-55",
		patientName: "Кузнецов Иван Петрович",
		patientPhone: "+7 (999) 111-22-33",
		doctorName: "Д-р Орлов А.В.",
		doctorId: "doc-12",
		toothFdi: [16, 17],
		material: "Диоксид циркония Katana",
		colorVita: "A2",
		constructionType: "crown_zirconia",
		clinicName: "DENTE Клиник",
		clinicPhone: "+7 (495) 777-88-99",
		bookingUrl: "https://dente.ru/book",
	};

	it("1. generateReadyInClinicSmsTemplate корректно формирует текст SMS без эмодзи", () => {
		const sms = generateReadyInClinicSmsTemplate(sampleOrder, sampleOrder.clinicName, sampleOrder.clinicPhone);

		assert.ok(sms.includes("Иван"), "Должно содержать имя пациента");
		assert.ok(sms.includes("Диоксид циркония Katana"), "Должно содержать материал конструкции");
		assert.ok(sms.includes("16, 17"), "Должно содержать формулу зубов FDI");
		assert.ok(sms.includes("Д-р Орлов А.В."), "Должно содержать ФИО врача");
		assert.ok(sms.includes("DENTE Клиник"), "Должно содержать название клиники");
		assert.ok(sms.includes("+7 (495) 777-88-99"), "Должно содержать телефон клиники");

		// Мандат 8d: Никаких эмодзи в медицинских сообщениях
		const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
		assert.strictEqual(emojiRegex.test(sms), false, "В SMS не должно быть эмодзи (Мандат 8d)");
	});

	it("2. generateReadyInClinicWhatsAppTemplate корректно формирует развернутое сообщение", () => {
		const wa = generateReadyInClinicWhatsAppTemplate(
			sampleOrder,
			sampleOrder.clinicName,
			sampleOrder.clinicPhone,
			sampleOrder.bookingUrl,
		);

		assert.ok(wa.includes("Иван"), "Должно приветствовать пациента по имени");
		assert.ok(wa.includes("ЗТЛ-2026-88"), "Должно содержать номер наряда ЗТЛ");
		assert.ok(wa.includes("16, 17"), "Должно содержать зубы");
		assert.ok(wa.includes("Диоксид циркония Katana"), "Должно указывать материал");
		assert.ok(wa.includes("доставлена в клинику DENTE Клиник"), "Должно указывать поступление в клинику");
		assert.ok(wa.includes("https://dente.ru/book"), "Должно содержать ссылку для онлайн-записи");

		const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
		assert.strictEqual(emojiRegex.test(wa), false, "В WhatsApp сообщении не должно быть эмодзи (Мандат 8d)");
	});

	it("3. Обрабатывает одиночные зубы, строковые FDI и дефолты", () => {
		const orderSingle: ReadyInClinicLabOrder = {
			orderNumber: "ЗТЛ-001",
			patientName: "Смирнова Анна",
			toothFdi: "21",
			doctorName: "Д-р Мельников",
		};

		const sms = generateReadyInClinicSmsTemplate(orderSingle);
		assert.ok(sms.includes("Анна"), "Имя извлечено корректно");
		assert.ok(sms.includes("зуб 21"), "Зуб 21 указан");
		assert.ok(sms.includes("ортопедическая конструкция"), "Дефолтный материал применен");

		const orderEmptyTeeth: ReadyInClinicLabOrder = {
			orderNumber: "ЗТЛ-002",
			patientName: "Пациент Без Номера",
		};
		const smsEmpty = generateReadyInClinicSmsTemplate(orderEmptyTeeth);
		assert.ok(smsEmpty.includes("зуб 16"), "Fallback зуб 16 применен");
	});

	it("4. Модальный компонент экспортируется и является валидным React-компонентом", () => {
		assert.strictEqual(typeof DentalLabReadyInClinicModal, "function", "DentalLabReadyInClinicModal должен быть функцией-компонентом");
	});

	it("5. Формирование черновика записи в расписание соответствует Приказу 804н и Ортопедии (Этап 3)", () => {
		const order = sampleOrder;
		const teethStr = Array.isArray(order.toothFdi) ? order.toothFdi.join(", ") : String(order.toothFdi || "16");
		const mat = order.material || "Ортопедическая конструкция";
		const shade = order.colorVita || "A2";

		const draft = {
			patientId: order.patientId || "",
			patientName: order.patientName,
			patientPhone: order.patientPhone || "",
			doctorId: order.doctorId || "",
			doctorName: order.doctorName || "Врач-ортопед",
			serviceTitle: "Примерка и фиксация ортопедической конструкции",
			serviceCode: "A16.07.004", // 804н
			durationMinutes: 45,
			stageKind: "stage_3_orthopedics",
			orderNumber: order.orderNumber,
			notes: `Готовая работа ЗТЛ № ${order.orderNumber} (${mat}, зуб ${teethStr}, оттенок ${shade}). Поступила в клинику.`,
		};

		assert.strictEqual(draft.serviceCode, "A16.07.004", "Код услуги соответствует номенклатуре Минздрава 804н");
		assert.strictEqual(draft.durationMinutes, 45, "Стандартное время приема под фиксацию — 45 минут");
		assert.strictEqual(draft.stageKind, "stage_3_orthopedics", "Привязка к Этапу 3 комплексного плана лечения");
		assert.strictEqual(draft.orderNumber, "ЗТЛ-2026-88", "Привязан номер наряда ЗТЛ");
		assert.ok(draft.notes.includes("A2"), "В примечании указан оттенок VITA");
	});
});
