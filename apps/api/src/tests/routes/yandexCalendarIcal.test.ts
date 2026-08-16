import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
	anonymizePatientName,
	escapeIcalText,
	foldIcalLine,
	formatIcalDateTime,
	generateIcsCalendar,
	lookupDoctorByIcalToken,
	registerYandexCalendarRoutes,
} from "../../routes/yandexCalendar.js";
import { authTokenSecret } from "../../security/authSecret.js";
import { signToken } from "../../utils/cryptoHelper.js";
import { createTenantTestApp } from "../support/tenantTestApp.js";

describe("RFC 5545 iCalendar (iCal) Feed and Anonymization", () => {
	describe("anonymizePatientName", () => {
		test("anonymizes standard three-word Russian full name", () => {
			assert.equal(
				anonymizePatientName("Иванов Иван Иванович"),
				"Пациент И.И.",
			);
		});

		test("anonymizes two-word Russian name", () => {
			assert.equal(anonymizePatientName("Алексеев Иван"), "Пациент А.И.");
		});

		test("anonymizes single-word name", () => {
			assert.equal(anonymizePatientName("Петров"), "Пациент П.");
		});

		test("anonymizes Latin full name", () => {
			assert.equal(anonymizePatientName("John Doe"), "Пациент J.D.");
		});

		test("preserves already anonymized prefix", () => {
			assert.equal(anonymizePatientName("Пациент А.И."), "Пациент А.И.");
			assert.equal(anonymizePatientName("Пациент"), "Пациент");
		});

		test("handles empty, whitespace or null gracefully", () => {
			assert.equal(anonymizePatientName(null), "Пациент");
			assert.equal(anonymizePatientName(undefined), "Пациент");
			assert.equal(anonymizePatientName(""), "Пациент");
			assert.equal(anonymizePatientName("   "), "Пациент");
		});

		test("handles hyphenated surnames correctly", () => {
			assert.equal(
				anonymizePatientName("Мамин-Сибиряк Дмитрий"),
				"Пациент М.Д.",
			);
		});
	});

	describe("escapeIcalText", () => {
		test("escapes backslashes, semicolons, commas, and newlines", () => {
			const input = "Кариес; лечение, осмотр\\консультация\n2 этаж\r\nкаб 3";
			const escaped = escapeIcalText(input);
			assert.equal(
				escaped,
				"Кариес\\; лечение\\, осмотр\\\\консультация\\n2 этаж\\nкаб 3",
			);
		});
	});

	describe("formatIcalDateTime", () => {
		test("formats UTC date to RFC 5545 YYYYMMDDTHHMMSSZ format", () => {
			const date = new Date("2026-08-16T14:30:45.000Z");
			assert.equal(formatIcalDateTime(date), "20260816T143045Z");
		});

		test("handles invalid date gracefully", () => {
			assert.equal(formatIcalDateTime("invalid-date"), "19700101T000000Z");
		});
	});

	describe("foldIcalLine", () => {
		test("does not fold lines shorter than 75 chars", () => {
			const line = "SUMMARY:Short summary";
			assert.equal(foldIcalLine(line), line);
		});

		test("folds lines exceeding 75 chars with CRLF and space", () => {
			const line =
				"DESCRIPTION:Очень длинное описание приема у врача стоматолога-терапевта в клинике Денте на улице Ленина";
			const folded = foldIcalLine(line, 50);
			const parts = folded.split("\r\n ");
			assert.ok(parts.length > 1, "Should be folded into multiple parts");
			assert.equal(parts.join(""), line);
		});
	});

	describe("generateIcsCalendar", () => {
		test("generates valid RFC 5545 VCALENDAR structure with VEVENT entries", () => {
			const appointments = [
				{
					id: "a1000000-0000-4000-8000-000000000001",
					startsAt: "2026-08-20T09:00:00.000Z",
					endsAt: "2026-08-20T10:00:00.000Z",
					status: "confirmed",
					reason: "Терапия",
					chairName: "Кресло 1",
					patientFullName: "Иванов Иван Иванович",
				},
				{
					id: "a1000000-0000-4000-8000-000000000002",
					startsAt: "2026-08-20T11:00:00.000Z",
					endsAt: "2026-08-20T12:00:00.000Z",
					status: "planned",
					reason: "Ортодонтия",
					chairName: "Кресло 2",
					patientFullName: "Петрова Анна Сергеевна",
				},
				{
					id: "a1000000-0000-4000-8000-000000000003",
					startsAt: "2026-08-20T13:00:00.000Z",
					endsAt: "2026-08-20T14:00:00.000Z",
					status: "cancelled",
					reason: "Консультация",
					chairName: "Кресло 1",
					patientFullName: "Сидоров Алексей",
				},
			];

			const ics = generateIcsCalendar({
				doctorName: "Доктор Смирнов А.В.",
				appointments,
			});

			// Line endings must be CRLF
			assert.ok(ics.includes("\r\n"), "iCalendar must use CRLF line endings");
			assert.ok(ics.startsWith("BEGIN:VCALENDAR\r\n"), "Must start with BEGIN:VCALENDAR");
			assert.ok(ics.endsWith("END:VCALENDAR\r\n"), "Must end with END:VCALENDAR");
			assert.ok(ics.includes("VERSION:2.0\r\n"), "Must specify VERSION:2.0");
			assert.ok(
				ics.includes("PRODID:-//Dente Dental CRM//Doctor Schedule RFC 5545//RU\r\n"),
				"Must specify PRODID",
			);
			assert.ok(
				ics.includes("X-WR-CALNAME:Расписание врача — Доктор Смирнов А.В."),
				"Must include calendar name",
			);

			// Check first event
			assert.ok(ics.includes("BEGIN:VEVENT"), "Must contain VEVENT");
			assert.ok(
				ics.includes("UID:appointment-a1000000-0000-4000-8000-000000000001@dental-crm"),
				"Must contain UID",
			);
			assert.ok(ics.includes("DTSTART:20260820T090000Z"), "Must format DTSTART in UTC");
			assert.ok(ics.includes("DTEND:20260820T100000Z"), "Must format DTEND in UTC");
			assert.ok(
				ics.includes("SUMMARY:Приём: Терапия (Пациент И.И.)"),
				"Summary must anonymize patient name to initials",
			);
			assert.ok(ics.includes("STATUS:CONFIRMED"), "Status must be CONFIRMED for confirmed");

			// Check planned event -> STATUS:TENTATIVE
			assert.ok(
				ics.includes("SUMMARY:Приём: Ортодонтия (Пациент П.А.)"),
				"Summary must anonymize Petrowa Anna to П.А.",
			);
			assert.ok(ics.includes("STATUS:TENTATIVE"), "Status must be TENTATIVE for planned");

			// Check cancelled event -> STATUS:CANCELLED
			assert.ok(
				ics.includes("SUMMARY:Приём: Консультация (Пациент С.А.)"),
				"Summary must anonymize Sidorov Alexey to С.А.",
			);
			assert.ok(ics.includes("STATUS:CANCELLED"), "Status must be CANCELLED for cancelled");

			// Ensure raw PII is NEVER in the feed
			assert.ok(!ics.includes("Иванов Иван Иванович"), "Raw patient name must NOT leak");
			assert.ok(!ics.includes("Петрова Анна Сергеевна"), "Raw patient name must NOT leak");
			assert.ok(!ics.includes("Сидоров Алексей"), "Raw patient name must NOT leak");
		});

		test("handles empty appointments list with valid empty calendar", () => {
			const ics = generateIcsCalendar({
				doctorName: "Доктор Смирнов",
				appointments: [],
			});

			assert.ok(ics.startsWith("BEGIN:VCALENDAR\r\n"));
			assert.ok(ics.endsWith("END:VCALENDAR\r\n"));
			assert.ok(!ics.includes("BEGIN:VEVENT"));
		});
	});

	describe("HTTP Route: GET /api/schedule/ical/:token", () => {
		test("responds 404 for unknown doctor subscription token", async () => {
			const app = createTenantTestApp();
			await registerYandexCalendarRoutes(app);

			const response = await app.inject({
				method: "GET",
				url: "/api/schedule/ical/00000000-0000-4000-8000-000000000999.ics",
			});

			assert.equal(response.statusCode, 404);
			const body = JSON.parse(response.body);
			assert.equal(body.error, "DoctorScheduleNotFound");
		});

		test("generates and accepts signed feed token", async () => {
			const app = createTenantTestApp();
			await registerYandexCalendarRoutes(app);

			const fakeOrgId = "00000000-0000-4000-8000-000000000001";
			const fakeDoctorId = "00000000-0000-4000-8000-000000000002";

			const token = signToken(
				{ userId: fakeDoctorId, doctorId: fakeDoctorId, organizationId: fakeOrgId },
				authTokenSecret(),
				3600,
			);

			// Route should correctly strip .ics and route to lookup
			const response = await app.inject({
				method: "GET",
				url: `/api/schedule/ical/${token}.ics`,
			});

			// Either 404 (if user not in DB) or 200 (if user exists), but NOT 400 or 500
			assert.ok(
				response.statusCode === 200 || response.statusCode === 404,
				`Expected 200 or 404, got ${response.statusCode}: ${response.body}`,
			);
		});

		test("feed-url endpoint returns signed subscription URL for authenticated staff", async () => {
			const app = createTenantTestApp();
			await registerYandexCalendarRoutes(app);

			const orgId = "00000000-0000-4000-8000-000000000001";
			const staffId = "00000000-0000-4000-8000-000000000002";

			const staffToken = signToken(
				{
					userId: staffId,
					organizationId: orgId,
					role: "doctor",
					fullName: "Тестовый Врач",
				},
				authTokenSecret(),
				3600,
			);

			const response = await app.inject({
				method: "GET",
				url: "/api/integrations/yandex-calendar/feed-url",
				headers: {
					"x-dente-staff-token": staffToken,
				},
			});

			assert.equal(response.statusCode, 200);
			const body = JSON.parse(response.body);
			assert.equal(body.doctorId, staffId);
			assert.ok(body.feedUrl.startsWith("/api/schedule/ical/"));
			assert.ok(body.feedUrl.endsWith(".ics"));
		});
	});
});
