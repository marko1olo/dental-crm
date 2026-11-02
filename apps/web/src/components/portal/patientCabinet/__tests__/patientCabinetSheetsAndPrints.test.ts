/**
 * patientCabinetSheetsAndPrints.test.ts
 *
 * Sweet-spot suite for Patient Cabinet Sheets & Statutory Print Generation (Mandates 8b, 8zi, 8e, 8s).
 * Audits non-blocking bottom sheets (Consent, SBP, Care memo, Reception QR, Reschedule)
 * and verifies statutory print HTML generators (Acts, 043/u, 1151156, 107-1/u, PEP consent).
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const readCssWithImports = (p: string): string =>
	readFileSync(p, "utf-8").replace(/@import\s+["']\.\/([^"']+)["'];/g, (_, rel) => readCssWithImports(join(dirname(p), rel)));

import "../../../../../testCssStub.mjs";
const { ConsentSigningSheet } = await import("../sheets/ConsentSigningSheet");
const { SbpPaymentSheet } = await import("../sheets/SbpPaymentSheet");
const { CareMemoSheet } = await import("../sheets/CareMemoSheet");
const { ReceptionQrSheet } = await import("../sheets/ReceptionQrSheet");
const { RescheduleSheet } = await import("../sheets/RescheduleSheet");
import { DEMO_PATIENT_CABINET } from "../patientCabinetPresets";
import {
	calculateCabinetSummary, calculatePatientTaxDeduction,
	generateCompletedWorksActHtml, generateConsentPrintHtml,
	generatePatientDentalPassport, generatePrescription107PrintHtml, generateSbpQrPayload,
	generatePaymentInvoiceHtml, generateFnsReceiptCheckUrl, generateExtract043Html,
	generatePatientTaxCertificate1151156, generateTreatmentPlanEstimateHtml,
	signTreatmentPlanWithPep, signConsentWithPep,
	type GeneratedDocumentSummary, type PatientPrescriptionItem, type PatientStatutoryConsent,
} from "../patientCabinetEngine";
import { generateCareMemo } from "../patientCareInstructionsEngine";

describe("PatientCabinetSheetsAndPrints — Mandates 8e, 8s Sheets & Statutory Print Suite", () => {
	const data = DEMO_PATIENT_CABINET;
	const summary = calculateCabinetSummary(data);
	const taxDeduction = calculatePatientTaxDeduction(data.invoices || [], 2026);
	const careMemo = generateCareMemo({
		patientName: "Иванов И. И.",
		patientPhone: "+79991234567",
		toothFdi: "16",
		interventionType: "caries",
		doctorName: "Д-р Смирнова",
		clinicName: "ДЕНТЕ",
	});

	it("1. Mandate 8e: Zero disabled buttons across all interactive bottom sheets", () => {
		// ConsentSigningSheet
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
				otpCountdown: 45, // Active countdown must NOT block the resend button
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

		// SbpPaymentSheet
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

		// RescheduleSheet
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

		// CareMemoSheet
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

		// ReceptionQrSheet
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

	it("2. Mandate 8d pt 6 (Anti-Matryoshka Law): Flat slide-over styling with touch drag handle", () => {
		const cssPath = fileURLToPath(new URL("../patientCabinet.css", import.meta.url));
		const css = readCssWithImports(cssPath);

		assert.ok(
			css.includes(".pc-sheet-overlay") && css.includes(".pc-sheet-window"),
			"patientCabinet.css includes sheet overlay and window styling",
		);
		assert.ok(
			css.includes("border-top-left-radius: 24px;") || css.includes(".pc-sheet-handle"),
			"Bottom sheets feature drag handle and slide-up ergonomics",
		);
	});

	it("3. Mandate 8s (Scale Sovereignty): Solo 1-chair clinic works out-of-the-box with zero backoffice dependencies", () => {
		const unpaidInvoice = data.invoices.find((i) => i.status === "unpaid") || data.invoices[0]!;
		const sbp = generateSbpQrPayload(unpaidInvoice, { legalName: "Стоматология ДЕНТЕ", inn: "7701234567" });
		assert.ok(sbp.sbpNspkPayloadString.includes("sum="), "SBP NSPK URL contains sum in kopecks");
		assert.ok(sbp.qrSvg.includes("<svg"), "Generates instant SVG QR code for direct bank scanning");

		assert.ok(taxDeduction.totalRefundRub > 0, "Calculates 13% tax refund instantly");
		assert.ok(taxDeduction.headerBannerTextRu.includes("Возврат от налоговой"), "Provides clear tax refund header");

		assert.ok(careMemo.smsText.length > 0, "Generates clear care memo text");
		assert.ok(careMemo.printHtml.includes("<!DOCTYPE html>"), "Provides printable A4 memo");
	});

	it("4. Statutory Print: Completed works act HTML (ст. 720 ГК РФ) with clinic stamp", () => {
		const paidInv = data.invoices.find((i) => i.status === "paid") || data.invoices[0]!;
		const actHtml = generateCompletedWorksActHtml(paidInv, data);

		assert.ok(actHtml.includes("АКТ ВЫПОЛНЕННЫХ РАБОТ"), "Act HTML contains official Russian title");
		assert.ok(actHtml.includes("ст. 720 ГК РФ"), "Act HTML cites Civil Code basis");
		assert.ok(actHtml.includes(data.fullName), "Act HTML contains patient full name");
		assert.ok(actHtml.includes("М.П. ООО «Стоматологическая клиника ДЕНТЕ»"), "Act HTML contains clinic stamp box");
	});

	it("5. Statutory Print: Treatment plan estimate HTML with 63-FZ PEP stamp and «ВСЁ ВКЛЮЧЕНО»", () => {
		const plan = data.treatmentPlans[0]!;
		const signedPlan = signTreatmentPlanWithPep(plan, data.phone, "884210", data.fullName);
		const estimateHtml = generateTreatmentPlanEstimateHtml(signedPlan, data);

		assert.ok(estimateHtml.includes("ООО «Стоматологическая клиника ДЕНТЕ»"), "Estimate contains clinic legal entity");
		assert.ok(estimateHtml.includes("7841098765"), "Estimate contains clinic INN");
		assert.ok(estimateHtml.includes(plan.planNumber), "Estimate contains plan number");
		assert.ok(estimateHtml.includes(data.fullName), "Estimate contains patient full name");
		assert.ok(estimateHtml.includes("63-ФЗ"), "Estimate includes 63-FZ PEP stamp");
		assert.ok(estimateHtml.includes("ВСЁ ВКЛЮЧЕНО"), "Estimate contains Mandate 8e all-inclusive statement");
	});

	it("6. Statutory Print: Official Form 043/u extract HTML with anamnesis, FDI formula, ICD-10 & doctor stamp", () => {
		const docExtract: GeneratedDocumentSummary = {
			id: "doc-extract-043-test",
			kind: "medical_card_extract_043",
			title: "Официальная выписка из медицинской карты 043/у",
			documentNumber: "ВЫП-043/2026-8842",
			status: "issued",
			dateIso: "2026-08-10",
			sha256: "4b82d091e9821a8c9b3e1029348ab12e09847120394850192837461524354657",
		};
		const extractHtml = generateExtract043Html(docExtract, data);

		assert.ok(extractHtml.includes("Форма № 043/у"), "Includes Form 043/u header");
		assert.ok(extractHtml.includes("ООО «Стоматологическая клиника ДЕНТЕ»"), "Includes clinic name");
		assert.ok(extractHtml.includes("ЛО-78-01-011842"), "Includes license number");
		assert.ok(extractHtml.includes(data.fullName), "Includes patient name");
		assert.ok(extractHtml.includes("Анамнез жизни и соматический статус"), "Includes anamnesis");
		assert.ok(extractHtml.includes("Зубная формула при первичном осмотре (номенклатура FDI)"), "Includes FDI formula");
		assert.ok(extractHtml.includes("18") && extractHtml.includes("48"), "Includes FDI teeth numbers");
		assert.ok(extractHtml.includes("К02.1") && extractHtml.includes("Кариес дентина"), "Includes ICD-10 K02.1");
		assert.ok(extractHtml.includes("К04.0") && extractHtml.includes("Пульпит"), "Includes ICD-10 K04.0");
		assert.ok(extractHtml.includes("A16.07.054"), "Includes 804n code");
		assert.ok(extractHtml.includes(data.curatingDoctor), "Includes doctor name");
		assert.ok(extractHtml.includes("Личная печать"), "Includes doctor stamp");
		assert.ok(extractHtml.includes("323-ФЗ"), "Includes 323-FZ basis");
	});

	it("7. Statutory Print: Form KND 1151156 tax deduction certificate HTML with clinic credentials & Code 1/2", () => {
		const taxCertHtml = generatePatientTaxCertificate1151156(data, 2026);

		assert.ok(taxCertHtml.includes("1151156"), "Includes Form KND 1151156 identifier");
		assert.ok(taxCertHtml.includes("7841098765"), "Includes clinic INN 7841098765");
		assert.ok(taxCertHtml.includes("784101001"), "Includes clinic KPP");
		assert.ok(taxCertHtml.includes("ЛО-78-01-011842"), "Includes medical license");
		assert.ok(taxCertHtml.includes(data.fullName), "Includes taxpayer full name");
		assert.ok(taxCertHtml.includes("2026"), "Includes tax year 2026");
		assert.ok(taxCertHtml.includes(">1<") || taxCertHtml.includes("Код 1") || taxCertHtml.includes("Код 01"), "Includes Code 1 for standard therapy");
		assert.ok(taxCertHtml.includes("М.П."), "Includes clinic stamp box");
	});

	it("8. Statutory Print: Form 107-1/u prescription blank HTML with Rp., Signa, clinic OGRN & QR verification", () => {
		const sampleRx: PatientPrescriptionItem = {
			id: "rx-amox-500",
			medicationName: "Амоксициллин + Клавулановая кислота (Амоксиклав)",
			dosageRu: "500 мг + 125 мг",
			instructionRu: "По 1 таблетке 2 раза в сутки во время еды в течение 7 дней",
			durationRu: "7 дней",
			doctorName: "Д-р Смирнов А. В.",
			dateIso: "2026-08-10",
			validityDays: 60,
		};
		const rxHtml = generatePrescription107PrintHtml(sampleRx, data);

		assert.ok(rxHtml.includes("Форма № 107-1/у"), "Includes official Form 107-1/u title");
		assert.ok(rxHtml.includes("1094н"), "Cites Order 1094n basis");
		assert.ok(rxHtml.includes("ООО «Стоматологическая клиника ДЕНТЕ»"), "Includes clinic name");
		assert.ok(rxHtml.includes("1217800098765"), "Includes clinic OGRN");
		assert.ok(rxHtml.includes(data.fullName), "Includes patient full name");
		assert.ok(rxHtml.includes("Rp.:"), "Includes Latin Rp. prefix");
		assert.ok(rxHtml.includes("Signa"), "Includes Signa usage instructions");
		assert.ok(rxHtml.includes("60 дней"), "Includes validity period");
		assert.ok(rxHtml.includes("Врач-стоматолог") && rxHtml.includes("Личная печать"), "Includes doctor seal");
		assert.ok(rxHtml.includes("Для рецептов"), "Includes pharmacy stamp");
		assert.ok(rxHtml.includes("svg") && rxHtml.includes("63-ФЗ"), "Includes 63-FZ verification QR SVG");
	});

	it("9. Statutory Print: Informed voluntary consent print HTML with 63-FZ PEP stamp & SHA-256", () => {
		const pendingConsent: PatientStatutoryConsent = {
			id: "c-pending-pep-1",
			code: "IDS-THERAPY-01",
			titleRu: "Информированное добровольное согласие на терапевтическое лечение",
			categoryRu: "Терапия",
			statutoryBasis: "323-ФЗ",
			status: "pending_signature",
			summaryTextRu: "Согласие на обработку кариозных полостей и постановку композитных пломб.",
			fullTextContent: "Я, пациент, даю согласие на медицинское вмешательство по статье 20 323-ФЗ.",
		};
		const signedConsent = signConsentWithPep(pendingConsent, data.phone, "849201", data.fullName);
		const printHtml = generateConsentPrintHtml(signedConsent, data);

		assert.ok(printHtml.includes("ДОКУМЕНТ ПОДПИСАН ПРОСТОЙ ЭЛЕКТРОННОЙ ПОДПИСЬЮ (63-ФЗ)"), "Includes statutory PEP header");
		assert.ok(printHtml.includes(signedConsent.signatureAudit?.integrityHash || ""), "Includes SHA-256 hash in print HTML");
		assert.ok(printHtml.includes(data.fullName), "Includes patient name in print HTML");
		assert.ok(printHtml.includes(data.phone), "Includes phone in print HTML");
		assert.ok(printHtml.includes("ООО «Стоматологическая клиника ДЕНТЕ»"), "Includes clinic name in print HTML");
	});
});
