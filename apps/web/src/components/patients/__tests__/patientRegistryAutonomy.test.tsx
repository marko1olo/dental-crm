import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DEFAULT_SOMATIC_HEALTHY_NORM } from "../safetyMath";
import { PatientCardModalFooter } from "../patientCardModalModules/PatientCardModalFooter";
import { PatientPassportAddressStep } from "../patientCreation/PatientPassportAddressStep";
import type { UsePatientCreationFormResult } from "../patientCreation/usePatientCreationTypes";
import { PatientSafetyBanner } from "../tabs/generalInfo/PatientSafetyBanner";

const mockCreationForm = {
	handleCreate: async () => {},
	handleCreateAndBook: async () => {},
	handleCreateAndOpenVisit: async () => {},
	isPatientCreating: false,
} as unknown as UsePatientCreationFormResult;

describe("Red Team Inquisitor: Patient Registry & Somatic Autonomy", () => {
	it("1. PatientPassportAddressStep renders semantic <details> with exact accordion title", () => {
		const htmlClosed = renderToStaticMarkup(
			React.createElement(PatientPassportAddressStep, {
				fieldRequirements: {
					requirePhone: true,
					requireBirthDate: false,
					requireSnils: false,
					requireIdentityDocument: false,
					requireAdvertisingSource: false,
				},
				validationErrors: {},
				isMinorUnder14: false,
				showDocFields: false,
				onToggleDocFields: () => {},
				snils: "",
				onSnilsChange: () => {},
				insurancePolicyNumber: "",
				onInsurancePolicyNumberChange: () => {},
				identityDocument: "",
				onIdentityDocumentChange: () => {},
				registrationAddress: "",
				onRegistrationAddressChange: () => {},
			}),
		);

		assert.ok(htmlClosed.includes("<details"), "Must use semantic <details> element");
		assert.ok(htmlClosed.includes("<summary"), "Must use semantic <summary> element");
		assert.ok(htmlClosed.includes("► Документы для налогового вычета и договора (опционально)"));

		const htmlOpen = renderToStaticMarkup(
			React.createElement(PatientPassportAddressStep, {
				fieldRequirements: {
					requirePhone: true,
					requireBirthDate: false,
					requireSnils: false,
					requireIdentityDocument: false,
					requireAdvertisingSource: false,
				},
				validationErrors: {},
				isMinorUnder14: false,
				showDocFields: true,
				onToggleDocFields: () => {},
				snils: "123-456-789 01",
				onSnilsChange: () => {},
				insurancePolicyNumber: "1234567890123456",
				onInsurancePolicyNumberChange: () => {},
				identityDocument: "4510 123456",
				onIdentityDocumentChange: () => {},
				registrationAddress: "г. Москва, ул. Ленина, д. 1",
				onRegistrationAddressChange: () => {},
			}),
		);

		assert.ok(htmlOpen.includes("open="), "Must have open attribute when showDocFields is true");
		assert.ok(htmlOpen.includes("СНИЛС"), "Must contain SNILS field");
		assert.ok(htmlOpen.includes("Паспорт РФ"), "Must contain Passport field");
		assert.ok(htmlOpen.includes("Полис ОМС / ДМС"), "Must contain OMS/DMS field");
		assert.ok(htmlOpen.includes("Адрес регистрации / проживания"), "Must contain Address field");
		assert.equal(htmlOpen.includes("ЕГИСЗ"), false, "Must not leak raw bureaucratic acronym ЕГИСЗ in labels");
	});

	it("2. PatientCardModalFooter renders unblocked primary save and creation CTAs (Mandate 8e)", () => {
		const createHtml = renderToStaticMarkup(
			React.createElement(PatientCardModalFooter, {
				isCreateMode: true,
				creationForm: mockCreationForm,
				onClose: () => {},
				onSave: () => {},
			}),
		);
		const submitBtn = createHtml.match(/<button[^>]*data-testid="patient-creation-submit-btn"[^>]*>/);
		const visitBtn = createHtml.match(/<button[^>]*data-testid="patient-creation-submit-and-visit-btn"[^>]*>/);
		assert.ok(submitBtn, "Must render patient-creation-submit-btn");
		assert.ok(visitBtn, "Must render patient-creation-submit-and-visit-btn");
		assert.equal(/\bdisabled\b/.test(submitBtn[0]), false, "Create button must never be disabled");
		assert.equal(/\bdisabled\b/.test(visitBtn[0]), false, "Create-and-visit button must never be disabled");
		assert.ok(submitBtn[0].includes("bg-[var(--primary)]"), "Single primary CTA uses var(--primary)");

		const editHtml = renderToStaticMarkup(
			React.createElement(PatientCardModalFooter, {
				isCreateMode: false,
				creationForm: mockCreationForm,
				isDirty: true,
				saveState: "saving",
				onClose: () => {},
				onSave: () => {},
			}),
		);
		const saveBtn = editHtml.match(/<button[^>]*data-testid="btn-save-patient-card"[^>]*>/);
		assert.ok(saveBtn);
		assert.equal(/\bdisabled\b/.test(saveBtn[0]), false, "Save button must stay unblocked even while saving");
		assert.ok(editHtml.includes("Сохранение..."));
	});

	it("3. PatientSafetyBanner renders 1-click healthy norm trigger without blocking alerts", () => {
		const fullHtml = renderToStaticMarkup(
			React.createElement(PatientSafetyBanner, {
				currentProfile: { ...DEFAULT_SOMATIC_HEALTHY_NORM },
				mode: "full",
				onToggleAllergy: () => {},
				onApplySomaticNorm: () => {},
			}),
		);
		assert.ok(fullHtml.includes('data-testid="btn-somatic-healthy-norm"'));
		assert.ok(fullHtml.includes("Норма"));

		const compactRiskHtml = renderToStaticMarkup(
			React.createElement(PatientSafetyBanner, {
				currentProfile: {
					...DEFAULT_SOMATIC_HEALTHY_NORM,
					hasPenicillinAllergy: true,
				},
				mode: "compact",
				onToggleAllergy: () => {},
				onApplySomaticNorm: () => {},
			}),
		);
		assert.ok(compactRiskHtml.includes('data-testid="btn-somatic-healthy-norm"'));
	});
});
