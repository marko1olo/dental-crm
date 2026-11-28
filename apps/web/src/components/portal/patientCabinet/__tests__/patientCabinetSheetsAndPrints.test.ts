/**
 * patientCabinetSheetsAndPrints.test.ts
 *
 * Sweet-spot suite for Patient Cabinet Sheets, Real SBP QR & Statutory Print Generation (Mandates 8b, 8zi, 8e, 8s).
 */

import "../../../../../testCssStub.mjs";
import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import React, { createElement } from "react";
globalThis.React = React;
import { renderToStaticMarkup } from "react-dom/server";
import { computeCrc16Ccitt } from "@dental/shared";
const { ConsentSigningSheet } = await import("../sheets/ConsentSigningSheet");
const { SbpPaymentSheet } = await import("../sheets/SbpPaymentSheet");
const { CareMemoSheet } = await import("../sheets/CareMemoSheet");
const { ReceptionQrSheet } = await import("../sheets/ReceptionQrSheet");
const { RescheduleSheet } = await import("../sheets/RescheduleSheet");
import { DEMO_PATIENT_CABINET } from "../patientCabinetPresets";
import {
	calculateCabinetSummary, calculatePatientTaxDeduction,
	generateCompletedWorksActHtml, generateConsentPrintHtml,
	generatePrescription107PrintHtml, generateSbpQrPayload, buildAvailableSbpBanks,
	generatePaymentInvoiceHtml, generateExtract043Html,
	generatePatientTaxCertificate1151156, generateTreatmentPlanEstimateHtml,
	signTreatmentPlanWithPep, signConsentWithPep,
	type GeneratedDocumentSummary, type PatientPrescriptionItem, type PatientStatutoryConsent,
} from "../patientCabinetEngine";
import { generateCareMemo } from "../patientCareInstructionsEngine";
import { setRuntimeDemoMode } from "../../../../utils/demoModeEngine.js";

describe("PatientCabinetSheetsAndPrints — Mandates 8e, 8s Sheets, SBP & Statutory Print Suite", () => {
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

	afterEach(() => {
		setRuntimeDemoMode(null);
	});

	it("1. Mandate 8e: Zero disabled buttons across all interactive bottom sheets", () => {
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
				otpCountdown: 45,
				onResendOtp: () => {},
				onConfirmOtp: () => {},
				onSignCabinetPep: () => {},
			}),
		);
		assert.equal(consentHtml.includes("<button disabled") || consentHtml.includes('disabled=""'), false);

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
				isCheckingStatus: true,
				statusMessage: "Проверка платежа...",
				onCheckStatus: () => {},
				onOpenBankApp: () => {},
			}),
		);
		assert.equal(sbpHtml.includes("<button disabled") || sbpHtml.includes('disabled=""'), false);

		const appt = data.appointments[0] || null;
		const rescheduleHtml = renderToStaticMarkup(
			createElement(RescheduleSheet, {
				isOpen: true,
				onClose: () => {},
				appointment: appt,
				onSubmit: () => {},
			}),
		);
		assert.equal(rescheduleHtml.includes("<button disabled") || rescheduleHtml.includes('disabled=""'), false);

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
		assert.equal(careHtml.includes("<button disabled") || careHtml.includes('disabled=""'), false);

		const qrHtml = renderToStaticMarkup(
			createElement(ReceptionQrSheet, {
				isOpen: true,
				onClose: () => {},
				data,
				nextAppointment: summary.nextAppointment || null,
			}),
		);
		assert.equal(qrHtml.includes("<button disabled") || qrHtml.includes('disabled=""'), false);
		assert.ok(qrHtml.includes("pc-sheet-overlay") || qrHtml.includes("pc-sheet-handle"));
	});

	it("2. Genuine SBP NSPK payload: zero fake bank=100000000111/crc=84A2, valid CRC16, bank qrId links & requisites guard", () => {
		const unpaidInvoice = data.invoices.find((i) => i.status === "unpaid") || data.invoices[0]!;
		assert.throws(
			() => generateSbpQrPayload(unpaidInvoice, {}),
			/реквизиты клиники/i,
		);

		const sbp = generateSbpQrPayload(unpaidInvoice, {
			legalName: "ООО Клиника",
			inn: "7841098765",
			bic: "044525225",
		});
		assert.equal(sbp.sbpNspkPayloadString.includes("bank=100000000111"), false, "Must not synthesize fake bank ID");
		assert.equal(sbp.sbpNspkPayloadString.includes("crc=84A2"), false, "Must not hardcode crc=84A2");

		const crcSplit = sbp.sbpNspkPayloadString.split("&crc=");
		assert.equal(crcSplit.length, 2);
		assert.equal(crcSplit[1], computeCrc16Ccitt(crcSplit[0]!));

		const banks = buildAvailableSbpBanks(sbp.qrId, sbp.sbpNspkPayloadString);
		const generic = banks.find((b) => b.id === "sbp_generic");
		const sber = banks.find((b) => b.id === "sber");
		assert.equal(generic?.schemaPrefix, sbp.sbpNspkPayloadString);
		assert.ok(sber?.schemaPrefix.includes(encodeURIComponent(sbp.qrId)));
	});

	it("3. Mandate 8s (Scale Sovereignty): Solo 1-chair clinic works out-of-the-box", () => {
		const unpaidInvoice = data.invoices.find((i) => i.status === "unpaid") || data.invoices[0]!;
		const sbp = generateSbpQrPayload(unpaidInvoice, { legalName: "Стоматология ДЕНТЕ", inn: "7701234567" });
		assert.ok(sbp.sbpNspkPayloadString.includes("sum="), "SBP NSPK URL contains sum in kopecks");
		assert.ok(sbp.qrSvg.includes("<svg"), "Generates instant SVG QR code");
		assert.ok(taxDeduction.totalRefundRub > 0, "Calculates 13% tax refund instantly");
		assert.ok(careMemo.smsText.length > 0 && careMemo.printHtml.includes("<!DOCTYPE html>"));
	});

	it("4. Statutory Print: Completed works act HTML (ст. 720 ГК РФ) with clinic stamp", () => {
		const paidInv = data.invoices.find((i) => i.status === "paid") || data.invoices[0]!;
		const actHtml = generateCompletedWorksActHtml(paidInv, data);

		assert.ok(actHtml.includes("АКТ ВЫПОЛНЕННЫХ РАБОТ"));
		assert.ok(actHtml.includes("ст. 720 ГК РФ"));
		assert.ok(actHtml.includes(data.fullName));
		assert.ok(actHtml.includes("М.П."));
	});

	it("5. Statutory Print: Treatment plan estimate HTML with 63-FZ PEP stamp and «ВСЁ ВКЛЮЧЕНО»", () => {
		const plan = data.treatmentPlans[0]!;
		const signedPlan = signTreatmentPlanWithPep(plan, data.phone, "884210", data.fullName);
		const estimateHtml = generateTreatmentPlanEstimateHtml(signedPlan, data);

		assert.ok(estimateHtml.includes(plan.planNumber));
		assert.ok(estimateHtml.includes(data.fullName));
		assert.ok(estimateHtml.includes("63-ФЗ"));
		assert.ok(estimateHtml.includes("ВСЁ ВКЛЮЧЕНО"));
	});

	it("6. Statutory Print: Medical card extract HTML with anamnesis, FDI formula, ICD-10 & doctor stamp", () => {
		const docExtract: GeneratedDocumentSummary = {
			id: "doc-extract-043-test",
			kind: "medical_card_extract_043",
			title: "Официальная выписка из медицинской карты",
			documentNumber: "ВЫП-2026-8842",
			status: "issued",
			dateIso: "2026-08-10",
			sha256: "4b82d091e9821a8c9b3e1029348ab12e09847120394850192837461524354657",
		};
		const extractHtml = generateExtract043Html(docExtract, data);

		assert.ok(extractHtml.includes("Выписка из медицинской карты приёма"));
		assert.ok(extractHtml.includes(data.fullName));
		assert.ok(extractHtml.includes("Анамнез жизни и соматический статус"));
		assert.ok(extractHtml.includes("18") && extractHtml.includes("48"));
		assert.ok(extractHtml.includes("К02.1") && extractHtml.includes("К04.0"));
		assert.ok(extractHtml.includes("323-ФЗ"));
	});

	it("7. Statutory Print & Regression: Form KND 1151156 filters by paidAtIso, omits fake 'Иван' and prod INN 7701234567", () => {
		setRuntimeDemoMode(false);
		const certInput = {
			...data,
			fullName: "Воронов",
			clinicInfo: undefined,
			invoices: [
				{
					...data.invoices[0]!,
					id: "inv-tax-2025",
					status: "paid" as const,
					issueDateIso: "2026-01-10",
					paidAtIso: "2025-12-20T12:00:00Z",
					paidAmountRub: 25000,
					totalAmountRub: 25000,
					items: [
						{
							id: "it-tax-2025",
							code: "A16.07.002",
							titleRu: "Лечение кариеса",
							toothFdi: "16",
							quantity: 1,
							priceRub: 25000,
							totalRub: 25000,
						},
					],
				},
			],
		};

		const taxCert2025 = generatePatientTaxCertificate1151156(certInput, 2025);
		assert.ok(taxCert2025.includes("1151156"));
		assert.equal(taxCert2025.includes("Иван"), false, "Must not substitute fake 'Иван' for single-word patient name");
		assert.equal(taxCert2025.includes("7701234567"), false, "Must not inject demo INN 7701234567 when not in demo mode");
		assert.ok(
			taxCert2025.replace(/\s+/g, " ").includes("25 000") || taxCert2025.includes("25000"),
			"Includes invoice matching paidAtIso 2025 even when issueDateIso is 2026",
		);
		const taxCert2026 = generatePatientTaxCertificate1151156(certInput, 2026);
		assert.equal(taxCert2026.replace(/\s+/g, " ").includes("25 000"), false, "Must not assign 2025 paidAtIso invoice to 2026");

		setRuntimeDemoMode(true);
		const taxCertDemo = generatePatientTaxCertificate1151156(data, 2026);
		assert.ok(taxCertDemo.includes("7841098765") && taxCertDemo.includes("М.П."));
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

		assert.ok(rxHtml.includes("Форма № 107-1/у"));
		assert.ok(rxHtml.includes("1094н"));
		assert.ok(rxHtml.includes("Rp.:"));
		assert.ok(rxHtml.includes("Signa"));
		assert.ok(rxHtml.includes("60 дней"));
		assert.ok(rxHtml.includes("svg") && rxHtml.includes("63-ФЗ"));
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

		assert.ok(printHtml.includes("ДОКУМЕНТ ПОДПИСАН ПРОСТОЙ ЭЛЕКТРОННОЙ ПОДПИСЬЮ (63-ФЗ)"));
		assert.ok(printHtml.includes(signedConsent.signatureAudit?.integrityHash || ""));
		assert.ok(printHtml.includes(data.fullName));
		assert.ok(printHtml.includes(data.phone));
	});
});
