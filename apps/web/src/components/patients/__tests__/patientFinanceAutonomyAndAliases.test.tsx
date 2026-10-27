import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React, { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PatientFinanceTab } from "../tabs/PatientFinanceTab";
import { PatientGeneralInfoTab } from "../tabs/PatientGeneralInfoTab";
import { PatientCardModal } from "../PatientCardModal";
import { PatientDetailModal } from "../PatientDetailModal";
import { PatientCardView } from "../PatientCardView";

describe("Patient Finance Autonomy, Pure Language & Aliases (Mandates 8e, 8x)", () => {
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

	it("purges all bureaucratic bird language («54-ФЗ», «ККТ», «ОФД», «ПП РФ»)", () => {
		const financeHtml = renderToStaticMarkup(createElement(PatientFinanceTab, { patient: mockPatient }));
		const modalHtml = renderToStaticMarkup(createElement(PatientCardModal, { isOpen: true, onClose: () => {}, patient: mockPatient, initialTab: "finance" }));
		const generalHtml = renderToStaticMarkup(createElement(PatientGeneralInfoTab, { patient: mockPatient, activeSection: "all" }));

		const combinedHtml = `${financeHtml} ${modalHtml} ${generalHtml}`;
		assert.ok(!combinedHtml.includes("54-ФЗ"));
		assert.ok(!combinedHtml.includes("ККТ"));
		assert.ok(!combinedHtml.includes("ОФД"));
		assert.ok(!combinedHtml.includes("ПП РФ"));
	});

	it("strictly enforces Doctor & Patient Autonomy: INN is never required for physical persons (Mandate 8e)", () => {
		const html = renderToStaticMarkup(createElement(PatientGeneralInfoTab, { patient: mockPatient, activeSection: "all" }));

		assert.ok(html.includes('data-testid="input-inn"'));
		assert.ok(html.includes("ИНН (не требуется физлицам)") || html.includes("Необязательно"));
		assert.ok(!html.includes('data-testid="input-inn" required'));

		assert.ok(html.includes('data-testid="input-snils"'));
		assert.ok(html.includes("СНИЛС (по желанию)") || html.includes("необязательно"));
		assert.ok(!html.includes('data-testid="input-snils" required'));
	});

	it("Anti-Matryoshka invariant: PatientCardModal renders Finance tab inline without nested modals", () => {
		const html = renderToStaticMarkup(createElement(PatientCardModal, { isOpen: true, onClose: () => {}, patient: mockPatient, initialTab: "finance" }));

		assert.ok(html.includes('data-testid="patient-balance-card"'));
		assert.ok(html.includes('data-testid="quick-deposit-operations-panel"'));

		const dialogOccurrences = (html.match(/role="dialog"/g) || []).length;
		assert.equal(dialogOccurrences, 1, "Must have exactly 1 role='dialog', no Matryoshka nesting!");
	});

	it("exports canonical backwards-compatible aliases: PatientDetailModal, PatientCardView", () => {
		assert.ok(typeof PatientDetailModal === "function" || typeof PatientDetailModal === "object");
		assert.ok(typeof PatientCardView === "function" || typeof PatientCardView === "object");

		const detailHtml = renderToStaticMarkup(createElement(PatientDetailModal, { isOpen: true, onClose: () => {}, patient: mockPatient, initialTab: "finance" }));
		assert.ok(detailHtml.includes('data-testid="patient-card-modal"'));

		const viewHtml = renderToStaticMarkup(createElement(PatientCardView, { isOpen: true, onClose: () => {}, patient: mockPatient, initialTab: "finance" }));
		assert.ok(viewHtml.includes('data-testid="patient-card-modal"'));
	});
});
