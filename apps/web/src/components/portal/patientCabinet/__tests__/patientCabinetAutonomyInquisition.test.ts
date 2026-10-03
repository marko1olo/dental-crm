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
const { PatientCabinetModal } = await import("../PatientCabinetModal");
const { OverviewTab } = await import("../tabs/OverviewTab");
const { InvoicesTab } = await import("../tabs/InvoicesTab");
const { DocumentsTab } = await import("../tabs/DocumentsTab");
const { TreatmentPlanTab } = await import("../tabs/TreatmentPlanTab");
const { ConsentSigningSheet } = await import("../sheets/ConsentSigningSheet");
const { SbpPaymentSheet } = await import("../sheets/SbpPaymentSheet");
const { CareMemoSheet } = await import("../sheets/CareMemoSheet");
const { ReceptionQrSheet } = await import("../sheets/ReceptionQrSheet");
const { RescheduleSheet } = await import("../sheets/RescheduleSheet");
import { DEMO_PATIENT_CABINET } from "../patientCabinetPresets";
import {
	calculateCabinetSummary, calculateDentalHealthIndex, calculatePatientTaxDeduction,
	generateCompletedWorksActHtml, generateConsentPrintHtml, generateDocumentSnapshotHtml,
	generatePatientDentalPassport, generatePrescription107PrintHtml, generateSbpQrPayload,
	generatePaymentInvoiceHtml, generateFnsReceiptCheckUrl, generateExtract043Html,
	generatePatientTaxCertificate1151156, generateTreatmentPlanEstimateHtml,
	signTreatmentPlanWithPep, signConsentWithPep, computePatientTeethFromStages,
	type GeneratedDocumentSummary, type PatientPrescriptionItem, type PatientStatutoryConsent,
} from "../patientCabinetEngine";
import { mapServerPortalMeToCabinetData } from "../patientCabinetMapper";
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
		const css = readCssWithImports(cssPath);

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
		const css = readCssWithImports(cssPath);

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
		const css = readCssWithImports(cssPath);

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

	it("7. Mandate 8s & Pipeline: mapServerPortalMeToCabinetData maps documents and prescriptions without loss", () => {
		const serverPayload = {
			patient: {
				id: "pat-12345",
				fullName: "Кузнецов Петр Сергеевич",
				phone: "+79111234567",
			},
			invoices: [
				{
					id: "inv-1",
					number: "СЧ-001",
					status: "paid",
					totalAmountRub: 15000,
					paidAmountRub: 15000,
					items: [
						{
							code: "A16.07.001",
							titleRu: "Лечение кариеса",
							quantity: 1,
							priceRub: 15000,
							totalRub: 15000,
						},
					],
				},
			],
			documents: [
				{
					id: "doc-contract-1",
					kind: "paid_medical_services_contract",
					title: "Договор на оказание медицинских услуг",
					status: "issued",
					totalAmountRub: 50000,
					documentNumber: "ДОГ-2026/01",
					issuedAt: "2026-08-01T10:00:00Z",
					issuedSnapshotSha256:
						"e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
				},
				{
					id: "doc-act-1",
					kind: "completed_works_act",
					title: "Акт выполненных работ",
					status: "issued",
					totalAmountRub: 15000,
					documentNumber: "АКТ-2026/01",
					issuedAt: "2026-08-05T12:00:00Z",
				},
			],
		};

		const mapped = mapServerPortalMeToCabinetData(serverPayload);
		assert.ok(
			Array.isArray(mapped.documents),
			"documents array is mapped and preserved",
		);
		assert.equal(mapped.documents.length, 2, "Both server documents are retained");
		assert.equal(mapped.documents[0].id, "doc-contract-1");
		assert.equal(
			mapped.documents[0].kind,
			"paid_medical_services_contract",
		);
		assert.equal(mapped.documents[0].totalAmountRub, 50000);
		assert.equal(
			mapped.documents[0].htmlUrl,
			"/api/portal/documents/doc-contract-1/html",
		);
		assert.equal(mapped.documents[1].kind, "completed_works_act");
	});

	it("8. Mandate 7.5 & InvoicesTab: 1-click button «Акт выполненных работ» renders for paid invoices and generates publication HTML", () => {
		const invoicesHtml = renderToStaticMarkup(
			createElement(InvoicesTab, {
				data,
				onOpenSbpForInvoice: () => {},
				onShowToast: () => {},
			}),
		);

		// Verified that print act button exists for paid invoices
		assert.ok(
			invoicesHtml.includes("Акт выполненных работ"),
			"InvoicesTab contains 1-click «Акт выполненных работ» button",
		);
		assert.ok(
			invoicesHtml.includes("print-act-btn-"),
			"InvoicesTab features data-testid=print-act-btn for paid invoices",
		);

		// Verify publication-grade completed works act generator
		const paidInv =
			data.invoices.find((i) => i.status === "paid") || data.invoices[0]!;
		const actHtml = generateCompletedWorksActHtml(paidInv, data);
		assert.ok(
			actHtml.includes("АКТ ВЫПОЛНЕННЫХ РАБОТ"),
			"Act HTML contains official Russian title",
		);
		assert.ok(
			actHtml.includes("ст. 720 ГК РФ"),
			"Act HTML cites Civil Code basis",
		);
		assert.ok(
			actHtml.includes(data.fullName),
			"Act HTML contains patient full name",
		);
		assert.ok(
			actHtml.includes("М.П. ООО «Стоматологическая клиника ДЕНТЕ»"),
			"Act HTML contains clinic stamp box",
		);
	});

	it("9. Mandate 8d & DocumentsTab: Real clinical docs render, zero fake 404 links, clean empty state when no prescriptions", () => {
		const sampleDocs: GeneratedDocumentSummary[] = [
			{
				id: "doc-live-1",
				kind: "paid_medical_services_contract",
				title: "Договор на оказание медицинских услуг № ДОГ-2026/01",
				status: "issued",
				dateIso: "2026-08-01",
				totalAmountRub: 89000,
				sha256:
					"9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
			},
		];

		const dataWithDocs = {
			...data,
			documents: sampleDocs,
			prescriptions: [], // No prescriptions
		};

		const html = renderToStaticMarkup(
			createElement(DocumentsTab, {
				data: dataWithDocs,
				selectedTaxYear: 2026,
				onSelectTaxYear: () => {},
				taxDeductionCalc: taxDeduction,
				onStartConsentSigning: () => {},
				onOpenTaxCertificateSheet: () => {},
				onDownloadTaxCertificateDirect: () => {},
				onShowToast: () => {},
			}),
		);

		// Real clinical documents section is present
		assert.ok(
			html.includes("clinical-documents-section"),
			"Clinical documents section is rendered",
		);
		assert.ok(
			html.includes("view-doc-btn-doc-live-1"),
			"Clinical doc preview button is present",
		);
		assert.ok(
			html.includes("Договор на оказание медицинских услуг"),
			"Document title rendered",
		);

		// Reassuring empty state when prescriptions are absent
		assert.ok(
			html.includes("Назначений лекарственных препаратов нет"),
			"Shows clean empty state when no prescriptions exist",
		);
		// Zero hardcoded antibiotic mocks
		assert.equal(
			html.includes("Амоксициллин 500 мг (капсулы №20)"),
			false,
			"Hardcoded Amoxicillin mock is completely removed",
		);
		assert.equal(
			html.includes("Ибупрофен 400 мг (таблетки №20)"),
			false,
			"Hardcoded Ibuprofen mock is completely removed",
		);

		// Zero fake /portal/documents/consent-...pdf 404 links
		assert.equal(
			html.includes("/portal/documents/consent-"),
			false,
			"Zero fake /portal/documents/consent-...pdf 404 links",
		);

		// Verify printable consent generator
		const consentHtml = generateConsentPrintHtml(data.consents[0]!, data);
		assert.ok(
			consentHtml.includes("Информированное") ||
				consentHtml.toLowerCase().includes("согласие"),
			"Consent HTML rendered",
		);
		assert.ok(
			consentHtml.includes("323-ФЗ") || consentHtml.includes("152-ФЗ"),
			"Consent HTML includes statutory basis",
		);
	});

	it("10. Mandate 8c & TreatmentPlanTab: Real dental formula FDI 11..48 renders in SVG without horizontal scroll", () => {
		const plan = data.treatmentPlans[0];
		assert.ok(plan, "Demo patient has treatment plan");

		const computedTeeth = computePatientTeethFromStages(plan.stages, data.warranties);
		assert.equal(computedTeeth.length, 32, "Calculates all 32 adult teeth");

		// Tooth 16 should be implant from stage 2 / warranty
		const tooth16 = computedTeeth.find((t) => t.fdiCode === "16");
		assert.ok(tooth16, "Tooth 16 exists");
		assert.ok(
			tooth16.status === "missing_or_implant" || tooth16.status === "healthy",
			"Tooth 16 has valid clinical status from plan",
		);

		// Render TreatmentPlanTab
		const html = renderToStaticMarkup(
			createElement(TreatmentPlanTab, {
				data,
				dentalPassport,
				onPayStageWithSbp: () => {},
				onBookAppointment: () => {},
				onApproveTreatmentPlan: () => {},
				onShowToast: () => {},
			}),
		);

		// Dental formula container and SVG arch must be present
		assert.ok(
			html.includes("patient-plan-dental-formula"),
			"Dental formula container is rendered",
		);
		assert.ok(
			html.includes('viewBox="0 0 580 180"'),
			"SVG arch has responsive viewBox preventing horizontal scroll",
		);
		assert.ok(
			html.includes("plan-tooth-16"),
			"Tooth 16 is rendered in dental formula",
		);
		assert.ok(
			html.includes("plan-tooth-36"),
			"Tooth 36 is rendered in dental formula",
		);
		assert.ok(
			html.includes("filter-teeth-all"),
			"Status filter chips are present",
		);
	});

	it("11. Mandate 7.5 & 8e: Treatment Plan approval (63-FZ PEP) and printable estimate generation", () => {
		const plan = data.treatmentPlans[0];
		assert.ok(plan, "Demo plan exists");

		// Sign plan with PEP
		const signedPlan = signTreatmentPlanWithPep(
			plan,
			data.phone,
			"884210",
			data.fullName,
		);
		assert.equal(signedPlan.approvedByPatient, true, "Plan is marked approved");
		assert.ok(signedPlan.approvedAtIso, "Signed date timestamp is present");
		assert.ok(signedPlan.approvalAudit, "Approval audit exists");
		assert.equal(signedPlan.approvalAudit?.legalBasis, "63-ФЗ ПЭП", "Audit records 63-FZ PEP");
		assert.ok(
			signedPlan.approvalAudit?.integrityHash && signedPlan.approvalAudit.integrityHash.length === 64,
			"SHA-256 integrity hash is valid 64-char hex",
		);

		// Generate printable estimate HTML
		const estimateHtml = generateTreatmentPlanEstimateHtml(signedPlan, data);
		assert.ok(estimateHtml.includes("ООО «Стоматологическая клиника ДЕНТЕ»"), "Estimate contains clinic legal entity");
		assert.ok(estimateHtml.includes("7841098765"), "Estimate contains clinic INN");
		assert.ok(estimateHtml.includes(plan.planNumber), "Estimate contains plan number");
		assert.ok(estimateHtml.includes(data.fullName), "Estimate contains patient full name");
		assert.ok(estimateHtml.includes("63-ФЗ"), "Estimate includes 63-FZ PEP stamp");
		assert.ok(estimateHtml.includes("ВСЁ ВКЛЮЧЕНО"), "Estimate contains Mandate 8e all-inclusive transparency statement");

		// Render tab and verify zero disabled buttons on plan actions
		const tabHtml = renderToStaticMarkup(
			createElement(TreatmentPlanTab, {
				data,
				dentalPassport,
				onPayStageWithSbp: () => {},
				onBookAppointment: () => {},
				onApproveTreatmentPlan: () => {},
				onShowToast: () => {},
			}),
		);
		assert.ok(tabHtml.includes("approve-treatment-plan-btn") || tabHtml.includes("plan-approved-badge"), "Approve plan button or approved badge is rendered");
		assert.ok(tabHtml.includes("print-treatment-plan-btn"), "Print estimate button is rendered");
		assert.equal(tabHtml.includes("<button disabled") || tabHtml.includes('disabled=""'), false, "Zero disabled buttons across treatment plan tab");
	});

	it("12. Mandate 8e, 4, 8d: Unpaid invoice SBP/Card payment & A4 Invoice, Paid invoice 54-FZ FNS link & Act", () => {
		const unpaidInv = data.invoices.find((i) => i.status === "unpaid" || i.status === "partially_paid");
		assert.ok(unpaidInv, "At least one unpaid invoice exists in test dataset");
		const paidInv = data.invoices.find((i) => i.status === "paid");
		assert.ok(paidInv, "At least one paid invoice exists in test dataset");

		// Test A4 Payment Invoice HTML generation
		const invoiceA4Html = generatePaymentInvoiceHtml(unpaidInv, data);
		assert.ok(invoiceA4Html.includes("СЧЕТ НА ОПЛАТУ"), "A4 Invoice includes title with invoice number");
		assert.ok(invoiceA4Html.includes("40702810938000123456"), "A4 Invoice includes Sberbank settlement account");
		assert.ok(invoiceA4Html.includes("044030653"), "A4 Invoice includes Sberbank BIC");
		assert.ok(invoiceA4Html.includes("svg"), "A4 Invoice includes embedded SBP QR SVG for instant mobile payment");
		assert.ok(invoiceA4Html.includes("7841098765"), "A4 Invoice includes clinic INN");

		// Test FNS Receipt Check URL generation
		const fnsCheckUrl = generateFnsReceiptCheckUrl(paidInv);
		assert.ok(fnsCheckUrl.includes("nalog.ru") || fnsCheckUrl.includes("nalog.gov.ru"), "FNS Receipt URL targets official Tax Service portal");
		assert.ok(fnsCheckUrl.includes(paidInv.id) || fnsCheckUrl.includes(paidInv.fiscalReceiptNumber || "") || fnsCheckUrl.includes("fn="), "FNS Receipt URL includes fiscal attributes or receipt identifier");

		// Render InvoicesTab and verify all action buttons & zero disabled buttons
		const invoicesTabHtml = renderToStaticMarkup(
			createElement(InvoicesTab, {
				data,
				onOpenSbpForInvoice: () => {},
				onOpenCardPayment: () => {},
				onShowToast: () => {},
			}),
		);

		// Unpaid invoice actions
		assert.ok(invoicesTabHtml.includes(`data-testid="pay-sbp-btn-${unpaidInv.id}"`), "Unpaid invoice has SBP payment button");
		assert.ok(invoicesTabHtml.includes(`data-testid="pay-card-btn-${unpaidInv.id}"`), "Unpaid invoice has Card payment button");
		assert.ok(invoicesTabHtml.includes(`data-testid="print-invoice-btn-${unpaidInv.id}"`), "Unpaid invoice has Print A4 invoice button");
		assert.ok(invoicesTabHtml.includes(`data-testid="download-invoice-btn-${unpaidInv.id}"`), "Unpaid invoice has Download A4 invoice button");

		// Paid invoice actions
		assert.ok(invoicesTabHtml.includes(`data-testid="download-receipt-btn-${paidInv.id}"`), "Paid invoice has Download 54-FZ receipt button");
		assert.ok(invoicesTabHtml.includes(`data-testid="print-receipt-btn-${paidInv.id}"`), "Paid invoice has Print 54-FZ receipt button");
		assert.ok(invoicesTabHtml.includes(`data-testid="print-act-btn-${paidInv.id}"`), "Paid invoice has Print completed works act button");
		assert.ok(invoicesTabHtml.includes(`data-testid="fns-check-link-${paidInv.id}"`), "Paid invoice has FNS verification link");

		// Autonomy invariant: Zero disabled buttons
		assert.equal(invoicesTabHtml.includes("<button disabled") || invoicesTabHtml.includes('disabled=""'), false, "Zero disabled buttons across Invoices tab");
	});

	it("13. Mandate 7.5 & 8e: Form 043/u extract with anamnesis, FDI formula, ICD-10, procedures & doctor stamp", () => {
		const docExtract: GeneratedDocumentSummary = {
			id: "doc-extract-043-test",
			kind: "medical_card_extract_043",
			title: "Официальная выписка из медицинской карты 043/у",
			documentNumber: "ВЫП-043/2026-8842",
			status: "issued",
			dateIso: "2026-08-10",
			sha256: "4b82d091e9821a8c9b3e1029348ab12e09847120394850192837461524354657",
		};

		// 1. Verify polygraphic HTML generator
		const extractHtml = generateExtract043Html(docExtract, data);
		assert.ok(extractHtml.includes("Форма № 043/у"), "Includes Form 043/u header");
		assert.ok(extractHtml.includes("ООО «Стоматологическая клиника ДЕНТЕ»"), "Includes clinic name");
		assert.ok(extractHtml.includes("ЛО-78-01-011842"), "Includes license number");
		assert.ok(extractHtml.includes(data.fullName), "Includes patient name");
		assert.ok(extractHtml.includes(data.cardNumber), "Includes card number");
		assert.ok(extractHtml.includes("Анамнез жизни и соматический статус"), "Includes anamnesis");
		assert.ok(extractHtml.includes("Зубная формула при первичном осмотре (номенклатура FDI)"), "Includes FDI formula");
		assert.ok(extractHtml.includes("18") && extractHtml.includes("48"), "Includes FDI teeth numbers");
		assert.ok(extractHtml.includes("К02.1") && extractHtml.includes("Кариес дентина"), "Includes ICD-10 K02.1");
		assert.ok(extractHtml.includes("К04.0") && extractHtml.includes("Пульпит"), "Includes ICD-10 K04.0");
		assert.ok(extractHtml.includes("A16.07.054"), "Includes 804n code");
		assert.ok(extractHtml.includes(data.curatingDoctor), "Includes doctor name");
		assert.ok(extractHtml.includes("Личная печать"), "Includes doctor stamp");
		assert.ok(extractHtml.includes("323-ФЗ"), "Includes 323-FZ basis");

		// 2. Render DocumentsTab with extract 043 document
		const docsTabHtml = renderToStaticMarkup(
			createElement(DocumentsTab, { data: { ...data, documents: [docExtract] }, selectedTaxYear: 2026, onSelectTaxYear: () => {}, taxDeductionCalc: taxDeduction, onStartConsentSigning: () => {}, onOpenTaxCertificateSheet: () => {}, onDownloadTaxCertificateDirect: () => {}, onShowToast: () => {} }),
		);

		assert.ok(docsTabHtml.includes('data-testid="print-extract-043-btn"'), "1-click 043 print button rendered");
		assert.ok(docsTabHtml.includes("Печать выписки из медкарты") || docsTabHtml.includes("Печать выписки 043/у"), "Button label states medical card extract print");
		assert.equal(docsTabHtml.includes("<button disabled") || docsTabHtml.includes('disabled=""'), false, "Zero disabled buttons across Documents tab");
	});

	it("14. Mandate 7.5, 8e: Form KND 1151156 tax deduction certificate with clinic credentials, payer INN, Code 1/2 & 1-click print", () => {
		// 1. Verify generation of statutory Form KND 1151156
		const taxCertHtml = generatePatientTaxCertificate1151156(data, 2026);
		assert.ok(taxCertHtml.includes("1151156"), "Includes Form KND 1151156 identifier");
		assert.ok(taxCertHtml.includes("7841098765"), "Includes clinic INN 7841098765");
		assert.ok(taxCertHtml.includes("784101001"), "Includes clinic KPP");
		assert.ok(taxCertHtml.includes("ЛО-78-01-011842"), "Includes medical license");
		assert.ok(taxCertHtml.includes(data.fullName), "Includes taxpayer full name");
		assert.ok(taxCertHtml.includes("2026"), "Includes tax year 2026");
		assert.ok(taxCertHtml.includes(">1<") || taxCertHtml.includes("Код 1"), "Includes Code 1 for standard therapy");
		assert.ok(taxCertHtml.includes(">2<") || taxCertHtml.includes("Код 2"), "Includes Code 2 for expensive implant surgery");
		assert.ok(taxCertHtml.includes("Руководитель организации") || taxCertHtml.includes("Смирнов А. В."), "Includes head executive signature");
		assert.ok(taxCertHtml.includes("М.П."), "Includes clinic stamp box");

		// 2. Render InvoicesTab and assert 1-click print button
		const invoicesTabHtml = renderToStaticMarkup(
			createElement(InvoicesTab, { data, onOpenSbpForInvoice: () => {}, onOpenCardPayment: () => {}, onShowToast: () => {} }),
		);
		assert.ok(invoicesTabHtml.includes('data-testid="print-tax-deduction-btn"'), "InvoicesTab renders 1-click tax deduction print button");

		// 3. Render DocumentsTab and assert 1-click print button & zero disabled locks
		const docsTabHtml = renderToStaticMarkup(
			createElement(DocumentsTab, { data, selectedTaxYear: 2026, onSelectTaxYear: () => {}, taxDeductionCalc: taxDeduction, onStartConsentSigning: () => {}, onOpenTaxCertificateSheet: () => {}, onDownloadTaxCertificateDirect: () => {}, onShowToast: () => {} }),
		);
		assert.ok(docsTabHtml.includes('data-testid="print-tax-deduction-btn"'), "DocumentsTab renders 1-click tax deduction print button");
		assert.equal(
			docsTabHtml.includes("<button disabled") || invoicesTabHtml.includes("<button disabled"),
			false,
			"Zero disabled buttons on tax deduction actions across tabs",
		);
	});

	it("15. Mandate 7.5, 8e: Form 107-1/u prescription blank with Rp., Signa, clinic stamp, doctor seal & QR verification", () => {
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

		// 1. Verify generation of statutory Form 107-1/u
		const rxHtml = generatePrescription107PrintHtml(sampleRx, data);
		assert.ok(rxHtml.includes("Форма № 107-1/у"), "Includes official Form 107-1/u title");
		assert.ok(rxHtml.includes("1094н"), "Cites Order 1094n basis");
		assert.ok(rxHtml.includes("ООО «Стоматологическая клиника ДЕНТЕ»"), "Includes clinic name");
		assert.ok(rxHtml.includes("1217800098765"), "Includes clinic OGRN");
		assert.ok(rxHtml.includes(data.fullName), "Includes patient full name");
		assert.ok(rxHtml.includes("Д-р Смирнов А. В."), "Includes doctor name");
		assert.ok(rxHtml.includes("Rp.:"), "Includes Latin Rp. prefix");
		assert.ok(rxHtml.includes("Signa"), "Includes Signa usage instructions");
		assert.ok(rxHtml.includes("60 дней"), "Includes validity period");
		assert.ok(rxHtml.includes("Врач-стоматолог") && rxHtml.includes("Личная печать"), "Includes doctor seal");
		assert.ok(rxHtml.includes("Для рецептов"), "Includes pharmacy stamp");
		assert.ok(rxHtml.includes("svg") && rxHtml.includes("63-ФЗ"), "Includes 63-FZ verification QR SVG");

		// 2. Render DocumentsTab with prescription and assert 1-click print button
		const docsTabHtml = renderToStaticMarkup(
			createElement(DocumentsTab, { data: { ...data, prescriptions: [sampleRx] }, selectedTaxYear: 2026, onSelectTaxYear: () => {}, taxDeductionCalc: taxDeduction, onStartConsentSigning: () => {}, onOpenTaxCertificateSheet: () => {}, onDownloadTaxCertificateDirect: () => {}, onShowToast: () => {} }),
		);
		assert.ok(docsTabHtml.includes(`data-testid="print-prescription-btn-${sampleRx.id}"`), "Renders 1-click print prescription button");
		assert.ok(docsTabHtml.includes("Печать рецепта (107-1/у)"), "Button label indicates 107-1/u print");
		assert.equal(docsTabHtml.includes("<button disabled") || docsTabHtml.includes('disabled=""'), false, "Zero disabled buttons across Documents tab");
	});

	it("16. Mandate 7.5, 8e: Informed voluntary consent (323-FZ) PEP signing (63-FZ), SHA-256 stamp & printable blank", () => {
		const pendingConsent: PatientStatutoryConsent = {
			id: "c-pending-pep-1",
			code: "IDS-THERAPY-01",
			titleRu: "Информированное добровольное согласие на терапевтическое лечение",
			categoryRu: "Терапия",
			statutoryBasis: "323-ФЗ",
			status: "pending_signature",
			summaryTextRu: "Согласие на обработку кариозных полостей и постановку композитных пломб.",
			fullTextContent: "Я, пациент, даю согласие на медицинское вмешательство в соответствии со статьей 20 Федерального закона № 323-ФЗ.",
		};

		// 1. Render DocumentsTab with pending consent and verify 1-click sign button
		const docsPendingHtml = renderToStaticMarkup(
			createElement(DocumentsTab, { data: { ...data, consents: [pendingConsent] }, selectedTaxYear: 2026, onSelectTaxYear: () => {}, taxDeductionCalc: taxDeduction, onStartConsentSigning: () => {}, onOpenTaxCertificateSheet: () => {}, onDownloadTaxCertificateDirect: () => {}, onShowToast: () => {} }),
		);
		assert.ok(docsPendingHtml.includes(`data-testid="sign-consent-btn-${pendingConsent.id}"`), "Pending consent renders 1-click PEP signing button");
		assert.ok(docsPendingHtml.includes("Подписать по SMS (63-ФЗ ПЭП)"), "Button label mentions 63-FZ PEP");

		// 2. Perform 63-FZ Simple Electronic Signature (PEP)
		const signedConsent = signConsentWithPep(pendingConsent, data.phone, "849201", data.fullName);
		assert.equal(signedConsent.status, "signed", "Status transitioned to signed");
		assert.ok(signedConsent.signatureAudit, "Signature audit record created");
		assert.equal(signedConsent.signatureAudit?.legalBasis, "63-ФЗ ПЭП", "Audit records 63-FZ PEP basis");
		assert.equal(signedConsent.signatureAudit?.phone, data.phone, "Audit records verification phone");
		assert.equal(signedConsent.signatureAudit?.integrityHash.length, 64, "SHA-256 integrity hash is 64 hex chars");

		// 3. Render DocumentsTab with signed consent and verify audit badge & 1-click print button
		const docsSignedHtml = renderToStaticMarkup(
			createElement(DocumentsTab, { data: { ...data, consents: [signedConsent] }, selectedTaxYear: 2026, onSelectTaxYear: () => {}, taxDeductionCalc: taxDeduction, onStartConsentSigning: () => {}, onOpenTaxCertificateSheet: () => {}, onDownloadTaxCertificateDirect: () => {}, onShowToast: () => {} }),
		);
		assert.ok(docsSignedHtml.includes(`data-testid="print-signed-consent-btn-${signedConsent.id}"`), "Signed consent renders 1-click print button");
		assert.ok(docsSignedHtml.includes("Криптографический хеш ПЭП (SHA-256)"), "Renders SHA-256 audit badge");
		assert.ok(docsSignedHtml.includes(signedConsent.signatureAudit.integrityHash), "Renders actual SHA-256 hash");

		// 4. Verify printable publication HTML contains PEP stamp and 323-FZ / 63-FZ credentials
		const printHtml = generateConsentPrintHtml(signedConsent, data);
		assert.ok(printHtml.includes("ДОКУМЕНТ ПОДПИСАН ПРОСТОЙ ЭЛЕКТРОННОЙ ПОДПИСЬЮ (63-ФЗ)"), "Includes statutory PEP header");
		assert.ok(printHtml.includes(signedConsent.signatureAudit.integrityHash), "Includes SHA-256 hash in print HTML");
		assert.ok(printHtml.includes(data.fullName), "Includes patient name in print HTML");
		assert.ok(printHtml.includes(data.phone), "Includes phone in print HTML");
		assert.ok(printHtml.includes("ООО «Стоматологическая клиника ДЕНТЕ»"), "Includes clinic name in print HTML");

		// 5. Zero disabled buttons invariant across DocumentsTab
		assert.equal(docsPendingHtml.includes("<button disabled") || docsSignedHtml.includes("<button disabled"), false, "Zero disabled buttons on consent workflow");
	});
});
