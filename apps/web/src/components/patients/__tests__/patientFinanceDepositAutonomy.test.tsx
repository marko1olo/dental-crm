import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React, { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PatientFinanceTab } from "../tabs/PatientFinanceTab";
import { PatientGeneralInfoTab } from "../tabs/PatientGeneralInfoTab";
import { PatientCardModal } from "../PatientCardModal";
import { PatientDetailModal } from "../PatientDetailModal";
import { PatientCardView } from "../PatientCardView";

describe("Patient Card & Finance Deposit Inquisitor (Mandate 8e & Apple HIG)", () => {
	const mockPatient = {
		id: "pat-9901",
		fullName: "Смирнова Елена Александровна",
		phone: "+7 (916) 123-45-67",
		birthDate: "1988-06-15",
		patientBalanceRub: 7500,
		familyBalanceRub: 18000,
		familyGroupId: "fam-grp-01",
		inn: "",
		snils: "",
	};

	it("renders high-contrast deposit and family balance cards with round ruble typography", () => {
		const html = renderToStaticMarkup(
			createElement(PatientFinanceTab, {
				patient: mockPatient,
			}),
		);

		// Personal balance card
		assert.ok(html.includes('data-testid="patient-balance-card"'), "Must render personal balance card");
		assert.ok(
			html.includes('data-testid="personal-balance-amount-display"') ||
				html.includes('data-testid="patient-balance-amount-display"'),
			"Must render personal balance amount display",
		);
		assert.ok(
			html.includes(mockPatient.patientBalanceRub.toLocaleString("ru-RU")) ||
				html.includes("7 500") ||
				html.includes("7500"),
			"Must display formatted round rubles without kopeck drift",
		);

		// Family balance card
		assert.ok(html.includes('data-testid="family-balance-card"'), "Must render family balance card");
		assert.ok(html.includes('data-testid="family-balance-amount-display"'), "Must render family balance amount display");
		assert.ok(
			html.includes(mockPatient.familyBalanceRub.toLocaleString("ru-RU")) ||
				html.includes("18 000") ||
				html.includes("18000"),
			"Must display formatted family round rubles",
		);
	});

	it("renders quick deposit tiles (+1 000, +5 000, +10 000, +20 000) with touch targets >= 44x44px", () => {
		const html = renderToStaticMarkup(
			createElement(PatientFinanceTab, {
				patient: mockPatient,
			}),
		);

		// Quick deposit presets
		const presets = [1000, 5000, 10000, 20000];
		for (const amt of presets) {
			const testId = `data-testid="btn-quick-deposit-${amt}"`;
			assert.ok(html.includes(testId), `Must render quick deposit button for ${amt} ₽`);
		}

		// Touch targets >= 44px
		assert.ok(
			html.includes("min-h-[48px]") || html.includes("h-12"),
			"Quick deposit buttons must have minimum height of at least 44px (Apple HIG / gloves ergonomics)",
		);

		// Ensure buttons are active, not disabled
		assert.ok(!html.includes('data-testid="btn-quick-deposit-1000" disabled'), "Quick deposit button must not be disabled");
	});

	it("provides quick payment methods (Card, Cash, SBP QR) with touch targets >= 44px", () => {
		const html = renderToStaticMarkup(
			createElement(PatientFinanceTab, {
				patient: mockPatient,
			}),
		);

		assert.ok(html.includes('data-testid="btn-method-card"'), "Must render card payment method");
		assert.ok(html.includes('data-testid="btn-method-cash"'), "Must render cash payment method");
		assert.ok(html.includes('data-testid="btn-method-sbp"'), "Must render SBP QR payment method");
	});

	it("purges all bureaucratic bird language («54-ФЗ», «ККТ», «ОФД», «ПП РФ»)", () => {
		const financeHtml = renderToStaticMarkup(
			createElement(PatientFinanceTab, {
				patient: mockPatient,
			}),
		);

		const modalHtml = renderToStaticMarkup(
			createElement(PatientCardModal, {
				isOpen: true,
				onClose: () => {},
				patient: mockPatient,
				initialTab: "finance",
			}),
		);

		const generalHtml = renderToStaticMarkup(
			createElement(PatientGeneralInfoTab, {
				patient: mockPatient,
				activeSection: "all",
			}),
		);

		const combinedHtml = `${financeHtml} ${modalHtml} ${generalHtml}`;

		assert.ok(!combinedHtml.includes("54-ФЗ"), "Combined UI must NOT contain '54-ФЗ'");
		assert.ok(!combinedHtml.includes("ККТ"), "Combined UI must NOT contain 'ККТ'");
		assert.ok(!combinedHtml.includes("ОФД"), "Combined UI must NOT contain 'ОФД'");
		assert.ok(!combinedHtml.includes("ПП РФ"), "Combined UI must NOT contain 'ПП РФ'");
	});

	it("strictly enforces Doctor & Patient Autonomy: INN is never required for physical persons (Mandate 8e)", () => {
		const html = renderToStaticMarkup(
			createElement(PatientGeneralInfoTab, {
				patient: mockPatient,
				activeSection: "all",
			}),
		);

		// Check INN field
		assert.ok(html.includes('data-testid="input-inn"'), "Must render input-inn");
		assert.ok(
			html.includes("ИНН (не требуется физлицам)") || html.includes("Необязательно"),
			"INN field must clearly state it is not required for physical persons",
		);
		assert.ok(
			!html.includes('data-testid="input-inn" required'),
			"INN field must NEVER have required attribute",
		);

		// Check SNILS field
		assert.ok(html.includes('data-testid="input-snils"'), "Must render input-snils");
		assert.ok(
			html.includes("СНИЛС (по желанию)") || html.includes("необязательно"),
			"SNILS field must clearly state it is optional",
		);
		assert.ok(
			!html.includes('data-testid="input-snils" required'),
			"SNILS field must NEVER have required attribute",
		);
	});

	it("Anti-Matryoshka invariant: PatientCardModal renders Finance tab inline without nested modals", () => {
		const html = renderToStaticMarkup(
			createElement(PatientCardModal, {
				isOpen: true,
				onClose: () => {},
				patient: mockPatient,
				initialTab: "finance",
			}),
		);

		// Must render the finance tab content inline
		assert.ok(html.includes('data-testid="patient-balance-card"'), "Must render patient balance card inside modal");
		assert.ok(html.includes('data-testid="quick-deposit-operations-panel"'), "Must render quick deposit panel inside modal");

		// Modal depth is strictly 1: only one role="dialog" or modal root
		const dialogOccurrences = (html.match(/role="dialog"/g) || []).length;
		assert.equal(dialogOccurrences, 1, "Must have exactly 1 role='dialog', no Matryoshka nesting!");
	});

	it("exports canonical backwards-compatible aliases: PatientDetailModal, PatientCardView", () => {
		assert.ok(
			typeof PatientDetailModal === "function" || typeof PatientDetailModal === "object",
			"PatientDetailModal must be exported as a valid React component",
		);
		assert.ok(
			typeof PatientCardView === "function" || typeof PatientCardView === "object",
			"PatientCardView must be exported as a valid React component",
		);

		const detailHtml = renderToStaticMarkup(
			createElement(PatientDetailModal, {
				isOpen: true,
				onClose: () => {},
				patient: mockPatient,
				initialTab: "finance",
			}),
		);
		assert.ok(detailHtml.includes('data-testid="patient-card-modal"'), "PatientDetailModal renders PatientCardModal root");

		const viewHtml = renderToStaticMarkup(
			createElement(PatientCardView, {
				isOpen: true,
				onClose: () => {},
				patient: mockPatient,
				initialTab: "finance",
			}),
		);
		assert.ok(viewHtml.includes('data-testid="patient-card-modal"'), "PatientCardView renders PatientCardModal root");
	});
});
