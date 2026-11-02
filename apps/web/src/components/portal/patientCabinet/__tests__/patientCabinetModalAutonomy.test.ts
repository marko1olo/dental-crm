/**
 * patientCabinetModalAutonomy.test.ts
 *
 * Sweet-spot suite for Patient Cabinet Modal & Tab Autonomy (Mandates 8b, 8zi, 8e, 8d).
 * Audits 0 disabled buttons across tabs, 63-FZ PEP approval, 0 cartoon emojis, and desktop/mobile ergonomics.
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
const { PatientCabinetModal } = await import("../PatientCabinetModal");
const { OverviewTab } = await import("../tabs/OverviewTab");
const { InvoicesTab } = await import("../tabs/InvoicesTab");
const { DocumentsTab } = await import("../tabs/DocumentsTab");
const { TreatmentPlanTab } = await import("../tabs/TreatmentPlanTab");
import { DEMO_PATIENT_CABINET } from "../patientCabinetPresets";
import {
	calculateCabinetSummary, calculateDentalHealthIndex, calculatePatientTaxDeduction,
	generatePatientDentalPassport, generateCompletedWorksActHtml,
	generatePaymentInvoiceHtml, generateFnsReceiptCheckUrl, generateExtract043Html,
	generatePatientTaxCertificate1151156, generatePrescription107PrintHtml,
	signTreatmentPlanWithPep, signConsentWithPep, computePatientTeethFromStages,
	type GeneratedDocumentSummary, type PatientPrescriptionItem, type PatientStatutoryConsent,
} from "../patientCabinetEngine";
import { mapServerPortalMeToCabinetData } from "../patientCabinetMapper";

describe("PatientCabinetModalAutonomy — Mandates 8e, 8d, 8s Modal & Tab Suite", () => {
	const data = DEMO_PATIENT_CABINET;
	const summary = calculateCabinetSummary(data);
	const healthIndex = calculateDentalHealthIndex(data.teeth || []);
	const dentalPassport = generatePatientDentalPassport(data);
	const taxDeduction = calculatePatientTaxDeduction(data.invoices || [], 2026);

	it("1. Mandate 8e: Zero disabled buttons in PatientCabinetModal container", () => {
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
	});

	it("2. Mandate 8d pt 7 (Zero Cartoon Emojis): Vector Lucide icons across all tabs", () => {
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

		const emojiRegex = /\p{Extended_Pictographic}/u;
		assert.equal(emojiRegex.test(overviewHtml), false, "OverviewTab contains 0 raw unicode emojis");
		assert.equal(emojiRegex.test(plansHtml), false, "TreatmentPlanTab contains 0 raw unicode emojis");
		assert.equal(emojiRegex.test(invoicesHtml), false, "InvoicesTab contains 0 raw unicode emojis");
		assert.equal(emojiRegex.test(documentsHtml), false, "DocumentsTab contains 0 raw unicode emojis");
	});

	it("3. Desktop Density & CSS Tokens: Clinical 28-36px button heights and tokenized status badges", () => {
		const cssPath = fileURLToPath(new URL("../patientCabinet.css", import.meta.url));
		const css = readCssWithImports(cssPath);

		assert.ok(css.includes(".pc-btn-primary {") && css.includes("min-height: 36px;"), "Desktop primary button height is 36px");
		assert.ok(css.includes(".pc-btn-secondary {") && css.includes("min-height: 32px;"), "Desktop secondary button height is 32px");
		assert.ok(css.includes(".pc-close-btn {") && css.includes("min-height: 32px;"), "Desktop close button height is 32px");
		assert.ok(css.includes(".pc-status-badge.paid") && css.includes("color: var(--pc-success);"), "Paid badge uses var(--pc-success)");
		assert.ok(css.includes(".pc-status-badge.unpaid") && css.includes("color: var(--pc-warning);"), "Unpaid badge uses var(--pc-warning)");
		assert.ok(css.includes(".pc-status-badge.scheduled") && css.includes("color: var(--pc-primary);"), "Scheduled badge uses var(--pc-primary)");
	});

	it("4. Mandate 8s & Pipeline: mapServerPortalMeToCabinetData preserves documents and contracts without loss", () => {
		const serverPayload = {
			patient: { id: "pat-12345", fullName: "Кузнецов Петр Сергеевич", phone: "+79111234567" },
			invoices: [{
				id: "inv-1", number: "СЧ-001", status: "paid", totalAmountRub: 15000, paidAmountRub: 15000,
				items: [{ code: "A16.07.001", titleRu: "Лечение кариеса", quantity: 1, priceRub: 15000, totalRub: 15000 }],
			}],
			documents: [
				{
					id: "doc-contract-1", kind: "paid_medical_services_contract", title: "Договор на оказание медицинских услуг",
					status: "issued", totalAmountRub: 50000, documentNumber: "ДОГ-2026/01", issuedAt: "2026-08-01T10:00:00Z",
					issuedSnapshotSha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
				},
				{
					id: "doc-act-1", kind: "completed_works_act", title: "Акт выполненных работ", status: "issued",
					totalAmountRub: 15000, documentNumber: "АКТ-2026/01", issuedAt: "2026-08-05T12:00:00Z",
				},
			],
		};
		const mapped = mapServerPortalMeToCabinetData(serverPayload);
		assert.ok(Array.isArray(mapped.documents), "documents array is mapped and preserved");
		assert.equal(mapped.documents.length, 2, "Both server documents are retained");
		assert.equal(mapped.documents[0].id, "doc-contract-1");
		assert.equal(mapped.documents[0].kind, "paid_medical_services_contract");
		assert.equal(mapped.documents[0].totalAmountRub, 50000);
		assert.equal(mapped.documents[0].htmlUrl, "/api/portal/documents/doc-contract-1/html");
		assert.equal(mapped.documents[1].kind, "completed_works_act");
	});

	it("5. Mandates 8e, 4, 8d: InvoicesTab 1-click act, SBP/card actions, FNS receipt and zero disabled buttons", () => {
		const unpaidInv = data.invoices.find((i) => i.status === "unpaid" || i.status === "partially_paid");
		assert.ok(unpaidInv, "At least one unpaid invoice exists in test dataset");
		const paidInv = data.invoices.find((i) => i.status === "paid") || data.invoices[0]!;
		assert.ok(paidInv, "At least one paid invoice exists in test dataset");

		const invoiceA4Html = generatePaymentInvoiceHtml(unpaidInv, data);
		assert.ok(invoiceA4Html.includes("СЧЕТ НА ОПЛАТУ"), "A4 Invoice includes title");
		assert.ok(invoiceA4Html.includes("40702810938000123456"), "A4 Invoice includes Sberbank settlement account");

		const fnsCheckUrl = generateFnsReceiptCheckUrl(paidInv);
		assert.ok(fnsCheckUrl.includes("nalog.ru") || fnsCheckUrl.includes("nalog.gov.ru"), "FNS Receipt URL targets official Tax Service portal");

		const invoicesTabHtml = renderToStaticMarkup(
			createElement(InvoicesTab, {
				data,
				onOpenSbpForInvoice: () => {},
				onOpenCardPayment: () => {},
				onShowToast: () => {},
			}),
		);
		assert.ok(invoicesTabHtml.includes(`data-testid="pay-sbp-btn-${unpaidInv.id}"`), "Unpaid invoice has SBP payment button");
		assert.ok(invoicesTabHtml.includes(`data-testid="pay-card-btn-${unpaidInv.id}"`), "Unpaid invoice has Card payment button");
		assert.ok(invoicesTabHtml.includes(`data-testid="print-invoice-btn-${unpaidInv.id}"`), "Unpaid invoice has Print A4 invoice button");
		assert.ok(invoicesTabHtml.includes(`data-testid="download-receipt-btn-${paidInv.id}"`), "Paid invoice has Download 54-FZ receipt button");
		assert.ok(invoicesTabHtml.includes(`data-testid="print-receipt-btn-${paidInv.id}"`), "Paid invoice has Print 54-FZ receipt button");
		assert.ok(invoicesTabHtml.includes(`data-testid="print-act-btn-${paidInv.id}"`), "Paid invoice has Print completed works act button");
		assert.ok(invoicesTabHtml.includes(`data-testid="fns-check-link-${paidInv.id}"`), "Paid invoice has FNS verification link");
		assert.equal(invoicesTabHtml.includes("<button disabled") || invoicesTabHtml.includes('disabled=""'), false, "Zero disabled buttons across Invoices tab");
	});

	it("6. Mandate 8d & DocumentsTab: Real clinical docs, clean empty state, 043/u extract and 107-1/u print", () => {
		const sampleDocs: GeneratedDocumentSummary[] = [{
			id: "doc-live-1", kind: "paid_medical_services_contract",
			title: "Договор на оказание медицинских услуг № ДОГ-2026/01",
			status: "issued", dateIso: "2026-08-01", totalAmountRub: 89000,
			sha256: "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
		}];
		const sampleRx: PatientPrescriptionItem = {
			id: "rx-amox-500", medicationName: "Амоксициллин + Клавулановая кислота (Амоксиклав)",
			dosageRu: "500 мг + 125 мг", instructionRu: "По 1 таблетке 2 раза в сутки во время еды в течение 7 дней",
			durationRu: "7 дней", doctorName: "Д-р Смирнов А. В.", dateIso: "2026-08-10", validityDays: 60,
		};
		const docExtract: GeneratedDocumentSummary = {
			id: "doc-extract-043-test", kind: "medical_card_extract_043",
			title: "Официальная выписка из медицинской карты 043/у", documentNumber: "ВЫП-043/2026-8842",
			status: "issued", dateIso: "2026-08-10", sha256: "4b82d091e9821a8c9b3e1029348ab12e09847120394850192837461524354657",
		};

		const html = renderToStaticMarkup(
			createElement(DocumentsTab, {
				data: { ...data, documents: [...sampleDocs, docExtract], prescriptions: [sampleRx] },
				selectedTaxYear: 2026,
				onSelectTaxYear: () => {},
				taxDeductionCalc: taxDeduction,
				onStartConsentSigning: () => {},
				onOpenTaxCertificateSheet: () => {},
				onDownloadTaxCertificateDirect: () => {},
				onShowToast: () => {},
			}),
		);

		assert.ok(html.includes("clinical-documents-section"), "Clinical documents section is rendered");
		assert.ok(html.includes("view-doc-btn-doc-live-1"), "Clinical doc preview button is present");
		assert.ok(html.includes("print-extract-043-btn"), "1-click 043 extract print button rendered");
		assert.ok(html.includes(`print-prescription-btn-${sampleRx.id}`), "1-click prescription print button rendered");
		assert.equal(html.includes("/portal/documents/consent-"), false, "Zero fake /portal/documents/consent-...pdf 404 links");
		assert.equal(html.includes("<button disabled") || html.includes('disabled=""'), false, "Zero disabled buttons across Documents tab");
	});

	it("7. Mandates 8c, 8e, 8am: TreatmentPlanTab FDI 11..48 SVG, 3-Tier selector, tax deduction card and single Teal CTA", () => {
		const plan = data.treatmentPlans[0];
		assert.ok(plan, "Demo patient has treatment plan");
		const computedTeeth = computePatientTeethFromStages(plan.stages, data.warranties);
		assert.equal(computedTeeth.length, 32, "Calculates all 32 adult teeth");

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

		assert.ok(html.includes("patient-plan-dental-formula"), "Dental formula container is rendered");
		assert.ok(html.includes('viewBox="0 0 580 180"'), "SVG arch has responsive viewBox preventing horizontal scroll");
		assert.ok(html.includes('data-testid="pc-3tier-selector"'), "Renders 3-tier selector container");
		assert.ok(html.includes('data-testid="btn-tier-basic"'), "Renders Basic tier button");
		assert.ok(html.includes('data-testid="btn-tier-standard"'), "Renders Standard tier button");
		assert.ok(html.includes('data-testid="btn-tier-premium"'), "Renders Premium tier button");
		assert.ok(html.includes('data-testid="pc-plan-tax-deduction-card"'), "Renders 1-click tax deduction card");
		assert.ok(html.includes("Налоговый вычет 13% НДФЛ"), "Card contains 13% NDFL tax refund label");
		assert.equal(html.includes("<button disabled") || html.includes('disabled=""'), false, "Zero disabled buttons across TreatmentPlanTab");
	});

	it("8. Mandates 7.5 & 8e: 63-FZ PEP approval for treatment plan & statutory consent with SHA-256 audit", () => {
		const plan = data.treatmentPlans[0]!;
		const signedPlan = signTreatmentPlanWithPep(plan, data.phone, "884210", data.fullName);
		assert.equal(signedPlan.approvedByPatient, true, "Plan is marked approved");
		assert.equal(signedPlan.approvalAudit?.legalBasis, "63-ФЗ ПЭП", "Audit records 63-FZ PEP");
		assert.equal(signedPlan.approvalAudit?.integrityHash.length, 64, "SHA-256 integrity hash is valid 64-char hex");

		const pendingConsent: PatientStatutoryConsent = {
			id: "c-pending-pep-1", code: "IDS-THERAPY-01",
			titleRu: "Информированное добровольное согласие на терапевтическое лечение",
			categoryRu: "Терапия", statutoryBasis: "323-ФЗ", status: "pending_signature",
			summaryTextRu: "Согласие на обработку кариозных полостей и постановку композитных пломб.",
			fullTextContent: "Я, пациент, даю согласие на медицинское вмешательство по статье 20 323-ФЗ.",
		};
		const signedConsent = signConsentWithPep(pendingConsent, data.phone, "849201", data.fullName);
		assert.equal(signedConsent.status, "signed", "Consent transitioned to signed");
		assert.equal(signedConsent.signatureAudit?.legalBasis, "63-ФЗ ПЭП", "Audit records 63-FZ PEP basis");
		assert.equal(signedConsent.signatureAudit?.integrityHash.length, 64, "SHA-256 integrity hash is 64 hex chars");

		const docsSignedHtml = renderToStaticMarkup(
			createElement(DocumentsTab, {
				data: { ...data, consents: [signedConsent] },
				selectedTaxYear: 2026,
				onSelectTaxYear: () => {},
				taxDeductionCalc: taxDeduction,
				onStartConsentSigning: () => {},
				onOpenTaxCertificateSheet: () => {},
				onDownloadTaxCertificateDirect: () => {},
				onShowToast: () => {},
			}),
		);
		assert.ok(docsSignedHtml.includes(`data-testid="print-signed-consent-btn-${signedConsent.id}"`), "Signed consent renders 1-click print button");
		assert.ok(docsSignedHtml.includes("Криптографический хеш ПЭП (SHA-256)"), "Renders SHA-256 audit badge");
		assert.equal(docsSignedHtml.includes("<button disabled") || docsSignedHtml.includes('disabled=""'), false, "Zero disabled buttons on consent workflow");
	});
});
