import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	TrojanCloserEngine,
	isWithinQuietHours,
	isOptOutPhrase,
} from "./closerEngine.js";
import type { CloserLeadCandidate } from "./competitorDbImporter.js";

function makeMockCandidate(overrides: Partial<CloserLeadCandidate> = {}): CloserLeadCandidate {
	return {
		id: "cand_test_1",
		rawIndex: 1,
		fullName: "Смирнов Алексей Викторович",
		firstName: "Алексей",
		lastName: "Смирнов",
		phone: "+79261234567",
		isPhoneValid: true,
		estimateSumRub: 140_000,
		consultationDate: "2026-10-06",
		lastVisitDate: null,
		daysSinceConsultation: 3,
		daysSinceLastVisit: null,
		doctorName: "Д-р Кузнецов",
		treatmentNotes: "Имплантация 2 ед.",
		category: "abandoned_estimate_hot",
		sourceSystem: "ident",
		metadata: {},
		...overrides,
	};
}

describe("closerEngine (Trojan Closer & Recall Cadences)", () => {
	it("progresses through 3-step abandoned estimate cadence correctly", () => {
		const engine = new TrojanCloserEngine();
		const candidate = makeMockCandidate({ category: "abandoned_estimate_hot" });

		// Шаг 1: День 3
		const step1 = engine.evaluateNextMessage(candidate);
		assert.ok(step1);
		assert.equal(step1.stepId, "day_3_soft_reminder");
		assert.ok(step1.text.includes("Алексей"));
		assert.ok(step1.text.replace(/[\s\u00A0\u202F]+/g, " ").includes("140 000"));
		assert.ok(step1.buttons.some((b) => b.action === "request_pdf"));
		assert.ok(step1.buttons.some((b) => b.action === "book_slot"));

		// Записываем отправку шага 1
		engine.recordMessageSent(candidate.id, step1);

		// Шаг 2: День 7 (фиксация цены)
		const step2 = engine.evaluateNextMessage(candidate);
		assert.ok(step2);
		assert.equal(step2.stepId, "day_7_price_lock");
		assert.ok(step2.buttons.some((b) => b.action === "lock_price"));

		engine.recordMessageSent(candidate.id, step2);

		// Шаг 3: День 14 (докторский аудит сомнений)
		const step3 = engine.evaluateNextMessage(candidate);
		assert.ok(step3);
		assert.equal(step3.stepId, "day_14_doctor_audit");
		assert.ok(step3.buttons.some((b) => b.action === "request_call"));
	});

	it("handles patient opt-out via button and stop words", () => {
		const engine = new TrojanCloserEngine();
		const cand = makeMockCandidate({ id: "cand_opt_out" });

		const step1 = engine.evaluateNextMessage(cand);
		assert.ok(step1);
		engine.recordMessageSent(cand.id, step1);

		// Пациент нажал кнопку "Неактуально"
		const feedback = engine.handlePatientFeedback(cand.id, "opt_out", "");
		assert.equal(feedback.newStatus, "unsubscribed");
		assert.equal(feedback.isUnsubscribed, true);

		// После отписки никаких новых сообщений формироваться не должно!
		const nextStep = engine.evaluateNextMessage(cand);
		assert.equal(nextStep, null);

		// Проверка детектора стоп-слов
		assert.equal(isOptOutPhrase("Пожалуйста, отпишитесь от меня"), true);
		assert.equal(isOptOutPhrase("хватит слать спам"), true);
		assert.equal(isOptOutPhrase("стоп"), true);
		assert.equal(isOptOutPhrase("Сколько стоит коронка?"), false);
	});

	it("converts lead when patient clicks lock_price or book_slot", () => {
		const engine = new TrojanCloserEngine();
		const cand = makeMockCandidate({ id: "cand_convert" });

		const step1 = engine.evaluateNextMessage(cand);
		assert.ok(step1);
		engine.recordMessageSent(cand.id, step1);

		// Пациент нажимает "Зафиксировать цену"
		const result = engine.handlePatientFeedback(cand.id, "lock_price");
		assert.equal(result.isConverted, true);
		assert.equal(result.newStatus, "converted");
		assert.ok(result.replyText.includes("зафиксирована"));

		// После конверсии бот больше не спамит рассылкой
		assert.equal(engine.evaluateNextMessage(cand), null);
	});

	it("processes preventive hygiene recall at 5.5 months and overdue recall", () => {
		const engine = new TrojanCloserEngine();
		const candRecall = makeMockCandidate({
			id: "cand_recall",
			category: "recall_due",
			lastVisitDate: "2026-04-15",
			daysSinceLastVisit: 177,
		});

		const proposal = engine.evaluateNextMessage(candRecall);
		assert.ok(proposal);
		assert.equal(proposal.stepId, "recall_5_5_months");
		assert.ok(proposal.buttons.some((b) => b.action === "book_recall"));
	});

	it("runs urgent slot campaign with first-come-first-served locking", () => {
		const engine = new TrojanCloserEngine();
		const cand1 = makeMockCandidate({ id: "cand_u1", firstName: "Ольга" });
		const cand2 = makeMockCandidate({ id: "cand_u2", firstName: "Дмитрий" });

		const campaign = engine.startUrgentSlotFill({
			slotId: "slot_urgent_1500",
			doctorName: "Д-р Кузнецов",
			dateIso: "2026-10-09",
			startTime: "15:00",
			durationMinutes: 60,
			waitingList: [cand1, cand2],
		});

		assert.equal(campaign.proposals.length, 2);
		assert.equal(campaign.urgentState.status, "open");

		// Первый пациент подтверждает слот
		const claim1 = engine.claimUrgentSlot("slot_urgent_1500", cand1.id);
		assert.equal(claim1.success, true);
		assert.ok(claim1.message.includes("успешно закреплено"));

		// Второй пациент пытается подтвердить уже занятый слот
		const claim2 = engine.claimUrgentSlot("slot_urgent_1500", cand2.id);
		assert.equal(claim2.success, false);
		assert.ok(claim2.message.includes("уже занял другой пациент"));
	});

	it("checks quiet hours boundary conditions (09:00 - 21:00)", () => {
		// 23:00 - тихий час (true)
		const lateNight = new Date("2026-10-09T23:00:00");
		assert.equal(isWithinQuietHours(lateNight), true);

		// 03:00 ночи - тихий час (true)
		const earlyMorning = new Date("2026-10-09T03:00:00");
		assert.equal(isWithinQuietHours(earlyMorning), true);

		// 14:00 дня - разрешено (false)
		const dayTime = new Date("2026-10-09T14:00:00");
		assert.equal(isWithinQuietHours(dayTime), false);
	});
});
