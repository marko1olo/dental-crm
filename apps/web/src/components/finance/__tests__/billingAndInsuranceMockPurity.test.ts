/**
 * billingAndInsuranceMockPurity.test.ts — Mock Purity Verification Suite Wave 107
 * Confirms total eradication of synthetic 'Иванов Иван Иванович' fallback mocks across:
 * 1. PatientBillingModal.tsx
 * 2. DmsStudioModal.tsx
 * 3. FamilyWalletModal.tsx (Canonical SSOT)
 * 4. BankInstallmentQrModal.tsx
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import React from "react";
import { renderToString } from "react-dom/server";

if (!process.env.VITEST) {
	try {
		registerHooks({
			resolve(specifier, context, nextResolve) {
				if (specifier.endsWith(".css") || specifier.includes(".css")) {
					return {
						format: "module",
						shortCircuit: true,
						url: "data:text/javascript," + encodeURIComponent("export default {};"),
					};
				}
				return nextResolve(specifier, context);
			},
		});
	} catch {
		// Hooks already registered by runner
	}
}

const { FamilyWalletModal } = await import("../../patients/family/FamilyWalletModal.js");
const { BankInstallmentQrModal } = await import("../../payments/BankInstallmentQrModal.js");
const { DmsStudioModal } = await import("../../insurance/DmsStudioModal.js");
const { PatientInstallmentsModal } = await import("../../billing/PatientInstallmentsModal.js");

describe("Wave 107: Billing, Insurance & Family Wallet Mock Purity (Real Component Renders)", () => {
	it("DmsStudioModal: renders clean empty state without synthetic clown name 'Иванов Иван Иванович'", () => {
		const html = renderToString(
			React.createElement(DmsStudioModal, {
				isOpen: true,
				onClose: () => {},
			}),
		);
		assert.equal(html.includes("Иванов Иван Иванович"), false, "DmsStudioModal must not render synthetic patient name");
		assert.ok(html.length > 50, "DmsStudioModal must render real markup");
	});

	it("PatientInstallmentsModal: renders honest empty state without fake aligners preset when no server plan exists", () => {
		const html = renderToString(
			React.createElement(PatientInstallmentsModal, {
				isOpen: true,
				onClose: () => {},
				patientName: "Кузнецова Ольга",
			}),
		);
		assert.ok(html.includes('data-testid="installments-empty-state"'), "Must render honest empty state without fabricated 360 000 ₽ aligners preset");
		assert.equal(html.includes("Элайнеры Spark"), false);
		assert.equal(html.includes("Иванов Иван Иванович"), false);
	});

	it("FamilyWalletModal: renders with clean default empty state without synthetic Ivanov family members", () => {
		const html = renderToString(
			React.createElement(FamilyWalletModal, {
				isOpen: true,
				onClose: () => {},
				inline: true,
				patientId: "pat-clean",
				patientName: "Петров Петр Петрович",
			}),
		);
		assert.ok(!html.includes("Иванов Иван Иванович"), "Rendered HTML must not contain synthetic Ivanov head payer");
		assert.ok(!html.includes("Семья Ивановых"), "Rendered HTML must not contain synthetic Ivanov family name");
		assert.ok(!html.includes("Иванова Елена Сергеевна"), "Rendered HTML must not contain mock spouse");
		assert.ok(!html.includes("Иванов Михаил Иванович"), "Rendered HTML must not contain mock child");
	});

	it("BankInstallmentQrModal: renders with clean default patient without synthetic mock name", () => {
		const html = renderToString(
			React.createElement(BankInstallmentQrModal, {
				isOpen: true,
				onClose: () => {},
				stageAmountKopecks: 5000000,
			}),
		);
		assert.ok(!html.includes("Иванов Иван Иванович"), "Rendered HTML must not contain synthetic patient name");
	});
});
