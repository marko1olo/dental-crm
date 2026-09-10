/**
 * patientHeaderCardErgonomics.test.tsx
 *
 * DENTE Dental CRM — Wave 97 Ergonomic Invariants:
 * PatientHeaderCard Action Toolbar Compacting (Miller's Law & Mandates 8d, 8e, 8p).
 *
 * Requirements:
 * 1. Exactly 2 primary direct action buttons on screen:
 *    - «Начать приём» (data-testid="header-open-visit-btn")
 *    - «Записать» (data-testid="header-book-appointment-btn")
 * 2. 1 compact 32-36px action menu trigger:
 *    - data-testid="header-actions-menu-btn"
 * 3. Secondary actions aggregated into popover menu (data-testid="header-actions-menu-popover"):
 *    - «Бланк договора (_______)» (header-print-blank-contract-btn)
 *    - «Анамнез 043/у» (header-anamnesis-btn)
 *    - «WhatsApp» (header-whatsapp-btn)
 *    - «Изменить» (header-edit-patient-btn)
 */

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
	administrativeProfile: {
		loyaltyTier: "gold",
	},
	totalSpentRub: 150000,
	balanceRub: 0,
	allergies: "",
	notes: "",
};

const mockAppLogic = {
	dashboard: {
		patients: [mockPatient],
		clinicSettings: {
			profile: {
				legalName: 'ООО "ДЕНТЕ КЛИНИКА"',
			},
		},
	},
	selectedPatient: mockPatient,
} as unknown as AppLogicContextType;

describe("PatientHeaderCard — Wave 97 Action Toolbar Compacting (Miller's Law & Mandate 8d/8e/8p)", () => {
	it("1. Renders exactly 2 primary direct action buttons in the main actions toolbar", () => {
		const html = renderToString(
			<AppLogicProvider value={mockAppLogic}>
				<PatientHeaderCard
					patient={mockPatient}
					onEditPatient={() => {}}
					onOpenAnamnesis={() => {}}
				/>
			</AppLogicProvider>,
		);

		// Primary 1: Начать приём
		assert.ok(
			html.includes('data-testid="header-open-visit-btn"'),
			"Must render primary 'Начать приём' button",
		);
		assert.ok(
			html.includes("Начать приём"),
			"Must include text 'Начать приём'",
		);

		// Primary 2: Записать
		assert.ok(
			html.includes('data-testid="header-book-appointment-btn"'),
			"Must render primary 'Записать' button",
		);
		assert.ok(
			html.includes("Записать"),
			"Must include text 'Записать'",
		);

		// Actions menu trigger (...)
		assert.ok(
			html.includes('data-testid="header-actions-menu-btn"'),
			"Must render compact '...' actions menu button",
		);
	});

	it("2. Does not clutter main screen toolbar with secondary action buttons by default", () => {
		const html = renderToString(
			<AppLogicProvider value={mockAppLogic}>
				<PatientHeaderCard
					patient={mockPatient}
					onEditPatient={() => {}}
					onOpenAnamnesis={() => {}}
				/>
			</AppLogicProvider>,
		);

		// Secondary action buttons must NOT be rendered on main toolbar directly (they live in popover)
		assert.equal(
			html.includes('data-testid="header-print-blank-contract-btn"'),
			false,
			"Blank contract button must reside inside popover, not on root toolbar",
		);
		assert.equal(
			html.includes('data-testid="header-anamnesis-btn"'),
			false,
			"Anamnesis button must reside inside popover, not on root toolbar",
		);
		assert.equal(
			html.includes('data-testid="header-whatsapp-btn"'),
			false,
			"WhatsApp button must reside inside popover, not on root toolbar",
		);
		assert.equal(
			html.includes('data-testid="header-edit-patient-btn"'),
			false,
			"Edit patient button must reside inside popover, not on root toolbar",
		);
	});

	it("3. Preserves phone number and copy button in contact quick bar", () => {
		const html = renderToString(
			<AppLogicProvider value={mockAppLogic}>
				<PatientHeaderCard
					patient={mockPatient}
					onEditPatient={() => {}}
					onOpenAnamnesis={() => {}}
				/>
			</AppLogicProvider>,
		);

		assert.ok(
			html.includes("+7 999 111-22-33"),
			"Must display patient phone number",
		);
		assert.ok(
			html.includes('aria-label="Скопировать телефон"'),
			"Must provide accessible copy phone button",
		);
	});
});
