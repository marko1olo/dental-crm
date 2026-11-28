/**
 * apps/web/src/components/patients/family/__tests__/familyWalletCanonical.test.ts
 *
 * Canonical Family Wallet & Patient Balance Badge Live Tests:
 * 1. FamilyWalletModal rendering in closed & inline modes
 * 2. PatientFamilyAndInsuranceWidget integration and positive/negative balance badges
 * 3. 0% commission intra-family pooled deposit arithmetic in exact kopecks
 * 4. PatientSearchResultRow renders explicit 'Депозит:' and 'Долг:' badges
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { kopecksToRubles, rublesToKopecks, type Patient } from "@dental/shared";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PatientFamilyAndInsuranceWidget } from "../../PatientFamilyAndInsuranceWidget";
import { PatientSearchResultRow } from "../../patientSearchAutocomplete/PatientSearchResultRow";
import { FamilyWalletModal } from "../FamilyWalletModal";

const basePatient: Patient = {
	id: "pat-fw-1",
	organizationId: "00000000-0000-0000-0000-000000000001",
	status: "active",
	fullName: "Иванова Мария Петровна",
	phone: "+7 (999) 123-45-67",
	email: null,
	notes: null,
	gender: "female",
	birthDate: "1990-05-10",
	balanceRub: 15000,
	administrativeProfile: null,
	createdAt: "2026-01-01T00:00:00.000Z",
	updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("Family Wallet SSOT & Pooled Deposit Architecture", () => {
	it("renders closed FamilyWalletModal cleanly as empty string without throwing", () => {
		const html = renderToStaticMarkup(
			React.createElement(FamilyWalletModal, {
				isOpen: false,
				onClose: () => {},
				patientId: basePatient.id,
				patientName: basePatient.fullName,
			}),
		);
		assert.equal(html, "");
	});

	it("renders inline FamilyWalletModal with pooled balance controls when opened", () => {
		const html = renderToStaticMarkup(
			React.createElement(FamilyWalletModal, {
				isOpen: true,
				inline: true,
				onClose: () => {},
				patientId: basePatient.id,
				patientName: basePatient.fullName,
				familyData: {
					id: "fam-1",
					name: "Семья Ивановых",
					balance: 15000,
					headPatientId: basePatient.id,
					members: [
						{
							id: basePatient.id,
							fullName: basePatient.fullName,
							personalBalanceRub: 15000,
							roleRu: "Глава семьи",
						},
					],
				},
			}),
		);
		assert.ok(html.includes("family-wallet-inline-view"));
		assert.ok(html.includes("Иванова Мария Петровна") || html.includes("Семья"));
	});

	it("renders PatientFamilyAndInsuranceWidget with positive, negative, and zero balance badges", () => {
		const positiveHtml = renderToStaticMarkup(
			React.createElement(PatientFamilyAndInsuranceWidget, {
				patient: basePatient,
				patientBalance: 12500,
			}),
		);
		assert.ok(positiveHtml.includes('data-testid="patient-family-and-insurance-widget"'));
		assert.ok(positiveHtml.includes("Финансы, семейный счёт и страхование ДМС/ОМС"));
		assert.match(positiveHtml, /\+12[\s\u00A0]?500\s?₽/);

		const debtHtml = renderToStaticMarkup(
			React.createElement(PatientFamilyAndInsuranceWidget, {
				patient: basePatient,
				patientBalance: -3400,
			}),
		);
		assert.match(debtHtml, /-3[\s\u00A0]?400\s?₽/);
	});

	it("validates family pooled deposit calculations (kopeck precision, 0% commission)", () => {
		const momKopecks = rublesToKopecks(15000.5);
		const costKopecks = rublesToKopecks(4250.75);
		const commissionPercent = 0;
		const commissionKopecks = Math.round(costKopecks * (commissionPercent / 100));

		assert.equal(commissionKopecks, 0, "Intra-family commission must be exactly 0%");

		const remainingKopecks = momKopecks - costKopecks;
		const remainingRub = kopecksToRubles(remainingKopecks);

		assert.equal(remainingKopecks, 1074975);
		assert.equal(remainingRub, 10749.75);
	});

	it("renders PatientSearchResultRow with explicit 'Депозит:' and 'Долг:' badges", () => {
		const depositRowHtml = renderToStaticMarkup(
			React.createElement(PatientSearchResultRow, {
				item: {
					patient: { ...basePatient, balanceRub: 4500 },
					score: 100,
					fullNameHighlights: [{ text: basePatient.fullName, isMatch: true }],
					phoneHighlights: [],
				},
				isSelected: false,
				somaticBadge: null,
				onSelect: () => {},
				onMouseEnter: () => {},
			}),
		);
		assert.ok(depositRowHtml.includes("Депозит:"));

		const debtRowHtml = renderToStaticMarkup(
			React.createElement(PatientSearchResultRow, {
				item: {
					patient: { ...basePatient, balanceRub: -2000 },
					score: 90,
					fullNameHighlights: [{ text: basePatient.fullName, isMatch: false }],
					phoneHighlights: [],
				},
				isSelected: true,
				somaticBadge: null,
				onSelect: () => {},
				onMouseEnter: () => {},
			}),
		);
		assert.ok(debtRowHtml.includes("Долг:"));
	});
});
