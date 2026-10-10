/**
 * omnichannelBotDialog.test.ts — Unit tests for Omnichannel FSM Dialog Manager,
 * Slot Matcher, Intent Classifier, and Operator Handover Service.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	BotDialogManager,
	OperatorHandoverService,
	classifyDetailedIntent,
	findAvailableSlots,
	type DoctorAvailableSlot,
	type IncomingBotMessage,
} from "../messaging/omnichannel/index.js";

describe("Omnichannel FSM Dialog & Slot Matcher Engine", () => {
	const sampleSlots: DoctorAvailableSlot[] = [
		{
			slotId: "slot-01",
			doctorId: "doc-101",
			doctorName: "д-р Иванов И.И.",
			specialty: "Стоматолог-терапевт",
			startDateTime: "2026-08-30T10:00:00+03:00",
			endDateTime: "2026-08-30T11:00:00+03:00",
			dateFormatted: "30 августа 2026 г.",
			timeFormatted: "10:00",
			isFree: true,
		},
		{
			slotId: "slot-02",
			doctorId: "doc-101",
			doctorName: "д-р Иванов И.И.",
			specialty: "Стоматолог-терапевт",
			startDateTime: "2026-08-30T14:30:00+03:00",
			endDateTime: "2026-08-30T15:30:00+03:00",
			dateFormatted: "30 августа 2026 г.",
			timeFormatted: "14:30",
			isFree: true,
		},
		{
			slotId: "slot-03",
			doctorId: "doc-202",
			doctorName: "д-р Смирнова Е.А.",
			specialty: "Стоматолог-ортопед",
			startDateTime: "2026-08-30T18:00:00+03:00",
			endDateTime: "2026-08-30T19:00:00+03:00",
			dateFormatted: "30 августа 2026 г.",
			timeFormatted: "18:00",
			isFree: true,
		},
		{
			slotId: "slot-04",
			doctorId: "doc-303",
			doctorName: "д-р Соколов Д.В.",
			specialty: "Стоматолог-хирург",
			startDateTime: "2026-08-31T11:00:00+03:00",
			endDateTime: "2026-08-31T12:00:00+03:00",
			dateFormatted: "31 августа 2026 г.",
			timeFormatted: "11:00",
			isFree: false, // Occupied
		},
	];

	// ─── 1. Intent Classification & Clinical Triage ───
	describe("1. Intent Classification & Triage", () => {
		it("1.1 classifies acute pain as emergency and provides clinical advice", () => {
			const res = classifyDetailedIntent("У меня невыносимо болит зуб, опухла щека!");
			assert.equal(res.intent, "emergency_pain");
			assert.equal(res.urgency, "emergency");
			assert.ok(res.triageAdvice?.includes("не согревайте"));
			assert.ok(res.triageAdvice?.includes("CITO"));
		});

		it("1.2 classifies live operator request with high urgency", () => {
			const res = classifyDetailedIntent("Позовите оператора пожалуйста, не хочу с ботом говорить");
			assert.equal(res.intent, "operator_handover");
			assert.equal(res.urgency, "urgent");
		});

		it("1.3 classifies booking and pricing inquiries", () => {
			const bookRes = classifyDetailedIntent("Хочу записаться на консультацию");
			assert.equal(bookRes.intent, "booking");

			const priceRes = classifyDetailedIntent("Сколько стоит пломба и гигиена?");
			assert.equal(priceRes.intent, "price_faq");

			const labRes = classifyDetailedIntent("Когда будет готова коронка?");
			assert.equal(labRes.intent, "lab_status");
		});
	});

	// ─── 2. Slot Matcher ───
	describe("2. Slot Matcher", () => {
		it("2.1 filters available slots by specialty", () => {
			const result = findAvailableSlots(sampleSlots, { specialty: "терапевт" });
			assert.equal(result.found, true);
			assert.equal(result.matches.length, 2);
			assert.equal(result.matches[0]!.doctorName, "д-р Иванов И.И.");
		});

		it("2.2 filters by time of day (morning vs evening)", () => {
			const morningResult = findAvailableSlots(sampleSlots, { timeOfDay: "morning" });
			assert.equal(morningResult.matches.length, 1);
			assert.equal(morningResult.matches[0]!.slotId, "slot-01");

			const eveningResult = findAvailableSlots(sampleSlots, { timeOfDay: "evening" });
			assert.equal(eveningResult.matches.length, 1);
			assert.equal(eveningResult.matches[0]!.slotId, "slot-03");
		});

		it("2.3 handles no free slots with fallback buttons", () => {
			const result = findAvailableSlots(sampleSlots, { specialty: "хирург" }); // Only slot-04 which is occupied
			assert.equal(result.found, false);
			assert.equal(result.matches.length, 0);
			assert.ok(result.messageText.includes("нет свободных окон"));
			assert.ok(result.suggestedButtons.length > 0);
		});
	});

	// ─── 3. FSM Dialog Manager ───
	describe("3. FSM Dialog Manager", () => {
		it("3.1 walks through guided booking flow: specialty -> slot -> confirmation", () => {
			const manager = new BotDialogManager();
			const senderId = "+79997778899";

			// Step 1: Patient asks to book
			const msg1: IncomingBotMessage = {
				channel: "telegram",
				senderId,
				text: "Здравствуйте, хочу записаться к врачу",
				organizationId: "org-test-1",
			};
			const reply1 = manager.handleMessage(msg1, sampleSlots);
			assert.equal(reply1.nextStep, "awaiting_specialty");
			assert.ok(reply1.buttons && reply1.buttons.length > 0);

			// Step 2: Patient selects therapy
			const msg2: IncomingBotMessage = {
				channel: "telegram",
				senderId,
				text: "терапевт",
				organizationId: "org-test-1",
			};
			const reply2 = manager.handleMessage(msg2, sampleSlots);
			assert.equal(reply2.nextStep, "awaiting_slot");
			assert.ok(reply2.text.includes("д-р Иванов И.И."));

			// Step 3: Patient chooses slot-01
			const msg3: IncomingBotMessage = {
				channel: "telegram",
				senderId,
				text: "10:00",
				payload: "book:slot:slot-01",
				organizationId: "org-test-1",
			};
			const reply3 = manager.handleMessage(msg3, sampleSlots);
			assert.equal(reply3.nextStep, "awaiting_confirmation");
			assert.ok(reply3.text.includes("10:00"));

			// Step 4: Patient confirms booking
			const msg4: IncomingBotMessage = {
				channel: "telegram",
				senderId,
				text: "Подтверждаю",
				payload: "book:confirm:slot-01",
				organizationId: "org-test-1",
			};
			const reply4 = manager.handleMessage(msg4, sampleSlots);
			assert.equal(reply4.actionExecuted, "APPOINTMENT_BOOKED");
			assert.ok(reply4.text.includes("успешно подтверждена"));
		});

		it("3.2 acute emergency triggers immediate CITO escalation and alerts clinic", () => {
			const manager = new BotDialogManager();
			const msg: IncomingBotMessage = {
				channel: "whatsapp",
				senderId: "+79001112233",
				text: "Помогите, острая боль в челюсти, температура 38.5!",
				organizationId: "org-test-1",
			};

			const reply = manager.handleMessage(msg, sampleSlots);
			assert.equal(reply.handoverToOperator, true);
			assert.equal(reply.actionExecuted, "CITO_EMERGENCY_TRIGGERED");
			assert.ok(reply.text.includes("не согревайте щеку"));

			const ctx = manager.getOrCreateContext("whatsapp", "org-test-1", "+79001112233");
			assert.equal(ctx.handoverActive, true);
			assert.equal(ctx.currentState, "handover_operator");
		});

		it("3.3 suppresses bot auto-reply when human operator takes over, resumes when released", () => {
			const manager = new BotDialogManager();
			const senderId = "+79112223344";
			const ctx = manager.getOrCreateContext("vk", "org-test-1", senderId);

			// Operator takes over
			OperatorHandoverService.takeoverByOperator(ctx, "op-42", "Мария");
			assert.equal(ctx.handoverActive, true);

			// Next patient message
			const msg: IncomingBotMessage = {
				channel: "vk",
				senderId,
				text: "А где вход во двор?",
				organizationId: "org-test-1",
			};
			const reply = manager.handleMessage(msg, sampleSlots);
			assert.equal(reply.text, "");
			assert.equal(reply.handoverToOperator, true);

			// Operator releases back to bot
			OperatorHandoverService.releaseToBot(ctx);
			assert.equal(ctx.handoverActive, false);

			// Patient message is now handled by bot again
			const msg2: IncomingBotMessage = {
				channel: "vk",
				senderId,
				text: "Сколько стоит чистка зубов?",
				organizationId: "org-test-1",
			};
			const reply2 = manager.handleMessage(msg2, sampleSlots);
			assert.ok(reply2.text.includes("профгигиена"));
		});

		it("3.4 evicts expired sessions based on TTL", () => {
			const manager = new BotDialogManager(100); // 100ms TTL
			const ctx = manager.getOrCreateContext("telegram", "org-1", "user-1");
			assert.ok(ctx);

			// Advance time by 200ms
			const evicted = manager.expireOldSessions(Date.now() + 200);
			assert.equal(evicted, 1);
			assert.equal(manager.getContext(ctx.dialogId), undefined);
		});
	});
});
