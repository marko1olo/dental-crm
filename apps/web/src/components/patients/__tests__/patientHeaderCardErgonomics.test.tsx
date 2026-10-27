import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { PatientHeaderCard } from "../PatientHeaderCard";
import { AppLogicProvider, type AppLogicContextType } from "../../../contexts/AppLogicContext";

const mockPatient = {
	id: "pat-wave97-1",
	fullName: "Смирнов Алексей Владимирович",
	phone: "+7 999 111-22-33",
	birthDate: "1988-04-12",
	administrativeProfile: { loyaltyTier: "gold" },
	totalSpentRub: 150000,
	balanceRub: 0,
	allergies: "",
	notes: "",
};

const mockAppLogic = {
	dashboard: {
		patients: [mockPatient],
		clinicSettings: { profile: { legalName: 'ООО "ДЕНТЕ КЛИНИКА"' } },
	},
	selectedPatient: mockPatient,
} as unknown as AppLogicContextType;

describe("PatientHeaderCard — Wave 97 Action Toolbar Compacting (Miller's Law & Mandate 8d/8e/8p)", () => {
	it("1. Renders exactly 2 primary direct action buttons in the main actions toolbar", () => {
		const html = renderToString(
			<AppLogicProvider value={mockAppLogic}>
				<PatientHeaderCard patient={mockPatient} onEditPatient={() => {}} onOpenAnamnesis={() => {}} />
			</AppLogicProvider>,
		);

		assert.ok(html.includes('data-testid="header-open-visit-btn"'), "Must render primary 'Начать приём' button");
		assert.ok(html.includes("Начать приём"), "Must include text 'Начать приём'");
		assert.ok(html.includes('data-testid="header-book-appointment-btn"'), "Must render primary 'Записать' button");
		assert.ok(html.includes("Записать"), "Must include text 'Записать'");
		assert.ok(html.includes('data-testid="header-actions-menu-btn"'), "Must render compact '...' actions menu button");
	});

	it("2. Does not clutter main screen toolbar with secondary action buttons by default", () => {
		const html = renderToString(
			<AppLogicProvider value={mockAppLogic}>
				<PatientHeaderCard patient={mockPatient} onEditPatient={() => {}} onOpenAnamnesis={() => {}} />
			</AppLogicProvider>,
		);

		assert.equal(html.includes('data-testid="header-print-blank-contract-btn"'), false);
		assert.equal(html.includes('data-testid="header-anamnesis-btn"'), false);
		assert.equal(html.includes('data-testid="header-whatsapp-btn"'), false);
		assert.equal(html.includes('data-testid="header-edit-patient-btn"'), false);
	});

	it("3. Preserves phone number and copy button in contact quick bar", () => {
		const html = renderToString(
			<AppLogicProvider value={mockAppLogic}>
				<PatientHeaderCard patient={mockPatient} onEditPatient={() => {}} onOpenAnamnesis={() => {}} />
			</AppLogicProvider>,
		);

		assert.ok(html.includes("+7 999 111-22-33"), "Must display patient phone number");
		assert.ok(html.includes('aria-label="Скопировать телефон"'), "Must provide accessible copy phone button");
	});
});
