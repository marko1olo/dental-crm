import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { classifyBookingIntent } from "../bookingParserModules/bookingIntentClassifier.js";
import { parseBookingDate } from "../bookingParserModules/bookingDateParser.js";
import { parseBookingTime, parseBookingDuration } from "../bookingParserModules/bookingTimeParser.js";
import { matchBookingService, DURATION_MAP, REASON_NAMES } from "../bookingParserModules/bookingServiceMatcher.js";
import { matchDoctorsAndAssistants } from "../bookingParserModules/bookingDoctorMatcher.js";
import { matchPatientsAndChairs, resolveParticipants } from "../bookingParserModules/bookingPatientMatcher.js";
import type { Chair, Patient, StaffMember } from "@dental/shared";

describe("smartBookingModules: bookingIntentClassifier", () => {
	it("classifies create intent by default", () => {
		const result = classifyBookingIntent("Иванов на чистку завтра");
		assert.equal(result.action, "create");
		assert.equal(result.isCancel, false);
		assert.equal(result.isReschedule, false);
	});

	it("classifies cancel intent when trigger words are present", () => {
		const triggers = ["отмени запись", "удали прием", "удалите слот", "сними запись", "убери визит"];
		for (const t of triggers) {
			const result = classifyBookingIntent(`${t} Иванова`);
			assert.equal(result.action, "cancel", `Trigger: ${t}`);
			assert.equal(result.isCancel, true);
		}
	});

	it("classifies reschedule intent when trigger words are present", () => {
		const triggers = ["перенеси", "перезапиши", "перекинь", "сдвинь"];
		for (const t of triggers) {
			const result = classifyBookingIntent(`${t} Иванова на завтра`);
			assert.equal(result.action, "reschedule", `Trigger: ${t}`);
			assert.equal(result.isReschedule, true);
		}
	});
});

describe("smartBookingModules: bookingDateParser", () => {
	const fixedNow = new Date("2026-07-27T10:00:00+04:00");

	it("parses relative dates: сегодня, завтра, послезавтра", () => {
		const today = parseBookingDate("сегодня в 12:00", fixedNow);
		assert.equal(today.dateFound, true);
		assert.equal(today.targetDate.getDate(), 27);

		const tomorrow = parseBookingDate("завтра в 12:00", fixedNow);
		assert.equal(tomorrow.dateFound, true);
		assert.equal(tomorrow.targetDate.getDate(), 28);

		const dayAfter = parseBookingDate("послезавтра в 12:00", fixedNow);
		assert.equal(dayAfter.dateFound, true);
		assert.equal(dayAfter.targetDate.getDate(), 29);
	});

	it("parses explicit date with month safely without rollover bug", () => {
		const parsed = parseBookingDate("на 15 октября", fixedNow);
		assert.equal(parsed.dateFound, true);
		assert.equal(parsed.targetDate.getMonth(), 9); // October = 9
		assert.equal(parsed.targetDate.getDate(), 15);
	});

	it("moves past day to next period", () => {
		const parsed = parseBookingDate("на 5 число", fixedNow);
		assert.equal(parsed.dateFound, true);
		assert.equal(parsed.targetDate.getMonth(), 7); // August = 7 (next month after July)
		assert.equal(parsed.targetDate.getDate(), 5);
	});
});

describe("smartBookingModules: bookingTimeParser", () => {
	it("parses explicit durations", () => {
		assert.equal(parseBookingDuration("на 45 минут").durationMinutes, 45);
		assert.equal(parseBookingDuration("на полчаса").durationMinutes, 30);
		assert.equal(parseBookingDuration("на полтора часа").durationMinutes, 90);
		assert.equal(parseBookingDuration("на 2 часа").durationMinutes, 120);
		assert.equal(parseBookingDuration("на час").durationMinutes, 60);
	});

	it("parses time intervals 'с 14:00 до 15:30'", () => {
		const result = parseBookingTime("с 14:00 до 15:30");
		assert.equal(result.timeFound, true);
		assert.equal(result.hours, 14);
		assert.equal(result.minutes, 0);
		assert.equal(result.durationMinutes, 90);
		assert.equal(result.explicitDurationFound, true);
	});

	it("parses colloquial half-hour times", () => {
		const result = parseBookingTime("в пол третьего");
		assert.equal(result.timeFound, true);
		assert.equal(result.hours, 14);
		assert.equal(result.minutes, 30);
	});

	it("parses morning/evening hour hints", () => {
		const morning = parseBookingTime("в 10 утра");
		assert.equal(morning.hours, 10);

		const evening = parseBookingTime("в 6 вечера");
		assert.equal(evening.hours, 18);
	});
});

describe("smartBookingModules: bookingServiceMatcher", () => {
	it("matches procedure profiles to correct service names and durations", () => {
		const cleaning = matchBookingService("Иванов на чистку в 10:00", false);
		assert.equal(cleaning.reason, "Профгигиена");
		assert.equal(cleaning.durationMinutes, 45);

		const implant = matchBookingService("запиши на имплантацию", false);
		assert.equal(implant.reason, "Имплантация");
		assert.equal(implant.durationMinutes, 120);

		const crown = matchBookingService("установка коронки", false);
		assert.equal(crown.reason, "Коронка");
	});

	it("preserves explicit duration over default service duration", () => {
		const match = matchBookingService("чистка", false, 90, true);
		assert.equal(match.reason, "Профгигиена");
		assert.equal(match.durationMinutes, 90);
	});
});

describe("smartBookingModules: bookingDoctorMatcher & bookingPatientMatcher", () => {
	const staff: StaffMember[] = [
		{ id: "doc1", fullName: "Смирнов Алексей Игоревич", role: "doctor", active: true, specialties: ["Хирург"] },
		{ id: "ast1", fullName: "Ковалева Мария", role: "assistant", active: true },
	];
	const patients: Patient[] = [
		{ id: "pat1", fullName: "Иванов Сергей Павлович", active: true } as unknown as Patient,
		{ id: "pat2", fullName: "Смирнова Ольга", active: true } as unknown as Patient,
	];
	const chairs: Chair[] = [
		{ id: "ch1", name: "Кресло 1", active: true },
	];

	it("matches doctor with context preposition 'к Смирнову'", () => {
		const words = ["иванов", "к", "смирнову"];
		const { foundDocs } = matchDoctorsAndAssistants(words, staff);
		const { foundPats, foundChairs } = matchPatientsAndChairs(words, patients, chairs);
		const resolved = resolveParticipants(foundDocs, foundPats, [], foundChairs);

		assert.equal(resolved.doctorUserId, "doc1");
		assert.equal(resolved.patientId, "pat1");
	});

	it("matches chair name correctly", () => {
		const words = ["иванов", "кресло", "1"];
		const { foundPats, foundChairs } = matchPatientsAndChairs(words, patients, chairs);
		assert.ok(foundChairs.length > 0);
		assert.equal(foundChairs[0]?.id, "ch1");
	});
});
