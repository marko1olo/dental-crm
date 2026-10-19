/**
 * patientRegistryAutonomyAndFamilyInquisition.test.tsx
 *
 * Red Team Inquisitor Test Suite:
 * 1. Mandate 8e: Frictionless Patient Intake & 2 Mandatory Fields (Full Name + Phone).
 *    Collapsible <details> accordion «► Документы для налогового вычета и договора (опционально)».
 * 2. Mandate 8e & Family Shared Deposit:
 *    1-Click CTA: «Списать с семейного депозита (Баланс семьи: 45 000 ₽, Глава: Иванов И.И.)».
 * 3. PatientCardModal & PatientGeneralInfoTab:
 *    Family tab embeds both PatientFamilyCard (wallet & group) and PatientRepresentativesSection (art. 64 СК РФ / 323-ФЗ).
 * 4. Chairside Somatic Status:
 *    1-click «✓ Соматически здоров / Аллергий нет», passive ⚠️ warning badges, zero disabled submit buttons.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PatientPassportAddressStep } from "../patientCreation/PatientPassportAddressStep";
import { PaymentFamilyDepositView } from "../../finance/modal/payment/PaymentFamilyDepositView";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const patientsDir = path.resolve(__dirname, "..");
const webSrcRoot = path.resolve(__dirname, "../../..");

describe("Red Team Inquisitor: Patient Registry, Family Deposit & Somatic Autonomy", () => {
	it("1. PatientPassportAddressStep renders semantic <details> with exact accordion title", () => {
		const htmlClosed = renderToStaticMarkup(
			React.createElement(PatientPassportAddressStep, {
				fieldRequirements: {
					requireFullName: true,
					requirePhone: true,
					requireBirthDate: false,
					requireGender: false,
					requireSnils: false,
					requireIdentityDocument: false,
					requireResidentialAddress: false,
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

		// Semantic details and summary
		assert.ok(htmlClosed.includes("<details"), "Must use semantic <details> element");
		assert.ok(htmlClosed.includes("<summary"), "Must use semantic <summary> element");
		assert.ok(
			htmlClosed.includes("► Документы для налогового вычета и договора (опционально)"),
			"Summary must have exact clinical text: '► Документы для налогового вычета и договора (опционально)'",
		);

		const htmlOpen = renderToStaticMarkup(
			React.createElement(PatientPassportAddressStep, {
				fieldRequirements: {
					requireFullName: true,
					requirePhone: true,
					requireBirthDate: false,
					requireGender: false,
					requireSnils: false,
					requireIdentityDocument: false,
					requireResidentialAddress: false,
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

	it("2. PaymentFamilyDepositView displays exact 1-click CTA with family head and family balance", () => {
		const html = renderToStaticMarkup(
			React.createElement(PaymentFamilyDepositView, {
				patientDepositRub: 0,
				patientFamilyBalanceRub: 45000,
				familyHeadName: "Иванов И.И.",
				familyGroupName: "Семья Ивановых",
				totalDueRub: 12000,
				amountRub: "12000.00",
				isSubmittingDeposit: false,
				handleDepositOrPartialCombo: () => {},
				setSplitDepositRub: () => {},
				setSplitCardRub: () => {},
				setSplitCashRub: () => {},
				setSplitSbpRub: () => {},
				setActiveMethod: () => {},
			}),
		);

		// Button text check: «Списать с семейного депозита (Баланс семьи: 45 000 ₽, Глава: Иванов И.И.)»
		assert.match(
			html,
			/Списать с семейного депозита \(Баланс семьи:\s*45\s*000\s*₽,\s*Глава:\s*Иванов И\.И\.\)/,
			"Button must display exact 1-click family debit CTA with balance and head",
		);

		// Test-ID present
		assert.ok(html.includes('data-testid="btn-pay-family-full"'), "Must have data-testid btn-pay-family-full");
		// Not disabled
		assert.ok(!html.includes('data-testid="btn-pay-family-full" disabled'), "Family CTA button must NOT be disabled");
	});

	it("3. PatientGeneralInfoTab embeds both PatientFamilyCard and PatientRepresentativesSection in family section", () => {
		const tabPath = path.resolve(patientsDir, "tabs/PatientGeneralInfoTab.tsx");
		const content = fs.readFileSync(tabPath, "utf-8");

		assert.ok(content.includes("<PatientFamilyCard"), "PatientGeneralInfoTab must embed <PatientFamilyCard");
		assert.ok(
			content.includes("<PatientRepresentativesSection"),
			"PatientGeneralInfoTab must embed <PatientRepresentativesSection",
		);
		assert.ok(
			content.includes("usePatientFamilyLoader"),
			"PatientGeneralInfoTab must use usePatientFamilyLoader hook",
		);
	});

	it("4. PatientCreationModalView never disables primary save buttons (Mandate 8e)", () => {
		const modalViewPath = path.resolve(patientsDir, "patientCreation/PatientCreationModalView.tsx");
		const content = fs.readFileSync(modalViewPath, "utf-8");

		assert.ok(
			content.includes('data-testid="patient-creation-submit-btn"'),
			"Must have patient-creation-submit-btn",
		);
		assert.ok(
			content.includes('data-testid="patient-creation-submit-and-visit-btn"'),
			"Must have patient-creation-submit-and-visit-btn",
		);
		// Ensure neither is disabled={true}
		assert.ok(
			!content.includes('data-testid="patient-creation-submit-btn"\n\t\t\t\t\t\t\tdisabled={true}'),
			"Submit button must not be disabled={true}",
		);
		assert.ok(
			!content.includes('data-testid="patient-creation-submit-and-visit-btn"\n\t\t\t\t\t\t\tdisabled={true}'),
			"Submit & visit button must not be disabled={true}",
		);
	});

	it("5. Somatic Health Norm provides 1-click healthy status without blocking alerts", () => {
		const bannerPath = path.resolve(patientsDir, "tabs/generalInfo/PatientSafetyBanner.tsx");
		const content = fs.readFileSync(bannerPath, "utf-8");

		assert.ok(
			content.includes('data-testid="btn-somatic-healthy-norm"'),
			"Must offer 1-click somatic norm application via btn-somatic-healthy-norm",
		);
		assert.ok(
			content.includes("Соматически здоров. Аллергоанамнез не отягощен") ||
				content.includes("Физиологическая норма"),
			"Must record physiological somatic norm without blocking",
		);
		assert.ok(
			content.includes("onApplySomaticNorm"),
			"Must support onApplySomaticNorm callback",
		);
	});
});
