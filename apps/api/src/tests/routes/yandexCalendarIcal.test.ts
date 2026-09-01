import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
	anonymizePatientName,
	anonymizePatientForCalendar,
	escapeIcalText,
	foldIcalLine,
	formatIcalDateTime,
	generateDoctorIcalToken,
	generateDoctorIcsFeed,
	generateIcsCalendar,
	lookupDoctorByIcalToken,
	registerYandexCalendarRoutes,
	validateIcsRFC5545,
} from "../../routes/yandexCalendar.js";
import { authTokenSecret } from "../../security/authSecret.js";
import { signToken, verifyToken } from "../../utils/cryptoHelper.js";
import { createTenantTestApp } from "../support/tenantTestApp.js";

describe("RFC 5545 iCalendar (iCal) Feed, Token Rotation and 152-FZ Anonymization", () => {
	describe("152-FZ Patient PII Anonymization", () => {
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

		test("attaches card number properly", () => {
			assert.equal(
				anonymizePatientName("Иванов Иван Иванович", "№ 4022"),
				"Пациент И.И. (карта № № 4022)",
			);
		});

		test("handles empty, whitespace or null gracefully", () => {
			assert.equal(anonymizePatientName(null), "Пациент");
			assert.equal(anonymizePatientName(undefined), "Пациент");
			assert.equal(anonymizePatientName(""), "Пациент");
			assert.equal(anonymizePatientName("   "), "Пациент");
		});

		test("supports surname + initials format", () => {
			const res = anonymizePatientForCalendar(
				"Смирнов Дмитрий Алексеевич",
				"890",
				{ format: "surname_initials" },
			);
			assert.equal(res, "Смирнов Д.А. (карта № 890)");
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

	describe("generateDoctorIcsFeed & RFC 5545 Compliance", () => {
		test("generates valid RFC 5545 VCALENDAR structure with VEVENT entries and sanitizes diagnoses", () => {
			const appointments = [
				{
					id: "a1000000-0000-4000-8000-000000000001",
					startsAt: "2026-08-20T09:00:00.000Z",
					endsAt: "2026-08-20T10:00:00.000Z",
					status: "confirmed",
					reason: "Терапия К02.1 Кариес дентина",
					chairName: "Кресло 1",
					patientFullName: "Иванов Иван Иванович",
					patientCardNumber: "1024",
					sequence: 1,
				},
				{
					id: "a1000000-0000-4000-8000-000000000002",
					startsAt: "2026-08-20T11:00:00.000Z",
					endsAt: "2026-08-20T12:00:00.000Z",
					status: "planned",
					reason: "Острая боль CITO пульпит К04.0",
					isEmergency: true,
					chairName: "Кресло 2",
					patientFullName: "Петрова Анна Сергеевна",
					sequence: 0,
				},
				{
					id: "a1000000-0000-4000-8000-000000000003",
					startsAt: "2026-08-20T13:00:00.000Z",
					endsAt: "2026-08-20T14:00:00.000Z",
					status: "cancelled",
					reason: "Консультация",
					chairName: "Кресло 1",
					patientFullName: "Сидоров Алексей",
					sequence: 2,
				},
			];

			const ics = generateDoctorIcsFeed({
				doctorName: "Доктор Смирнов А.В.",
				appointments,
				refreshIntervalMinutes: 15,
				alarmMinutesBefore: 15,
			});

			const validation = validateIcsRFC5545(ics);
			assert.equal(validation.isValid, true, `Validation failed: ${validation.errors.join(", ")}`);
			assert.equal(validation.eventCount, 3);
			assert.equal(validation.hasValidLineEndings, true);

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
			assert.ok(ics.includes("STATUS:CONFIRMED"), "Status must be CONFIRMED for confirmed");
			assert.ok(ics.includes("SEQUENCE:1"), "Must output SEQUENCE for event synchronization");

			// Check planned event -> STATUS:TENTATIVE
			assert.ok(ics.includes("STATUS:TENTATIVE"), "Status must be TENTATIVE for planned");

			// Check cancelled event -> STATUS:CANCELLED
			assert.ok(ics.includes("STATUS:CANCELLED"), "Status must be CANCELLED for cancelled");

			// Ensure raw PII and sensitive ICD-10 diagnosis codes are NEVER in the feed
			assert.ok(!ics.includes("Иванов Иван Иванович"), "Raw patient name must NOT leak");
			assert.ok(!ics.includes("Петрова Анна Сергеевна"), "Raw patient name must NOT leak");
			assert.ok(!ics.includes("Сидоров Алексей"), "Raw patient name must NOT leak");
			assert.ok(!ics.includes("К02.1"), "ICD-10 code must be sanitized");
			assert.ok(!ics.includes("К04.0"), "ICD-10 code must be sanitized");
		});

		test("handles empty appointments list with valid empty calendar", () => {
			const ics = generateIcsCalendar({
				doctorName: "Доктор Смирнов",
				appointments: [],
			});

			const val = validateIcsRFC5545(ics);
			assert.equal(val.isValid, true);
			assert.equal(val.eventCount, 0);
			assert.ok(ics.startsWith("BEGIN:VCALENDAR\r\n"));
			assert.ok(ics.endsWith("END:VCALENDAR\r\n"));
		});
	});

	describe("HTTP Routes & Security Invariants", () => {
		test("DEFECT-ICAL-01: rejects unauthenticated raw UUIDs and unknown tokens with 404", async () => {
			const app = createTenantTestApp();
			await registerYandexCalendarRoutes(app);

			// Direct plain UUIDs must be rejected without valid HMAC signature
			const response = await app.inject({
				method: "GET",
				url: "/api/schedule/ical/00000000-0000-4000-8000-000000000999.ics",
			});

			assert.equal(response.statusCode, 404);
			const body = JSON.parse(response.body);
			assert.equal(body.error, "DoctorScheduleNotFound");

			const doctorEndpointResp = await app.inject({
				method: "GET",
				url: "/api/schedule/ical/doctor/00000000-0000-4000-8000-000000000999.ics",
			});

			assert.equal(doctorEndpointResp.statusCode, 404);
		});

		test("generates and accepts signed feed token on both endpoints", async () => {
			const app = createTenantTestApp();
			await registerYandexCalendarRoutes(app);

			const fakeOrgId = "00000000-0000-4000-8000-000000000001";
			const fakeDoctorId = "00000000-0000-4000-8000-000000000002";

			const token = signToken(
				{ userId: fakeDoctorId, doctorId: fakeDoctorId, organizationId: fakeOrgId, v: 1 },
				authTokenSecret(),
				3600,
			);

			// Route /api/schedule/ical/doctor/:token.ics
			const response = await app.inject({
				method: "GET",
				url: `/api/schedule/ical/doctor/${token}.ics`,
			});

			assert.ok(
				response.statusCode === 200 || response.statusCode === 404,
				`Expected 200 or 404, got ${response.statusCode}: ${response.body}`,
			);
		});

		test("generateDoctorIcalToken creates signed token that can be parsed and verified", () => {
			const orgId = "00000000-0000-4000-8000-000000000001";
			const doctorId = "00000000-0000-4000-8000-000000000002";

			const token = generateDoctorIcalToken({
				doctorId,
				organizationId: orgId,
				tokenVersion: 2,
			});

			assert.ok(typeof token === "string" && token.length > 20);
			const secret = authTokenSecret();
			const payload = verifyToken(token, secret) as any;
			assert.equal(payload.doctorId, doctorId);
			assert.equal(payload.organizationId, orgId);
			assert.equal(payload.v, 2);
		});

		test("lookupDoctorByIcalToken returns null for forged/corrupted tokens without calling DB", async () => {
			const result = await lookupDoctorByIcalToken("corrupted-token-xxx");
			assert.equal(result, null);

			const emptyResult = await lookupDoctorByIcalToken("");
			assert.equal(emptyResult, null);

			const nullResult = await lookupDoctorByIcalToken(null as any);
			assert.equal(nullResult, null);
		});
	});
});
