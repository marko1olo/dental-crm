/**
 * soloDoctorFrictionKillerWave46.test.tsx
 *
 * DENTE Dental CRM — Wave 46 Unit Tests:
 * Solo-Doctor Friction Killer & Reality/Procedure Simulator Elimination (Mandates 8e, 8k, 8n).
 *
 * Verifies:
 * 1. 54-FZ Buyer INN optionality for natural persons (Mandate 8e, 8n) in PaymentModal, FastCheckoutModal, PatientAdministrativeForm.
 * 2. Complete elimination of denomination simulator / banknote counting (Mandate 8k) in ShiftCloseZReportModal & CashDayTally.
 * 3. Quick cash change input wording without procedure simulator jargon ("Быстрый ввод внесенной суммы").
 * 4. 1-Click carpule & visit write-offs without commission (Mandate 8e item 10, 8n).
 * 5. Strict Zero Emojis (⚡) across financial modals (Mandate 8d item 7).
 * 6. Softphone dialer call button autonomy (btn-start-outgoing-call).
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";
import { ShiftCloseZReportModal } from "../fiscal/ShiftCloseZReportModal.js";
import { CashDayTally } from "../CashDayTally.js";
import { PaymentModal } from "../PaymentModal.js";
import { FastCheckoutModal } from "../FastCheckoutModal.js";
import { FiscalReceipt54FzModal } from "../FiscalReceipt54FzModal.js";
import { PatientAdministrativeForm } from "../../patients/PatientAdministrativeForm.js";
import { ClinicalWriteoffModal } from "../../inventory/writeoff/ClinicalWriteoffModal.js";
import {
	createQuickCarpuleWriteoffDocument,
	createQuickVisitWriteoffDocument,
} from "../../inventory/writeoff/clinicalWriteoffEngine.js";
import { TelephonyFloatingWidget } from "../../telephony/TelephonyFloatingWidget.js";
import { validate54FzBuyerInn } from "../cashboxOperations.js";

describe("Wave 46: 54-FZ Buyer INN Optionality for Citizens (Mandates 8e & 8n)", () => {
	it("verifies validate54FzBuyerInn treats empty INN for physical person as strictly valid & optional", () => {
		const resEmpty = validate54FzBuyerInn("", "physical");
		assert.equal(resEmpty.isValid, true);
		assert.equal(resEmpty.isRequired, false);
		assert.equal(resEmpty.errorMessage, undefined);

		// With optional 12 digits, valid
		const res12 = validate54FzBuyerInn("770123456789", "physical");
		assert.equal(res12.isValid, true);

		// Legal entity requires 10 digits
		const resLegalEmpty = validate54FzBuyerInn("", "legal_entity");
		assert.equal(resLegalEmpty.isValid, false);
		assert.equal(resLegalEmpty.isRequired, true);
	});

	it("renders physical person INN badge and inputs in PaymentModal", () => {
		const html = renderToString(
			React.createElement(PaymentModal, {
				isOpen: true,
				onClose: () => {},
				patientId: "pat-test-1",
				patientName: "Кузнецов Михаил Сергеевич",
				amountRub: 5000,
			})
		);

		assert.ok(html.includes('data-testid="payer-type-section"'), "Must render payer type section");
		assert.ok(html.includes('data-testid="tab-payer-physical"'), "Must render physical person tab");
		assert.ok(html.includes('data-testid="tab-payer-legal"'), "Must render legal entity tab");
		assert.ok(html.includes('data-testid="inn-physical-not-required-badge"'), "Must render 54-FZ badge");
		assert.ok(html.includes("54-ФЗ для физлиц не требуется"), "Must state INN not required for physical persons");
		assert.ok(html.includes('data-testid="input-buyer-inn-physical"'), "Must render physical person INN input");
	});

	it("renders physical person INN badge and inputs in FastCheckoutModal", () => {
		const html = renderToString(
			React.createElement(FastCheckoutModal, {
				isOpen: true,
				onClose: () => {},
				patientId: "pat-test-1",
				patientName: "Кузнецов Михаил Сергеевич",
				totalBillRub: 3500,
			})
		);

		assert.ok(html.includes('data-testid="payer-type-section"'), "Must render payer type section");
		assert.ok(html.includes('data-testid="inn-physical-not-required-badge"'), "Must render 54-FZ badge");
		assert.ok(html.includes('data-testid="input-buyer-inn-physical"'), "Must render physical person INN input");
	});

	it("renders optional badge on INN field in PatientAdministrativeForm", () => {
		const html = renderToString(
			React.createElement(PatientAdministrativeForm, {
				patientAdministrativeProfileDraft: {
					fullName: "Иванов Иван Иванович",
					taxpayerInn: "",
					identityDocument: "",
					snilsNumber: "",
					insurancePolicyNumber: "",
					insuranceCompanyTitle: "",
					birthDate: "1990-01-01",
					gender: "male",
					phoneMobile: "+7 (999) 000-00-00",
					residentialAddress: "",
					preferredAppointmentWeekdays: [],
				} as any,
				updatePatientAdministrativeProfileDraft: () => {},
			})
		);

		assert.ok(html.includes('data-testid="inn-patient-admin-optional-badge"'), "Must render optional badge for patient INN");
		assert.ok(html.includes("(опционально для физлиц, 54-ФЗ)"), "Badge text must state optional for 54-FZ");
	});
});

describe("Wave 46: Elimination of Denomination Simulator & Banknote Counting (Mandate 8k)", () => {
	it("verifies ShiftCloseZReportModal has single cash input & match button and NO denomination grid", () => {
		const html = renderToString(
			React.createElement(ShiftCloseZReportModal, {
				isOpen: true,
				onClose: () => {},
				onConfirmCloseShift: () => {},
				initialTab: "drawer",
				cashierFullName: "Иванова А. С.",
			})
		);

		// Single actual cash drawer input
		assert.ok(html.includes('data-testid="input-drawer-actual-cash"'), "Must have single cash drawer input");
		// 1-Click match button
		assert.ok(html.includes('data-testid="btn-match-drawer-cash"'), "Must have 1-click match cash button");
		assert.ok(html.includes("Совпадает с кассой"), "Button must state 'Совпадает с кассой'");

		// Proves absence of denomination breakdown calculator
		assert.equal(html.includes('data-testid="denom-calc"'), false, "Must not have denomination calculator");
		assert.equal(html.includes('data-testid="denom-grid"'), false, "Must not have denomination grid");
		assert.equal(html.includes("Опись купюр"), false, "Must not have procedure simulator wording");
	});

	it("verifies CashDayTally renders 1-click match button without denomination simulator", () => {
		const html = renderToString(
			React.createElement(CashDayTally, {
				payments: [
					{
						id: "p1",
						amountRub: 15400,
						method: "cash",
						status: "paid",
						paidAt: new Date().toISOString(),
					} as any,
				],
				methodLabels: { cash: "Наличные" },
				money: (v: number | null) => `${v ?? 0} ₽`,
			})
		);

		assert.ok(html.includes('data-testid="btn-cash-matches"'), "Must render 1-click match cash button");
		assert.ok(html.includes("Совпадает с кассой"), "Must label button with match text");
	});

	it("verifies quick cash input wording in financial modals eliminates 'выбор купюр'", () => {
		const paymentHtml = renderToString(
			React.createElement(PaymentModal, {
				isOpen: true,
				onClose: () => {},
				patientId: "pat-1",
				patientName: "Кузнецов М. С.",
				amountRub: 5000,
				defaultMethod: "cash",
			})
		);
		assert.ok(paymentHtml.includes("Быстрый ввод внесенной суммы:"), "PaymentModal must use correct label");
		assert.equal(paymentHtml.includes("Быстрый выбор купюр:"), false, "Must not say 'Быстрый выбор купюр:'");
	});
});

describe("Wave 46: 1-Click Carpule & Clinical Write-Offs without Commission (Mandates 8e & 8n)", () => {
	it("proves createQuickCarpuleWriteoffDocument creates single-signer document in 1 click", () => {
		const doc = createQuickCarpuleWriteoffDocument({
			count: 2,
			cabinetId: "cab-01",
			nurseFullName: "Смирнова А.В.",
		});

		assert.equal(doc.status, "confirmed");
		assert.equal(doc.isSingleSigner, true);
		assert.equal(doc.isQuickCarpuleWriteoff, true);
		assert.equal(doc.lines.length, 1);
		assert.equal(doc.lines[0]?.actualQuantity, 2);
		assert.ok(doc.actNumber.startsWith("КАРП-"));
	});

	it("proves createQuickVisitWriteoffDocument creates single-signer document for therapy and surgery", () => {
		const therapyDoc = createQuickVisitWriteoffDocument({ visitType: "therapy" });
		assert.equal(therapyDoc.status, "confirmed");
		assert.equal(therapyDoc.isSingleSigner, true);
		assert.ok(therapyDoc.lines.length > 0);

		const surgeryDoc = createQuickVisitWriteoffDocument({ visitType: "surgery" });
		assert.equal(surgeryDoc.status, "confirmed");
		assert.equal(surgeryDoc.isSingleSigner, true);
		assert.ok(surgeryDoc.lines.length > 0);
	});

	it("renders 1-click quick writeoff buttons in ClinicalWriteoffModal", () => {
		const html = renderToString(
			React.createElement(ClinicalWriteoffModal, {
				isOpen: true,
				onClose: () => {},
			})
		);

		assert.ok(html.includes('data-testid="quick-writeoff-strip"'), "Must render quick writeoff strip");
		assert.ok(html.includes('data-testid="btn-quick-carpule-writeoff"'), "Must render quick carpule button");
		assert.ok(html.includes('data-testid="btn-quick-therapy-writeoff"'), "Must render quick therapy button");
		assert.ok(html.includes('data-testid="btn-quick-surgery-writeoff"'), "Must render quick surgery button");
	});
});

describe("Wave 46: Strict Zero Emojis (Mandate 8d Item 7)", () => {
	it("proves strict zero emojis (⚡) in PaymentModal, FastCheckoutModal, and FiscalReceipt54FzModal", () => {
		const paymentHtml = renderToString(
			React.createElement(PaymentModal, {
				isOpen: true,
				onClose: () => {},
				amountRub: 5000,
			})
		);
		assert.equal(paymentHtml.includes("⚡"), false, "PaymentModal must not contain ⚡ emoji");

		const fastCheckoutHtml = renderToString(
			React.createElement(FastCheckoutModal, {
				isOpen: true,
				onClose: () => {},
				totalBillRub: 3500,
			})
		);
		assert.equal(fastCheckoutHtml.includes("⚡"), false, "FastCheckoutModal must not contain ⚡ emoji");

		const fiscalModalHtml = renderToString(
			React.createElement(FiscalReceipt54FzModal, {
				isOpen: true,
				onClose: () => {},
				patientId: "pat-1",
			})
		);
		assert.equal(fiscalModalHtml.includes("⚡"), false, "FiscalReceipt54FzModal must not contain ⚡ emoji");
	});
});

describe("Wave 46: Telephony Softphone Autonomy (Mandate 8e)", () => {
	it("verifies dialer call button has testid and is never disabled", () => {
		const html = renderToString(
			React.createElement(TelephonyFloatingWidget, {
				showDialerDefault: true,
			})
		);

		assert.ok(html.includes('data-testid="btn-start-outgoing-call"'), "Must render btn-start-outgoing-call");
		// Verify it does NOT have disabled attribute
		assert.equal(
			html.includes('data-testid="btn-start-outgoing-call" disabled'),
			false,
			"Call button must not be disabled"
		);
	});
});
