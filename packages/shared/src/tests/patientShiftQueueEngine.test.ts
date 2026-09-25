import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	buildPatientShiftQueue,
	calculateChairDuration,
	calculateWaitTime,
	formatChairDurationRu,
	formatWaitTimeRu,
	getAvailableQueueActions,
	mapOperationalStatusToDbStatus,
	mapOperationalStatusToQueueTab,
	resolveOperationalStatus,
	type PatientOperationalStatus,
} from "../schedule/patientShiftQueueEngine.js";

describe("Patient Shift Queue & Live Operational Board Engine (StomX Parity)", () => {
	// ─────────────────────────────────────────────────────────────────────────
	// 1. Operational Status Resolution
	// ─────────────────────────────────────────────────────────────────────────
	describe("1. Operational Status Resolution & Aliases", () => {
		it("resolves in_chair, in_treatment, in_progress to in_chair", () => {
			assert.equal(resolveOperationalStatus("in_chair"), "in_chair");
			assert.equal(resolveOperationalStatus("in_treatment"), "in_chair");
			assert.equal(resolveOperationalStatus("IN_TREATMENT"), "in_chair");
			assert.equal(resolveOperationalStatus("in_progress"), "in_chair");
		});

		it("resolves arrived and waiting to arrived", () => {
			assert.equal(resolveOperationalStatus("arrived"), "arrived");
			assert.equal(resolveOperationalStatus("ARRIVED"), "arrived");
			assert.equal(resolveOperationalStatus("waiting"), "arrived");
		});

		it("resolves ready_for_checkout and payment_pending", () => {
			assert.equal(
				resolveOperationalStatus("ready_for_checkout"),
				"ready_for_checkout",
			);
			assert.equal(
				resolveOperationalStatus("payment_pending"),
				"ready_for_checkout",
			);
			assert.equal(
				resolveOperationalStatus("waiting_payment"),
				"ready_for_checkout",
			);
		});

		it("resolves ready_for_checkout from comment tags", () => {
			assert.equal(
				resolveOperationalStatus("in_treatment", "Осмотр [ready_for_checkout]"),
				"ready_for_checkout",
			);
			assert.equal(
				resolveOperationalStatus("in_treatment", "Терапия [Ожидает расчета]"),
				"ready_for_checkout",
			);
			assert.equal(
				resolveOperationalStatus("in_chair", "Лечение кариеса [На кассу]"),
				"ready_for_checkout",
			);
		});

		it("resolves completed, cancelled, no_show, confirmed, planned", () => {
			assert.equal(resolveOperationalStatus("completed"), "completed");
			assert.equal(resolveOperationalStatus("done"), "completed");
			assert.equal(resolveOperationalStatus("cancelled"), "cancelled");
			assert.equal(resolveOperationalStatus("no_show"), "no_show");
			assert.equal(resolveOperationalStatus("confirmed"), "confirmed");
			assert.equal(resolveOperationalStatus("planned"), "planned");
			assert.equal(resolveOperationalStatus(""), "planned");
		});

		it("maps operational status to DB status safely", () => {
			assert.equal(mapOperationalStatusToDbStatus("in_chair"), "in_treatment");
			assert.equal(
				mapOperationalStatusToDbStatus("ready_for_checkout"),
				"in_treatment",
			);
			assert.equal(mapOperationalStatusToDbStatus("arrived"), "arrived");
			assert.equal(mapOperationalStatusToDbStatus("completed"), "completed");
			assert.equal(mapOperationalStatusToDbStatus("confirmed"), "confirmed");
			assert.equal(mapOperationalStatusToDbStatus("planned"), "planned");
			assert.equal(mapOperationalStatusToDbStatus("cancelled"), "cancelled");
			assert.equal(mapOperationalStatusToDbStatus("no_show"), "no_show");
		});

		it("maps operational status to queue tab correctly", () => {
			assert.equal(mapOperationalStatusToQueueTab("arrived"), "waiting");
			assert.equal(mapOperationalStatusToQueueTab("in_chair"), "in_chair");
			assert.equal(
				mapOperationalStatusToQueueTab("ready_for_checkout"),
				"checkout",
			);
			assert.equal(mapOperationalStatusToQueueTab("completed"), "completed");
			assert.equal(mapOperationalStatusToQueueTab("planned"), "scheduled");
			assert.equal(mapOperationalStatusToQueueTab("cancelled"), "cancelled");
		});
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 2. Wait Timer Calculations & Severity Rules
	// ─────────────────────────────────────────────────────────────────────────
	describe("2. Wait Timer Calculations & Severity (>15 min yellow, >30 min red)", () => {
		const baseTime = new Date("2026-09-25T10:00:00.000Z").getTime();

		it("formats wait time in clean Russian without emojis", () => {
			assert.equal(formatWaitTimeRu(0), "Только что прибыл");
			assert.equal(formatWaitTimeRu(8), "Ждет 8 мин");
			assert.equal(formatWaitTimeRu(21), "Ждет 21 мин");
		});

		it("calculates normal wait time (<= 15 min)", () => {
			const arrival = new Date("2026-09-25T10:00:00.000Z").toISOString();
			const now = baseTime + 8 * 60000; // 8 minutes later
			const result = calculateWaitTime(arrival, arrival, now);

			assert.equal(result.waitMinutes, 8);
			assert.equal(result.waitSeverity, "normal");
			assert.equal(result.waitFormatted, "Ждет 8 мин");
		});

		it("calculates warning wait time (16..30 min)", () => {
			const arrival = new Date("2026-09-25T10:00:00.000Z").toISOString();
			const now = baseTime + 18 * 60000; // 18 minutes later
			const result = calculateWaitTime(arrival, arrival, now);

			assert.equal(result.waitMinutes, 18);
			assert.equal(result.waitSeverity, "warning");
			assert.equal(result.waitFormatted, "Ждет 18 мин");
		});

		it("calculates critical wait time (> 30 min)", () => {
			const arrival = new Date("2026-09-25T10:00:00.000Z").toISOString();
			const now = baseTime + 35 * 60000; // 35 minutes later
			const result = calculateWaitTime(arrival, arrival, now);

			assert.equal(result.waitMinutes, 35);
			assert.equal(result.waitSeverity, "critical");
			assert.equal(result.waitFormatted, "Ждет 35 мин");
		});

		it("handles patient arrival earlier than appointment startsAt safely", () => {
			const scheduled = "2026-09-25T10:30:00.000Z";
			const arrived = "2026-09-25T10:15:00.000Z";
			const now = new Date("2026-09-25T10:25:00.000Z").getTime();
			const result = calculateWaitTime(scheduled, arrived, now);

			assert.equal(result.waitMinutes, 10);
			assert.equal(result.waitSeverity, "normal");
		});
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 3. Chair Duration Timer Calculations & Overtime
	// ─────────────────────────────────────────────────────────────────────────
	describe("3. Chair Duration Timer Calculations & Overtime", () => {
		const startsAt = "2026-09-25T10:00:00.000Z";
		const endsAt = "2026-09-25T10:30:00.000Z"; // 30 min planned
		const baseMs = new Date(startsAt).getTime();

		it("formats chair duration correctly", () => {
			assert.equal(formatChairDurationRu(24, 30), "В кресле 24 мин (из 30)");
			assert.equal(formatChairDurationRu(10), "В кресле 10 мин");
		});

		it("reports normal severity when within planned duration", () => {
			const nowMs = baseMs + 20 * 60000; // 20 min elapsed
			const result = calculateChairDuration(startsAt, endsAt, startsAt, nowMs);

			assert.equal(result.chairDurationMinutes, 20);
			assert.equal(result.plannedDurationMinutes, 30);
			assert.equal(result.isOvertime, false);
			assert.equal(result.overtimeMinutes, 0);
			assert.equal(result.chairDurationSeverity, "normal");
			assert.equal(result.chairDurationFormatted, "В кресле 20 мин (из 30)");
		});

		it("reports warning when exceeding planned duration by 1..15 min", () => {
			const nowMs = baseMs + 38 * 60000; // 38 min elapsed (8 min overtime)
			const result = calculateChairDuration(startsAt, endsAt, startsAt, nowMs);

			assert.equal(result.chairDurationMinutes, 38);
			assert.equal(result.isOvertime, true);
			assert.equal(result.overtimeMinutes, 8);
			assert.equal(result.chairDurationSeverity, "warning");
		});

		it("reports overtime severity when exceeding planned duration by >15 min", () => {
			const nowMs = baseMs + 52 * 60000; // 52 min elapsed (22 min overtime)
			const result = calculateChairDuration(startsAt, endsAt, startsAt, nowMs);

			assert.equal(result.chairDurationMinutes, 52);
			assert.equal(result.isOvertime, true);
			assert.equal(result.overtimeMinutes, 22);
			assert.equal(result.chairDurationSeverity, "overtime");
		});
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 4. 1-Click Status Progression Pipeline
	// ─────────────────────────────────────────────────────────────────────────
	describe("4. 1-Click Status Progression Pipeline", () => {
		it("provides Reception button 'Пациент пришел' -> status 'arrived'", () => {
			const actions = getAvailableQueueActions("planned");
			assert.ok(actions.primaryAction);
			assert.equal(actions.primaryAction.actionId, "mark_arrived");
			assert.equal(actions.primaryAction.labelRu, "Пациент пришел");
			assert.equal(actions.primaryAction.targetStatus, "arrived");
			assert.equal(actions.primaryAction.role, "reception");

			const confirmedActions = getAvailableQueueActions("confirmed");
			assert.equal(confirmedActions.primaryAction?.actionId, "mark_arrived");
		});

		it("provides Doctor button 'Пригласить в кабинет' -> status 'in_chair'", () => {
			const actions = getAvailableQueueActions("arrived");
			assert.ok(actions.primaryAction);
			assert.equal(actions.primaryAction.actionId, "invite_to_chair");
			assert.equal(actions.primaryAction.labelRu, "Пригласить в кабинет");
			assert.equal(actions.primaryAction.targetStatus, "in_chair");
			assert.equal(actions.primaryAction.role, "doctor");
		});

		it("provides Doctor button 'Завершить прием и отправить на кассу' -> status 'ready_for_checkout'", () => {
			const actions = getAvailableQueueActions("in_chair");
			assert.ok(actions.primaryAction);
			assert.equal(actions.primaryAction.actionId, "send_to_checkout");
			assert.equal(
				actions.primaryAction.labelRu,
				"Завершить прием и отправить на кассу",
			);
			assert.equal(actions.primaryAction.targetStatus, "ready_for_checkout");
			assert.equal(actions.primaryAction.role, "doctor");
		});

		it("provides Cashier button 'Чек пробит' -> status 'completed'", () => {
			const actions = getAvailableQueueActions("ready_for_checkout");
			assert.ok(actions.primaryAction);
			assert.equal(actions.primaryAction.actionId, "complete_checkout");
			assert.equal(actions.primaryAction.labelRu, "Чек пробит");
			assert.equal(actions.primaryAction.targetStatus, "completed");
			assert.equal(actions.primaryAction.role, "cashier");
		});

		it("provides null primary action for completed visits but secondary resumption", () => {
			const actions = getAvailableQueueActions("completed");
			assert.equal(actions.primaryAction, null);
			assert.ok(actions.secondaryActions.length > 0);
			assert.equal(actions.secondaryActions[0]?.actionId, "revert_to_chair");
		});
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 5. Complete Queue Categorization & Board Building
	// ─────────────────────────────────────────────────────────────────────────
	describe("5. Complete Queue Categorization & Board Building", () => {
		const targetDate = "2026-09-25";
		const nowMs = new Date("2026-09-25T11:00:00.000Z").getTime();

		const sampleAppointments = [
			{
				id: "apt-1",
				patientId: "pat-1",
				doctorUserId: "doc-1",
				chairId: "chair-1",
				startsAt: "2026-09-25T09:00:00.000Z",
				endsAt: "2026-09-25T09:40:00.000Z",
				status: "completed",
				reason: "Профгигиена полости рта",
			},
			{
				id: "apt-2",
				patientId: "pat-2",
				doctorUserId: "doc-1",
				chairId: "chair-1",
				startsAt: "2026-09-25T10:00:00.000Z",
				endsAt: "2026-09-25T10:45:00.000Z",
				status: "in_chair",
				reason: "Лечение кариеса 2.4",
			},
			{
				id: "apt-3",
				patientId: "pat-3",
				doctorUserId: "doc-2",
				chairId: "chair-2",
				startsAt: "2026-09-25T10:30:00.000Z",
				endsAt: "2026-09-25T11:15:00.000Z",
				status: "arrived",
				arrivedAt: "2026-09-25T10:35:00.000Z", // 25 min wait at 11:00 -> warning!
				reason: "Удаление ретенированного зуба 3.8",
			},
			{
				id: "apt-4",
				patientId: "pat-4",
				doctorUserId: "doc-1",
				chairId: "chair-1",
				startsAt: "2026-09-25T10:45:00.000Z",
				endsAt: "2026-09-25T11:15:00.000Z",
				status: "ready_for_checkout",
				reason: "Установка коронки E-max 1.6",
			},
			{
				id: "apt-5",
				patientId: "pat-5",
				doctorUserId: "doc-2",
				chairId: "chair-2",
				startsAt: "2026-09-25T12:00:00.000Z",
				endsAt: "2026-09-25T12:30:00.000Z",
				status: "confirmed",
				reason: "Консультация ортодонта",
			},
			{
				id: "apt-yesterday",
				patientId: "pat-old",
				doctorUserId: "doc-1",
				chairId: "chair-1",
				startsAt: "2026-09-24T12:00:00.000Z",
				endsAt: "2026-09-24T12:30:00.000Z",
				status: "confirmed",
				reason: "Вчерашний прием",
			},
		];

		const patientsById = new Map([
			["pat-1", { fullName: "Смирнова Елена Васильевна", phone: "+7 999 111-22-33" }],
			["pat-2", { fullName: "Барабаш Сергей Владимирович", phone: "+7 999 222-33-44" }],
			["pat-3", { fullName: "Кузнецов Иван Петрович", phone: "+7 999 333-44-55" }],
			["pat-4", { fullName: "Морозова Анна Дмитриевна", phone: "+7 999 444-55-66" }],
			["pat-5", { fullName: "Васильев Олег Игоревич", phone: "+7 999 555-66-77" }],
		]);

		const staffById = new Map([
			["doc-1", { name: "Д-р Иванов А.А.", specialty: "Терапевт" }],
			["doc-2", { name: "Д-р Петров Б.Б.", specialty: "Хирург" }],
		]);

		const chairsById = new Map([
			["chair-1", { name: "Кабинет 1 (Кресло 1)" }],
			["chair-2", { name: "Кабинет 2 (Хирургия)" }],
		]);

		it("filters appointments strictly for target date", () => {
			const queue = buildPatientShiftQueue(sampleAppointments, {
				targetDateKey: targetDate,
				nowMs,
				patientsById,
				staffById,
				chairsById,
			});

			assert.equal(queue.counts.all, 5, "Yesterday's appointment must be excluded");
		});

		it("correctly categorizes appointments into each operational queue tab", () => {
			const queue = buildPatientShiftQueue(sampleAppointments, {
				targetDateKey: targetDate,
				nowMs,
				patientsById,
				staffById,
				chairsById,
			});

			assert.equal(queue.counts.waiting, 1);
			assert.equal(queue.itemsByTab.waiting[0]?.id, "apt-3");
			assert.equal(queue.itemsByTab.waiting[0]?.patientName, "Кузнецов Иван Петрович");
			assert.equal(queue.itemsByTab.waiting[0]?.waitMinutes, 25);
			assert.equal(queue.itemsByTab.waiting[0]?.waitSeverity, "warning");

			assert.equal(queue.counts.in_chair, 1);
			assert.equal(queue.itemsByTab.in_chair[0]?.id, "apt-2");
			assert.equal(queue.itemsByTab.in_chair[0]?.patientName, "Барабаш Сергей Владимирович");

			assert.equal(queue.counts.checkout, 1);
			assert.equal(queue.itemsByTab.checkout[0]?.id, "apt-4");
			assert.equal(queue.itemsByTab.checkout[0]?.patientName, "Морозова Анна Дмитриевна");

			assert.equal(queue.counts.completed, 1);
			assert.equal(queue.itemsByTab.completed[0]?.id, "apt-1");
			assert.equal(queue.itemsByTab.completed[0]?.patientName, "Смирнова Елена Васильевна");
		});

		it("accurately counts waiting overtime (>15 min) and chair overtime", () => {
			const queue = buildPatientShiftQueue(sampleAppointments, {
				targetDateKey: targetDate,
				nowMs,
				patientsById,
				staffById,
				chairsById,
			});

			assert.equal(queue.summary.waitingOvertimeCount, 1, "Apt 3 has waited 25 min (>15 min)");
			assert.equal(queue.summary.inChairOvertimeCount, 1, "Apt 2 is in chair for 60 min (>45 min)");
		});

		it("filters queue by selected doctor", () => {
			const queueDoc1 = buildPatientShiftQueue(sampleAppointments, {
				targetDateKey: targetDate,
				nowMs,
				selectedDoctorId: "doc-1",
				patientsById,
				staffById,
				chairsById,
			});

			assert.equal(queueDoc1.counts.all, 3);
			assert.equal(queueDoc1.counts.waiting, 0, "Doc 1 has no waiting patients");
			assert.equal(queueDoc1.counts.in_chair, 1);
			assert.equal(queueDoc1.counts.checkout, 1);
			assert.equal(queueDoc1.counts.completed, 1);

			const queueDoc2 = buildPatientShiftQueue(sampleAppointments, {
				targetDateKey: targetDate,
				nowMs,
				selectedDoctorId: "doc-2",
				patientsById,
				staffById,
				chairsById,
			});

			assert.equal(queueDoc2.counts.all, 2);
			assert.equal(queueDoc2.counts.waiting, 1, "Doc 2 has 1 waiting patient");
		});

		it("filters queue by selected chair", () => {
			const queueChair1 = buildPatientShiftQueue(sampleAppointments, {
				targetDateKey: targetDate,
				nowMs,
				selectedChairId: "chair-1",
				patientsById,
				staffById,
				chairsById,
			});

			assert.equal(queueChair1.counts.all, 3);
		});
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 6. Zero Emojis Compliance Inspection (Mandates 8c, 8d)
	// ─────────────────────────────────────────────────────────────────────────
	describe("6. Zero Cartoon Emojis Compliance Inspection", () => {
		const emojiRegex =
			/[\u{1F300}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1FA70}-\u{1FAFF}]/u;

		it("proves 100% absence of cartoon emojis in wait time strings", () => {
			assert.equal(emojiRegex.test(formatWaitTimeRu(0)), false);
			assert.equal(emojiRegex.test(formatWaitTimeRu(8)), false);
			assert.equal(emojiRegex.test(formatWaitTimeRu(25)), false);
		});

		it("proves 100% absence of cartoon emojis in chair duration strings", () => {
			assert.equal(emojiRegex.test(formatChairDurationRu(20, 30)), false);
			assert.equal(emojiRegex.test(formatChairDurationRu(45)), false);
		});

		it("proves 100% absence of cartoon emojis in action labels", () => {
			const statuses: PatientOperationalStatus[] = [
				"planned",
				"confirmed",
				"arrived",
				"in_chair",
				"ready_for_checkout",
				"completed",
				"cancelled",
				"no_show",
			];

			for (const st of statuses) {
				const actions = getAvailableQueueActions(st);
				if (actions.primaryAction) {
					assert.equal(emojiRegex.test(actions.primaryAction.labelRu), false);
					assert.equal(emojiRegex.test(actions.primaryAction.roleRu), false);
				}
				for (const sec of actions.secondaryActions) {
					assert.equal(emojiRegex.test(sec.labelRu), false);
					assert.equal(emojiRegex.test(sec.roleRu), false);
				}
			}
		});
	});
});
