import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	createAssistantCitoEvent,
	createChairStatusEvent,
	createInvoiceTransferEvent,
	createLanP2PMessage,
	createVectorClock,
	validateLanP2PMessage,
	type LanChairStatusEvent,
	type LanAssistantCitoEvent,
	type LanInvoiceTransferEvent,
} from "../sync/index.js";

describe("Instantaneous Clinical P2P Events & Message Envelopes", () => {
	it("createChairStatusEvent validates dental chair progression statuses", () => {
		const event = createChairStatusEvent({
			cabinetNumber: "Кабинет 2",
			chairId: "chair-cab2-01",
			status: "treatment_in_progress",
			doctorId: "doc-101",
			doctorName: "Д-р Смирнов А.В.",
			patientId: "pat-202",
			patientName: "Кузнецова Е.Н.",
			note: "Препарирование под коронку 46",
		});

		assert.equal(event.cabinetNumber, "Кабинет 2");
		assert.equal(event.status, "treatment_in_progress");
		assert.equal(event.patientName, "Кузнецова Е.Н.");
		assert.ok(event.updatedAt);
	});

	it("createAssistantCitoEvent creates CITO urgent alerts with unique callId", () => {
		const call1 = createAssistantCitoEvent({
			cabinetNumber: 3,
			doctorId: "doc-surgeon-1",
			doctorName: "Д-р Иванов И.И.",
			urgency: "cito_emergency",
			reason: "anesthesia_aid",
			customMessage: "Срочно карпулу с адреналином 1:100000",
		});

		assert.equal(call1.cabinetNumber, 3);
		assert.equal(call1.urgency, "cito_emergency");
		assert.equal(call1.reason, "anesthesia_aid");
		assert.equal(call1.status, "pending");
		assert.ok(call1.callId.startsWith("cito-"));
	});

	it("createInvoiceTransferEvent calculates kopeck-exact totals and item sums", () => {
		const invoiceEvent = createInvoiceTransferEvent({
			cabinetNumber: "Кабинет 1",
			doctorId: "doc-therapist-1",
			doctorName: "Д-р Васильева М.С.",
			patientId: "pat-303",
			patientName: "Морозов Д.А.",
			items: [
				{
					name: "Анестезия инфильтрационная Ультракаин",
					priceRub: 850,
					quantity: 1,
				},
				{
					name: "Лечение кариеса эмали с пломбой световой",
					priceRub: 4500,
					quantity: 2,
					toothNumber: 16,
					discountRub: 500,
				},
			],
			comments: "Скидка 500 руб согласована главврачом",
		});

		// 850 + (4500 * 2 - 500) = 850 + 8500 = 9350 руб = 935000 коп
		assert.equal(invoiceEvent.totalAmountRub, 9350);
		assert.equal(invoiceEvent.totalAmountKopecks, 935000);
		assert.equal(invoiceEvent.status, "waiting_payment");
		assert.equal(invoiceEvent.items.length, 2);
	});

	it("createLanP2PMessage signs message with SHA-256 and validates integrity", () => {
		const clock = createVectorClock("tablet-cab1", 5);
		const chairEvent = createChairStatusEvent({
			cabinetNumber: 1,
			chairId: "chair-1",
			status: "ready_for_sanitization",
			doctorName: "Д-р Петров П.П.",
		});

		const message = createLanP2PMessage<LanChairStatusEvent>({
			eventType: "chair_status_changed",
			senderNodeId: "tablet-cab1",
			senderRole: "doctor_tablet",
			senderName: "Планшет Кабинета 1",
			organizationId: "org-dente-main",
			payload: chairEvent,
			vectorClock: clock,
		});

		assert.ok(message.messageId.startsWith("p2p-"));
		assert.ok(message.signature);
		assert.equal(message.eventType, "chair_status_changed");

		const validation = validateLanP2PMessage(message);
		assert.equal(validation.valid, true);
		assert.ok(validation.message);
	});

	it("validateLanP2PMessage rejects tampered payloads with signature mismatch", () => {
		const chairEvent = createChairStatusEvent({
			cabinetNumber: 1,
			chairId: "chair-1",
			status: "patient_seated",
		});

		const message = createLanP2PMessage({
			eventType: "chair_status_changed",
			senderNodeId: "tablet-cab1",
			senderRole: "doctor_tablet",
			senderName: "Планшет Кабинета 1",
			organizationId: "org-dente-main",
			payload: chairEvent as unknown as Record<string, unknown>,
		});

		// Tamper with payload
		const tamperedMessage = {
			...message,
			payload: {
				...chairEvent,
				status: "sanitized", // Altered after signing
			},
		};

		const validation = validateLanP2PMessage(tamperedMessage);
		assert.equal(validation.valid, false);
		assert.ok(validation.error?.includes("signature mismatch"));
	});
});
