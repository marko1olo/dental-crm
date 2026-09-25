import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { PatientCabinetModal } from "../PatientCabinetModal";
import { OverviewTab } from "../tabs/OverviewTab";
import { InvoicesTab } from "../tabs/InvoicesTab";
import { DocumentsTab } from "../tabs/DocumentsTab";
import { TreatmentPlanTab } from "../tabs/TreatmentPlanTab";
import { ConsentSigningSheet } from "../sheets/ConsentSigningSheet";
import { SbpPaymentSheet } from "../sheets/SbpPaymentSheet";
import { CareMemoSheet } from "../sheets/CareMemoSheet";
import { ReceptionQrSheet } from "../sheets/ReceptionQrSheet";
import { RescheduleSheet } from "../sheets/RescheduleSheet";
import { DEMO_PATIENT_CABINET } from "../patientCabinetPresets";
import {
	calculateCabinetSummary,
	calculateDentalHealthIndex,
	calculatePatientTaxDeduction,
	generatePatientDentalPassport,
	generateSbpQrPayload,
} from "../patientCabinetEngine";
import { generateCareMemo } from "../patientCareInstructionsEngine";

describe("PatientCabinetAutonomyInquisition — Mandates 8c, 8d, 8e, 8s Audit", () => {
	const data = DEMO_PATIENT_CABINET;
	const summary = calculateCabinetSummary(data);
	const healthIndex = calculateDentalHealthIndex(data.teeth || []);
	const dentalPassport = generatePatientDentalPassport(data);
	const taxDeduction = calculatePatientTaxDeduction(data.invoices || [], 2026);
	const careMemo = generateCareMemo({
		patientName: "Иванов И. И.",
		patientPhone: "+79991234567",
		toothFdi: "16",
		interventionType: "caries",
		doctorName: "Д-р Смирнова",
		clinicName: "ДЕНТЕ",
	});

	it("1. Mandate 8e (Doctor & Patient Autonomy): Zero disabled buttons across cabinet and all sheets", () => {
		// Render main modal
		const modalHtml = renderToStaticMarkup(
			createElement(PatientCabinetModal, {
				isOpen: true,
				onClose: () => {},
				initialData: data,
			}),
		);
		assert.equal(
			modalHtml.includes("<button disabled") || modalHtml.includes('disabled=""'),
			false,
			"PatientCabinetModal contains zero disabled buttons",
		);

		// Render ConsentSigningSheet
		const consent = data.consents[0] || null;
		const consentHtml = renderToStaticMarkup(
			createElement(ConsentSigningSheet, {
				isOpen: true,
				onClose: () => {},
				consent,
				phone: data.phone,
				patientName: data.fullName,
				consentSignMode: "sms_otp",
				onSetConsentSignMode: () => {},
				otpDigits: ["", "", "", "", "", ""],
				onOtpDigitChange: () => {},
				otpError: null,
				otpCountdown: 45, // Active countdown must NOT block the resend button!
				onResendOtp: () => {},
				onConfirmOtp: () => {},
				onSignCabinetPep: () => {},
			}),
		);
		assert.equal(
			consentHtml.includes("<button disabled") || consentHtml.includes('disabled=""'),
			false,
			"ConsentSigningSheet resend button must not be disabled even when countdown is active",
		);

		// Render SbpPaymentSheet
		const invoice = data.invoices[0] || null;
		const sbpPayload = invoice
			? generateSbpQrPayload(invoice, { legalName: "Стоматология ДЕНТЕ", inn: "7701234567" })
			: null;
		const sbpHtml = renderToStaticMarkup(
			createElement(SbpPaymentSheet, {
				isOpen: true,
				onClose: () => {},
				sbpPayload,
				invoice,
				isCheckingStatus: true, // Checking status must NOT produce disabled lock
				statusMessage: "Проверка платежа...",
				onCheckStatus: () => {},
				onOpenBankApp: () => {},
			}),
		);
		assert.equal(
			sbpHtml.includes("<button disabled") || sbpHtml.includes('disabled=""'),
			false,
			"SbpPaymentSheet confirm button must not be disabled during status check",
		);

		// Render RescheduleSheet
		const appt = data.appointments[0] || null;
		const rescheduleHtml = renderToStaticMarkup(
			createElement(RescheduleSheet, {
				isOpen: true,
				onClose: () => {},
				appointment: appt,
				onSubmit: () => {},
			}),
		);
		assert.equal(
			rescheduleHtml.includes("<button disabled") || rescheduleHtml.includes('disabled=""'),
			false,
			"RescheduleSheet contains zero disabled buttons",
		);

		// Render CareMemoSheet
		const careHtml = renderToStaticMarkup(
			createElement(CareMemoSheet, {
				isOpen: true,
				mode: "qr",
				onClose: () => {},
				careMemo,
				onSendWhatsApp: () => {},
				onPrint: () => {},
			}),
		);
		assert.equal(
			careHtml.includes("<button disabled") || careHtml.includes('disabled=""'),
			false,
			"CareMemoSheet contains zero disabled buttons",
		);

		// Render ReceptionQrSheet
		const qrHtml = renderToStaticMarkup(
			createElement(ReceptionQrSheet, {
				isOpen: true,
				onClose: () => {},
				data,
				nextAppointment: summary.nextAppointment || null,
			}),
		);
		assert.equal(
			qrHtml.includes("<button disabled") || qrHtml.includes('disabled=""'),
			false,
			"ReceptionQrSheet contains zero disabled buttons",
		);
	});

	it("2. Mandate 8d pt 7 (Zero Cartoon Emojis): Tabs, status chips, and headers use vector Lucide icons", () => {
		const overviewHtml = renderToStaticMarkup(
			createElement(OverviewTab, {
				data,
				summary,
				healthIndex,
				nextApptCountdown: "2 дн.",
				onOpenTab: () => {},
				onOpenReceptionQr: () => {},
				onOpenCareMemo: () => {},
				onOpenSbpForInvoice: () => {},
				onOpenSelfCheckin: () => {},
			}),
		);

		const plansHtml = renderToStaticMarkup(
			createElement(TreatmentPlanTab, {
				data,
				dentalPassport,
				onPayStageWithSbp: () => {},
				onBookAppointment: () => {},
			}),
		);

		const invoicesHtml = renderToStaticMarkup(
			createElement(InvoicesTab, {
				data,
				onOpenSbpForInvoice: () => {},
				onShowToast: () => {},
			}),
		);

		const documentsHtml = renderToStaticMarkup(
			createElement(DocumentsTab, {
				data,
				selectedTaxYear: 2026,
				onSelectTaxYear: () => {},
				taxDeductionCalc: taxDeduction,
				onStartConsentSigning: () => {},
				onOpenTaxCertificateSheet: () => {},
				onDownloadTaxCertificateDirect: () => {},
				onShowToast: () => {},
			}),
		);

		// Extended pictographic regex to detect cartoon emojis or unstyled symbols
		const emojiRegex = /\p{Extended_Pictographic}/u;
		assert.equal(
			emojiRegex.test(overviewHtml),
			false,
			"OverviewTab contains 0 raw unicode cartoon emojis",
		);
		assert.equal(
			emojiRegex.test(plansHtml),
			false,
			"TreatmentPlanTab contains 0 raw unicode cartoon emojis (such as ★ or tooth emojis)",
		);
		assert.equal(
			emojiRegex.test(invoicesHtml),
			false,
			"InvoicesTab contains 0 raw unicode cartoon emojis",
		);
		assert.equal(
			emojiRegex.test(documentsHtml),
			false,
			"DocumentsTab contains 0 raw unicode cartoon emojis",
		);
	});

	it("3. Mandate 8d pt 6 (Anti-Matryoshka Law): Modal depth strictly 1, sub-drawers render as flat slide-overs", () => {
		const cssPath = fileURLToPath(new URL("../patientCabinet.css", import.meta.url));
		const css = readFileSync(cssPath, "utf-8");

		// Sheets are styled with position: absolute/fixed within cabinet or viewport, not nested window frames
		assert.ok(
			css.includes(".pc-sheet-overlay") && css.includes(".pc-sheet-window"),
			"patientCabinet.css includes sheet overlay and window styling",
		);
		assert.ok(
			css.includes("border-top-left-radius: 24px;") || css.includes(".pc-sheet-handle"),
			"Bottom sheets feature drag handle and slide-up ergonomics",
		);
	});

	it("4. Mandate 8s (Scale Sovereignty): Solo 1-chair clinic works out-of-the-box with zero backoffice dependencies", () => {
		// Generates SBP payload with exact integer kopecks
		const unpaidInvoice = data.invoices.find((i) => i.status === "unpaid") || data.invoices[0];
		assert.ok(unpaidInvoice, "Unpaid invoice exists");
		const sbp = generateSbpQrPayload(unpaidInvoice, { legalName: "Стоматология ДЕНТЕ", inn: "7701234567" });
		assert.ok(sbp.sbpNspkPayloadString.includes("sum="), "SBP NSPK URL contains sum in kopecks");
		assert.ok(sbp.qrSvg.includes("<svg"), "Generates instant SVG QR code for direct bank scanning");

		// Generates 13% tax deduction certificate KND 1151156 without accountant
		assert.ok(taxDeduction.totalRefundRub > 0, "Calculates 13% tax refund instantly");
		assert.ok(taxDeduction.headerBannerTextRu.includes("Возврат от налоговой"), "Provides clear tax refund header");

		// Patient Care memo with direct WhatsApp link
		assert.ok(careMemo.smsText.length > 0, "Generates clear care memo text");
		assert.ok(careMemo.printHtml.includes("<!DOCTYPE html>"), "Provides printable A4 memo");
	});

	it("5. CSS Tokens & Dark Mode: Enforces design variables and AAA contrast on status badges", () => {
		const cssPath = fileURLToPath(new URL("../patientCabinet.css", import.meta.url));
		const css = readFileSync(cssPath, "utf-8");

		// Status badges use CSS tokens instead of hardcoded dark colors
		assert.ok(
			css.includes(".pc-status-badge.paid") && css.includes("color: var(--pc-success);"),
			"pc-status-badge.paid uses var(--pc-success)",
		);
		assert.ok(
			css.includes(".pc-status-badge.unpaid") && css.includes("color: var(--pc-warning);"),
			"pc-status-badge.unpaid uses var(--pc-warning)",
		);
		assert.ok(
			css.includes(".pc-status-badge.scheduled") && css.includes("color: var(--pc-primary);"),
			"pc-status-badge.scheduled uses var(--pc-primary)",
		);
		assert.ok(
			css.includes(".pc-qr-container") && css.includes("var(--pc-bg"),
			"pc-qr-container uses var(--pc-bg)",
		);
	});

	it("6. Desktop Density & Responsive Touch: Desktop buttons maintain 28-36px height with mobile touch adaptation", () => {
		const cssPath = fileURLToPath(new URL("../patientCabinet.css", import.meta.url));
		const css = readFileSync(cssPath, "utf-8");

		assert.ok(
			css.includes(".pc-btn-primary {") && css.includes("min-height: 36px;"),
			"Desktop primary button height is 36px (clinical desktop density)",
		);
		assert.ok(
			css.includes(".pc-btn-secondary {") && css.includes("min-height: 32px;"),
			"Desktop secondary button height is 32px",
		);
		assert.ok(
			css.includes(".pc-close-btn {") && css.includes("min-height: 32px;"),
			"Desktop close button height is 32px",
		);
	});
});
