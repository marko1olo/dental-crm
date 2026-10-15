/**
 * apps/web/src/components/documents/__tests__/patientLegalDocumentBadges.test.tsx
 *
 * Test suite for Statutory Legal Document Status Badges in Patient Profile Header
 * (ПП РФ № 736, 323-ФЗ ст. 20, Приказ МЗ РФ № 1051н).
 *
 * Verifies:
 * 1. Prominent visibility of «Договор: Подписан» / «ИДС: Подписано» directly in patient profile header.
 * 2. Draft states: «Договор: Черновик» / «ИДС: Черновик».
 * 3. Uninitialized states: «Договор: Не оформлен» / «ИДС: Требуется».
 * 4. Zero cartoon emojis (Lucide icons only).
 * 5. Presence in both PatientHeaderCard / PatientHeaderIdentity and PatientCard.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import ReactDOMServer from "react-dom/server";
import { PatientHeaderIdentity } from "../../patients/headerModules/PatientHeaderIdentity";
import { PatientCard } from "../../patients/PatientCard";
import { AppLogicProvider, type AppLogicContextType } from "../../../contexts/AppLogicContext";

// Cartoon emoji regex targeting pictorial emojis (faces, hands, items) per Mandate 8d
const CARTOON_EMOJI_REGEX = /[\u{1F300}-\u{1F5FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FAFF}]/u;

const mockAppLogic = {
	dashboard: {
		patients: [],
		documents: [],
		clinicSettings: {
			profile: {
				legalName: 'ООО "ДЕНТЕ КЛИНИКА"',
			},
		},
	},
	selectedPatient: null,
} as unknown as AppLogicContextType;

describe("Patient Legal Document Status Badges (SSOT ПП РФ № 736 & 323-ФЗ)", () => {
	it("1. PatientHeaderIdentity renders 'Договор: Подписан' and 'ИДС: Подписано' when issued", () => {
		const html = ReactDOMServer.renderToStaticMarkup(
			<AppLogicProvider value={mockAppLogic}>
				<PatientHeaderIdentity
					resolvedPatient={{ id: "pat-1", fullName: "Иванов Иван Иванович" }}
					fullName="Иванов Иван Иванович"
					initials="ИИ"
					birthDateStr="12.05.1985 (40 лет)"
					phone="+7 999 123-45-67"
					diagnosisText="К02.1 Кариес дентина"
					isActiveVisit={false}
					nextAppointment={null}
					contractStatus="issued"
					consentStatus="issued"
				/>
			</AppLogicProvider>,
		);

		assert.ok(html.includes('data-testid="badge-contract-status"'), "Must render badge-contract-status");
		assert.ok(html.includes("Договор: Подписан"), "Must contain 'Договор: Подписан'");
		assert.ok(html.includes('data-testid="badge-consent-status"'), "Must render badge-consent-status");
		assert.ok(html.includes("ИДС: Подписано"), "Must contain 'ИДС: Подписано'");
		assert.ok(!CARTOON_EMOJI_REGEX.test(html), "Must contain ZERO cartoon emojis");
	});

	it("2. PatientHeaderIdentity renders 'Договор: Черновик' and 'ИДС: Черновик' when draft", () => {
		const html = ReactDOMServer.renderToStaticMarkup(
			<AppLogicProvider value={mockAppLogic}>
				<PatientHeaderIdentity
					resolvedPatient={{ id: "pat-2", fullName: "Петров Петр Петрович" }}
					fullName="Петров Петр Петрович"
					initials="ПП"
					birthDateStr="01.01.1990 (36 лет)"
					phone="+7 999 765-43-21"
					diagnosisText=""
					isActiveVisit={false}
					nextAppointment={null}
					contractStatus="draft"
					consentStatus="draft"
				/>
			</AppLogicProvider>,
		);

		assert.ok(html.includes('data-testid="badge-contract-status"'));
		assert.ok(html.includes("Договор: Черновик"), "Must contain 'Договор: Черновик'");
		assert.ok(html.includes('data-testid="badge-consent-status"'));
		assert.ok(html.includes("ИДС: Черновик"), "Must contain 'ИДС: Черновик'");
	});

	it("3. PatientHeaderIdentity renders 'Договор: Не оформлен' and 'ИДС: Требуется' when uninitialized", () => {
		const html = ReactDOMServer.renderToStaticMarkup(
			<AppLogicProvider value={mockAppLogic}>
				<PatientHeaderIdentity
					resolvedPatient={{ id: "pat-3", fullName: "Сидоров Сидор" }}
					fullName="Сидоров Сидор"
					initials="СС"
					birthDateStr=""
					phone=""
					diagnosisText=""
					isActiveVisit={false}
					nextAppointment={null}
					contractStatus="none"
					consentStatus="none"
				/>
			</AppLogicProvider>,
		);

		assert.ok(html.includes('data-testid="badge-contract-status"'));
		assert.ok(html.includes("Договор: Не оформлен"), "Must contain 'Договор: Не оформлен'");
		assert.ok(html.includes('data-testid="badge-consent-status"'));
		assert.ok(html.includes("ИДС: Требуется"), "Must contain 'ИДС: Требуется'");
	});

	it("4. PatientCard renders legal badges correctly from dashboard documents", () => {
		const mockDashboard = {
			documents: [
				{
					id: "doc-contract-1",
					patientId: "pat-card-1",
					kind: "paid_medical_services_contract",
					status: "issued",
				},
				{
					id: "doc-consent-1",
					patientId: "pat-card-1",
					kind: "informed_consent",
					status: "issued",
				},
			],
		};

		const html = ReactDOMServer.renderToStaticMarkup(
			<PatientCard
				patient={{
					id: "pat-card-1",
					fullName: "Соколова Анна Сергеевна",
					phone: "+7 900 111-22-33",
					birthDate: "1995-07-20",
				}}
				// biome-ignore lint/suspicious/noExplicitAny: test dashboard
				dashboard={mockDashboard as any}
			/>,
		);

		assert.ok(html.includes('data-testid="badge-contract-status"'), "PatientCard must render badge-contract-status");
		assert.ok(html.includes("Договор: Подписан"), "PatientCard must display 'Договор: Подписан'");
		assert.ok(html.includes('data-testid="badge-consent-status"'), "PatientCard must render badge-consent-status");
		assert.ok(html.includes("ИДС: Подписано"), "PatientCard must display 'ИДС: Подписано'");
		assert.ok(!CARTOON_EMOJI_REGEX.test(html), "PatientCard must contain ZERO cartoon emojis");
	});

	it("5. PatientCard surfaces uninitialized contract and consent as actionable badges", () => {
		const mockDashboardEmpty = {
			documents: [],
		};

		const html = ReactDOMServer.renderToStaticMarkup(
			<PatientCard
				patient={{
					id: "pat-card-new",
					fullName: "Новиков Денис",
					phone: "+7 900 555-44-33",
				}}
				// biome-ignore lint/suspicious/noExplicitAny: test dashboard
				dashboard={mockDashboardEmpty as any}
			/>,
		);

		assert.ok(html.includes('data-testid="badge-contract-status"'));
		assert.ok(html.includes("Договор: Не оформлен"));
		assert.ok(html.includes('data-testid="badge-consent-status"'));
		assert.ok(html.includes("ИДС: Требуется"));
	});
});
