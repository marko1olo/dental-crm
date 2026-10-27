import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PatientPassportAddressStep } from "../patientCreation/PatientPassportAddressStep";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const patientsDir = path.resolve(__dirname, "..");

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
		assert.ok(!htmlOpen.includes("ЕГИСЗ"), "Must not leak raw bureaucratic acronym ЕГИСЗ in labels");
	});

	it("2. PatientCreationModalView never disables primary save buttons (Mandate 8e)", () => {
		const modalViewPath = path.resolve(patientsDir, "patientCreation/PatientCreationModalView.tsx");
		const footerPath = path.resolve(patientsDir, "patientCreation/PatientCreationModalFooter.tsx");
		const content =
			fs.readFileSync(modalViewPath, "utf-8") +
			(fs.existsSync(footerPath) ? "\n" + fs.readFileSync(footerPath, "utf-8") : "");

		assert.ok(content.includes('data-testid="patient-creation-submit-btn"'));
		assert.ok(content.includes('data-testid="patient-creation-submit-and-visit-btn"'));
		assert.ok(!content.includes('data-testid="patient-creation-submit-btn"\n\t\t\t\t\t\t\tdisabled={true}'));
		assert.ok(!content.includes('data-testid="patient-creation-submit-and-visit-btn"\n\t\t\t\t\t\t\tdisabled={true}'));
	});

	it("3. Somatic Health Norm provides 1-click healthy status without blocking alerts", () => {
		const bannerPath = path.resolve(patientsDir, "tabs/generalInfo/PatientSafetyBanner.tsx");
		const content = fs.readFileSync(bannerPath, "utf-8");

		assert.ok(content.includes('data-testid="btn-somatic-healthy-norm"'));
		assert.ok(content.includes("Соматически здоров. Аллергоанамнез не отягощен") || content.includes("Физиологическая норма"));
		assert.ok(content.includes("onApplySomaticNorm"));
	});
});
