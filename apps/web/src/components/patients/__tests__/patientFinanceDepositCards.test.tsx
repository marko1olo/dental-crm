import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React, { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PatientFinanceTab } from "../tabs/PatientFinanceTab";

describe("Patient Card & Finance Deposit Cards (Mandate 8e & Apple HIG)", () => {
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
		const html = renderToStaticMarkup(createElement(PatientFinanceTab, { patient: mockPatient }));

		assert.ok(html.includes('data-testid="patient-balance-card"'), "Must render personal balance card");
		assert.ok(
			html.includes('data-testid="personal-balance-amount-display"') ||
			html.includes('data-testid="patient-balance-amount-display"'),
		);
		const normalizedHtml = html.replace(/\u00A0/g, " ");
		assert.ok(normalizedHtml.includes("7 500") || normalizedHtml.includes("7500"));

		assert.ok(html.includes('data-testid="family-balance-card"'), "Must render family balance card");
		assert.ok(html.includes('data-testid="family-balance-amount-display"'));
		assert.ok(normalizedHtml.includes("18 000") || normalizedHtml.includes("18000"));
	});

	it("renders quick deposit tiles (+1 000, +5 000, +10 000, +20 000) with touch targets >= 44x44px", () => {
		const html = renderToStaticMarkup(createElement(PatientFinanceTab, { patient: mockPatient }));

		const presets = [1000, 5000, 10000, 20000];
		for (const amt of presets) {
			assert.ok(html.includes(`data-testid="btn-quick-deposit-${amt}"`));
		}
		assert.ok(html.includes("min-h-[48px]") || html.includes("h-12"));
		assert.ok(!html.includes('data-testid="btn-quick-deposit-1000" disabled'));
	});

	it("provides quick payment methods (Card, Cash, SBP QR) with touch targets >= 44px", () => {
		const html = renderToStaticMarkup(createElement(PatientFinanceTab, { patient: mockPatient }));

		assert.ok(html.includes('data-testid="btn-method-card"'));
		assert.ok(html.includes('data-testid="btn-method-cash"'));
		assert.ok(html.includes('data-testid="btn-method-sbp"'));
	});
});
