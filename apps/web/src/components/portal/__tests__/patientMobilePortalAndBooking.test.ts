/**
 * Patient Mobile Portal & Online Booking Engine Unit Tests (Wave 18)
 * (DOMAIN: PORTAL FINANCIALS, SMS OTP, FDI TEETH, ICS CALENDAR & ONLINE BOOKING)
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	calculateBookingPrepayment,
	calculateFinancialSummary,
	filterAvailableDoctors,
	formatFdiToothName,
	formatRussianPhone,
	generateFnsTaxCertificateData,
	generateIcsCalendarEvent,
	generateSbpPaymentQrPayload,
	generateSmsOtpCode,
	generateTimeSlots,
	verifySmsOtpCode,
} from "../patientPortalEngine";
import { generateQrCodeSvg } from "../patientCabinet/patientCabinetEngine";
import {
	SAMPLE_BOOKING_DOCTORS,
	SAMPLE_BOOKING_SERVICES,
	SAMPLE_PORTAL_INVOICES,
	SAMPLE_PORTAL_PROFILE,
} from "../patientPortalPresets";

describe("Patient Mobile Portal & Online Booking Engine (Wave 18)", () => {
	describe("1. Financial Summary & 54-FZ Balances", () => {
		it("correctly calculates deposit, total paid, and remaining balances", () => {
			const summary = calculateFinancialSummary(SAMPLE_PORTAL_PROFILE, SAMPLE_PORTAL_INVOICES);

			assert.strictEqual(summary.depositBalanceRub, 14500);
			assert.strictEqual(summary.loyaltyBonusRub, 4200);
			assert.strictEqual(summary.cashbackPercent, 10);
			assert.strictEqual(SAMPLE_PORTAL_PROFILE.loyaltyTier, "Золотой статус (10%)");
			assert.strictEqual(SAMPLE_PORTAL_INVOICES.length, 3);
			assert.strictEqual(summary.paidInvoicesCount, 2);
			assert.strictEqual(summary.unpaidInvoicesCount, 1);
			assert.strictEqual(summary.hasUnpaidInvoices, true);
			assert.strictEqual(summary.totalPaidRub, 21300);
			assert.strictEqual(summary.totalRemainingRub, 28000);
		});
	});

	describe("2. FDI Tooth Naming (ISO 3950)", () => {
		it("formats upper right quadrant teeth correctly", () => {
			assert.strictEqual(formatFdiToothName("16"), "1.6 (Первый моляр ВЧ справа)");
			assert.strictEqual(formatFdiToothName("11"), "1.1 (Центральный резец ВЧ справа)");
		});

		it("formats lower right quadrant teeth correctly", () => {
			assert.strictEqual(formatFdiToothName("46"), "4.6 (Первый моляр НЧ справа)");
		});

		it("handles arbitrary numeric teeth gracefully", () => {
			assert.strictEqual(formatFdiToothName("24"), "2.4 (Первый премоляр ВЧ слева)");
			assert.strictEqual(formatFdiToothName(""), "Зуб ");
		});
	});

	describe("3. Phone Formatting & Normalization", () => {
		it("formats raw 10-digit number to Russian masked string", () => {
			const formatted = formatRussianPhone("9265551234");
			assert.strictEqual(formatted, "+7 (926) 555-12-34");
		});

		it("formats 11-digit starting with 7 or 8", () => {
			assert.strictEqual(formatRussianPhone("89265551234"), "+7 (926) 555-12-34");
			assert.strictEqual(formatRussianPhone("+79265551234"), "+7 (926) 555-12-34");
		});

		it("handles partial input gracefully", () => {
			assert.strictEqual(formatRussianPhone("+7926"), "+7 (926");
			assert.strictEqual(formatRussianPhone("+7926555"), "+7 (926) 555");
		});
	});

	describe("4. SMS OTP Generation & Verification", () => {
		it("generates deterministic or custom 4-digit code", () => {
			const { code, expiresAtIso } = generateSmsOtpCode("+7 (926) 555-12-34", "7788");
			assert.strictEqual(code, "7788");
			assert.ok(typeof expiresAtIso === "string");
		});

		it("verifies matching SMS code successfully", () => {
			assert.strictEqual(verifySmsOtpCode("7788", "7788"), true);
			assert.strictEqual(verifySmsOtpCode(" 7788 ", "7788"), true);
		});

		it("rejects mismatching or invalid SMS codes", () => {
			assert.strictEqual(verifySmsOtpCode("1234", "7788"), false);
			assert.strictEqual(verifySmsOtpCode("", "7788"), false);
			assert.strictEqual(verifySmsOtpCode("778", "7788"), false);
		});
	});

	describe("5. iCalendar (.ics) Event Generation", () => {
		it("generates RFC 5545 valid calendar content", () => {
			const ics = generateIcsCalendarEvent(
				"Прием в ДЕНТЕ: Д-р Смирнова",
				"Услуга: Лечение пульпита\nКабинет: 104",
				"г. Санкт-Петербург, Невский пр-т, 140",
				"2026-09-01T14:30:00",
				60,
			);

			assert.match(ics, /BEGIN:VCALENDAR/);
			assert.match(ics, /VERSION:2\.0/);
			assert.match(ics, /SUMMARY:Прием в ДЕНТЕ: Д-р Смирнова/);
			assert.match(ics, /LOCATION:.*Санкт-Петербург/);
			assert.match(ics, /DTSTART:20260901T103000Z/);
			assert.match(ics, /DTEND:20260901T113000Z/);
			assert.match(ics, /END:VCALENDAR/);
		});
	});

	describe("6. Doctor Filtering & Specialty Categories", () => {
		it("returns all doctors for 'all' filter in matching branch", () => {
			const docs = filterAvailableDoctors(SAMPLE_BOOKING_DOCTORS, "branch-central", "all");
			assert.ok(docs.length >= 2);
		});

		it("filters by surgery specialty correctly", () => {
			const surgeons = filterAvailableDoctors(SAMPLE_BOOKING_DOCTORS, "branch-central", "surgery");
			assert.strictEqual(surgeons.length, 1);
			assert.strictEqual(surgeons[0]!.specialtyCategory, "surgery");
		});

		it("filters by therapy specialty correctly", () => {
			const therapists = filterAvailableDoctors(SAMPLE_BOOKING_DOCTORS, "branch-central", "therapy");
			assert.strictEqual(therapists.length, 1);
			assert.strictEqual(therapists[0]!.specialtyCategory, "therapy");
		});
	});

	describe("7. Time Slot Grid Generation", () => {
		it("generates morning, afternoon, and evening time slots", () => {
			const slots = generateTimeSlots("doc-smirnov", "branch-central", "2026-09-01");
			assert.ok(slots.length > 5);

			const morning = slots.filter((s) => s.timePeriod === "morning");
			const afternoon = slots.filter((s) => s.timePeriod === "afternoon");
			const evening = slots.filter((s) => s.timePeriod === "evening");

			assert.ok(morning.length > 0);
			assert.ok(afternoon.length > 0);
			assert.ok(evening.length > 0);

			assert.strictEqual(morning[0]!.timeRu, "09:00");
			assert.strictEqual(afternoon[0]!.timeRu, "12:30");
			assert.strictEqual(evening[0]!.timeRu, "17:30");
		});
	});

	describe("8. Prepayment Calculation Logic", () => {
		it("calculates 0 deposit for free consultations", () => {
			const freeService = SAMPLE_BOOKING_SERVICES.find((s) => s.isFreeConsultation)!;
			const prepayment = calculateBookingPrepayment(freeService, "morning");
			assert.strictEqual(prepayment.requiresPrepayment, false);
			assert.strictEqual(prepayment.prepaymentAmountRub, 0);
		});

		it("calculates 1000 ₽ deposit for surgery services", () => {
			const surgeryService = SAMPLE_BOOKING_SERVICES.find((s) => s.specialtyCategory === "surgery")!;
			const prepayment = calculateBookingPrepayment(surgeryService, "afternoon");
			assert.strictEqual(prepayment.requiresPrepayment, true);
			assert.strictEqual(prepayment.prepaymentAmountRub, 1000);
		});
	});

	describe("9. FNS Tax Certificate (КНД 1151156)", () => {
		it("calculates 13% tax refund for paid dental treatment", () => {
			const cert = generateFnsTaxCertificateData(SAMPLE_PORTAL_PROFILE, SAMPLE_PORTAL_INVOICES, 2026);
			assert.strictEqual(cert.taxYear, 2026);
			assert.strictEqual(cert.totalPaidEligibleRub, 21300);
			assert.strictEqual(cert.maxDeductionRefundRub, 2769); // 21300 * 0.13 = 2769
			assert.strictEqual(cert.patientFullName, "Смирнова Екатерина Васильевна");
			assert.strictEqual(cert.clinicInn, "7701234567");
		});
	});

	describe("10. SBP QR Code & Exact Integer Kopecks", () => {
		it("generates NSPK SBP payment URL with exact integer kopecks (sum parameter)", () => {
			const payload = generateSbpPaymentQrPayload("inv-101", 12500.5, "Лечение кариеса");
			assert.ok(payload.startsWith("https://qr.nspk.ru/"));
			assert.ok(payload.includes("sum=1250050")); // 12500.5 * 100 = 1250050 kopecks without float bugs
			assert.ok(payload.includes("cur=RUB"));
			assert.ok(payload.includes("qrcId=inv-101"));
		});

		it("generates deterministic crisp SVG QR code containing finder and timing patterns", () => {
			const payload = generateSbpPaymentQrPayload("inv-102", 5000, "Консультация");
			const svg = generateQrCodeSvg(payload, { size: 160, color: "#0f172a", background: "#ffffff" });
			assert.ok(svg.includes("<svg"));
			assert.ok(svg.includes('viewBox="0 0 160 160"'));
			assert.ok(svg.includes('shape-rendering="crispEdges"'));
			assert.ok(svg.includes("<rect"));
			assert.ok(svg.includes("</svg>"));
		});
	});
});

