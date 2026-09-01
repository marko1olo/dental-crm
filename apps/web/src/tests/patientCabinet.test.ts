/**
 * Unit Test Suite for Patient Personal Portal & SMS/OTP Cabinet
 * (DOMAIN: PORTAL PATIENT CABINET)
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	calculateCabinetSummary,
	calculateCheckupDaysRemaining,
	calculateWarrantyValidity,
	filterAppointments,
	filterInvoices,
	formatKopecksToRub,
	formatRubles,
	formatRussianDateIso,
	generateDetailedReceiptHtml,
	generatePatientTaxCertificate1151156,
	generatePepIntegrityHash,
	generateQrCodeSvg,
	generateSbpQrPayload,
	generateSha256,
	generateSmsOtp,
	processSbpPayment,
	signConsentWithPep,
	verifySmsOtp,
	type PatientInvoiceItem,
	type PatientPersonalCabinetData,
	type PatientStatutoryConsent,
} from "../components/portal/patientCabinet/patientCabinetEngine";
import {
	DEMO_PATIENT_CABINET,
	PATIENT_CABINET_PRESET_ALEXEY,
	PATIENT_CABINET_PRESET_DMITRY,
	PATIENT_CABINET_PRESET_ELENA,
} from "../components/portal/patientCabinet/patientCabinetPresets";

describe("Patient Personal Portal - SBP QR Payments & Currency Formatting", () => {
	it("formats rubles and kopecks accurately with Russian locale", () => {
		assert.equal(formatRubles(35000), "35\u00A0000\u00A0₽");
		assert.equal(formatRubles(0), "0\u00A0₽");
		assert.equal(formatKopecksToRub(3500000), "35\u00A0000,00\u00A0₽");
		assert.equal(formatKopecksToRub(12550), "125,50\u00A0₽");
	});

	it("generates deterministic NSPK SBP QR payload and SVG", () => {
		const invoice = PATIENT_CABINET_PRESET_ALEXEY.invoices[0] as PatientInvoiceItem;
		assert.ok(invoice);
		assert.equal(invoice.status, "unpaid");

		const sbpPayload = generateSbpQrPayload(invoice);

		assert.ok(sbpPayload.qrId.startsWith("SBPA"));
		assert.equal(sbpPayload.invoiceNumber, "СЧ-2026/089");
		assert.equal(sbpPayload.amountRub, 35000);
		assert.equal(sbpPayload.amountKopecks, 3500000);
		assert.match(sbpPayload.sbpNspkPayloadString, /https:\/\/qr\.nspk\.ru\/SBPA/);
		assert.match(sbpPayload.sbpNspkPayloadString, /sum=3500000/);

		// SVG generation
		assert.ok(sbpPayload.qrSvg.startsWith("<svg"));
		assert.ok(sbpPayload.qrSvg.includes("viewBox="));
		assert.ok(sbpPayload.qrSvg.endsWith("</svg>"));

		// Available popular banks
		assert.ok(sbpPayload.availableBanks.length >= 4);
		assert.ok(sbpPayload.availableBanks.some((b) => b.id === "sber"));
		assert.ok(sbpPayload.availableBanks.some((b) => b.id === "tbank"));
	});

	it("processes SBP payment and transitions invoice to paid status with fiscal receipt", () => {
		const invoice = PATIENT_CABINET_PRESET_ALEXEY.invoices[0] as PatientInvoiceItem;
		const paid = processSbpPayment(invoice, "tx-98241");

		assert.equal(paid.status, "paid");
		assert.equal(paid.paidAmountRub, 35000);
		assert.equal(paid.remainingAmountRub, 0);
		assert.equal(paid.paymentMethod, "sbp");
		assert.ok(paid.paidAtIso);
		assert.ok(paid.fiscalReceiptNumber?.startsWith("ФД-"));
		assert.ok(paid.fiscalReceiptUrl?.includes("receipt.nalog.ru"));
	});

	it("filters invoices by payment status correctly", () => {
		const invoices = PATIENT_CABINET_PRESET_ALEXEY.invoices;

		const all = filterInvoices(invoices, "all");
		assert.equal(all.length, 3);

		const unpaid = filterInvoices(invoices, "unpaid");
		assert.equal(unpaid.length, 1);
		assert.equal(unpaid[0]?.id, "inv-2026-089");

		const paid = filterInvoices(invoices, "paid");
		assert.equal(paid.length, 2);
		assert.ok(paid.every((i) => i.status === "paid"));
	});
});

describe("Patient Personal Portal - Treatment Plans & Appointments", () => {
	it("aggregates active treatment plan stages and progress", () => {
		const plan = PATIENT_CABINET_PRESET_ALEXEY.treatmentPlans[0];
		assert.ok(plan);
		assert.equal(plan.progressPercent, 70);
		assert.equal(plan.totalCostRub, 340000);
		assert.equal(plan.paidCostRub, 235000);
		assert.equal(plan.remainingDueRub, 105000);

		// Check completed vs in-progress stages
		const completedStages = plan.stages.filter((s) => s.status === "completed");
		const inProgressStages = plan.stages.filter((s) => s.status === "in_progress");
		assert.equal(completedStages.length, 4);
		assert.equal(inProgressStages.length, 1);
	});

	it("filters upcoming and past appointments", () => {
		const appointments = PATIENT_CABINET_PRESET_ALEXEY.appointments;

		const upcoming = filterAppointments(appointments, "upcoming");
		assert.ok(upcoming.length >= 2);
		assert.ok(upcoming.some((a) => a.id === "apt-8842-1"));

		const past = filterAppointments(appointments, "past");
		assert.ok(past.length >= 2);
		assert.ok(past.every((a) => a.status === "completed" || a.status === "cancelled"));
	});
});

describe("Patient Personal Portal - Electronic Warranty Passports & Checkup Countdown", () => {
	it("calculates countdown days to mandatory checkup correctly", () => {
		// Mock base date: 2026-08-22
		const baseDate = "2026-08-22T12:00:00Z";

		// 1. Normal checkup in 44 days (2026-10-05)
		const normalCheckup = calculateCheckupDaysRemaining("2026-10-05T00:00:00Z", baseDate);
		assert.equal(normalCheckup.isOverdue, false);
		assert.equal(normalCheckup.isUrgent, false);
		assert.equal(normalCheckup.daysRemaining, 44);
		assert.match(normalCheckup.labelRu, /Через 44 дн\./);

		// 2. Urgent checkup in 10 days (2026-09-01)
		const urgentCheckup = calculateCheckupDaysRemaining("2026-09-01T00:00:00Z", baseDate);
		assert.equal(urgentCheckup.isOverdue, false);
		assert.equal(urgentCheckup.isUrgent, true);
		assert.equal(urgentCheckup.daysRemaining, 10);

		// 3. Overdue checkup by 5 days (2026-08-17)
		const overdueCheckup = calculateCheckupDaysRemaining("2026-08-17T00:00:00Z", baseDate);
		assert.equal(overdueCheckup.isOverdue, true);
		assert.match(overdueCheckup.labelRu, /Просрочен на 5 дн\./);
	});

	it("calculates warranty duration validity and expiration", () => {
		const baseDate = "2026-08-22T12:00:00Z";

		// Active warranty valid until 2031-06-25
		const activeWar = calculateWarrantyValidity("2031-06-25T00:00:00Z", baseDate);
		assert.equal(activeWar.isExpired, false);
		assert.ok(activeWar.daysRemaining > 1000);
		assert.match(activeWar.labelRu, /Действует еще/);

		// Expired warranty (2025-01-01)
		const expiredWar = calculateWarrantyValidity("2025-01-01T00:00:00Z", baseDate);
		assert.equal(expiredWar.isExpired, true);
		assert.equal(expiredWar.daysRemaining, 0);
		assert.equal(expiredWar.labelRu, "Срок гарантии истек");
	});
});

describe("Patient Personal Portal - 63-FZ SMS/OTP & PEP Digital Signatures", () => {
	it("generates 6-digit OTP code and enforces expiration", () => {
		const otp = generateSmsOtp("+79991234567");
		assert.equal(otp.code.length, 6);
		assert.ok(/^\d{6}$/.test(otp.code));
		assert.ok(otp.expiresAt > otp.sentTimestamp);
	});

	it("validates correct vs incorrect SMS OTP codes", () => {
		const now = Date.now();
		const expected = "842109";

		// Valid
		const okRes = verifySmsOtp("842109", expected, now);
		assert.equal(okRes.success, true);

		// Invalid code
		const badCodeRes = verifySmsOtp("123456", expected, now);
		assert.equal(badCodeRes.success, false);
		assert.match(badCodeRes.error || "", /Неверный код/);

		// Non-6-digit input
		const shortRes = verifySmsOtp("842", expected, now);
		assert.equal(shortRes.success, false);

		// Expired OTP (older than 5 min)
		const expiredRes = verifySmsOtp("842109", expected, now - 6 * 60 * 1000);
		assert.equal(expiredRes.success, false);
		assert.match(expiredRes.error || "", /истек/);
	});

	it("signs statutory consent 323-FZ with simple electronic signature (63-FZ PEP) and SHA-256 hash", () => {
		const pendingConsent = PATIENT_CABINET_PRESET_ALEXEY.consents[0] as PatientStatutoryConsent;
		assert.equal(pendingConsent.status, "pending_signature");

		const signedConsent = signConsentWithPep(
			pendingConsent,
			"+7 (999) 123-45-67",
			"842109",
			"Воронов Алексей Владимирович",
		);

		assert.equal(signedConsent.status, "signed");
		assert.ok(signedConsent.signedAtIso);
		assert.ok(signedConsent.signatureAudit);
		assert.equal(signedConsent.signatureAudit?.verificationMethod, "sms_otp");
		assert.equal(signedConsent.signatureAudit?.legalBasis, "63-ФЗ ПЭП");
		assert.equal(signedConsent.signatureAudit?.smsOtpCode, "842109");

		// Integrity hash
		assert.ok(signedConsent.signatureAudit?.integrityHash);
		assert.equal(signedConsent.signatureAudit?.integrityHash.length, 64);

		// Hash determinism
		const expectedHash = generatePepIntegrityHash(
			pendingConsent,
			"+7 (999) 123-45-67",
			"842109",
			signedConsent.signatureAudit.timestamp,
		);
		assert.equal(signedConsent.signatureAudit.integrityHash, expectedHash);
	});
});

describe("Patient Personal Portal - Summary Aggregator & Preset Profiles", () => {
	it("calculates cabinet summary accurately for demo profile", () => {
		const summary = calculateCabinetSummary(PATIENT_CABINET_PRESET_ALEXEY);

		assert.equal(summary.totalInvoicesCount, 3);
		assert.equal(summary.unpaidInvoicesCount, 1);
		assert.equal(summary.totalUnpaidAmountRub, 35000);
		assert.equal(summary.totalPaidAmountRub, 199000);
		assert.ok(summary.upcomingAppointmentsCount >= 1);
		assert.ok(summary.nextAppointment);
		assert.equal(summary.activePlansCount, 1);
		assert.equal(summary.pendingConsentsCount, 1);
		assert.equal(summary.activeWarrantiesCount, 2);
		assert.equal(summary.loyaltyBonusBalance, 12500);
	});

	it("validates preset patient profiles (Alexey, Elena, Dmitry)", () => {
		// Profile 1: Alexey (Complex rehabilitation)
		assert.equal(PATIENT_CABINET_PRESET_ALEXEY.fullName, "Воронов Алексей Владимирович");
		assert.ok(PATIENT_CABINET_PRESET_ALEXEY.treatmentPlans.length > 0);
		assert.ok(PATIENT_CABINET_PRESET_ALEXEY.warranties.length > 0);

		// Profile 2: Elena (Esthetics, 100% paid)
		assert.equal(PATIENT_CABINET_PRESET_ELENA.fullName, "Миронова Елена Сергеевна");
		assert.equal(PATIENT_CABINET_PRESET_ELENA.loyaltyTierRu, "Платиновый VIP (15%)");
		assert.equal(PATIENT_CABINET_PRESET_ELENA.invoices.filter((i) => i.status === "unpaid").length, 0);

		// Profile 3: Dmitry (Urgent)
		assert.equal(PATIENT_CABINET_PRESET_DMITRY.fullName, "Соколов Дмитрий Константинович");
		assert.equal(PATIENT_CABINET_PRESET_DMITRY.invoices.length, 1);
		assert.equal(PATIENT_CABINET_PRESET_DMITRY.invoices[0]?.status, "unpaid");
	});
});

describe("Patient Personal Portal - Statutory Tax Deduction (KND 1151156) & 54-FZ Detailed Receipt", () => {
	it("generates statutory FNS NDFL Tax Deduction Certificate (КНД 1151156) with Code 1 and Code 2", () => {
		const html = generatePatientTaxCertificate1151156(PATIENT_CABINET_PRESET_ALEXEY, 2026);

		assert.ok(html.includes("КНД 1151156"), "Should contain statutory form code KND 1151156");
		assert.ok(html.includes("СПРАВКА ОБ ОПЛАТЕ МЕДИЦИНСКИХ УСЛУГ"), "Should contain statutory title");
		assert.ok(html.includes("ООО «Стоматологическая клиника ДЕНТЕ»"), "Should include clinic name");
		assert.ok(html.includes("7841098765"), "Should include clinic INN");
		assert.ok(html.includes("Воронов"), "Should include patient family name");
		assert.ok(html.includes("Алексей"), "Should include patient given name");
		assert.ok(html.includes("2026"), "Should include tax year 2026");
	});

	it("generates detailed 54-FZ fiscal receipt with 804n statutory nomenclature items and QR code", () => {
		const paidInvoice = PATIENT_CABINET_PRESET_ALEXEY.invoices.find((i) => i.status === "paid");
		assert.ok(paidInvoice);

		const receiptHtml = generateDetailedReceiptHtml(paidInvoice, PATIENT_CABINET_PRESET_ALEXEY);

		assert.ok(receiptHtml.includes("КАССОВЫЙ ЧЕК / ПРИХОД 54-ФЗ"), "Should contain 54-FZ header");
		assert.ok(receiptHtml.includes("ООО «Стоматологическая клиника ДЕНТЕ»"), "Should contain clinic name");
		assert.ok(receiptHtml.includes("ИНН: 7841098765"), "Should contain clinic INN");
		assert.ok(receiptHtml.includes("Воронов Алексей Владимирович"), "Should contain patient name");
		assert.ok(receiptHtml.includes(paidInvoice.invoiceNumber), "Should contain invoice number");
		assert.ok(receiptHtml.includes("Код 804н:"), "Should list statutory 804n nomenclature codes");
		assert.ok(receiptHtml.includes("<svg"), "Should contain fiscal verification QR code SVG");
	});
});

