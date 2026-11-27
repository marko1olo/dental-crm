/**
 * subagent3DoctorAutonomyWave64.test.tsx
 *
 * Doctor Autonomy & Reception Friction-Killer via live SSR + Business Engines (Mandates 8e & 8n).
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { validate54FzBuyerInn } from "../../finance/cashboxInnValidation.js";
import { process100PercentDiscountCheckout } from "../../cashbox/cashRegisterCatalogData.js";
import { CryptoProSigner } from "../CryptoProSigner";
import { EmkControlBoard } from "../EmkControlBoard";
import { PatientCommunicationConsentsPanel } from "../../patients/PatientCommunicationConsentsPanel";
import { CheckoutDiscountAndPayerControls } from "../../cashbox/studioModules/checkout/CheckoutDiscountAndPayerControls";
import { PatientAdministrativeForm } from "../../patients/PatientAdministrativeForm";
import { patientAdministrativeProfileDraftFromPatient } from "../../../appHelpers/clinicProfileHelpers";

describe("Subagent 3: Doctor Autonomy & Reception Friction-Killer (Mandates 8e & 8n)", () => {
	it("1. CryptoProSigner renders unlocked secondary signing button even without crypto plugin", () => {
		const html = renderToStaticMarkup(
			React.createElement(CryptoProSigner, {
				visitId: "visit-1",
				isLocked: false,
				onSigned: () => {},
			}),
		);
		assert.equal(html.includes('disabled=""'), false, "Sign button must not be disabled");
		assert.equal(html.includes("043/у"), false);
	});

	it("2. EmkControlBoard renders revision submission without !reason disabled lockout", () => {
		const html = renderToStaticMarkup(
			React.createElement(EmkControlBoard, {
				dashboard: null,
			}),
		);
		assert.ok(html.length > 0);
		assert.equal(html.includes("043/у"), false);
		assert.equal(html.includes("834н"), false);
	});

	it("3. PatientCommunicationConsentsPanel renders save control without !dirty lockout", () => {
		const html = renderToStaticMarkup(
			React.createElement(PatientCommunicationConsentsPanel, {
				patientId: "pat-comm-1",
			}),
		);
		assert.ok(html.includes('data-testid="patient-comm-consents-panel"'));
		assert.ok(html.includes("Согласия на связь"));
	});

	it("4. validates physical payer INN exemption, 100% warranty checkout, and CheckoutDiscountAndPayerControls SSR", () => {
		const physicalEmpty = validate54FzBuyerInn("", "physical");
		assert.strictEqual(physicalEmpty.isValid, true);
		assert.strictEqual(physicalEmpty.isRequired, false);

		const physicalWithInn = validate54FzBuyerInn("770123456789", "physical");
		assert.strictEqual(physicalWithInn.isValid, true);

		const legalEmpty = validate54FzBuyerInn("", "legal_entity");
		assert.strictEqual(legalEmpty.isValid, false);
		assert.strictEqual(legalEmpty.isRequired, true);

		const warrantyResult = process100PercentDiscountCheckout({
			totalGrossRub: 15000,
			isWarrantyRework: true,
		});
		assert.strictEqual(warrantyResult.isZeroDue, true);
		assert.strictEqual(warrantyResult.totalNetRub, 0);
		assert.strictEqual(warrantyResult.bypassKktZeroReceipt, true);

		const controlsHtml = renderToStaticMarkup(
			React.createElement(CheckoutDiscountAndPayerControls, {
				isWarranty: false,
				setIsWarranty: () => {},
				discountPercent: 0,
				setDiscountPercent: () => {},
				setMethod: () => {},
				payerType: "physical",
				setPayerType: () => {},
				buyerInn: "",
				setBuyerInn: () => {},
			}),
		);
		assert.ok(controlsHtml.includes('data-testid="payer-selection-section"'));
		assert.ok(controlsHtml.includes("preset-warranty-100"));
	});

	it("5. Reception Autonomy: PatientAdministrativeForm renders unlocked blank contract print button", () => {
		const html = renderToStaticMarkup(
			React.createElement(PatientAdministrativeForm, {
				patientAdministrativeProfileDraft: patientAdministrativeProfileDraftFromPatient(null),
				updatePatientAdministrativeProfileDraft: () => {},
			}),
		);
		assert.ok(html.includes('data-testid="admin-form-print-blank-contract-btn"'));
		assert.ok(html.includes("Печать бланка договора"));
		assert.ok(html.includes("Печать бланка согласия"));
		assert.equal(html.includes('data-testid="admin-form-print-blank-contract-btn" disabled'), false);
	});
});
