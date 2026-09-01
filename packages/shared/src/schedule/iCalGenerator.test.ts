import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
	anonymizePatientForCalendar,
	anonymizePatientName,
	buildGoogleCalendarSubscriptionUrl,
	buildWebcalUrl,
	buildYandexCalendarSubscriptionUrl,
	escapeIcalText,
	foldIcalLine,
	formatIcalDateTime,
	generateDoctorIcsFeed,
	generateIcsCalendar,
	validateIcsRFC5545,
} from "./iCalGenerator.js";

describe("iCalGenerator & RFC 5545 Engine", () => {
	describe("152-FZ Patient PII Anonymization", () => {
		test("anonymizes standard 3-word Russian name to initials", () => {
			assert.equal(anonymizePatientName("Иванов Иван Иванович"), "Пациент И.И.");
		});

		test("anonymizes 2-word Russian name to initials", () => {
			assert.equal(anonymizePatientName("Смирнова Екатерина"), "Пациент С.Е.");
		});

		test("attaches medical card number when provided", () => {
			assert.equal(
				anonymizePatientName("Кузнецов Петр Алексеевич", "1042-А"),
				"Пациент К.П. (карта № 1042-А)",
			);
		});

		test("supports surname + initials format for doctor view", () => {
			const formatted = anonymizePatientForCalendar(
				"Барабаш Сергей Васильевич",
				"778",
				{ format: "surname_initials" },
			);
			assert.equal(formatted, "Барабаш С.В. (карта № 778)");
		});

		test("handles empty and null inputs safely", () => {
			assert.equal(anonymizePatientName(null), "Пациент");
			assert.equal(anonymizePatientName(""), "Пациент");
			assert.equal(anonymizePatientName(undefined, "99"), "Пациент (карта № 99)");
		});

		test("preserves already anonymized labels", () => {
			assert.equal(anonymizePatientName("Пациент А.Б."), "Пациент А.Б.");
		});
	});

	describe("RFC 5545 Text Escaping", () => {
		test("escapes backslashes, semicolons, commas and newlines", () => {
			const raw = "Кариес; лечение, пломба\\осмотр\n2 этаж\r\nкаб. 4";
			const escaped = escapeIcalText(raw);
			assert.equal(escaped, "Кариес\\; лечение\\, пломба\\\\осмотр\\n2 этаж\\nкаб. 4");
		});
	});

	describe("RFC 5545 DateTime Formatting", () => {
		test("formats UTC ISO string correctly to YYYYMMDDTHHMMSSZ", () => {
			const date = new Date("2026-09-01T15:30:45.000Z");
			assert.equal(formatIcalDateTime(date), "20260901T153045Z");
		});

		test("handles invalid dates with safe fallback", () => {
			assert.equal(formatIcalDateTime("invalid"), "19700101T000000Z");
		});
	});

	describe("RFC 5545 Line Folding", () => {
		test("does not fold lines <= 75 octets", () => {
			const shortLine = "SUMMARY:Short Summary";
			assert.equal(foldIcalLine(shortLine), shortLine);
		});

		test("folds lines > 75 octets with CRLF and space", () => {
			const longLine =
				"DESCRIPTION:Очень длинное подробное описание приема стоматолога-терапевта в клинике Денте на Ленина";
			const folded = foldIcalLine(longLine, 50);
			assert.ok(folded.includes("\r\n "), "Must fold with CRLF and space");
			const reconstructed = folded.split("\r\n ").join("");
			assert.equal(reconstructed, longLine);
		});
	});

	describe("generateDoctorIcsFeed & Validation", () => {
		test("generates RFC 5545 compliant calendar feed and passes validation", () => {
			const appointments = [
				{
					id: "a1000000-0000-4000-8000-000000000001",
					startsAt: "2026-09-02T09:00:00.000Z",
					endsAt: "2026-09-02T10:00:00.000Z",
					status: "confirmed",
					reason: "Лечение кариеса",
					chairName: "Кресло 1 (Терапия)",
					patientFullName: "Иванов Иван Иванович",
					patientCardNumber: "1024",
					sequence: 1,
				},
				{
					id: "a1000000-0000-4000-8000-000000000002",
					startsAt: "2026-09-02T11:00:00.000Z",
					endsAt: "2026-09-02T12:00:00.000Z",
					status: "planned",
					reason: "Острая боль пульпит",
					isEmergency: true,
					chairName: "Кресло 2",
					patientFullName: "Петрова Анна Сергеевна",
					patientCardNumber: "1025",
					sequence: 0,
				},
				{
					id: "a1000000-0000-4000-8000-000000000003",
					startsAt: "2026-09-02T14:00:00.000Z",
					endsAt: "2026-09-02T14:30:00.000Z",
					status: "cancelled",
					reason: "Консультация",
					chairName: "Кресло 1",
					patientFullName: "Сидоров Алексей",
					sequence: 2,
				},
			];

			const ics = generateDoctorIcsFeed({
				doctorName: "Доктор Барабаш С.В.",
				appointments,
				refreshIntervalMinutes: 15,
				alarmMinutesBefore: 15,
			});

			// Validate with our RFC 5545 validator
			const val = validateIcsRFC5545(ics);
			assert.equal(val.isValid, true, `Validation failed: ${val.errors.join(", ")}`);
			assert.equal(val.eventCount, 3);
			assert.equal(val.hasValidLineEndings, true);
			assert.equal(val.prodId, "-//Dente Dental CRM//Doctor Schedule RFC 5545//RU");

			// Check structure invariants
			assert.ok(ics.startsWith("BEGIN:VCALENDAR\r\n"));
			assert.ok(ics.endsWith("END:VCALENDAR\r\n"));
			assert.ok(ics.includes("X-WR-CALNAME:Расписание врача — Доктор Барабаш С.В."));
			assert.ok(ics.includes("REFRESH-INTERVAL;VALUE=DURATION:PT15M"));

			// Check VEVENT #1 (confirmed)
			assert.ok(ics.includes("UID:appointment-a1000000-0000-4000-8000-000000000001@dental-crm"));
			assert.ok(ics.includes("DTSTART:20260902T090000Z"));
			assert.ok(ics.includes("DTEND:20260902T100000Z"));
			assert.ok(ics.includes("STATUS:CONFIRMED"));
			assert.ok(ics.includes("SEQUENCE:1"));
			assert.ok(ics.includes("Пациент И.И. (карта № 1024)"));

			// Check VEVENT #2 (emergency CITO)
			assert.ok(ics.includes("[CITO Острая боль]"));
			assert.ok(ics.includes("STATUS:TENTATIVE"));

			// Check VEVENT #3 (cancelled)
			assert.ok(ics.includes("STATUS:CANCELLED"));

			// Zero PII leaks: raw full names must NOT be in the feed
			assert.ok(!ics.includes("Иванов Иван Иванович"));
			assert.ok(!ics.includes("Петрова Анна Сергеевна"));
			assert.ok(!ics.includes("Сидоров Алексей"));
		});

		test("backward compatibility with generateIcsCalendar", () => {
			const ics = generateIcsCalendar({
				doctorName: "Доктор Смирнов",
				appointments: [],
			});
			const val = validateIcsRFC5545(ics);
			assert.equal(val.isValid, true);
			assert.equal(val.eventCount, 0);
		});
	});

	describe("Calendar URL Builders", () => {
		test("buildWebcalUrl converts http/https to webcal protocol", () => {
			assert.equal(
				buildWebcalUrl("https://example.com/api/schedule/ical/doc-token.ics"),
				"webcal://example.com/api/schedule/ical/doc-token.ics",
			);
			assert.equal(
				buildWebcalUrl("/api/schedule/ical/doc-token.ics", "https://crm.dente.ru"),
				"webcal://crm.dente.ru/api/schedule/ical/doc-token.ics",
			);
		});

		test("buildYandexCalendarSubscriptionUrl generates valid Yandex subscription link", () => {
			const url = buildYandexCalendarSubscriptionUrl(
				"/api/schedule/ical/doc-token.ics",
				"https://crm.dente.ru",
			);
			assert.ok(url.startsWith("https://calendar.yandex.ru/custom-import?url="));
			assert.ok(url.includes("crm.dente.ru"));
		});

		test("buildGoogleCalendarSubscriptionUrl generates valid Google webcal link", () => {
			const url = buildGoogleCalendarSubscriptionUrl(
				"/api/schedule/ical/doc-token.ics",
				"https://crm.dente.ru",
			);
			assert.ok(url.startsWith("https://calendar.google.com/calendar/render?cid="));
			assert.ok(url.includes("webcal%3A%2F%2Fcrm.dente.ru"));
		});
	});
});
