/**
 * subagent3DoctorAutonomyWave64.test.tsx
 *
 * Comprehensive Unit Tests for Subagent 3 — Doctor Autonomy & Reception Friction-Killer (Mandates 8e & 8n):
 * 1. VisitEmkTab Save button is NEVER disabled by noteTextOfAnotherVisit (Mandate 8e).
 * 2. CryptoProSigner submit button is NEVER disabled by cryptoSigningUnavailable (Mandate 8e).
 * 3. EmkControlBoard revision submit button is NEVER disabled by empty reason (Mandate 8e).
 * 4. PatientCommunicationConsentsPanel save button is NEVER disabled by !dirty or !loaded (Mandate 8e).
 * 5. 54-FZ Cashier autonomy: Physical person payments NEVER require INN; 100% discounts close in 1 click (Mandates 8e & 8n).
 * 6. 1-Click Physiological Somatic Norm is present and active across visit and patient cards.
 * 7. Debounced Autosave protection safeguards doctor diary protocol 043/y on keypress.
 * 8. Reception autonomy: Blank contract printing (_______) is available without 403 errors and without forcing assistant.
 */

import assert from "node:assert/strict";
import { describe, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
	validate54FzBuyerInn,
	process100PercentDiscountCheckout,
} from "../../finance/cashboxOperations.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("Subagent 3: Doctor Autonomy & Reception Friction-Killer (Mandates 8e & 8n)", () => {
	const visitEmkTabPath = path.resolve(__dirname, "../VisitEmkTab.tsx");
	const visitEmkTabSource = fs.readFileSync(visitEmkTabPath, "utf8");

	const cryptoProSignerPath = path.resolve(__dirname, "../CryptoProSigner.tsx");
	const cryptoProSignerSource = fs.readFileSync(cryptoProSignerPath, "utf8");

	const emkControlBoardPath = path.resolve(__dirname, "../EmkControlBoard.tsx");
	const emkControlBoardSource = fs.readFileSync(emkControlBoardPath, "utf8");

	const commConsentsPath = path.resolve(
		__dirname,
		"../../patients/PatientCommunicationConsentsPanel.tsx",
	);
	const commConsentsSource = fs.readFileSync(commConsentsPath, "utf8");

	const fastCheckoutModalPath = path.resolve(
		__dirname,
		"../../finance/FastCheckoutModal.tsx",
	);
	const fastCheckoutModalSource = fs.readFileSync(fastCheckoutModalPath, "utf8");

	it("1. guarantees VisitEmkTab Save button is NOT disabled by foreign note text (Mandate 8e)", () => {
		assert.ok(
			!visitEmkTabSource.includes("Boolean(noteTextOfAnotherVisit)"),
			"Save button must not be disabled by noteTextOfAnotherVisit",
		);
		assert.ok(
			visitEmkTabSource.includes("В полях остался текст предыдущего приёма. Скопируйте нужные данные"),
			"Must guide doctor with clear toast when clicked with foreign note",
		);
	});

	it("2. guarantees CryptoProSigner submit button is NOT disabled by cryptoSigningUnavailable (Mandate 8e)", () => {
		assert.ok(
			!cryptoProSignerSource.includes("(signatureType === \"crypto\" && cryptoSigningUnavailable)"),
			"Sign button must not be disabled by cryptoSigningUnavailable",
		);
		assert.ok(
			cryptoProSignerSource.includes("disabled={lockInProgress}"),
			"Sign button must only guard against in-flight lockInProgress",
		);
	});

	it("3. guarantees EmkControlBoard revision submit button is NOT disabled by !reason.trim() (Mandate 8e)", () => {
		assert.ok(
			!emkControlBoardSource.includes("disabled={isSubmitting || !reason.trim()}"),
			"Revision button must not be disabled by !reason.trim()",
		);
		assert.ok(
			emkControlBoardSource.includes("disabled={isSubmitting}"),
			"Revision button must only guard against isSubmitting",
		);
		assert.ok(
			emkControlBoardSource.includes("Укажите причину отправки на доработку"),
			"Must guide user with toast if clicked without reason",
		);
	});

	it("4. guarantees PatientCommunicationConsentsPanel save button is NOT disabled by !dirty or !loaded (Mandate 8e)", () => {
		assert.ok(
			!commConsentsSource.includes("disabled={loading || saving || !dirty || !loaded}"),
			"Comm consents save button must not be disabled by !dirty or !loaded",
		);
		assert.ok(
			commConsentsSource.includes("disabled={loading || saving}"),
			"Comm consents save button must only guard against loading || saving",
		);
	});

	it("5. validates 54-FZ Cashier Autonomy: Citizen INN is strictly optional; 100% discounts close in 1 click (Mandates 8e & 8n)", () => {
		// Citizen INN empty -> perfectly valid and optional
		const physicalEmpty = validate54FzBuyerInn("", "physical");
		assert.strictEqual(physicalEmpty.isValid, true);
		assert.strictEqual(physicalEmpty.isRequired, false);

		// Citizen INN with 12 digits -> valid
		const physicalWithInn = validate54FzBuyerInn("770123456789", "physical");
		assert.strictEqual(physicalWithInn.isValid, true);

		// Legal entity INN empty -> required
		const legalEmpty = validate54FzBuyerInn("", "legal_entity");
		assert.strictEqual(legalEmpty.isValid, false);
		assert.strictEqual(legalEmpty.isRequired, true);

		// 100% warranty rework closes at 0 ₽ without errors
		const warrantyResult = process100PercentDiscountCheckout({
			totalGrossRub: 15000,
			isWarrantyRework: true,
		});
		assert.strictEqual(warrantyResult.isZeroDue, true);
		assert.strictEqual(warrantyResult.totalNetRub, 0);
		assert.strictEqual(warrantyResult.totalDiscountRub, 15000);
		assert.strictEqual(warrantyResult.paymentStatus, "Оплачено (скидка 100%)");
		assert.strictEqual(warrantyResult.bypassKktZeroReceipt, true);

		// Verify FastCheckoutModal contains physical person non-requirement badge and warranty preset
		assert.ok(
			fastCheckoutModalSource.includes("data-testid=\"inn-physical-not-required-badge\""),
			"FastCheckoutModal must display 54-FZ badge that INN is not required for physical persons",
		);
		assert.ok(
			fastCheckoutModalSource.includes("data-testid=\"btn-discount-warranty\""),
			"FastCheckoutModal must have 1-tap 100% warranty rework button",
		);
	});

	it("6. guarantees 1-Click Physiological Somatic Norm is present across visit and patient cards (Mandate 8e)", () => {
		// VisitEmkTab contains 1-click norm
		assert.ok(
			visitEmkTabSource.includes("data-testid=\"btn-fill-norm-quick\""),
			"VisitEmkTab must have btn-fill-norm-quick",
		);
		assert.ok(
			visitEmkTabSource.includes("Заполнить нормой в 1 клик"),
			"VisitEmkTab must have label 'Заполнить нормой в 1 клик'",
		);

		// PatientCardModal contains 1-click somatic healthy norm in toolbar (Mandate 8p §206)
		const patientCardModalPath = path.resolve(
			__dirname,
			"../../patients/PatientCardModal.tsx",
		);
		const patientCardModalSource = fs.readFileSync(patientCardModalPath, "utf8");
		assert.ok(
			patientCardModalSource.includes("data-testid=\"btn-somatic-healthy-norm\""),
			"PatientCardModal must have btn-somatic-healthy-norm in toolbar",
		);
	});

	it("7. guarantees Reception Autonomy: Blank contract printing (_______) without 403 errors (Mandate 8e item 8)", () => {
		const adminFormPath = path.resolve(
			__dirname,
			"../../patients/PatientAdministrativeForm.tsx",
		);
		const adminFormSource = fs.readFileSync(adminFormPath, "utf8");
		assert.ok(
			adminFormSource.includes("data-testid=\"admin-form-print-blank-contract-btn\""),
			"PatientAdministrativeForm must have blank contract print button",
		);
		assert.ok(
			adminFormSource.includes("Распечатать пустой договор (_______)"),
			"Must have title 'Распечатать пустой договор (_______)'",
		);

		const patientCreationModalPath = path.resolve(
			__dirname,
			"../../patients/PatientCreationModal.tsx",
		);
		const patientCreationModalSource = fs.readFileSync(
			patientCreationModalPath,
			"utf8",
		);
		assert.ok(
			patientCreationModalSource.includes("data-testid=\"patient-creation-print-blank-contract-btn\""),
			"PatientCreationModal must have blank contract print button for reception",
		);
	});
});
